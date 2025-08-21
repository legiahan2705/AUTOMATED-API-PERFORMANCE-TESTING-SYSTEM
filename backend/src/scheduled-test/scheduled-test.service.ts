import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import axios from 'axios';

import { ScheduledTest } from './entities/scheduled-test.entity';
import { CreateScheduledTestDto } from './dto/create-scheduled-test.dto';
import { UpdateScheduledTestDto } from './dto/update-scheduled-test.dto';

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
  ) {}

  // Tạo mới một lịch test
  async create(data: Partial<ScheduledTest>) {
  const schedule = this.scheduledTestsRepo.create(data);
  const saved = await this.scheduledTestsRepo.save(schedule);

  this.addCronJob(saved);
  return saved;
}


  // Lấy tất cả các lịch test
  findAll() {
    return this.scheduledTestsRepo.find({ relations: ['project', 'user'] });
  }

  // Lấy một lịch test cụ thể
  async findOne(id: number): Promise<ScheduledTest | undefined> {
    return (
      (await this.scheduledTestsRepo.findOne({
        where: { id },
        relations: ['project', 'user'],
      })) ?? undefined
    );
  }

  // Cập nhật một lịch test
  async update(id: number, dto: UpdateScheduledTestDto) {
    await this.scheduledTestsRepo.update(id, dto);
    const updated = await this.findOne(id);
    if (!updated) return undefined;

    // Xóa cron job cũ và đăng ký lại với cấu hình mới
    this.removeCronJob(id);
    this.addCronJob(updated);

    return updated;
  }

  // Xóa một lịch test
  async remove(id: number) {
    await this.scheduledTestsRepo.delete(id);
    this.removeCronJob(id);
    return { deleted: true };
  }

  // Hàm thêm cron job cho một lịch test
  private addCronJob(schedule: ScheduledTest) {
    if (!schedule.isActive) return; // Nếu lịch bị tắt thì bỏ qua

    // Tạo một cron job dựa trên cronExpression đã lưu
    const job = new CronJob(schedule.cronExpression, async () => {
      this.logger.log(
        `Bắt đầu chạy test cho lịch #${schedule.id} - Project ${schedule.projectId}`,
      );

      try {
        // Xác định URL API của BE test-run dựa trên loại test
        let url = '';
        const baseUrl = process.env.TEST_RUN_API_BASE || 'http://localhost:3000';
        if (schedule.subType === 'postman') {
          url = `${baseUrl}/test-run/postman/${schedule.projectId}`;
        } else if (schedule.subType === 'quick') {
          url = `${baseUrl}/test-run/performance/quick/${schedule.projectId}`;
        } else if (schedule.subType === 'script') {
          url = `${baseUrl}/test-run/performance/k6/${schedule.projectId}`;
        }

        // Gọi API POST sang BE test-run với kiểu dữ liệu trả về đã khai báo
        const res = await axios.post<TestRunResponse>(url);

        // Log kết quả test-run trả về
        this.logger.log(
          `Test run thành công cho schedule #${schedule.id} - test_run_id=${res.data.test_run_id}`,
        );

        // Cập nhật thời gian chạy gần nhất
        await this.scheduledTestsRepo.update(schedule.id, {
          lastRunAt: new Date(),
        });
      } catch (err: any) {
        // Log lỗi nếu việc gọi test-run thất bại
        this.logger.error(
          `Lỗi khi chạy test cho schedule #${schedule.id}: ${err.message}`,
        );
      }
    });

    // Đăng ký cron job vào schedulerRegistry để quản lý
    this.schedulerRegistry.addCronJob(`schedule-${schedule.id}`, job as any);
    job.start();
  }

  // Hàm xóa một cron job theo ID schedule
  private removeCronJob(id: number) {
    const jobName = `schedule-${id}`;
    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
    }
  }

  // Load tất cả các cron jobs từ DB khi service khởi động
  async loadAllCronJobs() {
    const schedules = await this.findAll();
    schedules.forEach((s) => this.addCronJob(s));
  }
}