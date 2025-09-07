import { Controller, Post, Body, Res, Get, Query, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { GcsService } from 'src/project/gcs.service';
import { Response } from 'express';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly gcsService: GcsService,
  ) {}

  @Post('generate')
  async generateReport(@Body() reportData: any) {
    const gcsPath = await this.reportsService.generateScheduledTestPDF(reportData);
    
    // Extract filename from GCS path (gs://bucket/reports/filename.pdf)
    const fileName = gcsPath.split('/').pop();

    return {
      message: 'Report generated successfully',
      gcsPath: gcsPath,
      downloadUrl: `/reports/download?file=${fileName}`,
    };
  }

  @Post('scheduled')
  async generateScheduled(@Body() data: any) {
    const gcsPath = await this.reportsService.generateScheduledTestPDF(data);
    
    // Extract filename from GCS path
    const fileName = gcsPath.split('/').pop();

    return {
      message: 'Scheduled test report generated successfully',
      gcsPath: gcsPath,
      downloadUrl: `/reports/download?file=${fileName}`,
    };
  }

  // Method 1: Stream download from GCS
  @Get('download')
  async downloadFromGcs(@Query('file') fileName: string, @Res() res: Response) {
    if (!fileName) {
      throw new BadRequestException('File name is required');
    }

    try {
      // Construct GCS path
      const gcsPath = `gs://${process.env.GCS_BUCKET_NAME}/reports/${fileName}`;
      
      // Check if file exists
      const fileExists = await this.gcsService.fileExists(gcsPath);
      if (!fileExists) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Download file buffer from GCS
      const fileBuffer = await this.gcsService.downloadFile(gcsPath);
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      
      // Send file buffer
      return res.send(fileBuffer);

    } catch (error) {
      console.error('Error downloading file:', error);
      return res.status(500).json({ error: 'Failed to download file' });
    }
  }

  // Method 2: Alternative - Return signed URL for direct download (more efficient for large files)
  @Get('download-url')
  async getSignedDownloadUrl(@Query('file') fileName: string) {
    if (!fileName) {
      throw new BadRequestException('File name is required');
    }

    try {
      const gcsPath = `gs://${process.env.GCS_BUCKET_NAME}/reports/${fileName}`;
      
      const fileExists = await this.gcsService.fileExists(gcsPath);
      if (!fileExists) {
        throw new BadRequestException('File not found');
      }

      // Generate signed URL for direct download (valid for 1 hour)
      const signedUrl = await this.gcsService.getSignedUrl(gcsPath, 'read', 3600);
      
      return {
        message: 'Signed URL generated successfully',
        downloadUrl: signedUrl,
        expiresIn: '1 hour'
      };

    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new BadRequestException('Failed to generate download URL');
    }
  }

  // Method 3: List available reports
  @Get('list')
  async listReports() {
    try {
      const files = await this.gcsService.listFiles('reports/');
      
      const reports = files.map(file => ({
        name: file.name.split('/').pop(),
        fullPath: `gs://${process.env.GCS_BUCKET_NAME}/${file.name}`,
        size: file.metadata.size,
        created: file.metadata.timeCreated,
        updated: file.metadata.updated,
      }));

      return {
        message: 'Reports listed successfully',
        reports: reports
      };

    } catch (error) {
      console.error('Error listing reports:', error);
      throw new BadRequestException('Failed to list reports');
    }
  }
}