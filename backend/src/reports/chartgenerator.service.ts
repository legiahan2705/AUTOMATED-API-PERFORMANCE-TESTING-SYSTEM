import { Injectable } from '@nestjs/common';
import { ChartConfiguration, ChartType } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

@Injectable()
export class ChartGeneratorService {
  private readonly chartJSNodeCanvas: ChartJSNodeCanvas;

  constructor() {
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white',
      chartCallback: (ChartJS) => {
        // Register required components
        ChartJS.register(
          require('chart.js/auto').Chart.register
        );
      },
    });
  }

  async generatePostmanCharts(data: any[]): Promise<{ assertions: Buffer; responseTime: Buffer }> {
    const passCount = data.filter(d => d.is_passed).length;
    const failCount = data.length - passCount;

    // Assertions chart (Bar)
    const assertionsConfig: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: ['Pass', 'Fail'],
        datasets: [{
          label: 'Assertions',
          data: [passCount, failCount],
          backgroundColor: ['#22c55e', '#ef4444'],
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Test Assertions: Pass vs Fail'
          },
          legend: { display: false }
        },
        scales: { y: { beginAtZero: true } },
      },
    };

    // Response Time chart (Bar)
    const responseTimeConfig: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: data.map(d => this.truncateLabel(d.endpoint, 20)),
        datasets: [{
          label: 'Response Time (ms)',
          data: data.map(d => d.response_time),
          backgroundColor: data.map((_, i) => this.getColorByIndex(i)),
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Response Time per Endpoint'
          },
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { maxRotation: 45 }
          },
          y: { beginAtZero: true }
        },
      },
    };

    const assertions = await this.chartJSNodeCanvas.renderToBuffer(assertionsConfig);
    const responseTime = await this.chartJSNodeCanvas.renderToBuffer(responseTimeConfig);

    return { assertions, responseTime };
  }

  async generateQuickCharts(data: any[]): Promise<{ checks: Buffer; errorRate: Buffer }> {
    const checksPass = data.find(d => d.metric_name === 'checks_pass')?.value ?? 0;
    const checksFail = data.find(d => d.metric_name === 'checks_fail')?.value ?? 0;
    const errorRate = data.find(d => d.metric_name === 'error_rate')?.value ?? 0;

    // Checks chart (Bar)
    const checksConfig: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: ['Pass', 'Fail'],
        datasets: [{
          label: 'Checks',
          data: [checksPass, checksFail],
          backgroundColor: ['#22c55e', '#ef4444'],
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'K6 Checks: Pass vs Fail'
          },
          legend: { display: false }
        },
        scales: { y: { beginAtZero: true } },
      },
    };

    // Error Rate chart (Doughnut)
    const errorRateConfig: ChartConfiguration = {
      type: 'doughnut' as ChartType,
      data: {
        labels: ['Error Rate', 'Success Rate'],
        datasets: [{
          data: [errorRate, 100 - errorRate],
          backgroundColor: ['#ef4444', '#22c55e'],
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Error Rate: ${errorRate.toFixed(2)}%`
          },
          legend: {
            position: 'bottom'
          }
        },
      },
    };

    const checks = await this.chartJSNodeCanvas.renderToBuffer(checksConfig);
    const errorRateChart = await this.chartJSNodeCanvas.renderToBuffer(errorRateConfig);

    return { checks, errorRate: errorRateChart };
  }

  async generateScriptChart(data: any[]): Promise<Buffer> {
    const metrics = data.filter(d => d.type === 'metric').slice(0, 10); // Limit to avoid overcrowding

    const lineConfig: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: metrics.map(m => this.shortenMetricName(m.name)),
        datasets: [
          {
            label: 'Average',
            data: metrics.map(m => m.avg ?? null),
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6',
            tension: 0.3,
          },
          {
            label: 'P95',
            data: metrics.map(m => m.p95 ?? null),
            borderColor: '#8b5cf6',
            backgroundColor: '#8b5cf6',
            tension: 0.3,
          },
          {
            label: 'Max',
            data: metrics.map(m => m.max ?? null),
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'K6 Script Metrics Performance'
          },
          legend: { position: 'top' }
        },
        scales: {
          x: {
            ticks: { maxRotation: 45 }
          },
          y: { beginAtZero: true }
        },
      },
    };

    return await this.chartJSNodeCanvas.renderToBuffer(lineConfig);
  }

  // Helper methods
  private getColorByIndex(index: number): string {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
      '#0ea5e9', '#14b8a6', '#f97316', '#eab308', '#a855f7', '#f43f5e',
    ];
    return colors[index % colors.length];
  }

  private truncateLabel(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private shortenMetricName(name: string): string {
    return name
      .replace('http_req_', '')
      .replace('tls_', 'tls ')
      .replace('expected_response:true', 'ok')
      .replace(/_/g, ' ');
  }
}