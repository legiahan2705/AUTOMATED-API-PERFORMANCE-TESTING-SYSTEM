import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,         
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/auth/entities/user.entity';
import { TestRun } from 'src/test-run/entities/test-run.entity'; 

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.projects, {
    onDelete: 'CASCADE',
  })
  user: User;

  
  @OneToMany(() => TestRun, (testRun) => testRun.project, {
  cascade: true,
  onDelete: 'CASCADE',
})
testRuns: TestRun[];

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  apiUrl?: string;

  @Column({ nullable: true })
  vus?: string;

  @Column({ nullable: true })
  duration?: string;

  @Column({ nullable: true })
  originalPostmanFileName?: string;

  @Column({ nullable: true })
  originalK6ScriptFileName?: string;

  @Column({ nullable: true })
  postmanFilePath?: string;

  @Column({ nullable: true })
  k6ScriptFilePath?: string;

  @Column({ type: 'text', nullable: true })
  headers?: string;

  @Column({ type: 'text', nullable: true })
  body?: string;


  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable:true }) 
  method: string; 

  
}
