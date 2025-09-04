import { Controller, Post, Body, Res } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Response } from 'express';
import * as path from 'path';



@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  async generateReport(@Body() reportData: any) {
    const filePath = await this.reportsService.generateScheduledTestPDF(reportData);

    // trả về link để FE gọi download
    return {
      message: 'Report generated successfully',
      downloadUrl: `/reports/download?file=${path.basename(filePath)}`,
    };
  }

  @Post('scheduled')
  async generateScheduled(@Body() data: any) {
    const filePath = await this.reportsService.generateScheduledTestPDF(data);

    return {
      message: 'Scheduled test report generated successfully',
      downloadUrl: `/reports/download?file=${path.basename(filePath)}`,
    };
  }

  // endpoint để FE tải file về
  @Post('download')
  async download(@Body('file') fileName: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'upload', 'reports', fileName);
    return res.download(filePath);
  }
}
