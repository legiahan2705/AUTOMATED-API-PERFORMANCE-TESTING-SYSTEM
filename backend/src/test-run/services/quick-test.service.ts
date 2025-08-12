import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TestRun } from '../entities/test-run.entity';
import { PerfQuickResultDetail } from '../entities/perf_quick_result_detail.entity';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Project } from 'src/project/entities/project.entity';

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
  ) {}

  async runQuickTest(projectId: number) {
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
    const inputPath = `uploads/test_inputs/performance-quick/testrun_${testRunId}.js`;
    const resultPath = `uploads/results/performance-quick/testrun_${testRunId}_result.json`;
    const summaryPath = `uploads/summaries/performance-quick/testrun_${testRunId}_summary.json`;

    // ensure dirs
    if (!fs.existsSync(path.dirname(inputPath))) fs.mkdirSync(path.dirname(inputPath), { recursive: true });
    if (!fs.existsSync(path.dirname(resultPath))) fs.mkdirSync(path.dirname(resultPath), { recursive: true });
    if (!fs.existsSync(path.dirname(summaryPath))) fs.mkdirSync(path.dirname(summaryPath), { recursive: true });

    // 1️. Tạo script & ghi file
    fs.writeFileSync(
      inputPath,
      this.generateK6Script(
        config.apiUrl,
        config.vus,
        config.duration,
        config.method,
        project.headers ? JSON.parse(project.headers) : undefined,
        project.body ? JSON.parse(project.body) : undefined,
      ),
    );

    // 2️. Ghi log test_run
    const testRun = this.testRunRepo.create({
      project_id: project.id,
      category: 'performance',
      sub_type: 'quick',
      input_file_path: inputPath,
      raw_result_path: resultPath,
      summary_path: summaryPath,
      config_json: config,
    });
    const saved = await this.testRunRepo.save(testRun);

    // 3️. Chạy test bằng K6
    const k6Path = 'D:\\AppDownloaded\\k6\\k6.exe'; // giữ như cũ
    try {
      await execAsync(
        `"${k6Path}" run ${inputPath} --summary-export=${resultPath}`,
      );
    } catch (err: any) {
      if (err.code === 99) {
        console.warn(' Threshold bị vượt qua, nhưng test vẫn hợp lệ.');
      } else {
        // nếu k6 trả lỗi không phải threshold, throw để frontend biết
        throw err;
      }
    }

    if (!fs.existsSync(resultPath)) {
      throw new Error(`Không tìm thấy file kết quả test tại: ${resultPath}`);
    }

    // 4. Parse kết quả
    const raw = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
    const metricDetails = this.parseMetrics(raw);

    // 5. Lưu summary file
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(summaryPath, JSON.stringify(metricDetails, null, 2));

    // 6️. Lưu DB chi tiết
    const details = metricDetails.map((m) =>
      this.detailRepo.create({
        testRun: saved, // dùng object relation thay vì test_run_id
        metric_name: m.name,
        description: m.desc,
        category: m.cat,
        value: m.val,
        unit: m.unit,
        raw_values: m.raw_values,
      }),
    );

    await this.detailRepo.save(details);

    return { test_run_id: saved.id, summary: metricDetails };
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
        val: get(m['http_req_duration'], 'percentiles["90"]'),
        unit: 'ms',
        cat: 'Performance',
      },
      {
        name: 'http_req_duration_p95',
        desc: 'HTTP Req Duration P95',
        val: get(m['http_req_duration'], 'percentiles["95"]'),
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
