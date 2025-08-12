import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TestRun } from './test-run.entity';

@Entity('perf_script_result_detail')
export class PerfScriptResultDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  test_run_id: number;

  @ManyToOne(() => TestRun)
  @JoinColumn({ name: 'test_run_id' })
  testRun: TestRun;

  @Column()
  type: 'metric' | 'check'; // loại dữ liệu

  @Column()
  name: string; // metric_name hoặc check_name

  // Dùng chung cho metric hoặc check
  @Column('float', { nullable: true })
  avg: number;

  @Column('float', { nullable: true })
  min: number;

  @Column('float', { nullable: true })
  max: number;

  @Column('float', { nullable: true })
  p90: number;

  @Column('float', { nullable: true })
  p95: number;

  @Column('float', { nullable: true })
  rate: number;

  @Column('int', { nullable: true })
  value: number;

  @Column('int', { nullable: true })
  passes: number;

  @Column('int', { nullable: true })
  fails: number;

  @CreateDateColumn()
created_at: Date;
    
    @Column('json', { nullable: true })
    raw_values: Record<string, any>;

}

