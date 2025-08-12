// Import các decorator từ TypeORM để định nghĩa entity
import { Project } from 'src/project/entities/project.entity';
import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';


// Đánh dấu đây là một bảng (table) có tên là 'users' trong MySQL
@Entity('users')
export class User {
  // Cột 'id' là khóa chính, tự động tăng
  @PrimaryGeneratedColumn()
  id: number;

  // Cột 'name', kiểu string
  @Column()
  name: string;

  // Cột 'email', kiểu string, và phải là duy nhất
  @Column({ unique: true })
  email: string;

  // Cột 'password', kiểu string
  @Column()
  password: string;


  @OneToMany(() => Project, (project) => project.user)
  projects: Project[];


}
