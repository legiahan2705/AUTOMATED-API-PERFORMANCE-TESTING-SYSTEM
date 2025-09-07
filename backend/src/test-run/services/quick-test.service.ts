import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TestRun } from '../entities/test-run.entity';
import { PerfQuickResultDetail } from '../entities/perf_quick_result_detail.entity';
import { Repository } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Project } from 'src/project/entities/project.entity';
import { AiAnalysisService } from 'src/ai_analysis/ai-analysis.service';
import { GcsService } from 'src/project/gcs.service';

const execAsync = promisify(exec);

@Injectable()
export class QuickPerformanceTestService {
  constructor(
    @InjectRepository(TestRun)
    private testRunRepo: Repository<TestRun>,

    @InjectRepository(PerfQuickResultDetail)
    private detailRepo: Repository<PerfQuickResultDetail>,

    @InjectRepository(Project)
    private projectRepo: Repository<Project>,

    private readonly aiAnalysisService: AiAnalysisService,
    private readonly gcsService: GcsService,
  ) {}

  async runQuickTest(projectId: number, scheduled_test_id?: number) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project?.apiUrl) throw new NotFoundException('Project chưa có URL.');

    const config = {
      apiUrl: project.apiUrl,
      vus: project.vus || 1,
      duration: project.duration || '30s',
      method: project.method || 'GET',
    };

    const testRunId = Date.now();
    const inputFileName = `testrun_${testRunId}.js`;

    // Tạo script content
    const scriptContent = this.generateK6Script(
      config.apiUrl,
      config.vus,
      config.duration,
      config.method,
      project.headers ? JSON.parse(project.headers) : undefined,
      project.body ? JSON.parse(project.body) : undefined,
    );

    // Tạo temp file local để chạy K6
    const tempInputPath = `/tmp/${inputFileName}`;
    const tempResultPath = `/tmp/testrun_${testRunId}_result.json`;
    
    require('fs').writeFileSync(tempInputPath, scriptContent);

    // Upload input script lên GCS
    const inputBuffer = Buffer.from(scriptContent);
    const inputFile = {
      buffer: inputBuffer,
      mimetype: 'application/javascript',
      originalname: inputFileName,
    } as Express.Multer.File;

    const inputGcsPath = await this.gcsService.uploadFile(
      inputFile,
      inputFileName,
      'test_inputs/performance-quick',
    );

    // Ghi log test_run trước khi chạy test
    const testRun = this.testRunRepo.create({
      project_id: project.id,
      scheduled_test_id: scheduled_test_id || null,
      category: 'performance',
      sub_type: 'quick',
      input_file_path: inputGcsPath,
      raw_result_path: null, // Sẽ update sau
      summary_path: null, // Sẽ update sau
      config_json: config,
    });
    const saved = await this.testRunRepo.save(testRun);

    // Chạy test bằng K6
    try {
      await execAsync(`k6 run ${tempInputPath} --summary-export=${tempResultPath}`);
    } catch (err: any) {
      if (err.code === 99) {
        console.warn('Threshold bị vượt qua, nhưng test vẫn hợp lệ.');
      } else {
        throw err;
      }
    }

    if (!require('fs').existsSync(tempResultPath)) {
      throw new Error(`Không tìm thấy file kết quả test tại: ${tempResultPath}`);
    }

    // Parse kết quả
    const raw = JSON.parse(require('fs').readFileSync(tempResultPath, 'utf-8'));
    const metricDetails = this.parseMetrics(raw);

    // Upload raw result lên GCS
    const rawResultBuffer = Buffer.from(JSON.stringify(raw));
    const rawResultFile = {
      buffer: rawResultBuffer,
      mimetype: 'application/json',
      originalname: `testrun_${testRunId}_result.json`,
    } as Express.Multer.File;

    const rawResultGcsPath = await this.gcsService.uploadFile(
      rawResultFile,
      `testrun_${testRunId}_result.json`,
      'results/performance-quick',
    );

    // Upload summary lên GCS
    const summaryBuffer = Buffer.from(JSON.stringify(metricDetails, null, 2));
    const summaryFile = {
      buffer: summaryBuffer,
      mimetype: 'application/json',
      originalname: `testrun_${testRunId}_summary.json`,
    } as Express.Multer.File;

    const summaryGcsPath = await this.gcsService.uploadFile(
      summaryFile,
      `testrun_${testRunId}_summary.json`,
      'summaries/performance-quick',
    );

    // Cleanup temp files
    [tempInputPath, tempResultPath].forEach(file => {
      if (require('fs').existsSync(file)) {
        require('fs').unlinkSync(file);
      }
    });

    // Update test run với GCS paths
    saved.raw_result_path = rawResultGcsPath;
    saved.summary_path = summaryGcsPath;
    await this.testRunRepo.save(saved);

    // Lưu DB chi tiết
    const details = metricDetails.map((m) =>
      this.detailRepo.create({
        testRun: saved,
        metric_name: m.name,
        description: m.desc,
        category: m.cat,
        value: m.val,
        unit: m.unit,
        raw_values: m.raw_values,
      }),
    );

    await this.detailRepo.save(details);

    return { 
      test_run_id: saved.id, 
      summary: metricDetails,
      ai_analysis: null,
    };
  }

  private generateK6Script(
    apiUrl: string,
    vus: string | number,
    duration: string,
    method: string,
    headers?: Record<string, string>,
    body?: any,
  ): string {
    const hasHeaders = headers && Object.keys(headers).length > 0;
    const hasBody = body && Object.keys(body).length > 0;

    const headerStr = hasHeaders ? JSON.stringify(headers, null, 2) : '{}';
    const bodyStr = hasBody
      ? `JSON.stringify(${JSON.stringify(body, null, 2)})`
      : 'null';

    const requestLine =
      hasHeaders || hasBody
        ? `http.request('${method.toUpperCase()}', '${apiUrl}', ${bodyStr}, { headers: ${headerStr} });`
        : `http.${method.toLowerCase()}('${apiUrl}');`;

    return `
    import http from 'k6/http';
    import { check, sleep } from 'k6';

    export let options = {
      vus: ${Number(vus)},
      duration: '${duration}',
      thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
      },
    };

    export default function () {
      const res = ${requestLine}

      check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 800ms': (r) => r.timings.duration < 800,
      });

      sleep(1);
    };
  `;
  }

  private parseMetrics(raw: any) {
    const m = raw.metrics || {};
    const get = (metric: any, path: string, fallback: number | null = null) =>
      path.split('.').reduce((obj, key) => obj?.[key], metric) ?? fallback;

    const metrics = [
      {
        name: 'http_req_duration_avg',
        desc: 'HTTP Req Duration Avg',
        val: get(m['http_req_duration'], 'avg'),
        unit: 'ms',
        cat: 'Performance',
      },
      {
        name: 'http_req_duration_p90',
        desc: 'HTTP Req Duration P90',
        val: get(m['http_req_duration'], 'p(90)'), 
        unit: 'ms',
        cat: 'Performance',
      },
      {
        name: 'http_req_duration_p95',
        desc: 'HTTP Req Duration P95',
        val: get(m['http_req_duration'], 'p(95)'), 
        unit: 'ms',
        cat: 'Performance',
      },

      {
        name: 'http_reqs',
        desc: 'HTTP Requests',
        val: get(m['http_reqs'], 'count', 0),
        unit: 'count',
        cat: 'Requests',
      },
      {
        name: 'iterations',
        desc: 'Iterations',
        val: get(m['iterations'], 'count', 0),
        unit: 'count',
        cat: 'Requests',
      },

      {
        name: 'vus_max',
        desc: 'Max VUs',
        val: get(m['vus_max'], 'value', 0),
        unit: 'vus',
        cat: 'Performance',
      },

      {
        name: 'error_rate',
        desc: 'HTTP Error Rate',
        val: (get(m['http_req_failed'], 'value', 0) ?? 0) * 100,
        unit: '%',
        cat: 'Errors',
      },

      {
        name: 'checks_pass',
        desc: 'Checks Passed',
        val: get(m['checks'], 'passes', 0),
        unit: 'count',
        cat: 'Checks',
      },
      {
        name: 'checks_fail',
        desc: 'Checks Failed',
        val: get(m['checks'], 'fails', 0),
        unit: 'count',
        cat: 'Checks',
      },

      {
        name: 'data_sent',
        desc: 'Data Sent',
        val: get(m['data_sent'], 'count', 0),
        unit: 'bytes',
        cat: 'Network',
      },
      {
        name: 'data_received',
        desc: 'Data Received',
        val: get(m['data_received'], 'count', 0),
        unit: 'bytes',
        cat: 'Network',
      },
    ];

    return metrics
      .filter((m) => m.val !== null)
      .map((m) => ({
        ...m,
        raw_values: raw.metrics?.[m.name.replace(/_(avg|p\d+)$/, '')] || null,
      }));
  }
}