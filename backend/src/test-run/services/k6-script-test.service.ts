import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TestRun } from '../entities/test-run.entity';
import { PerfScriptResultDetail } from '../entities/perf_script_result_detail.entity';
import { Project } from 'src/project/entities/project.entity';
import { ScheduledTest } from 'src/scheduled-test/entities/scheduled-test.entity';
import { AiAnalysisService } from 'src/ai_analysis/ai-analysis.service';
import { GcsService } from 'src/project/gcs.service';

const execAsync = promisify(exec);

@Injectable()
export class K6ScriptTestService {
  constructor(
    @InjectRepository(TestRun)
    private testRunRepo: Repository<TestRun>,

    @InjectRepository(PerfScriptResultDetail)
    private detailRepo: Repository<PerfScriptResultDetail>,

    @InjectRepository(Project)
    private projectRepo: Repository<Project>,

    @InjectRepository(ScheduledTest)
    private scheduledTestRepo: Repository<ScheduledTest>,

    private readonly aiAnalysisService: AiAnalysisService,
    private readonly gcsService: GcsService,
  ) {}

  /**
   * Thực hiện chạy K6 performance test dựa trên script từ GCS
   */
  async runK6ScriptTest(projectId: number, scheduled_test_id?: number) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    
    let sourceFilePath: string;
    let originalFileName: string;

    // Kiểm tra xem có phải là scheduled test không
    if (scheduled_test_id) {
      const scheduledTest = await this.scheduledTestRepo.findOne({
        where: { id: scheduled_test_id },
      });

      if (!scheduledTest) {
        throw new NotFoundException(`Scheduled test #${scheduled_test_id} not found.`);
      }

      // Kiểm tra xem scheduled test có file riêng không
      if (scheduledTest.inputFilePath && await this.gcsService.fileExists(scheduledTest.inputFilePath)) {
        sourceFilePath = scheduledTest.inputFilePath;
        originalFileName = scheduledTest.originalFileName || this.getFileNameFromGcsPath(scheduledTest.inputFilePath);
      } else if (project?.k6ScriptFilePath) {
        // Fallback to project file nếu scheduled test không có file
        sourceFilePath = project.k6ScriptFilePath;
        originalFileName = project.originalK6ScriptFileName || this.getFileNameFromGcsPath(project.k6ScriptFilePath);
      } else {
        throw new NotFoundException('Neither scheduled test nor project has K6 script file.');
      }
    } else {
      // Chạy test thông thường từ project
      if (!project?.k6ScriptFilePath) {
        throw new NotFoundException('Project không có file K6 script.');
      }
      sourceFilePath = project.k6ScriptFilePath;
      originalFileName = project.originalK6ScriptFileName || this.getFileNameFromGcsPath(project.k6ScriptFilePath);
    }

    // Tạo tên file duy nhất dựa trên timestamp hiện tại
    const testRunId = Date.now();
    const inputFileName = `testrun_${testRunId}.js`;

    // Tạo temp file local để chạy K6 (vì K6 cần file local)
    const tempInputPath = `/tmp/${inputFileName}`;
    
    // Download file từ GCS và lưu temp local
    const scriptContent = await this.gcsService.readFile(sourceFilePath);
    require('fs').writeFileSync(tempInputPath, scriptContent);

    // Upload input file lên GCS để lưu trữ
    const inputBuffer = Buffer.from(scriptContent);
    const inputFile = {
      buffer: inputBuffer,
      mimetype: 'application/javascript',
      originalname: inputFileName,
    } as Express.Multer.File;

    const inputGcsPath = await this.gcsService.uploadFile(
      inputFile,
      inputFileName,
      'test_inputs/performance-k6',
    );

    // Tạo temp paths cho kết quả
    const tempRawResultPath = `/tmp/testrun_${testRunId}_result.json`;
    const tempTimeSeriesPath = `/tmp/test_${testRunId}_time_series.json`;

    // Thực thi lệnh k6 run
    try {
      await execAsync(
        `k6 run ${tempInputPath} --summary-export=${tempRawResultPath} --out json=${tempTimeSeriesPath}`,
        {
          env: { ...process.env, LOG_PATH: tempTimeSeriesPath },
        },
      );
    } catch (err: any) {
      if (err.code === 99) {
        console.warn('K6 test completed, but performance thresholds were not met.');
      } else {
        console.error('An unexpected error occurred while running k6:', err);
        throw err;
      }
    }

    // Kiểm tra file kết quả tồn tại
    if (!require('fs').existsSync(tempRawResultPath)) {
      throw new Error(`Không tìm thấy file kết quả test tại: ${tempRawResultPath}`);
    }

    const rawData = JSON.parse(require('fs').readFileSync(tempRawResultPath, 'utf-8'));

    // Phân tích dữ liệu raw thành summary
    const summary = this.analyzeResult(rawData);
    summary.original_file_name = originalFileName;

    // Upload raw result lên GCS
    const rawResultBuffer = Buffer.from(JSON.stringify(rawData));
    const rawResultFile = {
      buffer: rawResultBuffer,
      mimetype: 'application/json',
      originalname: `testrun_${testRunId}_result.json`,
    } as Express.Multer.File;

