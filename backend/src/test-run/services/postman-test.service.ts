import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TestRun } from '../entities/test-run.entity';
import { ApiResultDetail } from '../entities/api-result-detail.entity';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Project } from 'src/project/entities/project.entity';

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
  ) {}

  async runPostmanTest(projectId: number , scheduled_test_id?: number) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project?.postmanFilePath)
      throw new NotFoundException('Project không có file Postman.');

    const testRunId = Date.now();
    const inputFileName = `testrun_${testRunId}.json`;
    const inputPath = path.join('uploads/test_inputs/postman', inputFileName);

    fs.copyFileSync(project.postmanFilePath, inputPath);

    const rawResultPath = `uploads/results/api/testrun_${testRunId}_result.json`;
    const summaryPath = `uploads/summaries/api/testrun_${testRunId}_summary.json`;
    const timeSeriesDir = 'uploads/time_series/postman';
    if (!fs.existsSync(timeSeriesDir)) fs.mkdirSync(timeSeriesDir, { recursive: true });
    const timeSeriesPath = path.join(timeSeriesDir, `test_${testRunId}_time_series.json`);

    const cmd = `npx newman run ${inputPath} -r json --reporter-json-export ${rawResultPath}`;
    await execAsync(cmd);

    // 📊 Lấy time series từ raw Newman
    const rawData = JSON.parse(fs.readFileSync(rawResultPath, 'utf-8'));
    const timeSeries = (rawData.run?.executions || []).map(e => ({
      timestamp: new Date().toISOString(),
      duration: e.response?.responseTime || 0,
      status: e.response?.code || null,
      name: e.item?.name || '',
      url: e.request?.url?.raw || '',
    }));
    fs.writeFileSync(timeSeriesPath, JSON.stringify(timeSeries, null, 2));

    console.log('Time series đã được ghi tại:', timeSeriesPath);

    const { summary, details } = this.analyzeResult(rawData);
    summary.original_file_name =
      project.originalPostmanFileName || path.basename(project.postmanFilePath);

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    const testRun = this.testRunRepo.create({
      project_id: projectId,
      scheduled_test_id: scheduled_test_id || null,
      category: 'api',
      sub_type: 'postman',
      input_file_path: inputPath,
      raw_result_path: rawResultPath,
      summary_path: summaryPath,
      time_series_path: timeSeriesPath,
      config_json: { fileName: inputFileName },
      original_file_name: summary.original_file_name,
    });
    const savedTestRun = await this.testRunRepo.save(testRun);

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
    };
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

    const summary = {
      collection_name: raw.collection?.info?.name || 'Unnamed Collection',
      total_requests: totalRequests,
      total_assertions: totalAssertions,
      passes: totalAssertions - totalFailures,
      failures: totalFailures,
      duration_ms: durationMs,
      results: (raw.run?.executions || []).map((e: any) => ({
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

    const details = (raw.run?.executions || []).map((exec: any) => ({
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
