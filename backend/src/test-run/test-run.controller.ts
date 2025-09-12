import {
  Controller,
  Get,
  Query,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { TestRunService } from './test-run.service';
import { Response } from 'express';
import { GcsService } from 'src/project/gcs.service';

@Controller('test-runs')
export class TestRunController {
  constructor(
    private readonly testRunService: TestRunService,
    private readonly gcsService: GcsService,
  ) {}

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

  // Tải file raw result từ GCS
  @Get(':id/raw-result/download')
  async downloadRawResult(@Param('id') id: string, @Res() res: Response) {
    const filePath = await this.testRunService.getRawResultPath(+id);
    if (!filePath) {
      throw new NotFoundException('Không tìm thấy file raw result.');
    }

    try {
      const fileBuffer = await this.gcsService.downloadFile(filePath);
      const fileName = filePath.split('/').pop() || 'raw_result.json';

      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      });

      return res.send(fileBuffer);
    } catch (error) {
      console.error(`Error downloading raw result ${id}:`, error);
      throw new NotFoundException('Lỗi khi tải file raw result.');
    }
  }

  // Lấy nội dung raw result dạng text để FE xem
  @Get(':id/raw-result/content')
  async getRawResultContent(@Param('id') id: number) {
    const filePath = await this.testRunService.getRawResultPath(id);
    if (!filePath)
      throw new NotFoundException('Không tìm thấy file raw result.');

    try {
      return await this.gcsService.readFile(filePath);
    } catch (err) {
      console.error(`[ERROR] Đọc file raw result id=${id} thất bại`, err);
      throw new NotFoundException('Lỗi khi đọc file raw result.');
    }
  }

  // Tải file summary từ GCS
  @Get(':id/summary/download')
  async downloadSummary(@Param('id') id: number, @Res() res: Response) {
    const filePath = await this.testRunService.getSummaryPath(id);
    if (!filePath) throw new NotFoundException('Không tìm thấy file summary.');

    try {
      const fileBuffer = await this.gcsService.downloadFile(filePath);
      const fileName = filePath.split('/').pop() || 'summary.json';

      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      });

      return res.send(fileBuffer);
    } catch (error) {
      console.error(`Lỗi khi tải summary của test run ${id}:`, error);
      throw new NotFoundException('Lỗi khi tải file summary');
    }
  }

  // Tải file input từ GCS (Postman collection / K6 script)
  @Get(':id/input/download')
  async downloadInputFile(@Param('id') id: number, @Res() res: Response) {
    const filePath = await this.testRunService.getInputFilePath(id);
    if (!filePath) throw new NotFoundException('Không tìm thấy file input.');

    try {
      const fileBuffer = await this.gcsService.downloadFile(filePath);
      const fileName = filePath.split('/').pop() || 'input_file';

      // Determine content type based on file extension
      const contentType = fileName.endsWith('.js')
        ? 'application/javascript'
        : 'application/json';

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      });

      return res.send(fileBuffer);
    } catch (error) {
      console.error(`Lỗi khi tải input file của test run ${id}:`, error);
      throw new NotFoundException('Lỗi khi tải file input');
    }
  }

  @Get(':id/delete')
  async deleteTestRun(@Param('id') id: string) {
    return this.testRunService.deleteTestRun(+id);
  }

  // Lấy dữ liệu time series để vẽ biểu đồ từ GCS
  @Get(':id/time-series')
  async getTimeSeriesData(@Param('id') id: number, @Res() res: Response) {
    try {
      const filePath = await this.testRunService.getTimeSeriesPath(id);
      if (!filePath) {
        return res.status(200).json([]);
      }

      const fileExists = await this.gcsService.fileExists(filePath);
      if (!fileExists) {
        return res.status(200).json([]);
      }

      const raw = await this.gcsService.readFile(filePath);
      if (!raw.trim()) return res.status(200).json([]);

      // Kiểm tra xem file là JSON array hay JSON lines
      if (raw.trim().startsWith('[')) {
        // JSON array format (Postman)
        try {
          const jsonArray = JSON.parse(raw);
          return res.json(Array.isArray(jsonArray) ? jsonArray : [jsonArray]);
        } catch (err) {
          console.error(
            `Invalid JSON array in time-series file ${filePath}:`,
            err,
          );
          return res.status(200).json([]);
        }
      } else {
        // JSON lines format (K6)
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
          .filter((line) => line !== null);

        return res.json(jsonLines);
      }
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
