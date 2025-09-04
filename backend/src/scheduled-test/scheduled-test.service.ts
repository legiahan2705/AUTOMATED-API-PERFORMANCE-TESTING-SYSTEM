import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import axios from 'axios';

import * as fs from 'fs';
import * as path from 'path';

import { ScheduledTest } from './entities/scheduled-test.entity';
import { CreateScheduledTestDto } from './dto/create-scheduled-test.dto';
import { UpdateScheduledTestDto } from './dto/update-scheduled-test.dto';
import { ReportsService } from '../reports/reports.service';
import { TestRunService } from '../test-run/test-run.service';
import { EmailService } from 'src/email/emai.service';

// Định nghĩa kiểu dữ liệu trả về từ API BE test-run
interface TestRunResponse {
  test_run_id: number;
  summary: any;
}

@Injectable()
export class ScheduledTestsService {
  private readonly logger = new Logger(ScheduledTestsService.name);

  constructor(
    @InjectRepository(ScheduledTest)
    private readonly scheduledTestsRepo: Repository<ScheduledTest>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly reportsService: ReportsService,
    private readonly testRunService: TestRunService,
    private readonly emailService: EmailService,
  ) {}

  async handleFileUpload(file: Express.Multer.File, subType: string): Promise<string> {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'schedule', subType);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}_${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    return `uploads/schedule/${subType}/${fileName}`;
  }

  async create(data: Partial<ScheduledTest>, file?: Express.Multer.File) {
    if (data.subType !== 'quick' && !file) {
      throw new Error(`File input is required for subType=${data.subType}`);
    }

    if (file) {
      const filePath = await this.handleFileUpload(file, data.subType!);
      data.inputFilePath = filePath;
    }

    if ('isActive' in data) {
      data.isActive = Boolean(data.isActive);
    }

    if (data.category === 'perf') {
      data.category = 'perf';
    } else if (data.category === 'api') {
      data.category = 'api';
    }

    const schedule = this.scheduledTestsRepo.create(data);
    const saved = await this.scheduledTestsRepo.save(schedule);

    this.addCronJob(saved);
    return saved;
  }

  async update(id: number, dto: UpdateScheduledTestDto, file?: Express.Multer.File) {
    const schedule = await this.findOne(id);
    if (!schedule) throw new Error(`Schedule #${id} not found`);

    if (file) {
      const filePath = await this.handleFileUpload(file, dto.subType ?? schedule.subType);
      dto.inputFilePath = filePath;
    }

    await this.scheduledTestsRepo.update(id, dto);
    const updated = await this.findOne(id);

    if (updated) {
      this.removeCronJob(id);
      this.addCronJob(updated);
    }

    return updated;
  }

  findAll() {
    return this.scheduledTestsRepo.find({ relations: ['project', 'user'] });
  }

  async findOne(id: number): Promise<ScheduledTest | undefined> {
    return (
      (await this.scheduledTestsRepo.findOne({
        where: { id },
        relations: ['project', 'user'],
      })) ?? undefined
    );
  }

  async remove(id: number) {
    await this.scheduledTestsRepo.delete(id);
    this.removeCronJob(id);
    return { deleted: true };
  }

  private addCronJob(schedule: ScheduledTest) {
    if (!schedule.isActive) return;

    const job = new CronJob(schedule.cronExpression, async () => {
      this.logger.log(
        `Bắt đầu chạy test cho lịch #${schedule.id} - Project ${schedule.projectId}`,
      );

      try {
        let url = '';
        const baseUrl = process.env.TEST_RUN_API_BASE || 'http://localhost:3000';
        if (schedule.subType === 'postman') {
          url = `${baseUrl}/test-run/postman/${schedule.projectId}?scheduleId=${schedule.id}`;
        } else if (schedule.subType === 'quick') {
          url = `${baseUrl}/test-run/performance/quick/${schedule.projectId}?scheduleId=${schedule.id}`;
        } else if (schedule.subType === 'script') {
          url = `${baseUrl}/test-run/performance/script/${schedule.projectId}?scheduleId=${schedule.id}`;
        }

        const res = await axios.post<TestRunResponse>(url);
        const testRunId = res.data.test_run_id;

        this.logger.log(
          `Test run thành công cho schedule #${schedule.id} - test_run_id=${testRunId}`,
        );

        // Cập nhật thời gian chạy gần nhất
        await this.scheduledTestsRepo.update(schedule.id, {
          lastRunAt: new Date(),
        });

        // **DELAY REPORT GENERATION để đảm bảo data đã được lưu**
        this.scheduleReportGeneration(testRunId, schedule);

      } catch (err: any) {
        this.logger.error(
          `Lỗi khi chạy test cho schedule #${schedule.id}: ${err.message}`,
        );

        if (schedule.emailTo) {
          await this.emailService.sendScheduledTestError(
            schedule.emailTo,
            schedule,
            err.message,
          );
          this.logger.log(`Error notification email sent to ${schedule.emailTo}`);
        }
      }
    });

    this.schedulerRegistry.addCronJob(`schedule-${schedule.id}`, job as any);
    job.start();
  }

  /**
   * Schedule report generation với delay để đảm bảo data đã được lưu vào DB
   */
  private scheduleReportGeneration(testRunId: number, schedule: ScheduledTest) {
    // Delay 10 giây trước khi bắt đầu tạo report
    const delayMs = 10000; // 10 seconds
    
    setTimeout(async () => {
      await this.generateReportWithRetry(testRunId, schedule);
    }, delayMs);
  }

  /**
   * Tạo PDF report với retry mechanism
   */
  private async generateReportWithRetry(
    testRunId: number, 
    schedule: ScheduledTest, 
    maxRetries: number = 3
  ) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      attempt++;
      
      try {
        this.logger.log(
          `Bắt đầu tạo PDF report cho test run #${testRunId} (attempt ${attempt}/${maxRetries})`
        );

        // Kiểm tra xem test run đã có đầy đủ data chưa
        const isDataReady = await this.verifyTestRunDataReady(testRunId);
        
        if (!isDataReady && attempt < maxRetries) {
          this.logger.warn(
            `Test run #${testRunId} data chưa sẵn sàng, retry sau 15s (attempt ${attempt})`
          );
          await this.delay(15000); // Wait 15s before retry
          continue;
        }

        // Lấy chi tiết test run từ database
        const testDetail = await this.testRunService.getTestRunDetails(testRunId);

        if (!testDetail || !testDetail.testRun) {
          throw new Error(`Không tìm thấy test run detail cho ID: ${testRunId}`);
        }

        // Tạo PDF report với data structure phù hợp
        const reportPath = await this.reportsService.generateScheduledTestPDF(testDetail);

        this.logger.log(`PDF report đã được tạo thành công: ${reportPath}`);

        // Gửi email với PDF report đính kèm
        if (schedule.emailTo) {
          await this.emailService.sendScheduledTestReport(
            schedule.emailTo,
            reportPath,
            schedule,
            testDetail,
          );
          this.logger.log(`Email sent to ${schedule.emailTo} with PDF report`);
        }

        // Thành công, thoát khỏi retry loop
        return;

      } catch (error) {
        this.logger.error(
          `Lỗi khi tạo PDF report cho test run #${testRunId} (attempt ${attempt}): ${error.message}`,
        );

        if (attempt === maxRetries) {
          this.logger.error(
            `Đã thử ${maxRetries} lần nhưng vẫn không thể tạo PDF report cho test run #${testRunId}`
          );

          // Gửi email thông báo lỗi report generation nếu method tồn tại
          if (schedule.emailTo && 'sendReportGenerationError' in this.emailService) {
            try {
              await (this.emailService as any).sendReportGenerationError(
                schedule.emailTo,
                schedule,
                error.message,
              );
            } catch (emailError) {
              this.logger.error(`Failed to send report generation error email: ${emailError.message}`);
            }
          } else {
            // Fallback: sử dụng sendScheduledTestError nếu sendReportGenerationError không tồn tại
            try {
              await this.emailService.sendScheduledTestError(
                schedule.emailTo,
                schedule,
                `Report generation failed after ${maxRetries} attempts: ${error.message}`,
              );
            } catch (emailError) {
              this.logger.error(`Failed to send error notification email: ${emailError.message}`);
            }
          }
        } else {
          // Wait before next retry
          await this.delay(5000); // 5s delay between retries
        }
      }
    }
  }

  /**
   * Kiểm tra xem test run data đã sẵn sàng chưa
   */
  private async verifyTestRunDataReady(testRunId: number): Promise<boolean> {
    try {
      const testDetail = await this.testRunService.getTestRunDetails(testRunId);
      
      if (!testDetail || !testDetail.testRun) {
        return false;
      }

      const testRun = testDetail.testRun;
      
      // Kiểm tra các file paths có tồn tại không
      const requiredChecks: boolean[] = [];
      
      if (testRun.summary_path) {
        const summaryExists = fs.existsSync(path.resolve(process.cwd(), testRun.summary_path));
        requiredChecks.push(summaryExists);
      }
      
      if (testRun.raw_result_path) {
        const rawResultExists = fs.existsSync(path.resolve(process.cwd(), testRun.raw_result_path));
        requiredChecks.push(rawResultExists);
      }

      // Kiểm tra có summary data không
      const hasSummaryData = testDetail.summary && Object.keys(testDetail.summary).length > 0;
      requiredChecks.push(hasSummaryData);

      // Kiểm tra details data dựa trên sub_type
      let hasDetailsData = true;
      if (testRun.sub_type === 'postman' || testRun.sub_type === 'quick' || testRun.sub_type === 'script') {
        hasDetailsData = testDetail.details && testDetail.details.length > 0;
        requiredChecks.push(hasDetailsData);
      }

      const allReady = requiredChecks.every(check => check === true);
      
      this.logger.debug(
        `Test run #${testRunId} data ready check: ${allReady} (${requiredChecks.length} checks passed)`
      );

      return allReady;

    } catch (error) {
      this.logger.warn(
        `Error checking test run #${testRunId} data readiness: ${error.message}`
      );
      return false;
    }
  }

  /**
   * Utility function để delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private removeCronJob(id: number) {
    const jobName = `schedule-${id}`;
    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
    }
  }

  async loadAllCronJobs() {
    const schedules = await this.findAll();
    schedules.forEach((s) => this.addCronJob(s));
  }
}