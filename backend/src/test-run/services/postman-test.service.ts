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

  /**
   * Chạy test Postman sử dụng Newman CLI
   * - Sao chép file Postman collection sang thư mục test_inputs
   * - Chạy Newman với reporter JSON, lưu kết quả raw
   * - Lấy log response time dạng JSON line từ stdout (nếu có)
   * - Lọc và ghi log time series vào file riêng
   * - Phân tích kết quả, lưu summary, lưu chi tiết assertions vào DB
   * - Lưu test run và cập nhật trường time_series_path
   * @param projectId ID project chứa file Postman collection
   * @returns test_run_id và summary kết quả test
   */
  async runPostmanTest(projectId: number) {
    // Lấy project và kiểm tra file Postman collection
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project?.postmanFilePath)
      throw new NotFoundException('Project không có file Postman.');

    // Tạo tên và đường dẫn file input test dựa vào timestamp
    const testRunId = Date.now();
    const inputFileName = `testrun_${testRunId}.json`;
    const inputPath = path.join('uploads/test_inputs/postman', inputFileName);

    // Sao chép file Postman collection gốc vào thư mục test_inputs
    fs.copyFileSync(project.postmanFilePath, inputPath);

    // Đường dẫn lưu file kết quả raw, summary và time series log
    const rawResultPath = `uploads/results/api/testrun_${testRunId}_result.json`;
    const summaryPath = `uploads/summaries/api/testrun_${testRunId}_summary.json`;
    const timeSeriesDir = 'uploads/time_series/postman';
    if (!fs.existsSync(timeSeriesDir)) fs.mkdirSync(timeSeriesDir, { recursive: true });
    const timeSeriesPath = path.join(timeSeriesDir, `test_${testRunId}_time_series.json`);

    // Lệnh chạy Newman với reporter JSON export
    const cmd = `npx newman run ${inputPath} -r json --reporter-json-export ${rawResultPath}`;

    // Thực thi lệnh và lấy stdout để parse log time series
    const { stdout } = await execAsync(cmd);

    // Phân tích stdout, lọc các dòng JSON có timestamp, duration, status (log response time)
    const timeSeriesLines = stdout.split('\n').filter((line) => {
      try {
        const obj = JSON.parse(line);
        return (
          obj.timestamp &&
          obj.duration !== undefined &&
          obj.status !== undefined
        );
      } catch {
        return false;
      }
    });

    // Nếu có log hợp lệ, ghi ra file time series
    if (timeSeriesLines.length > 0) {
      // Parse kỹ lại, chỉ giữ object hợp lệ
      const parsedLines = timeSeriesLines
        .map((line) => {
          try {
            const obj = JSON.parse(line);
            return obj &&
              obj.timestamp &&
              obj.duration !== undefined &&
              obj.status !== undefined
              ? obj
              : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (parsedLines.length > 0) {
        fs.writeFileSync(
          timeSeriesPath,
          parsedLines.map((obj) => JSON.stringify(obj)).join('\n'),
        );
        console.log('Log response time đã được ghi tại:', timeSeriesPath);
      } else {
        console.warn('Không tìm thấy log response time hợp lệ.');
      }
    } else {
      console.warn('Không tìm thấy log response time trong stdout.');
    }

    // Đọc file kết quả raw Newman export
    const rawData = JSON.parse(fs.readFileSync(rawResultPath, 'utf-8'));

    // Phân tích kết quả raw thành summary & chi tiết assertions
    const { summary, details } = this.analyzeResult(rawData);

    // Gán tên file gốc nếu có
    summary.original_file_name =
      project.originalPostmanFileName || path.basename(project.postmanFilePath);

    // Ghi summary ra file JSON
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Tạo bản ghi test run mới, kèm luôn trường time_series_path
    const testRun = this.testRunRepo.create({
      project_id: projectId,
      category: 'api',
      sub_type: 'postman',
      input_file_path: inputPath,
      raw_result_path: rawResultPath,
      summary_path: summaryPath,
      time_series_path: timeSeriesPath, // Cập nhật đường dẫn log thời gian phản hồi
      config_json: { fileName: inputFileName },
      original_file_name: summary.original_file_name,
    });
    const savedTestRun = await this.testRunRepo.save(testRun);

    // Tạo entities chi tiết assertions từ data phân tích
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

  /**
   * Phân tích kết quả raw Newman export thành summary tổng quan và chi tiết assertions
   * @param raw Dữ liệu raw JSON xuất từ Newman
   * @returns object chứa summary và details
   */
  private analyzeResult(raw: any) {
    // Thống kê tổng số requests, assertions, failures
    const totalRequests = raw.run?.stats?.requests?.total || 0;
    const totalAssertions = raw.run?.stats?.assertions?.total || 0;
    const totalFailures = raw.run?.failures?.length || 0;

    // Tính duration test: nếu có thời gian bắt đầu và kết thúc thì tính khoảng đó,
    // còn không thì cộng responseTime từng request
    const durationMs =
      raw.run?.timings?.completed && raw.run?.timings?.started
        ? raw.run.timings.completed - raw.run.timings.started
        : raw.run?.executions?.reduce(
            (sum, e) => sum + (e.response?.responseTime || 0),
            0,
          );

    // Hàm dựng URL đầy đủ từ object URL Newman trả về
    const buildUrl = (urlObj: any) => {
      if (urlObj?.raw) return urlObj.raw;
      const host = urlObj?.host?.join('.') || '';
      const path = urlObj?.path?.join('/') || '';
      return `${host}/${path}`.replace(/\/$/, '');
    };

    // Tổng hợp summary toàn bộ kết quả
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
      original_file_name: '', // sẽ set bên ngoài
    };

    // Chi tiết từng execution assertions, kết quả test
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
