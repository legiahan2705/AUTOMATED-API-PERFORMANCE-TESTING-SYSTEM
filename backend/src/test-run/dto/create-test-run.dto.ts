import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateTestRunDto {
  @IsNumber()
  project_id: number;

  @IsEnum(['api', 'performance'])
  category: 'api' | 'performance';

  @IsEnum(['postman', 'quick', 'script'])
  sub_type: 'postman' | 'quick' | 'script';

  @IsOptional()
  @IsString()
  input_file_path?: string;

  @IsOptional()
  config_json?: any;

  @IsOptional()
  @IsString()
  raw_result_path?: string;

  @IsOptional()
  @IsString()
  summary_path?: string;

  @IsOptional()
  @IsString()
  gpt_analysis?: string;
}
