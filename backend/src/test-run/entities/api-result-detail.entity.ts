import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { TestRun } from './test-run.entity';

@Entity('api_result_details')
export class ApiResultDetail {
  @PrimaryGeneratedColumn()
  id: number; 

  @Column()
  test_run_id: number;

  @ManyToOne(() => TestRun)
  @JoinColumn({ name: 'test_run_id' })
  testRun: TestRun;

  @Column()
  method: string;

  @Column('text')
  endpoint: string;

  @Column()
  status_code: number;

  @Column()
  response_time: number;

  @Column()
  is_passed: boolean;

  @Column('text', { nullable: true })
  error_message: string;

  @Column('json', { nullable: true })
  assertion_results: any;

  @Column('json', { nullable: true })
  raw_values: Record<string, any>; //  Lưu execution đầy đủ

  @CreateDateColumn()
  created_at: Date;
}
