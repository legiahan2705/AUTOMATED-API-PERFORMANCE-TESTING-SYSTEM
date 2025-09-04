import { Module } from '@nestjs/common';
import { EmailService } from './emai.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}