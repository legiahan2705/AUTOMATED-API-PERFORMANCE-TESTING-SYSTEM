import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduledTestDto } from './create-scheduled-test.dto';

export class UpdateScheduledTestDto extends PartialType(CreateScheduledTestDto) {}
