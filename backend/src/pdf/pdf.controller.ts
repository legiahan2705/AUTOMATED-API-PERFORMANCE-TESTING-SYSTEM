// pdf.controller.ts
import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('generate')
  async generatePdf(@Body('html') html: string, @Res() res: Response) {
    const pdfBuffer = await this.pdfService.generatePdfFromHtml(html);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"',
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
