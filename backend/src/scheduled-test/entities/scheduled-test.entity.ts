import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../project/entities/project.entity';
import { User } from 'src/auth/entities/user.entity';
import { TestRun } from 'src/test-run/entities/test-run.entity';

@Entity('scheduled_tests')
export class ScheduledTest {
  @PrimaryGeneratedColumn()
  id: number;

  // Quan hệ tới User (chủ sở hữu)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  // Quan hệ tới Test Run
  @OneToMany(() => TestRun, (testRun) => testRun.scheduledTest)
  testRuns: TestRun[];

  // Quan hệ tới Project
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: number;

  // Loại test: API hoặc Performance
  @Column({ type: 'enum', enum: ['api', 'perf'] })
  category: 'api' | 'perf';

  // Kiểu test con: postman / quick / script
  @Column({ type: 'enum', enum: ['postman', 'quick', 'script'] })
  subType: 'postman' | 'quick' | 'script';

  // Cấu hình test (JSON) lưu lúc tạo lịch
  @Column({ type: 'json', nullable: true })
  configJson: any;

  // Biểu thức cron
  @Column()
  cronExpression: string;

  // Email nhận báo cáo
  @Column()
  emailTo: string;

  // Lần chạy gần nhất
  @Column({ type: 'datetime', nullable: true })
  lastRunAt: Date;

  // Trạng thái kích hoạt
  @Column({ type: 'tinyint', default: 1 })
  isActive: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
