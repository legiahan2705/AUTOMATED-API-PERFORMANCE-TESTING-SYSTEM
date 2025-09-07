import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GcsService } from 'src/project/gcs.service';

interface EmailAttachment {
  filename: string;
  path?: string;
  content?: Buffer | string;
  contentType?: string;
  cid?: string; // for inline images
}

interface TestResultSummary {
  testRunId: number;
  subType: string;
  status: string;
  successRate?: number;
  totalRequests?: number;
  totalAssertions?: number;
  passes?: number;
  failures?: number;
  duration?: number;
  errorRate?: number;
  avgResponseTime?: number;
  details?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly gcsService: GcsService, // Add GCS service injection
  ) {
    this.initializeTransporter();
  }

  private formatDateTime(date: any): string {
    const d = new Date(date);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private initializeTransporter() {
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Additional configuration for better reliability
      connectionTimeout: 300000,
      socketTimeout: 300000,
      greetingTimeout: 100000,
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    };

    this.transporter = nodemailer.createTransport(config);

    // Verify connection on startup
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error(`SMTP connection failed: ${error.message}`);
    }
  }

  private async sendMail(
    to: string | string[],
    subject: string,
    html: string,
    attachments?: EmailAttachment[],
    cc?: string | string[],
    bcc?: string | string[],
  ): Promise<boolean> {
    try {
      // Validate email addresses
      const recipients = Array.isArray(to) ? to : [to];
      for (const email of recipients) {
        if (!this.isValidEmail(email)) {
          throw new Error(`Invalid email address: ${email}`);
        }
      }

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Test Automation System'}" <${process.env.SMTP_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
        subject,
        html,
        attachments: attachments || [],
        // Add tracking headers
        headers: {
          'X-Test-Automation': 'true',
          'X-Priority': '1',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to}, Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Download file from GCS to temporary location for email attachment
   */
  private async downloadGcsFileForEmail(gcsPath: string): Promise<{ localPath: string; cleanup: () => void }> {
    try {
      // Check if file exists in GCS
      const exists = await this.gcsService.fileExists(gcsPath);
      if (!exists) {
        throw new Error(`File not found in GCS: ${gcsPath}`);
      }

      // Generate temporary file path
      const fileName = path.basename(gcsPath);
      const tempDir = os.tmpdir();
      const localPath = path.join(tempDir, `email_${Date.now()}_${fileName}`);

      // Download file from GCS and write to local file
      const fileBuffer = await this.gcsService.downloadFile(gcsPath);
      fs.writeFileSync(localPath, fileBuffer);

      this.logger.log(`Downloaded file from GCS ${gcsPath} to ${localPath}`);

      // Return cleanup function
      const cleanup = () => {
        try {
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
            this.logger.log(`Cleaned up temporary file: ${localPath}`);
          }
        } catch (error) {
          this.logger.warn(`Failed to cleanup temporary file ${localPath}: ${error.message}`);
        }
      };

      return { localPath, cleanup };
    } catch (error) {
      this.logger.error(`Error downloading file from GCS: ${error.message}`);
      throw error;
    }
  }

  async sendScheduledTestReport(
    recipientEmail: string | string[],
    reportGcsPath: string, // Now expects GCS path instead of local path
    scheduleInfo: any,
    testResult: any,
  ): Promise<boolean> {
    let cleanup: (() => void) | null = null;
    
    try {
      // Download file from GCS to temporary location
      const { localPath, cleanup: cleanupFn } = await this.downloadGcsFileForEmail(reportGcsPath);
      cleanup = cleanupFn;

      const filename = path.basename(reportGcsPath);
      const summary = this.extractTestResultSummary(testResult, scheduleInfo);
      const html = this.generateReportEmailHTML(scheduleInfo, summary);

      const attachments: EmailAttachment[] = [
        {
          filename,
          path: localPath, // Use local temporary path for attachment
          contentType: 'application/pdf',
        },
      ];

      const subject = this.generateReportSubject(scheduleInfo, summary);

      const success = await this.sendMail(recipientEmail, subject, html, attachments);
      
      return success;
    } catch (error) {
      this.logger.error(`Error sending scheduled test report: ${error.message}`, error.stack);
      
      // Send error notification if report file is missing
      if (error.message.includes('File not found in GCS')) {
        await this.sendReportGenerationError(
          recipientEmail,
          scheduleInfo,
          `Report file not found in cloud storage: ${reportGcsPath}`
        );
      }
      
      return false;
    } finally {
      // Always cleanup temporary file
      if (cleanup) {
        cleanup();
      }
    }
  }

  async sendScheduledTestError(
    recipientEmail: string | string[],
    scheduleInfo: any,
    error: string,
  ): Promise<boolean> {
    try {
      const html = this.generateErrorHTML(scheduleInfo, error);

      const scheduleTime = this.formatDateTime(scheduleInfo.created_at);
      
      const subject = `🚨 FAILED - Scheduled Test: ${scheduleTime || scheduleInfo.id}`;
      
      return await this.sendMail(recipientEmail, subject, html);
    } catch (emailError) {
      this.logger.error(`Error sending error notification: ${emailError.message}`, emailError.stack);
      return false;
    }
  }

  async sendReportGenerationError(
    recipientEmail: string | string[],
    scheduleInfo: any,
    error: string,
  ): Promise<boolean> {
    try {
      const html = this.generateReportGenerationErrorHTML(scheduleInfo, error);
      const scheduleTime = this.formatDateTime(scheduleInfo.created_at);
      const subject = `⚠️ Report Generation Failed - ${scheduleTime || scheduleInfo.id}`;
      
      return await this.sendMail(recipientEmail, subject, html);
    } catch (emailError) {
      this.logger.error(`Error sending report generation error: ${emailError.message}`, emailError.stack);
      return false;
    }
  }

  async sendBulkNotification(
    recipients: string[],
    subject: string,
    htmlTemplate: string,
    attachments?: EmailAttachment[],
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const recipient of recipients) {
      try {
        const sent = await this.sendMail(recipient, subject, htmlTemplate, attachments);
        if (sent) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Failed to send to ${recipient}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error sending to ${recipient}: ${error.message}`);
      }
    }

    this.logger.log(`Bulk email results: ${results.success} sent, ${results.failed} failed`);
    return results;
  }

  private extractTestResultSummary(testResult: any, scheduleInfo: any): TestResultSummary {
    const summary = testResult?.summary || {};
    const testRun = testResult?.testRun || {};
    
    return {
      testRunId: testRun.id || testResult.id || 'N/A',
      subType: testRun.sub_type || scheduleInfo.subType || 'unknown',
      status: this.determineTestStatus(summary, testRun.sub_type),
      successRate: this.calculateSuccessRate(summary, testRun.sub_type),
      totalRequests: summary.total_requests || 0,
      totalAssertions: (summary.passes || 0) + (summary.failures || 0),
      passes: summary.passes || 0,
      failures: summary.failures || 0,
      duration: summary.duration_ms || 0,
      errorRate: summary.error_rate?.value || 0,
      avgResponseTime: summary.avg_response_time || 0,
      details: this.generateSummaryDetails(summary, testRun.sub_type),
    };
  }

  private determineTestStatus(summary: any, subType: string): string {
    if (subType === 'postman') {
      const total = (summary.passes || 0) + (summary.failures || 0);
      if (total === 0) return 'NO_DATA';
      const successRate = (summary.passes / total) * 100;
      if (successRate >= 95) return 'EXCELLENT';
      if (successRate >= 90) return 'GOOD';
      if (successRate >= 70) return 'WARNING';
      return 'FAILED';
    } else if (subType === 'quick' || subType === 'script') {
      const errorRate = summary.error_rate?.value || 0;
      if (errorRate === 0) return 'EXCELLENT';
      if (errorRate < 0.01) return 'GOOD';
      if (errorRate < 0.05) return 'WARNING';
      return 'FAILED';
    }
    return 'COMPLETED';
  }

  private calculateSuccessRate(summary: any, subType: string): number {
    if (subType === 'postman') {
      const total = (summary.passes || 0) + (summary.failures || 0);
      return total > 0 ? (summary.passes / total) * 100 : 0;
    }
    return 0;
  }

  private generateSummaryDetails(summary: any, subType: string): string {
    if (subType === 'postman') {
      return `${summary.passes || 0} passes, ${summary.failures || 0} failures`;
    } else if (subType === 'quick' || subType === 'script') {
      const errorRate = summary.error_rate?.value || 0;
      const duration = summary.http_req_duration_p95?.value || 0;
      return `Error rate: ${(errorRate * 100).toFixed(2)}%, P95 duration: ${duration.toFixed(2)}ms`;
    }
    return 'Test completed successfully';
  }

  private generateReportSubject(scheduleInfo: any, summary: TestResultSummary): string {
    const statusEmoji = {
      EXCELLENT: '✅',
      GOOD: '✅',
      WARNING: '⚠️',
      FAILED: '❌',
      COMPLETED: '✅',
      NO_DATA: '⚠️',
    }[summary.status] || '📊';

    const projectName = scheduleInfo.project?.name || 'Unknown Project';
    const testType = this.getTestTypeDisplayName(summary.subType);
    
    return `${statusEmoji} ${testType} Report - ${projectName}`;
  }

  private getTestTypeDisplayName(subType: string): string {
    const types = {
      postman: 'API Test',
      quick: 'Performance Test',
      script: 'Load Test',
    };
    return types[subType] || 'Test';
  }

  private generateReportEmailHTML(scheduleInfo: any, summary: TestResultSummary): string {
    const statusColor = {
      EXCELLENT: '#10B981',
      GOOD: '#10B981',
      WARNING: '#F59E0B',
      FAILED: '#EF4444',
      COMPLETED: '#3B82F6',
      NO_DATA: '#6B7280',
    }[summary.status] || '#6B7280';

    const projectName = scheduleInfo.project?.name || 'Unknown Project';
    const testType = this.getTestTypeDisplayName(summary.subType);

    const scheduleTime = this.formatDateTime(scheduleInfo.created_at);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px 20px; border-radius: 0 0 8px 8px; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; margin: 10px 0; }
          .metric { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid ${statusColor}; }
          .metric-label { font-weight: bold; color: #666; font-size: 14px; }
          .metric-value { font-size: 18px; font-weight: bold; color: #333; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
          .attachment-note { background: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2196f3; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${testType} Report</h1>
          <h2>${projectName}</h2>
          
        </div>
        
        <div class="content">
          <div class="status-badge" style="background-color: ${statusColor};">
            Status: ${summary.status}
          </div>
          
          <div class="metric">
            <div class="metric-label">Test Type</div>
            <div class="metric-value">${testType} (${summary.subType})</div>
          </div>
          
          ${summary.subType === 'postman' ? `
            <div class="metric">
              <div class="metric-label">Success Rate</div>
              <div class="metric-value">${summary.successRate?.toFixed(1)}% (${summary.passes}/${summary.totalAssertions})</div>
            </div>
            <div class="metric">
              <div class="metric-label">Total Requests</div>
              <div class="metric-value">${summary.totalRequests}</div>
            </div>
            ${summary.avgResponseTime ? `
            <div class="metric">
              <div class="metric-label">Average Response Time</div>
              <div class="metric-value">${summary.avgResponseTime.toFixed(2)} ms</div>
            </div>
            ` : ''}
          ` : ''}
          
          ${summary.errorRate !== undefined ? `
            <div class="metric">
              <div class="metric-label">Error Rate</div>
              <div class="metric-value">${(summary.errorRate * 100).toFixed(2)}%</div>
            </div>
          ` : ''}
          
          ${summary.duration ? `
            <div class="metric">
              <div class="metric-label">Test Duration</div>
              <div class="metric-value">${(summary.duration / 1000).toFixed(1)} seconds</div>
            </div>
          ` : ''}
          
          <div class="metric">
            <div class="metric-label">Execution Time</div>
            <div class="metric-value">${new Date().toLocaleString('vi-VN')}</div>
          </div>
          
          <div class="attachment-note">
            📎 <strong>Detailed PDF Report Attached</strong><br>
            The complete test results with charts and detailed analysis are available in the attached PDF file.
          </div>
        </div>
        
        <div class="footer">
          <p>Generated by Test Automation System</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateErrorHTML(scheduleInfo: any, error: string): string {
    const projectName = scheduleInfo.project?.name || 'Unknown Project';
    const scheduleTime = this.formatDateTime(scheduleInfo.created_at);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px 20px; border-radius: 0 0 8px 8px; }
          .error-box { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 Scheduled Test Failed</h1>
          <h2>${projectName}</h2>
        </div>
        
        <div class="content">
          <p><strong>Schedule:</strong> ${scheduleTime || `ID #${scheduleInfo.id}`}</p>
          <p><strong>Test Type:</strong> ${this.getTestTypeDisplayName(scheduleInfo.subType)}</p>
          <p><strong>Failed At:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          
          <div class="error-box">
            <h3>Error Details:</h3>
            <pre>${error}</pre>
          </div>
          
          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Check the system logs for more detailed error information</li>
            <li>Verify the test configuration and input files</li>
            <li>Ensure the target system is accessible</li>
            <li>Contact the development team if the issue persists</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>Generated by Test Automation System</p>
          <p>This is an automated error notification.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateReportGenerationErrorHTML(scheduleInfo: any, error: string): string {
    const projectName = scheduleInfo.project?.name || 'Unknown Project';
    const scheduleTime = this.formatDateTime(scheduleInfo.created_at);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ff9800; color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px 20px; border-radius: 0 0 8px 8px; }
          .warning-box { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ Report Generation Failed</h1>
          <h2>${projectName}</h2>
        </div>
        
        <div class="content">
          <p>The scheduled test executed successfully, but we encountered an issue generating the PDF report.</p>
          
          <p><strong>Schedule:</strong> ${scheduleTime || `ID #${scheduleInfo.id}`}</p>
          <p><strong>Test Type:</strong> ${this.getTestTypeDisplayName(scheduleInfo.subType)}</p>
          <p><strong>Error Time:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          
          <div class="warning-box">
            <h3>Error Details:</h3>
            <pre>${error}</pre>
          </div>
          
          <p><strong>What This Means:</strong></p>
          <ul>
            <li>Your test ran successfully and data was collected</li>
            <li>The issue is only with PDF report generation</li>
            <li>Test results are still available in the system</li>
            <li>You can manually generate reports from the dashboard</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>Generated by Test Automation System</p>
          <p>This is an automated notification.</p>
        </div>
      </body>
      </html>
    `;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection test successful');
      return true;
    } catch (error) {
      this.logger.error(`SMTP connection test failed: ${error.message}`);
      return false;
    }
  }

  // Utility method to send test email
  async sendTestEmail(to: string): Promise<boolean> {
    const html = `
      <h2>SMTP Configuration Test</h2>
      <p>This is a test email to verify SMTP configuration.</p>
      <p>Sent at: ${new Date().toLocaleString('vi-VN')}</p>
      <p>If you receive this email, your SMTP settings are working correctly.</p>
    `;

    return this.sendMail(to, 'SMTP Test Email', html);
  }

  // Method to get email statistics (if needed)
  getEmailStats() {
    return {
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: process.env.SMTP_PORT || '587',
      smtpUser: process.env.SMTP_USER || 'Not configured',
      isConfigured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
    };
  }
}