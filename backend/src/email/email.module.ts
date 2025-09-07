import { Module } from '@nestjs/common';
import { EmailService } from './emai.service';
import { GcsService } from 'src/project/gcs.service';

@Module({
  providers: [EmailService, GcsService],
  exports: [EmailService],
})
export class EmailModule {}