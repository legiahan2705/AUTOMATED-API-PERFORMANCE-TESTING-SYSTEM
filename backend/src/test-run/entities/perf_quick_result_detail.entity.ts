import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TestRun } from './test-run.entity';

@Entity('perf_quick_result_details')
export class PerfQuickResultDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TestRun, (testRun) => testRun.perfQuickResultDetails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'test_run_id' })
  testRun: TestRun;

  @Column()
  test_run_id: number;

  @Column()
  metric_name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  category?: string;

  @Column('float', { nullable: true })
  value: number | null;

  @Column({ nullable: true })
  unit?: string;

  @Column({ type: 'json', nullable: true })
  raw_values?: Record<string, any>;
}
