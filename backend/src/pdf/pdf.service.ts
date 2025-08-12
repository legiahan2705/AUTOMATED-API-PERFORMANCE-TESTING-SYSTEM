// pdf.service.ts
import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfService {
  async generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}

}
