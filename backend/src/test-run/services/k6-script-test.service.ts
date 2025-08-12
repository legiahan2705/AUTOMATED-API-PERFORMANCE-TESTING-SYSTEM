import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TestRun } from '../entities/test-run.entity';
import { PerfScriptResultDetail } from '../entities/perf_script_result_detail.entity';
import { Project } from 'src/project/entities/project.entity';

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
  ) {}

  /**
   * Thực hiện chạy K6 performance test dựa trên script của project
   * - Sao chép file script gốc sang thư mục test_inputs
   * - Thực thi lệnh k6 run với tham số xuất summary
   * - Đọc và phân tích kết quả raw, lưu summary ra file
   * - Lưu test run và chi tiết metrics, checks vào database
   * - Xử lý và lưu file log time series nếu có
   * @param projectId - ID project cần chạy test
   * @returns test_run_id và summary đã phân tích
   */
  async runK6ScriptTest(projectId: number) {
    // Lấy thông tin project, kiểm tra tồn tại file k6 script
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project?.k6ScriptFilePath) {
      throw new NotFoundException('Project không có file K6 script.');
    }

    // Hàm hỗ trợ tạo thư mục nếu chưa tồn tại
    const ensureDir = (dir: string) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    };

    // Tạo các thư mục cần thiết cho lưu trữ file test input, kết quả, summary và time series
    ensureDir('uploads/test_inputs/performance-k6');
    ensureDir('uploads/results/performance-k6');
    ensureDir('uploads/summaries/performance-k6');
    ensureDir('uploads/time_series/performance-k6');

    // Tạo tên file duy nhất dựa trên timestamp hiện tại
    const testRunId = Date.now();
    const inputFileName = `testrun_${testRunId}.js`;
    const inputPath = path.join(
      'uploads/test_inputs/performance-k6',
      inputFileName,
    );

    // Sao chép file k6 script gốc sang thư mục test_inputs
    fs.copyFileSync(project.k6ScriptFilePath, inputPath);

    // Đường dẫn lưu kết quả raw và summary
    const rawResultPath = `uploads/results/performance-k6/testrun_${testRunId}_result.json`;
    const summaryPath = `uploads/summaries/performance-k6/testrun_${testRunId}_summary.json`;

    // Đường dẫn lưu log thời gian (time series) - log JSON lines
    const timeSeriesPath = `uploads/time_series/performance-k6/test_${testRunId}_time_series.json`;

    // Thực thi lệnh k6 run với biến môi trường LOG_PATH truyền vào để script ghi log time series
    try {
      await execAsync(`k6 run ${inputPath} --summary-export=${rawResultPath}`, {
        env: { ...process.env, LOG_PATH: timeSeriesPath },
      });
    } catch (err: any) {
      console.error('Lỗi khi chạy k6:', err);
      throw err;
    }

    // Kiểm tra file kết quả raw tồn tại, đọc dữ liệu
    if (!fs.existsSync(rawResultPath)) {
      throw new Error(`Không tìm thấy file kết quả test tại: ${rawResultPath}`);
    }
    const rawData = JSON.parse(fs.readFileSync(rawResultPath, 'utf-8'));

    // Phân tích dữ liệu raw thành summary có cấu trúc dễ dùng
    const summary = this.analyzeResult(rawData);
    summary.original_file_name =
      project.originalK6ScriptFileName || path.basename(project.k6ScriptFilePath);

    // Ghi summary ra file JSON
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Tạo và lưu bản ghi test run mới vào database
    const testRun = this.testRunRepo.create({
      project_id: projectId,
      category: 'performance',
      sub_type: 'script',
      input_file_path: inputPath,
      raw_result_path: rawResultPath,
      summary_path: summaryPath,
      time_series_path: timeSeriesPath, // Cập nhật thêm trường time_series_path
      config_json: { fileName: inputFileName },
      original_file_name: summary.original_file_name,
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

    // Xử lý file log time series nếu tồn tại
    if (fs.existsSync(timeSeriesPath)) {
      try {
        // Đọc toàn bộ file time series
        const lines = fs
          .readFileSync(timeSeriesPath, 'utf-8')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((l) => {
            try {
              return JSON.parse(l);
            } catch {
              return null; // Bỏ qua dòng không phải JSON hợp lệ
            }
          })
          .filter(
            (obj) =>
              obj &&
              obj.timestamp &&
              obj.duration !== undefined &&
              obj.status !== undefined,
          );

        // Nếu có dữ liệu hợp lệ, ghi lại file sạch
        if (lines.length > 0) {
          fs.writeFileSync(
            timeSeriesPath,
            lines.map((l) => JSON.stringify(l)).join('\n'),
          );
          console.log('Log response time đã được ghi tại:', timeSeriesPath);
        } else {
          console.warn('File time series không có dữ liệu hợp lệ.');
        }
      } catch (err) {
        console.warn(`Lỗi đọc file time series: ${err.message}`);
      }
    } else {
      console.warn(
        'Không tìm thấy log response time. Có thể script chưa được cập nhật đúng.',
      );
    }

    return {
      test_run_id: savedTestRun.id,
      summary,
    };
  }

  /**
   * Phân tích raw result từ k6 thành cấu trúc summary tổng quan
   * @param raw - Dữ liệu raw từ file kết quả
   * @returns summary với tổng metrics, tổng checks, overview metrics và checks
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
