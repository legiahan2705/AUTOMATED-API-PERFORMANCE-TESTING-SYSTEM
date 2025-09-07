import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Project } from 'src/project/entities/project.entity';
import { ScheduledTest } from 'src/scheduled-test/entities/scheduled-test.entity';
import { ApiResultDetail } from '../entities/api-result-detail.entity';
import { TestRun } from '../entities/test-run.entity';
import { AiAnalysisService } from 'src/ai_analysis/ai-analysis.service';
import { GcsService } from 'src/project/gcs.service';

const execAsync = promisify(exec);

@Injectable()
export class PostmanTestService {
  constructor(
    @InjectRepository(TestRun)
    private testRunRepo: Repository<TestRun>,

    @InjectRepository(ApiResultDetail)
    private detailRepo: Repository<ApiResultDetail>,

    @InjectRepository(Project)
    private projectRepo: Repository<Project>,

    @InjectRepository(ScheduledTest)
    private scheduledTestRepo: Repository<ScheduledTest>,

    private readonly aiAnalysisService: AiAnalysisService,
    private readonly gcsService: GcsService,
  ) {}

  async runPostmanTest(projectId: number, scheduled_test_id?: number) {
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
      } else if (project?.postmanFilePath) {
        // Fallback to project file nếu scheduled test không có file
        sourceFilePath = project.postmanFilePath;
        originalFileName = project.originalPostmanFileName || this.getFileNameFromGcsPath(project.postmanFilePath);
      } else {
        throw new NotFoundException('Neither scheduled test nor project has Postman file.');
      }
    } else {
      // Chạy test thông thường từ project
      if (!project?.postmanFilePath) {
        throw new NotFoundException('Project không có file Postman.');
      }
      sourceFilePath = project.postmanFilePath;
      originalFileName = project.originalPostmanFileName || this.getFileNameFromGcsPath(project.postmanFilePath);
    }

    const testRunId = Date.now();
    const inputFileName = `testrun_${testRunId}.json`;
    
    // Tạo temp file local để chạy Newman (vì Newman cần file local)
    const tempInputPath = `/tmp/${inputFileName}`;
    
    // Download file từ GCS và lưu temp local
    const collectionContent = await this.gcsService.readFile(sourceFilePath);
    require('fs').writeFileSync(tempInputPath, collectionContent);

    // Upload input file lên GCS để lưu trữ
    const inputBuffer = Buffer.from(collectionContent);
    const inputFile = {
      buffer: inputBuffer,
      mimetype: 'application/json',
      originalname: inputFileName,
    } as Express.Multer.File;

    const inputGcsPath = await this.gcsService.uploadFile(
      inputFile,
      inputFileName,
      'test_inputs/postman',
    );

    // Tạo temp paths cho kết quả
    const tempRawResultPath = `/tmp/testrun_${testRunId}_result.json`;

    // Chạy Newman test
    const cmd = `npx newman run ${tempInputPath} -r json --reporter-json-export ${tempRawResultPath}`;
    await execAsync(cmd);

    // Đọc kết quả
    const rawData = JSON.parse(require('fs').readFileSync(tempRawResultPath, 'utf-8'));
    
    // Tạo time series từ raw Newman data
    const timeSeries = (rawData.run?.executions || []).map(e => ({
      timestamp: new Date().toISOString(),
      duration: e.response?.responseTime || 0,
      status: e.response?.code || null,
      name: e.item?.name || '',
      url: e.request?.url?.raw || '',
    }));

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
      'results/api',
    );

    // Phân tích kết quả
    const { summary, details } = this.analyzeResult(rawData);
    summary.original_file_name = originalFileName;

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
      'summaries/api',
    );

    // Upload time series lên GCS
    const timeSeriesBuffer = Buffer.from(JSON.stringify(timeSeries, null, 2));
    const timeSeriesFile = {
      buffer: timeSeriesBuffer,
      mimetype: 'application/json',
      originalname: `test_${testRunId}_time_series.json`,
    } as Express.Multer.File;

    const timeSeriesGcsPath = await this.gcsService.uploadFile(
      timeSeriesFile,
      `test_${testRunId}_time_series.json`,
      'time_series/postman',
    );

    console.log('Time series đã được upload lên GCS:', timeSeriesGcsPath);

    // Cleanup temp files
    [tempInputPath, tempRawResultPath].forEach(file => {
      if (require('fs').existsSync(file)) {
        require('fs').unlinkSync(file);
      }
    });

    // Lưu test run vào database
    const testRun = this.testRunRepo.create({
      project_id: projectId,
      scheduled_test_id: scheduled_test_id || null,
      category: 'api',
      sub_type: 'postman',
      input_file_path: inputGcsPath,
      raw_result_path: rawResultGcsPath,
      summary_path: summaryGcsPath,
      time_series_path: timeSeriesGcsPath,
      config_json: { fileName: inputFileName },
      original_file_name: originalFileName,
    });
    const savedTestRun = await this.testRunRepo.save(testRun);

    // Lưu chi tiết kết quả
    const entities = details.map((d) =>
      this.detailRepo.create({
        ...d,
        test_run_id: savedTestRun.id,
      }),
    );
    await this.detailRepo.save(entities);

    return {
      test_run_id: savedTestRun.id,
      summary,
      ai_analysis: null,
    };
  }

  private getFileNameFromGcsPath(gcsPath: string): string {
    return gcsPath.split('/').pop() || 'unknown.json';
  }

  private analyzeResult(raw: any) {
    const totalRequests = raw.run?.stats?.requests?.total || 0;
    const totalAssertions = raw.run?.stats?.assertions?.total || 0;
    const totalFailures = raw.run?.failures?.length || 0;

    const durationMs =
      raw.run?.timings?.completed && raw.run?.timings?.started
        ? raw.run.timings.completed - raw.run.timings.started
        : raw.run?.executions?.reduce(
            (sum, e) => sum + (e.response?.responseTime || 0),
            0,
          );

    const buildUrl = (urlObj: any) => {
      if (urlObj?.raw) return urlObj.raw;
      const host = urlObj?.host?.join('.') || '';
      const path = urlObj?.path?.join('/') || '';
      return `${host}/${path}`.replace(/\/$/, '');
    };

    // Tính average response time
    const executions = raw.run?.executions || [];
    const totalResponseTime = executions.reduce((sum, e) => sum + (e.response?.responseTime || 0), 0);
    const avgResponseTime = executions.length > 0 ? totalResponseTime / executions.length : 0;

    const summary = {
      collection_name: raw.collection?.info?.name || 'Unnamed Collection',
      total_requests: totalRequests,
      total_assertions: totalAssertions,
      passes: totalAssertions - totalFailures,
      failures: totalFailures,
      duration_ms: durationMs,
      avg_response_time: avgResponseTime,
      results: executions.map((e: any) => ({
        name: e.item?.name || '',
        method: e.request?.method || '',
        url: buildUrl(e.request?.url),
        status_code: e.response?.code || null,
        response_time: e.response?.responseTime || null,
        assertions: (e.assertions || []).map((a: any) => ({
          assertion: a.assertion,
          passed: !a.error,
          error_message: a.error?.message || null,
        })),
        is_passed: (e.assertions || []).every((a: any) => !a.error),
      })),
      original_file_name: '',
    };

    const details = executions.map((exec: any) => ({
      method: exec.request?.method || '',
      endpoint: exec.item?.name || buildUrl(exec.request?.url),
      status_code: exec.response?.code || null,
      response_time: exec.response?.responseTime || null,
      is_passed: (exec.assertions || []).every((a: any) => !a.error),
      error_message:
        exec.assertions?.find((a: any) => a.error)?.error?.message || null,
      assertion_results: exec.assertions || [],
      raw_values: exec,
    }));

    return { summary, details };
  }
}