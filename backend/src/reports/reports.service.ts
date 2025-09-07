import { Injectable } from '@nestjs/common';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as path from 'path';
import { ChartGeneratorService } from './chartgenerator.service';
import { GcsService } from 'src/project/gcs.service'; // Add this import

@Injectable()
export class ReportsService {
  constructor(
    private chartGenerator: ChartGeneratorService,
    private gcsService: GcsService, // Inject GcsService
  ) {}

  /**
   * Generate scheduled test PDF report with charts and upload to GCS
   */
  async generateScheduledTestPDF(detail: any): Promise<string> {
    try {
      const doc = new jsPDF('portrait', 'pt', 'a4');
      
      // Enhanced data extraction with better fallbacks
      let testRun, summary, subType, rawSummary, detailsData;
      
      if (detail.testRun) {
        testRun = detail.testRun;
        summary = detail.summary || {};
        rawSummary = detail.rawSummary || {};
        detailsData = detail.details || [];
        subType = testRun.sub_type;
      } else if (detail.id && detail.sub_type) {
        testRun = detail;
        summary = detail.summary || {};
        rawSummary = detail.rawSummary || detail.summary || {};
        detailsData = detail.details || [];
        subType = detail.sub_type;
      } else {
        testRun = {
          id: detail.id || 'unknown',
          sub_type: detail.sub_type || 'unknown',
          created_at: detail.created_at || new Date().toISOString(),
          project: detail.project || { name: 'Unknown Project' }
        };
        summary = detail.summary || {};
        rawSummary = detail.rawSummary || detail.summary || {};
        detailsData = detail.details || [];
        subType = testRun.sub_type;
      }

      console.log(`Generating PDF for test run #${testRun.id}, subType: ${subType}`);

      // === 1. Enhanced Header ===
      this.generateEnhancedHeader(doc, detail, subType, testRun);

      // === 2. Executive Summary Box ===
      let yPos = this.generateExecutiveSummary(doc, detail, testRun, subType, summary);

      // === 3. Test Results Summary Table ===
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Test Results Summary', 40, yPos + 20);

      const summaryEndY = this.generateEnhancedSummaryTable(
        doc,
        yPos + 45,
        detail,
        subType,
        summary,
        rawSummary
      );

      // === 4. Charts Section ===
      let chartsEndY = summaryEndY;
      try {
        chartsEndY = await this.generateChartsSection(
          doc,
          summaryEndY + 30,
          subType,
          detailsData,
          summary,
          rawSummary
        );
      } catch (error) {
        console.error('Error generating charts:', error);
        // Continue without charts if generation fails
      }

      // === 5. Detailed Results Table ===
      let detailEndY = chartsEndY;
      if (detailsData && detailsData.length > 0) {
        if (chartsEndY < doc.internal.pageSize.getHeight() - 200) {
          detailEndY = this.generateEnhancedDetailedResultsTable(
            doc,
            chartsEndY + 20,
            detailsData,
            subType,
          );
        } else {
          doc.addPage();
          detailEndY = this.generateEnhancedDetailedResultsTable(
            doc,
            60,
            detailsData,
            subType,
          );
        }
      }

      // === 6. Recommendations & Analysis Section ===
      if (detailEndY < doc.internal.pageSize.getHeight() - 150) {
        this.generateEnhancedRecommendationsSection(
          doc,
          detailEndY + 20,
          summary,
          subType,
        );
      } else {
        doc.addPage();
        this.generateEnhancedRecommendationsSection(doc, 60, summary, subType);
      }

      // === 7. Footer for all pages ===
      this.addEnhancedFooter(doc, testRun?.project?.name);

      // === 8. Upload PDF to GCS ===
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:-]/g, '');
      const projectName = testRun?.project?.name || 'TestReport';
      const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedProjectName}_${subType}_${timestamp}.pdf`;
      
      // Convert PDF to buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      
      // Create a mock Express.Multer.File object for GCS upload
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: fileName,
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: pdfBuffer,
        size: pdfBuffer.length,
        destination: '',
        filename: fileName,
        path: '',
        stream: null,
      };

      // Upload to GCS
      const gcsPath = await this.gcsService.uploadFile(
        mockFile,
        fileName,
        'reports' // folder trong GCS bucket
      );

      console.log(`PDF uploaded successfully to GCS: ${gcsPath}`);
      return gcsPath;
    } catch (error) {
      console.error('Error generating PDF for test run:', error);
      throw error;
    }
  }

  // === Charts Generation Section ===
  private async generateChartsSection(
    doc: jsPDF,
    startY: number,
    subType: string,
    detailsData: any[],
    summary: any,
    rawSummary: any
  ): Promise<number> {
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = startY;

    // Add charts title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Performance Charts', 40, currentY);
    currentY += 30;

    try {
      if (subType === 'postman' && detailsData && detailsData.length > 0) {
        const charts = await this.chartGenerator.generatePostmanCharts(detailsData);
        
        // Add assertions chart
        if (charts.assertions) {
          const assertionsImg = `data:image/png;base64,${charts.assertions.toString('base64')}`;
          doc.addImage(assertionsImg, 'PNG', 40, currentY, 250, 150);
          
          // Add response time chart next to it
          if (charts.responseTime) {
            const responseImg = `data:image/png;base64,${charts.responseTime.toString('base64')}`;
            doc.addImage(responseImg, 'PNG', 310, currentY, 250, 150);
          }
          currentY += 170;
        }
        
      } else if (subType === 'quick' && (detailsData.length > 0 || rawSummary)) {
        const dataSource = detailsData.length > 0 ? detailsData : this.convertRawSummaryToQuickData(rawSummary);
        const charts = await this.chartGenerator.generateQuickCharts(dataSource);
        
        // Add checks chart
        if (charts.checks) {
          const checksImg = `data:image/png;base64,${charts.checks.toString('base64')}`;
          doc.addImage(checksImg, 'PNG', 40, currentY, 250, 150);
        }
        
        // Add error rate chart next to it
        if (charts.errorRate) {
          const errorImg = `data:image/png;base64,${charts.errorRate.toString('base64')}`;
          doc.addImage(errorImg, 'PNG', 310, currentY, 250, 150);
        }
        currentY += 170;
        
      } else if (subType === 'script' && detailsData && detailsData.length > 0) {
        const chart = await this.chartGenerator.generateScriptChart(detailsData);
        
        if (chart) {
          const chartImg = `data:image/png;base64,${chart.toString('base64')}`;
          // Center the chart for script type
          doc.addImage(chartImg, 'PNG', 40, currentY, pageWidth - 80, 200);
          currentY += 220;
        }
      }
    } catch (error) {
      console.error('Chart generation failed:', error);
      // Add error message in PDF
      doc.setFontSize(12);
      doc.setTextColor(255, 0, 0);
      doc.text('Charts could not be generated due to technical issues', 40, currentY);
      currentY += 20;
    }

    return currentY + 20;
  }

  // Helper method to convert raw summary to quick data format
  private convertRawSummaryToQuickData(rawSummary: any): { metric_name: string; value: number }[] {
    const result: { metric_name: string; value: number }[] = [];

    if (rawSummary.http_req_duration_p95?.value) {
      result.push({ metric_name: 'http_req_duration_p95', value: rawSummary.http_req_duration_p95.value });
    }
    if (rawSummary.error_rate?.value) {
      result.push({ metric_name: 'error_rate', value: rawSummary.error_rate.value });
    }
    if (rawSummary.passes?.value) {
      result.push({ metric_name: 'checks_pass', value: rawSummary.passes.value });
    }
    if (rawSummary.failures?.value) {
      result.push({ metric_name: 'checks_fail', value: rawSummary.failures.value });
    }

    return result;
  }

  // === Header Generation ===
  private generateEnhancedHeader(doc: jsPDF, detail: any, subType: string, testRun: any) {
    const statusInfo = this.getTestStatusInfo(detail, subType);

    // Background header
    doc.setFillColor(45, 55, 72);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 120, 'F');

    // Title - White text on dark background
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Performance Test Report', 40, 60);

    // Subtitle - White text
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.text(this.getTestTypeName(subType), 40, 85);

    // Status badge
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(
      statusInfo.color[0],
      statusInfo.color[1],
      statusInfo.color[2],
    );
    doc.roundedRect(40, 95, 80, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(statusInfo.status, 50, 108);

    // Reset to black for body content
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
  }

  private generateExecutiveSummary(
    doc: jsPDF,
    detail: any,
    testRun: any,
    subType: string,
    summary: any
  ): number {
    const statusInfo = this.getTestStatusInfo(detail, subType);

    // Executive Summary Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(
      40,
      140,
      doc.internal.pageSize.getWidth() - 80,
      100,
      5,
      5,
      'F',
    );
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(
      40,
      140,
      doc.internal.pageSize.getWidth() - 80,
      100,
      5,
      5,
      'S',
    );

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', 50, 160);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const basicInfo = [
      `Project: ${testRun?.project?.name || 'Unknown'}`,
      `Test Type: ${this.getTestTypeName(subType)}`,
      `Test Run ID: #${testRun?.id || 'Unknown'}`,
      `Execution Date: ${testRun?.created_at ? new Date(testRun.created_at).toLocaleString('vi-VN') : 'Unknown'}`,
      `Status: ${statusInfo.details}`,
      `Generated: ${new Date().toLocaleString('vi-VN')}`,
    ];

    if (summary?.duration_ms) {
      basicInfo.push(`Total Duration: ${summary.duration_ms} ms`);
    }

    let yPosition = 180;
    basicInfo.forEach((info) => {
      doc.text(info, 50, yPosition);
      yPosition += 15;
    });

    return 280;
  }

  private generateEnhancedSummaryTable(
    doc: jsPDF,
    startY: number,
    detail: any,
    subType: string,
    summary: any,
    rawSummary: any
  ) {
    let rows: any[] = [];

    if (subType === 'postman') {
      const totalAssertions = (summary.passes || 0) + (summary.failures || 0);
      const successRate =
        totalAssertions > 0
          ? ((summary.passes / totalAssertions) * 100).toFixed(1)
          : '0';

      rows = [
        ['Total Requests', (summary.total_requests || 0).toString()],
        ['Duration (ms)', (summary.duration_ms || 0).toString()],
        ['Passes', (summary.passes || 0).toString()],
        ['Failures', (summary.failures || 0).toString()],
        ['Success Rate (%)', successRate + '%'],
        ['Total Assertions', totalAssertions.toString()],
      ];

      if (summary.avg_response_time) {
        rows.push(['Average Response Time', `${summary.avg_response_time.toFixed(2)}ms`]);
      }
    } else if (subType === 'quick') {
      if (Array.isArray(rawSummary) && rawSummary.length > 0) {
        rows = rawSummary
          .slice(0, 15)
          .map((metric: any) => [
            metric.name || 'Unknown',
            this.formatMetricValue(metric.val, metric.unit),
          ]);
      } else if (summary && typeof summary === 'object') {
        const metrics = [
          ['HTTP Req Duration P95', this.formatValue(summary.http_req_duration_p95?.value, 'ms')],
          ['Error Rate', this.formatValue(summary.error_rate?.value, '%')],
          ['HTTP Requests', this.formatValue(summary.http_reqs?.value, '')],
          ['Passes', this.formatValue(summary.passes?.value, '')],
          ['Failures', this.formatValue(summary.failures?.value, '')],
        ];
        rows = metrics.filter(([name, value]) => value !== 'N/A');
      }
    } else if (subType === 'script') {
      rows = [
        ['Total Metrics', (summary.total_metrics || 0).toString()],
        ['Total Passes', (summary.passes?.value || 0).toString()],
        ['Total Failures', (summary.failures?.value || 0).toString()],
      ];

      if (summary.metrics_overview) {
        const keyMetrics = ['http_req_duration', 'http_req_failed', 'vus_max', 'iterations'];
        keyMetrics.forEach((metricName) => {
          const metric = summary.metrics_overview[metricName];
          if (metric) {
            if (typeof metric === 'object') {
              if (metric.avg !== undefined) {
                rows.push([
                  `${metricName} (avg)`,
                  this.formatValue(metric.avg, metricName.includes('duration') ? 'ms' : ''),
                ]);
              }
              if (metric.max !== undefined) {
                rows.push([
                  `${metricName} (max)`,
                  this.formatValue(metric.max, metricName.includes('duration') ? 'ms' : ''),
                ]);
              }
              if (metric.rate !== undefined) {
                rows.push([`${metricName} (rate)`, this.formatValue(metric.rate * 100, '%')]);
              }
            } else {
              rows.push([metricName, this.formatValue(metric, '')]);
            }
          }
        });
      }
    }

    if (rows.length === 0) {
      rows = [['No data available', 'Please check test execution']];
    }

    autoTable(doc, {
      head: [['Metric', 'Value']],
      body: rows,
      startY: startY,
      styles: {
        fontSize: 10,
        cellPadding: 4,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: 20, right: 20 },
      tableWidth: 'auto',
    });

    return (doc as any).lastAutoTable.finalY + 15;
  }

  private generateEnhancedDetailedResultsTable(
    doc: jsPDF,
    startY: number,
    details: any[],
    subType: string,
  ) {
    if (!details || details.length === 0) return startY;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Detailed Test Results', 40, startY);
    startY += 20;

    let tableData: any[] = [];
    let headers: string[] = [];

    if (subType === 'postman') {
      headers = ['Endpoint', 'Method', 'Status', 'Response Time', 'Result', 'Error'];
      tableData = details
        .slice(0, 20)
        .map((item: any) => [
          this.truncateText(item.endpoint || 'N/A', 30),
          item.method || 'N/A',
          item.status_code?.toString() || 'N/A',
          `${item.response_time || 0}ms`,
          item.is_passed ? 'PASS' : 'FAIL',
          this.truncateText(item.error_message || '-', 40),
        ]);
    } else if (subType === 'quick') {
      headers = ['Metric', 'Category', 'Value', 'Unit'];
      tableData = details
        .slice(0, 20)
        .map((item: any) => [
          item.metric_name || 'N/A',
          item.category || '-',
          (item.value || 0).toString(),
          item.unit || '-',
        ]);
    } else if (subType === 'script') {
      const metrics = details.filter((d: any) => d.type === 'metric').slice(0, 15);
      headers = ['Metric Name', 'Average', 'Min', 'Max', 'P95'];
      tableData = metrics.map((item: any) => [
        item.name || 'N/A',
        this.formatValue(item.avg, ''),
        this.formatValue(item.min, ''),
        this.formatValue(item.max, ''),
        this.formatValue(item.p95, ''),
      ]);
    }

    if (tableData.length > 0) {
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: startY,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [52, 152, 219],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        margin: { left: 20, right: 20 },
      });

      return (doc as any).lastAutoTable.finalY + 20;
    }

    return startY;
  }

  private generateEnhancedRecommendationsSection(
    doc: jsPDF,
    startY: number,
    summary: any,
    subType: string,
  ) {
    let recommendations: string[] = [];

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Recommendations & Analysis', 40, startY);
    startY += 20;

    if (subType === 'postman') {
      const totalAssertions = (summary.passes || 0) + (summary.failures || 0);
      const successRate = totalAssertions > 0 ? (summary.passes / totalAssertions) * 100 : 0;
      const avgResponseTime = summary.duration_ms / (summary.total_requests || 1);

      if (successRate < 90) {
        recommendations.push('• Consider reviewing failed test cases and fixing API issues');
      }
      if (avgResponseTime > 2000) {
        recommendations.push('• API response times are high. Consider performance optimization');
      }
      if (summary.failures > 0) {
        recommendations.push('• Investigate and fix failing assertions to improve test reliability');
      }
      if (successRate >= 95) {
        recommendations.push('• Excellent test pass rate! Consider expanding test coverage');
      }
    } else if (subType === 'quick') {
      if (Array.isArray(summary)) {
        const p95Metric = summary.find((m: any) => m.name?.includes('p95'));
        const errorMetric = summary.find((m: any) => m.name?.includes('error'));

        if (p95Metric && p95Metric.val > 2000) {
          recommendations.push('• High P95 response time detected. Consider load balancing or caching');
        }
        if (errorMetric && errorMetric.val > 0.1) {
          recommendations.push('• Error rate is elevated. Review error logs and fix issues');
        }
      } else {
        if (summary.http_req_duration_p95?.value > 2000) {
          recommendations.push('• High P95 response time detected. Consider load balancing or caching');
        }
        if (summary.error_rate?.value > 0.1) {
          recommendations.push('• Error rate is elevated. Review error logs and fix issues');
        }
      }
      recommendations.push('• Monitor key performance metrics regularly for trend analysis');
    } else if (subType === 'script') {
      const httpDuration = summary.metrics_overview?.http_req_duration;
      const httpFailed = summary.metrics_overview?.http_req_failed;

      if (httpDuration?.avg > 1000) {
        recommendations.push('• Average request duration is high. Optimize backend performance');
      }
      if (httpFailed?.rate > 0.05) {
        recommendations.push('• Request failure rate is concerning. Check system stability');
      }
      if ((summary.passes?.value || 0) + (summary.failures?.value || 0) > 0) {
        recommendations.push('• Good test coverage with validation checks. Continue monitoring');
      }
    }

    // General recommendations
    recommendations.push('• Schedule regular performance testing to track trends');
    recommendations.push('• Set up monitoring alerts for critical performance thresholds');
    recommendations.push('• Document and share test results with development team');

    if (recommendations.length === 0) {
      recommendations.push('• No specific recommendations available for this test type');
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const textWidth = doc.internal.pageSize.getWidth() - 80;
    let currentY = startY;

    recommendations.forEach((rec) => {
      const lines = doc.splitTextToSize(rec, textWidth);
      lines.forEach((line: string) => {
        if (currentY > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          currentY = 40;
        }
        doc.text(line, 40, currentY);
        currentY += 15;
      });
      currentY += 5;
    });

    return currentY + 10;
  }

  // === Helper Methods ===
  private getTestTypeName(type: string): string {
    if (!type) return 'Unknown Test';

    const typeNames = {
      quick: 'Quick Performance Test',
      script: 'K6 Script Performance Test',
      postman: 'API (Postman) Test',
    };

    return typeNames[type] || type.charAt(0).toUpperCase() + type.slice(1) + ' Test';
  }

  private getTestStatusInfo(detail: any, subType: string) {
    const summary = detail?.summary || {};

    if (subType === 'postman') {
      const passes = summary.passes || 0;
      const failures = summary.failures || 0;
      const total = passes + failures;
      const successRate = total > 0 ? (passes / total) * 100 : 0;

      return {
        status: successRate >= 90 ? 'PASSED' : successRate >= 60 ? 'WARNING' : 'FAILED',
        color: successRate >= 90 ? [34, 197, 94] : successRate >= 60 ? [234, 179, 8] : [239, 68, 68],
        details: `${passes}/${total} tests passed (${successRate.toFixed(1)}%)`,
      };
    } else if (subType === 'quick') {
      const metricsCount = Array.isArray(summary) ? summary.length : Object.keys(summary).length;
      return {
        status: 'COMPLETED',
        color: [59, 130, 246],
        details: `${metricsCount} metrics collected`,
      };
    } else if (subType === 'script') {
      const totalPasses = summary.passes?.value || 0;
      const totalFailures = summary.failures?.value || 0;
      const totalChecks = totalPasses + totalFailures;

      return {
        status: totalChecks > 0 ? 'COMPLETED' : 'NO_CHECKS',
        color: totalChecks > 0 ? [34, 197, 94] : [156, 163, 175],
        details: `${summary.total_metrics || 0} metrics, ${totalChecks} checks`,
      };
    }

    return {
      status: 'UNKNOWN',
      color: [156, 163, 175],
      details: 'Status information not available',
    };
  }

  private addEnhancedFooter(doc: jsPDF, projectName?: string) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);

      doc.setDrawColor(200, 200, 200);
      doc.line(
        40,
        doc.internal.pageSize.getHeight() - 40,
        doc.internal.pageSize.getWidth() - 40,
        doc.internal.pageSize.getHeight() - 40,
      );

      doc.text(
        `Generated by Performance Testing Suite | ${new Date().toLocaleDateString('vi-VN')} | Page ${i} of ${pageCount}`,
        40,
        doc.internal.pageSize.getHeight() - 25,
      );

      if (projectName) {
        doc.text(
          projectName,
          doc.internal.pageSize.getWidth() - 200,
          doc.internal.pageSize.getHeight() - 25,
        );
      }
    }
  }

  private formatValue(value: any, unit: string = ''): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      const formatted = value % 1 === 0 ? value.toString() : value.toFixed(2);
      return unit ? `${formatted}${unit}` : formatted;
    }
    return value.toString();
  }

  private formatMetricValue(value: any, unit?: string): string {
    if (value === null || value === undefined) return 'N/A';
    
    if (typeof value === 'object') {
      // Handle complex values like percentiles
      if (value['p(95)'] !== undefined) return this.formatValue(value['p(95)'], unit);
      if (value.avg !== undefined) return this.formatValue(value.avg, unit);
      if (value.value !== undefined) return this.formatValue(value.value, unit);
      return JSON.stringify(value);
    }
    
    return this.formatValue(value, unit);
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}