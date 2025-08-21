import { IsEnum, IsInt, IsOptional, IsString, IsEmail } from 'class-validator';

export class CreateScheduledTestDto {
  @IsInt()
  projectId: number;

  @IsEnum(['api', 'perf'])
  category: 'api' | 'perf';

  @IsEnum(['postman', 'quick', 'script'])
  subType: 'postman' | 'quick' | 'script';

  @IsOptional()
  configJson?: any;

  @IsString()
  cronExpression: string;

  @IsEmail()
  emailTo: string;
}
