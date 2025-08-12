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

  // Lấy lịch sử test theo project, filter category & sub_type, sort thời gian
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

    // Map từng test run kèm summary, rawSummary, rawResult
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
            console.error(`Error parsing summary for test run ${testRun.id}:`, e);
          }
        }

        if (testRun.raw_result_path && fs.existsSync(testRun.raw_result_path)) {
          try {
            rawResult = JSON.parse(
              fs.readFileSync(testRun.raw_result_path, 'utf-8'),
            );
          } catch (e) {
            console.error(`Error parsing raw result for test run ${testRun.id}:`, e);
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

  private roundVal(val: any, decimals = 2) {
    if (typeof val !== 'number') return val;
    return parseFloat(val.toFixed(decimals));
  }

  // Validate & chuẩn hóa summary theo loại test
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
              http_req_duration_p95: extractVal('http_req_duration_p95')?.value
                ? { value: this.roundVal(extractVal('http_req_duration_p95')?.value) }
                : { value: this.roundVal(extractVal('http_req_duration_avg')?.value) },
              error_rate: { value: this.roundVal(extractVal('error_rate')?.value) },
              http_reqs: { value: this.roundVal(extractVal('http_reqs')?.value, 0) },
              passes: { value: this.roundVal(extractVal('checks_pass')?.value, 0) },
              failures: { value: this.roundVal(extractVal('checks_fail')?.value, 0) },
            }
          : {
              http_req_duration_p95: { value: this.roundVal(data.http_req_duration_p95?.value) },
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
          metrics_overview: metrics,
          passes: { value: metrics.checks?.passes || 0 },
          failures: { value: metrics.checks?.failures || 0 },
          total_metrics: Object.keys(metrics).length,
        };

      case 'postman':
        return {
          duration_ms: data.duration_ms ?? 0,
          total_requests: data.total_requests ?? 0,
          passes: data.passes ?? 0,
          failures: data.failures ?? 0,
        };

      default:
        return {};
    }
  }

  // Xoá test run, xoá cả detail & file liên quan
  async deleteTestRun(id: number) {
    const testRun = await this.testRunRepo.findOne({ where: { id } });
    if (!testRun) {
      throw new NotFoundException('Không tìm thấy test run để xoá.');
    }

    // Xoá chi tiết theo loại test
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

    // Xoá file (input, raw result, summary, time series)
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

  // Lấy chi tiết test run, kèm summary, details, rawResult
  async getTestRunDetails(id: number) {
    const testRun = await this.testRunRepo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!testRun) throw new NotFoundException('Không tìm thấy test run.');

    let summaryData = null;
    if (testRun.summary_path) {
      try {
        const absSummaryPath = path.resolve(process.cwd(), testRun.summary_path);
        if (fs.existsSync(absSummaryPath)) {
          summaryData = JSON.parse(fs.readFileSync(absSummaryPath, 'utf-8'));
        }
      } catch (err) {
        console.error(`Error reading summary file for test run ${id}:`, err);
      }
    }

    let rawResultData = null;
    if (testRun.raw_result_path) {
      try {
        const absRawResultPath = path.resolve(process.cwd(), testRun.raw_result_path);
        if (fs.existsSync(absRawResultPath)) {
          rawResultData = JSON.parse(fs.readFileSync(absRawResultPath, 'utf-8'));
        }
      } catch (err) {
        console.error(`Error reading raw result file for test run ${id}:`, err);
      }
    }

    let detailsData: any[] = [];
    if (testRun.sub_type === 'postman') {
      detailsData = await this.apiDetailRepo.find({ where: { test_run_id: id } });
    } else if (testRun.sub_type === 'quick') {
      detailsData = await this.quickDetailRepo.find({ where: { testRun: { id } } });
    } else if (testRun.sub_type === 'script') {
      detailsData = await this.scriptDetailRepo.find({ where: { test_run_id: id } });
    }

    return {
      testRun,
      summary: summaryData || {},
      details: detailsData,
      rawResult: rawResultData || {},
    };
  }

  // So sánh 2 test run cùng loại dựa trên summary
  async compareTests(idA: number, idB: number) {
    const testA = await this.testRunRepo.findOne({ where: { id: idA } });
    const testB = await this.testRunRepo.findOne({ where: { id: idB } });

    if (!testA || !testB) throw new NotFoundException('Không tìm thấy test.');

    // Kiểm tra tồn tại file summary
    if (!testA.summary_path || !fs.existsSync(path.resolve(process.cwd(), testA.summary_path))) {
      throw new NotFoundException(`File summary của test run A không tồn tại.`);
    }
    if (!testB.summary_path || !fs.existsSync(path.resolve(process.cwd(), testB.summary_path))) {
      throw new NotFoundException(`File summary của test run B không tồn tại.`);
    }

    let summaryA;
    let summaryB;
    try {
      summaryA = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), testA.summary_path), 'utf-8'));
    } catch (e) {
      throw new Error(`Lỗi parse JSON file summary test A: ${e.message}`);
    }

    try {
      summaryB = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), testB.summary_path), 'utf-8'));
    } catch (e) {
      throw new Error(`Lỗi parse JSON file summary test B: ${e.message}`);
    }

    return this.mapCompareSummary(testA, summaryA, testB, summaryB);
  }

  private mapCompareSummary(testA: TestRun, summaryA: any, testB: TestRun, summaryB: any) {
    if (testA.sub_type === 'quick' && testB.sub_type === 'quick') {
      return {
        p95Duration: this.makeDiff(summaryA.http_req_duration_p95?.value, summaryB.http_req_duration_p95?.value),
        errorRate: this.makeDiff(summaryA.error_rate?.value, summaryB.error_rate?.value),
        requests: this.makeDiff(summaryA.http_reqs?.value, summaryB.http_reqs?.value),
        checks: {
          testA: { pass: summaryA.passes?.value || 0, fail: summaryA.failures?.value || 0 },
          testB: { pass: summaryB.passes?.value || 0, fail: summaryB.failures?.value || 0 },
        },
      };
    }
    if (testA.sub_type === 'postman' && testB.sub_type === 'postman') {
      return {
        duration: this.makeDiff(summaryA.duration_ms, summaryB.duration_ms),
        failAssertions: this.makeDiff(summaryA.failures, summaryB.failures),
        passAssertions: this.makeDiff(summaryA.passes, summaryB.passes),
        checks: {
          testA: { pass: summaryA.passes || 0, fail: summaryA.failures || 0 },
          testB: { pass: summaryB.passes || 0, fail: summaryB.failures || 0 },
        },
      };
    }
    if (testA.sub_type === 'script' && testB.sub_type === 'script') {
      return {
        p95Duration: this.makeDiff(summaryA.metrics_overview?.http_req_duration?.['p(95)'], summaryB.metrics_overview?.http_req_duration?.['p(95)']),
        avgDuration: this.makeDiff(summaryA.metrics_overview?.http_req_duration?.avg, summaryB.metrics_overview?.http_req_duration?.avg),
        errorRate: this.makeDiff(summaryA.metrics_overview?.http_req_failed?.value * 100, summaryB.metrics_overview?.http_req_failed?.value * 100),
        checks: {
          testA: { pass: summaryA.passes?.value || 0, fail: summaryA.failures?.value || 0 },
          testB: { pass: summaryB.passes?.value || 0, fail: summaryB.failures?.value || 0 },
        },
      };
    }
    return {};
  }

  private makeDiff(a: number, b: number) {
    return { testA: a, testB: b, diff: b - a };
  }

  // --- Các hàm lấy đường dẫn file cho controller tải file ---

  async getRawResultPath(id: number): Promise<string | null> {
    const testRun = await this.testRunRepo.findOne({ where: { id } });
    if (!testRun?.raw_result_path) return null;

    const absolutePath = path.resolve(process.cwd(), testRun.raw_result_path);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
    return null;
  }

  async getSummaryPath(id: number): Promise<string | null> {
    const testRun = await this.testRunRepo.findOne({ where: { id } });
    if (!testRun?.summary_path) return null;

    const absolutePath = path.resolve(process.cwd(), testRun.summary_path);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
    return null;
  }

  async getInputFilePath(id: number): Promise<string | null> {
    const testRun = await this.testRunRepo.findOne({ where: { id } });
    if (!testRun?.input_file_path) return null;

    const absolutePath = path.resolve(process.cwd(), testRun.input_file_path);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
    return null;
  }

  async getTimeSeriesPath(id: number): Promise<string | null> {
    const testRun = await this.testRunRepo.findOne({ where: { id } });
    if (!testRun?.time_series_path) return null;

    const absolutePath = path.resolve(process.cwd(), testRun.time_series_path);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
    return null;
  }
}