    const rawResultGcsPath = await this.gcsService.uploadFile(
      rawResultFile,
      `testrun_${testRunId}_result.json`,
      'results/performance-k6',
    );

    // Upload summary lên GCS
    const summaryBuffer = Buffer.from(JSON.stringify(summary, null, 2));
    const summaryFile = {
      buffer: summaryBuffer,
      mimetype: 'application/json',
      originalname: `testrun_${testRunId}_summary.json`,
    } as Express.Multer.File;

    const summaryGcsPath = await this.gcsService.uploadFile(
      summaryFile,
      `testrun_${testRunId}_summary.json`,
      'summaries/performance-k6',
    );

    // Xử lý time series nếu có
    let timeSeriesGcsPath = null;
    if (require('fs').existsSync(tempTimeSeriesPath)) {
      try {
        const lines = require('fs')
          .readFileSync(tempTimeSeriesPath, 'utf-8')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            try {
              return JSON.parse(l);
            } catch {
              return null;
            }
          })
          .filter(
            (obj) =>
              obj &&
              obj.type === 'Point' &&
              obj.metric === 'http_req_duration' &&
              obj.data?.time &&
              obj.data?.value !== undefined &&
              obj.data?.tags?.status !== undefined,
          )
          .map((obj) => ({
            timestamp: obj.data.time,
            duration: obj.data.value,
            status: obj.data.tags.status,
          }));

        if (lines.length > 0) {
          const timeSeriesBuffer = Buffer.from(
            lines.map((l) => JSON.stringify(l)).join('\n')
          );
          const timeSeriesFile = {
            buffer: timeSeriesBuffer,
            mimetype: 'application/json',
            originalname: `test_${testRunId}_time_series.json`,
          } as Express.Multer.File;

          timeSeriesGcsPath = await this.gcsService.uploadFile(
            timeSeriesFile,
            `test_${testRunId}_time_series.json`,
            'time_series/performance-k6',
          );
          console.log('Log response time đã được upload lên GCS:', timeSeriesGcsPath);
        }
      } catch (err) {
        console.warn(`Lỗi xử lý file time series: ${err.message}`);
      }
    }

    // Cleanup temp files
    [tempInputPath, tempRawResultPath, tempTimeSeriesPath].forEach(file => {
      if (require('fs').existsSync(file)) {
        require('fs').unlinkSync(file);
      }
    });

    // Tạo và lưu bản ghi test run mới vào database
    const testRun = this.testRunRepo.create({
      project_id: projectId,
      scheduled_test_id: scheduled_test_id || null,
      category: 'performance',
      sub_type: 'script',
      input_file_path: inputGcsPath,
      raw_result_path: rawResultGcsPath,
      summary_path: summaryGcsPath,
      time_series_path: timeSeriesGcsPath,
      config_json: { fileName: inputFileName },
      original_file_name: originalFileName,
    });
    const savedTestRun = await this.testRunRepo.save(testRun);

    // Tạo danh sách entities chi tiết metrics và checks để lưu
    const entities: PerfScriptResultDetail[] = [];

    // Lặp qua metrics trong raw data, chuẩn bị lưu vào detail
    for (const [metricName, metricData] of Object.entries<any>(
      rawData.metrics || {},
    )) {
      const values = metricData.values || metricData;

      entities.push(
        this.detailRepo.create({
          test_run_id: savedTestRun.id,
          type: 'metric',
          name: metricName,
          avg: values.avg ?? null,
          min: values.min ?? null,
          max: values.max ?? null,
          p90: values['p(90)'] ?? null,
          p95: values['p(95)'] ?? null,
          rate: values.rate ?? null,
          value: values.value ?? values.count ?? null,
          passes: values.passes ?? null,
          fails: values.fails ?? null,
          raw_values: values,
        }),
      );
    }

    // Lặp qua checks, chuẩn bị lưu vào detail
    const checksData = rawData.root_group?.checks || {};
    for (const checkName in checksData) {
      const check = checksData[checkName];
      entities.push(
        this.detailRepo.create({
          test_run_id: savedTestRun.id,
          type: 'check',
          name: check.name || checkName,
          passes: check.passes ?? 0,
          fails: check.fails ?? 0,
        }),
      );
    }

    // Lưu tất cả chi tiết metrics và checks vào DB
    await this.detailRepo.save(entities);

    return {
      test_run_id: savedTestRun.id,
      summary,
      ai_analysis: null,
    };
  }

  private getFileNameFromGcsPath(gcsPath: string): string {
    return gcsPath.split('/').pop() || 'unknown.js';
  }

  /**
   * Phân tích raw result từ k6 thành cấu trúc summary tổng quan
   */
  private analyzeResult(raw: any) {
    const metrics = raw.metrics || {};
    const checks = raw.root_group?.checks || {};

    return {
      total_metrics: Object.keys(metrics).length,
      total_checks: Object.keys(checks).length,
      metrics_overview: Object.fromEntries(
        Object.entries(metrics).map(([name, m]: any) => [
          name,
          {
            ...(m.values ?? m),
          },
        ]),
      ),
      checks_overview: Object.keys(checks).map((key) => ({
        name: checks[key].name,
        passes: checks[key].passes,
        fails: checks[key].fails,
      })),
      original_file_name: '',
    };
  }
}