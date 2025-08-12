import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
  OneToMany
} from 'typeorm';
import { Project } from 'src/project/entities/project.entity'; 
import { PerfQuickResultDetail } from './perf_quick_result_detail.entity';

@Entity('test_runs')
export class TestRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  project_id: number;

  @ManyToOne(() => Project, (project) => project.testRuns, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project; // <-- Đặt JoinColumn ngay sau ManyToOne

  @OneToMany(() => PerfQuickResultDetail, (detail) => detail.testRun, {
    cascade: true,
  })
  perfQuickResultDetails: PerfQuickResultDetail[];

  @Column({ type: 'enum', enum: ['api', 'performance'] })
  category: 'api' | 'performance';

  @Column({ type: 'enum', enum: ['postman', 'quick', 'script'] })
  sub_type: 'postman' | 'quick' | 'script';

  @Column({ nullable: true })
  input_file_path: string;

  @Column({ type: 'json', nullable: true })
  config_json: any;

  @Column({ nullable: true })
  raw_result_path: string;

  @Column({ nullable: true })
  summary_path: string;

  @Column({ type: 'text', nullable: true })
  gpt_analysis: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ nullable: true })
  original_file_name: string;

  @Column({ nullable: true })
  time_series_path: string;
}

