import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsEmail, ValidateIf, IsBoolean } from 'class-validator';

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

 // Nếu subType khác quick thì bắt buộc có inputFilePath
  @ValidateIf(o => o.subType !== 'quick')
  @IsString()
  inputFilePath: string;

   @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true) // convert string → boolean
  isActive?: boolean;
}
