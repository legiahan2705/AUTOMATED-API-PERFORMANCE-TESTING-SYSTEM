import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  apiUrl?: string;

  @IsOptional()
  @IsString()
  vus?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  postmanFilePath?: string;

  @IsOptional()
  @IsString()
  k6ScriptFilePath?: string;

  originalPostmanFileName?: string;
  originalK6ScriptFileName?: string;

  @IsOptional()
  @IsString()
  method?: string;

   @IsOptional()
  @IsString()
  headers?: string;

  @IsOptional()
  @IsString()
  body?: string;
}
