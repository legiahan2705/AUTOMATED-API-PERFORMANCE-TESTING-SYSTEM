import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TestRun } from './entities/test-run.entity';
import { ApiResultDetail } from './entities/api-result-detail.entity';
import { PerfQuickResultDetail } from './entities/perf_quick_result_detail.entity';
import { PerfScriptResultDetail } from './entities/perf_script_result_detail.entity';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class TestRunService {
  constructor(
    @InjectRepository(TestRun)
    private testRunRepo: Repository<TestRun>,

    @InjectRepository(ApiResultDetail)
    private apiDetailRepo: Repository<ApiResultDetail>,

    @InjectRepository(PerfQuickResultDetail)
    private quickDetailRepo: Repository<PerfQuickResultDetail>,

    @InjectRepository(PerfScriptResultDetail)
    private scriptDetailRepo: Repository<PerfScriptResultDetail>,
  ) {}

  async getHistory(
    projectId: number,
    category?: 'api' | 'performance',
    subType?: 'postman' | 'quick' | 'script',
    sort: 'asc' | 'desc' = 'desc',
  ) {
    const query = this.testRunRepo
      .createQueryBuilder('t')
      .where('t.project_id = :projectId', { projectId });

    if (category) query.andWhere('t.category = :category', { category });
    if (subType) query.andWhere('t.sub_type = :subType', { subType });

    query.orderBy('t.created_at', sort.toUpperCase() as 'ASC' | 'DESC');

    const testRuns = await query.getMany();

    return await Promise.all(
      testRuns.map(async (testRun) => {
        let summaryData = {};
        let rawSummary = {};
        let rawResult = {};

        if (testRun.summary_path && fs.existsSync(testRun.summary_path)) {
          try {
            const rawData = JSON.parse(
              fs.readFileSync(testRun.summary_path, 'utf-8'),
            );
            rawSummary = rawData;
            summaryData = this.validateSummaryByType(testRun.sub_type, rawData);
          } catch (e) {
            console.error(
              `Error parsing summary for test run ${testRun.id}:`,
              e,
            );
          }
        }

        if (testRun.raw_result_path && fs.existsSync(testRun.raw_result_path)) {
          try {
            rawResult = JSON.parse(
              fs.readFileSync(testRun.raw_result_path, 'utf-8'),
            );
          } catch (e) {
            console.error(
              `Error parsing raw result for test run ${testRun.id}:`,
              e,
            );
          }
        }

        return {
          ...testRun,
          summary: summaryData,
          rawSummary,
          rawResult,
        };
      }),
    );
  }

  private makeDiff(a?: number | null, b?: number | null) {
    const valA = typeof a === 'number' ? a : null;
    const valB = typeof b === 'number' ? b : null;

    return {
      testA: valA,
      testB: valB,
      diff: valB !== null && valA !== null ? valB - valA : null,
      trend:
        valB !== null && valA !== null
          ? valB > valA
            ? 'increase'
            : valB < valA
            ? 'decrease'
            : 'same'
          : 'unknown',
    };
  }

  private roundVal(val: any, decimals = 2) {
    if (typeof val !== 'number') return val;
    return parseFloat(val.toFixed(decimals));
  }

  private validateSummaryByType(subType: string, data: any): any {
    const isArraySummary = Array.isArray(data);

    const extractVal = (name: string) => {
      if (!isArraySummary) return { value: null };
      const item = data.find((d: any) => d.name === name);
      return { value: item ? item.val : null };
    };

    switch (subType) {
      case 'quick':
        return isArraySummary
          ? {
              http_req_duration_p95: (() => {
                const p95 = extractVal('http_req_duration_p95')?.value;
                const p95FromRaw =
                  extractVal('http_req_duration')?.value?.['p(95)'];
                const avg = extractVal('http_req_duration_avg')?.value;
                return { value: this.roundVal(p95 ?? p95FromRaw ?? avg) };
              })(),
              error_rate: {
                value: this.roundVal(extractVal('error_rate')?.value),
              },
              http_reqs: {
                value: this.roundVal(extractVal('http_reqs')?.value, 0),
              },
              passes: {
                value: this.roundVal(extractVal('checks_pass')?.value, 0),
              },
              failures: {
                value: this.roundVal(extractVal('checks_fail')?.value, 0),
              },
            }
          : {
              http_req_duration_p95: {
                value: this.roundVal(
                  data.http_req_duration_p95?.value ??
                    data.http_req_duration?.['p(95)'] ??
                    data.http_req_duration_avg?.value,
                ),
              },
              error_rate: { value: this.roundVal(data.error_rate?.value) },
              http_reqs: { value: this.roundVal(data.http_reqs?.value, 0) },
              passes: { value: this.roundVal(data.passes?.value, 0) },
              failures: { value: this.roundVal(data.failures?.value, 0) },
            };

      case 'script':
        const metrics = isArraySummary
          ? data.reduce((acc: any, item: any) => {
              if (typeof item.val === 'number') {
                acc[item.name] = this.roundVal(item.val);
              } else if (typeof item.val === 'object') {
                acc[item.name] = Object.entries(item.val).reduce(
                  (subAcc: any, [key, val]) => {
                    subAcc[key] = this.roundVal(val);
                    return subAcc;
                  },
                  {},
                );
              } else {
                acc[item.name] = item.val;
              }
              return acc;
            }, {})
          : Object.entries(data.metrics_overview || {}).reduce(
              (acc: any, [key, val]: [string, any]) => {
                if (typeof val === 'number') {
                  acc[key] = this.roundVal(val);
                } else if (typeof val === 'object') {
                  acc[key] = Object.entries(val).reduce(
                    (subAcc: any, [subKey, subVal]) => {
                      subAcc[subKey] = this.roundVal(subVal);
                      return subAcc;
                    },
                    {},
                  );
                } else {
                  acc[key] = val;
                }
                return acc;
              },
              {},
            );

        return {
          original_file_name: data.original_file_name || 'Unknown Script',
          metrics_overview: metrics,
          passes: { value: metrics.checks?.passes || 0 },
          failures: { value: metrics.checks?.failures || 0 },
          total_metrics: Object.keys(metrics).length,
        };

      case 'postman':
        return {
          collection_name: data.collection_name || "Unknown Collection",
          duration_ms: data.duration_ms ?? 0,
          total_requests: data.total_requests ?? 0,
          passes: data.passes ?? 0,
          failures: data.failures ?? 0,
        };

      default:
        return {};
    }
  }

  async deleteTestRun(id: number) {
    const testRun = await this.testRunRepo.findOne({ where: { id } });
    if (!testRun) {
      throw new NotFoundException('Không tìm thấy test run để xoá.');
    }

    switch (testRun.sub_type) {
      case 'postman':
        await this.apiDetailRepo.delete({ test_run_id: id });
        break;
      case 'quick':
        await this.quickDetailRepo.delete({ testRun: { id } });
        break;
      case 'script':
        await this.scriptDetailRepo.delete({ test_run_id: id });
        break;
    }

    const filePaths = [
      testRun.input_file_path,
      testRun.raw_result_path,
      testRun.summary_path,
      testRun.time_series_path,
    ];

    for (const p of filePaths) {
      if (p) {
        try {
          const absPath = path.resolve(process.cwd(), p);
          if (fs.existsSync(absPath)) {
            await fs.promises.unlink(absPath);
            console.log(`Deleted file ${absPath}`);
          }
        } catch (err) {
          console.error(`Failed to delete file ${p}:`, err);
        }
      }
    }

    await this.testRunRepo.delete(id);
    return { message: 'Xoá test run thành công.' };
  }

  async getTestRunDetails(id: number) {
  const testRun = await this.testRunRepo.findOne({
    where: { id },
    relations: ['project'],
  });
  if (!testRun) throw new NotFoundException('Không tìm thấy test run.');

  let rawSummaryData = null;
  let processedSummaryData = {};
  
  if (testRun.summary_path) {
    try {
      const absSummaryPath = path.resolve(
        process.cwd(),
        testRun.summary_path,
      );
      if (fs.existsSync(absSummaryPath)) {
        rawSummaryData = JSON.parse(fs.readFileSync(absSummaryPath, 'utf-8'));
        // Process the raw summary data using the existing validation method
        processedSummaryData = this.validateSummaryByType(testRun.sub_type, rawSummaryData);
      }
    } catch (err) {
      console.error(`Error reading summary file for test run ${id}:`, err);
    }
  }

  let rawResultData = null;
  if (testRun.raw_result_path) {
    try {
      const absRawResultPath = path.resolve(
        process.cwd(),
        testRun.raw_result_path,
      );
      if (fs.existsSync(absRawResultPath)) {
        rawResultData = JSON.parse(
          fs.readFileSync(absRawResultPath, 'utf-8'),
        );
      }
    } catch (err) {
      console.error(`Error reading raw result file for test run ${id}:`, err);
    }
  }

  let detailsData: any[] = [];
  if (testRun.sub_type === 'postman') {
    detailsData = await this.apiDetailRepo.find({
      where: { test_run_id: id },
    });
  } else if (testRun.sub_type === 'quick') {
    detailsData = await this.quickDetailRepo.find({
      where: { testRun: { id } },
    });
  } else if (testRun.sub_type === 'script') {
    detailsData = await this.scriptDetailRepo.find({
      where: { test_run_id: id },
    });
  }

  return {
    testRun,
    summary: processedSummaryData,     
    rawSummary: rawSummaryData || {},  
    details: detailsData,
    rawResult: rawResultData || {},
  };
}

  async compareTests(idA: number, idB: number) {
    const testA = await this.testRunRepo.findOne({ where: { id: idA } });
    const testB = await this.testRunRepo.findOne({ where: { id: idB } });

    if (!testA || !testB)
      throw new NotFoundException('Không tìm thấy test run.');
    if (testA.sub_type !== testB.sub_type) {
      throw new Error('Chỉ so sánh được 2 test cùng loại.');
    }

    let compareResult: any = {};
    let lineChartDataA: any[] | null = null;
    let lineChartDataB: any[] | null = null;

    // --- API Functional Test (Postman) ---
    if (testA.sub_type === 'postman') {
      const detailsA = await this.apiDetailRepo.find({
        where: { test_run_id: idA },
      });
      const detailsB = await this.apiDetailRepo.find({
        where: { test_run_id: idB },
      });

      const passFailA = {
        pass: detailsA.filter((d) => d.is_passed).length,
        fail: detailsA.filter((d) => !d.is_passed).length,
      };
      const passFailB = {
        pass: detailsB.filter((d) => d.is_passed).length,
        fail: detailsB.filter((d) => !d.is_passed).length,
      };

      compareResult = {
        totalRequests: this.makeDiff(detailsA.length, detailsB.length),
        avgResponseTime: this.makeDiff(
          detailsA.reduce((sum, d) => sum + d.response_time, 0) /
            (detailsA.length || 1),
          detailsB.reduce((sum, d) => sum + d.response_time, 0) /
            (detailsB.length || 1),
        ),
        checks: { testA: passFailA, testB: passFailB },
      };
    }

    // --- Quick Performance Test (K6 quick) ---
    if (testA.sub_type === 'quick') {
      const detailsA = await this.quickDetailRepo.find({
        where: { test_run_id: idA },
      });
      const detailsB = await this.quickDetailRepo.find({
        where: { test_run_id: idB },
      });

      const getVal = (arr: PerfQuickResultDetail[], metric: string) =>
        arr.find((m) => m.metric_name === metric)?.value ?? null;

      compareResult = {
        p95Duration: this.makeDiff(
          getVal(detailsA, 'http_req_duration_p95') ??
            getVal(detailsA, 'http_req_duration_avg'),
          getVal(detailsB, 'http_req_duration_p95') ??
            getVal(detailsB, 'http_req_duration_avg'),
        ),

        errorRate: this.makeDiff(
          getVal(detailsA, 'error_rate'),
          getVal(detailsB, 'error_rate'),
        ),
        requests: this.makeDiff(
          getVal(detailsA, 'http_reqs'),
          getVal(detailsB, 'http_reqs'),
        ),
        checks: {
          testA: {
            pass: getVal(detailsA, 'checks_pass') || 0,
            fail: getVal(detailsA, 'checks_fail') || 0,
          },
          testB: {
            pass: getVal(detailsB, 'checks_pass') || 0,
            fail: getVal(detailsB, 'checks_fail') || 0,
          },
        },
      };
    }

    // --- Scripted Performance Test (K6 script) ---
    if (testA.sub_type === 'script') {
      const detailsA = await this.scriptDetailRepo.find({
        where: { test_run_id: idA },
      });
      const detailsB = await this.scriptDetailRepo.find({
        where: { test_run_id: idB },
      });

      const getMetric = (arr: PerfScriptResultDetail[], name: string) =>
        arr.find((m) => m.type === 'metric' && m.name === name) || null;

      const getCheckSum = (arr: PerfScriptResultDetail[]) => {
        const passes = arr
          .filter((m) => m.type === 'check')
          .reduce((sum, c) => sum + (c.passes || 0), 0);
        const fails = arr
          .filter((m) => m.type === 'check')
          .reduce((sum, c) => sum + (c.fails || 0), 0);
        return { pass: passes, fail: fails };
      };

      compareResult = {
        p95Duration: this.makeDiff(
          getMetric(detailsA, 'http_req_duration')?.p95,
          getMetric(detailsB, 'http_req_duration')?.p95,
        ),
        avgDuration: this.makeDiff(
          getMetric(detailsA, 'http_req_duration')?.avg,
          getMetric(detailsB, 'http_req_duration')?.avg,
        ),
        errorRate: this.makeDiff(
          (getMetric(detailsA, 'http_req_failed')?.rate ?? 0) * 100,
          (getMetric(detailsB, 'http_req_failed')?.rate ?? 0) * 100,
        ),
        checks: {
          testA: getCheckSum(detailsA),
          testB: getCheckSum(detailsB),
        },
      };
    }

    // Load line chart data nếu là postman hoặc script
    if (['postman', 'script'].includes(testA.sub_type)) {
      lineChartDataA = this.readTimeSeriesFile(testA.time_series_path);
      lineChartDataB = this.readTimeSeriesFile(testB.time_series_path);
    }

    return {
      subType: testA.sub_type,
      compareResult,
      lineChartDataA,
      lineChartDataB,
    };
  }

  async getRawResultPath(id: number): Promise<string | null> {
    const testRun = await this.testRunRepo.findOne({ where: { id } });
    if (!testRun?.raw_result_path) return null;

    const absolutePath = path.resolve(process.cwd(), testRun.raw_result_path);
    return fs.existsSync(absolutePath) ? absolutePath : null;
  }

  async getSummaryPath(id: number): Promise<string | null> {
    const testRun = await this.testRunRepo.findOne({ where: { id } });
    if (!testRun?.summary_path) return null;

    const absolutePath = path.resolve(process.cwd(), testRun.summary_path);
    return fs.existsSync(absolutePath) ? absolutePath : null;
  }

  async getInputFilePath(id: number): Promise<string | null> {
    const testRun = await this.testRunRepo.findOne({ where: { id } });
    if (!testRun?.input_file_path) return null;

    const absolutePath = path.resolve(process.cwd(), testRun.input_file_path);
    return fs.existsSync(absolutePath) ? absolutePath : null;
  }

  async getTimeSeriesPath(id: number): Promise<string | null> {
    const testRun = await this.testRunRepo.findOne({ where: { id } });
    if (!testRun?.time_series_path) return null;

    const absolutePath = path.resolve(process.cwd(), testRun.time_series_path);
    return fs.existsSync(absolutePath) ? absolutePath : null;
  }

  private readTimeSeriesFile(filePath?: string): any[] | null {
  if (!filePath) return null;

  const absPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) return null;

  try {
    const raw = fs.readFileSync(absPath, 'utf-8').trim();
    if (!raw) return [];

    // Nếu bắt đầu bằng [, coi như JSON Array (Postman)
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch (err) {
        console.error(`Invalid JSON array in ${filePath}:`, err);
        return [];
      }
    }

    // Ngược lại coi như JSON Lines (K6)
    return raw
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (err) {
          console.error(`Invalid JSON line in ${filePath}:`, line);
          return null;
        }
      })
      .filter(line => line !== null);

  } catch (err) {
    console.error(`Error reading time series file ${filePath}:`, err);
    return [];
  }
}

  
  // Lấy danh sách test run theo lịch
  async getTestRunsBySchedule(scheduleId: number) {
    const testRuns = await this.testRunRepo.find({
      where: { scheduled_test_id: scheduleId },
      order: { created_at: 'DESC' },
    });

    return await Promise.all(
      testRuns.map(async (testRun) => {
        let summaryData = {};
        if (testRun.summary_path && fs.existsSync(testRun.summary_path)) {
          try {
            summaryData = JSON.parse(
              fs.readFileSync(testRun.summary_path, 'utf-8'),
            );
          } catch (e) {
            console.error(
              `Error parsing summary for test run ${testRun.id}:`,
              e,
            );
          }
        }

        return {
          ...testRun,
          summary: summaryData,
        };
      }),
    );
  }
}