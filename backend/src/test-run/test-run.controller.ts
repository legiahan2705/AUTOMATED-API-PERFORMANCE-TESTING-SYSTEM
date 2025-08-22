import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { TestRunService } from './test-run.service';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';

@Controller('test-runs')
export class TestRunController {
  constructor(private readonly testRunService: TestRunService) {}

  @Get('history')
  async getTestHistory(
    @Query('projectId') projectId: number,
    @Query('category') category?: 'api' | 'performance',
    @Query('sub_type') subType?: 'postman' | 'quick' | 'script',
    @Query('sort') sort: 'asc' | 'desc' = 'desc',
  ) {
    return this.testRunService.getHistory(projectId, category, subType, sort);
  }

  @Get(':id/detail')
  async getTestRunDetails(@Param('id') id: number) {
    return this.testRunService.getTestRunDetails(id);
  }

  @Get('compare')
  async compareTests(@Query('idA') idA: number, @Query('idB') idB: number) {
    return this.testRunService.compareTests(idA, idB);
  }

  // Tải file raw result
  @Get(':id/raw-result/download')
  async downloadRawResult(@Param('id') id: string, @Res() res: Response) {
    const filePath = await this.testRunService.getRawResultPath(+id);
    if (!filePath) {
      throw new NotFoundException('Không tìm thấy file raw result.');
    }
    return res.download(filePath);
  }

  // Lấy nội dung raw result dạng text để FE xem
  @Get(':id/raw-result/content')
  async getRawResultContent(@Param('id') id: number) {
    const filePath = await this.testRunService.getRawResultPath(id);
    if (!filePath)
      throw new NotFoundException('Không tìm thấy file raw result.');

    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.error(`[ERROR] Đọc file raw result id=${id} thất bại`, err);
      throw new NotFoundException('Lỗi khi đọc file raw result.');
    }
  }

  // Tải file summary
  @Get(':id/summary/download')
  async downloadSummary(@Param('id') id: number, @Res() res: Response) {
    const filePath = await this.testRunService.getSummaryPath(id);
    if (!filePath) throw new NotFoundException('Không tìm thấy file summary.');

    res.download(filePath, (err) => {
      if (err) {
        console.error(`Lỗi khi tải summary của test run ${id}:`, err);
        if (!res.headersSent) {
          res.status(500).send('Lỗi khi tải file summary');
        }
      }
    });
  }

  // Tải file input (Postman collection / K6 script)
  @Get(':id/input/download')
  async downloadInputFile(@Param('id') id: number, @Res() res: Response) {
    const filePath = await this.testRunService.getInputFilePath(id);
    if (!filePath) throw new NotFoundException('Không tìm thấy file input.');

    res.download(filePath, (err) => {
      if (err) {
        console.error(`Lỗi khi tải input file của test run ${id}:`, err);
        if (!res.headersSent) {
          res.status(500).send('Lỗi khi tải file input');
        }
      }
    });
  }

  @Get(':id/delete')
  async deleteTestRun(@Param('id') id: string) {
    return this.testRunService.deleteTestRun(+id);
  }

  // Lấy dữ liệu time series để vẽ biểu đồ
  @Get(':id/time-series')
  async getTimeSeriesData(@Param('id') id: number, @Res() res: Response) {
    try {
      const filePath = await this.testRunService.getTimeSeriesPath(id);
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(200).json([]);
      }

      const raw = fs.readFileSync(filePath, 'utf-8').trim();
      if (!raw) return res.status(200).json([]);

      const jsonLines = raw
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (err) {
            console.error(
              `Invalid JSON line in time-series file ${filePath}:`,
              line,
            );
            return null;
          }
        })
        .filter((line) => line !== null); // bỏ line lỗi

      return res.json(jsonLines);
    } catch (err) {
      console.error(`Error đọc file time-series của test run ${id}:`, err);
      return res.status(200).json([]);
    }
  }

// Lấy danh sách test run theo lịch
  @Get('schedule/:id')
  async getTestRunsBySchedule(@Param('id') id: number) {
    return this.testRunService.getTestRunsBySchedule(id);
  }
}
