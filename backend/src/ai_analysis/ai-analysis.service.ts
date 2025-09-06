import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import Groq from 'groq-sdk';

// ===== Kiểu dữ liệu giữ nguyên =====
type ParsedPostman = {
  type: 'postman';
  total_requests: number;
  failed_requests: number;
  assertions: { total: number; failed: number };
  tests: { total: number; failed: number };
  response_time: { avg: number; min: number; max: number };
  failed_details: Array<{ name: string; expected: string; got: any }>;
};

type ParsedK6Quick = {
  type: 'k6_quick';
  requests: number;
  vus_max: number;
  http_req_duration: {
    avg?: number; min?: number; med?: number; max?: number; p95?: number; p99?: number;
  };
  iteration_duration?: { avg?: number; p95?: number; p99?: number };
  failure_ratio: number;
  checks: Record<string, { passes?: number; fails?: number }>;
  throughput?: { data_received: string; data_sent: string };
};

type ParsedK6Perf = {
  type: 'k6_performance';
  requests: number;
  iterations: number;
  vus: number;
  http_req_duration: {
    avg?: number; min?: number; med?: number; max?: number; p90?: number; p95?: number;
  };
  failures: number;
  checks: Record<string, { passes?: number; fails?: number }>;
};

type Parsed = ParsedPostman | ParsedK6Quick | ParsedK6Perf;

export interface HeuristicOutput {
  status: 'passed' | 'failed' | 'partially_failed' | 'warning';
  findings: string[];
  recommendations: string[];
}

interface AnalyzeOptions {
  model?: string;        // default: 'llama-3.1-8b-instant'
  language?: 'vi' | 'en';// default: 'en'
  timeoutMs?: number;    // tham khảo, không ảnh hưởng trực tiếp Groq
}

@Injectable()
export class AiAnalysisService {
  private client: Groq;

  constructor() {
    // Tạo Groq client, dùng API key trong .env
    this.client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  // ===== Xác định timeout dựa vào test type =====
  private getTimeoutForTestType(testType: string, customTimeout?: number): number {
    if (customTimeout) return customTimeout;
    switch (testType) {
      case 'postman': return 300000;
      case 'k6_quick': return 600000;
      case 'k6_performance': return 600000;
      default: return 300000;
    }
  }

  // ===== API chính gọi phân tích =====
  async analyzeWithAI(filePath: string, options: AnalyzeOptions = {}) {
    // dùng  model llama-3.1-8b-instant (nhanh, ổn định, phù hợp cho phân tích)
    const { model = 'llama-3.1-8b-instant', language = 'en' } = options;

    try {
      // 1. Đọc file JSON kết quả test
      const raw = fs.readFileSync(path.resolve(filePath), 'utf-8');
      const data = JSON.parse(raw);

      // 2. Parse theo loại test
      const parsed = this.detectAndParse(data);

      // 3. Timeout chỉ để log/meta
      const timeoutMs = this.getTimeoutForTestType(parsed.type, options.timeoutMs);

      // 4. Heuristics rule-based
      const heuristics = this.buildHeuristics(parsed);

      // 5. Prompt cho AI (cải tiến để phù hợp với model mới)
      const aiInput = this.buildPrompt(parsed, heuristics, language);

      // 6. Gọi Groq API với model mới
      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          { 
            role: 'system', 
            content: language === 'vi' 
              ? 'Bạn là chuyên gia QA/Performance Testing. Trả lời rõ ràng và súc tích bằng tiếng Việt.' 
              : 'You are a QA/Performance expert. Reply clearly and concisely.' 
          },
          { role: 'user', content: aiInput },
        ],
        temperature: 0.7, // Thêm temperature để có kết quả cân bằng
        max_tokens: 2048, // Giới hạn token để tối ưu chi phí
      });

      const aiOutput = completion.choices[0]?.message?.content || '';

      // 7. Trả kết quả
      return {
        aiInput,
        aiOutput,
        structured: heuristics,
        meta: { model, language, timeoutMs, testType: parsed.type }
      };
    } catch (error: any) {
      console.error('Error in AI analysis:', error?.message || error);
      throw error;
    }
  }

  // ===== Detect & parse =====
  private detectAndParse(data: any): Parsed {
    if (data?.metrics && data.metrics.http_req_duration) {
      if (data.metrics.http_req_duration['p(99)']) return this.parseQuick(data) as ParsedK6Quick;
      return this.parseK6(data) as ParsedK6Perf;
    }
    if (data?.collection && data?.run) return this.parsePostman(data) as ParsedPostman;
    throw new Error('Unknown test result format');
  }

  // ===== Heuristics =====
  private buildHeuristics(result: Parsed): HeuristicOutput {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let status: HeuristicOutput['status'] = 'passed';

    const push = (arr: string[], v?: any) => v ? arr.push(v) : null;

    if (result.type === 'postman') {
      const r = result as ParsedPostman;
      const failReq = r.failed_requests || 0;
      const failAssert = r.assertions?.failed || 0;

      if (failReq > 0 || failAssert > 0) status = failReq > 0 && failAssert > 0 ? 'failed' : 'partially_failed';

      push(findings, `Total requests: ${r.total_requests}, failed: ${failReq}.`);
      push(findings, `Assertions: ${r.assertions.total}, failed: ${failAssert}.`);
      push(findings, `Response time (ms): avg=${r.response_time.avg}, min=${r.response_time.min}, max=${r.response_time.max}.`);

      if (r.response_time.max > 2000) {
        status = status === 'passed' ? 'warning' : status;
        push(findings, `High maximum latency (${r.response_time.max} ms).`);
        push(recommendations, 'Review DB queries, add caching, optimize I/O or implement pagination.');
      }

      if ((r.failed_details || []).length > 0) {
        for (const f of r.failed_details.slice(0, 5)) {
          push(findings, `Fail: "${f.name}" — expected: ${f.expected}, got: ${f.got}`);
        }
        push(recommendations, 'Check backend logs and assertion logic; add edge case testing.');
      } else if (status === 'passed') {
        push(recommendations, 'Add negative/edge case tests (400/401/403/404), contract testing, and schema validation.');
      }
    }

    if (result.type === 'k6_quick') {
      const r = result as ParsedK6Quick;
      const p95 = r.http_req_duration?.p95 ?? r.http_req_duration?.med ?? 0;
      const p99 = r.http_req_duration?.p99 ?? 0;
      const fr = r.failure_ratio ?? 0;

      if (fr > 0.01) status = 'failed';
      else if (fr > 0) status = 'partially_failed';

      push(findings, `Requests: ${r.requests}, Max VUs: ${r.vus_max}, Failure ratio: ${fr}.`);
      push(findings, `HTTP duration: avg=${r.http_req_duration?.avg}, p95=${p95}, p99=${p99}, max=${r.http_req_duration?.max}.`);

      if (p95 > 1000) {
        status = status === 'passed' ? 'warning' : status;
        push(findings, `High p95 (${p95} ms) → user experience risk.`);
        push(recommendations, 'Add caching, optimize heavy endpoints, consider scale-out (HPA) & CDN.');
      }
      if (fr > 0) {
        push(recommendations, 'Investigate error groups (5xx/4xx/timeout), monitor APM logs, add retry/bulkhead/circuit breaker patterns.');
      }
      if (r.throughput) {
        push(findings, `Throughput: ${r.throughput.data_received}; ${r.throughput.data_sent}.`);
      }
    }

    if (result.type === 'k6_performance') {
      const r = result as ParsedK6Perf;
      const p95 = r.http_req_duration?.p95 ?? r.http_req_duration?.p90 ?? 0;

      if ((r.failures ?? 0) > 0) status = (r.failures ?? 0) > 10 ? 'failed' : 'partially_failed';

      push(findings, `Requests: ${r.requests}, Iterations: ${r.iterations}, VUs: ${r.vus}, Failures: ${r.failures}.`);
      push(findings, `HTTP duration: avg=${r.http_req_duration?.avg}, p95=${p95}, max=${r.http_req_duration?.max}.`);

      if (p95 > 1200) {
        status = status === 'passed' ? 'warning' : status;
        push(findings, `High p95 (${p95} ms).`);
        push(recommendations, 'Optimize DB (indexing/queries), use queues for heavy tasks, consider caching and response compression.');
      }
      if ((r.failures ?? 0) > 0) {
        push(recommendations, 'Categorize errors by type (HTTP 5xx/4xx/timeout), check resource limits (CPU/RAM/connection pool).');
      }
    }

    if (status === 'passed' && recommendations.length === 0) {
      recommendations.push('Continue expanding test coverage, add smoke tests to CI/CD pipeline and monitor baseline p95 across builds.');
    }

    return { status, findings, recommendations };
  }

  // ===== Prompt builder (cải tiến) =====
  private buildPrompt(result: Parsed, heuristics: HeuristicOutput, language: 'vi' | 'en' = 'en'): string {
    const langHeader = language === 'vi' 
      ? `Bạn là chuyên gia QA/Performance Testing với 10+ năm kinh nghiệm. Phân tích dựa trên số liệu thực tế, không đoán mò.`
      : `You are a senior QA/Performance expert with 10+ years experience. Base analysis on actual metrics, not assumptions.`;

    const ask = language === 'vi' 
      ? `Phân tích kết quả test sau và cung cấp:
1) **Tổng quan**: Pass/Fail/Warning với căn cứ cụ thể từ số liệu
2) **Phân tích hiệu năng**: Dùng CHÍNH XÁC các số p95/p99/throughput có trong data (không ước đoán)
3) **So sánh benchmark**: Response time có chấp nhận được? (web: <200ms, API: <500ms, batch: <2s)
4) **Rủi ro thực tế**: Tác động lên user experience và business
5) **Khuyến nghị ưu tiên**: Top 3 actions quan trọng nhất
6) **Checklist hành động**: 5-7 items cụ thể cho dev/QA`
      : `Analyze test results and provide:
1) **Overview**: Pass/Fail/Warning with specific evidence from metrics
2) **Performance Analysis**: Use EXACT p95/p99/throughput numbers from data (no guessing)
3) **Benchmark Comparison**: Are response times acceptable? (web: <200ms, API: <500ms, batch: <2s)
4) **Real Risks**: Impact on user experience and business
5) **Priority Recommendations**: Top 3 most critical actions
6) **Action Checklist**: 5-7 specific items for dev/QA teams`;

    const heuristicsText = language === 'vi'
      ? `=== PHÂN TÍCH TỰ ĐỘNG ===
Trạng thái: ${heuristics.status}
Phát hiện: ${heuristics.findings.join(' | ')}
Khuyến nghị: ${heuristics.recommendations.join(' | ')}

`
      : `=== AUTO ANALYSIS ===
Status: ${heuristics.status}
Findings: ${heuristics.findings.join(' | ')}
Recommendations: ${heuristics.recommendations.join(' | ')}

`;

    const raw = this.formatRawBlock(result);

    const footer = language === 'vi'
      ? `🎯 QUAN TRỌNG: Chỉ sử dụng số liệu có sẵn trong RAW DATA. Không đoán p95/p99 nếu không có. Đưa ra con số cụ thể và so sánh với industry standard.`
      : `🎯 CRITICAL: Only use metrics available in RAW DATA. Don't guess p95/p99 if not provided. Give specific numbers and compare with industry standards.`;

    return `${langHeader}

${ask}

${heuristicsText}=== RAW TEST DATA ===
${raw}

${footer}`;
  }

  // ===== Raw block formatter =====
  private formatRawBlock(result: Parsed): string {
    let text = `Test Type: ${result.type}\n`;

    if (result.type.startsWith('k6')) {
      const r: any = result;
      if (r.requests !== undefined) text += `Requests: ${r.requests}\n`;
      if (r.vus !== undefined) text += `VUs: ${r.vus}\n`;
      if (r.vus_max !== undefined) text += `Max VUs: ${r.vus_max}\n`;

      text += `HTTP Duration:\n`;
      for (const [k, v] of Object.entries(r.http_req_duration || {})) {
        text += `  - ${k}: ${v}\n`;
      }

      if (r.iteration_duration) {
        text += `Iteration Duration:\n`;
        for (const [k, v] of Object.entries(r.iteration_duration)) {
          text += `  - ${k}: ${v}\n`;
        }
      }

      if (r.failures !== undefined) text += `Failures: ${r.failures}\n`;
      if (r.failure_ratio !== undefined) text += `Failure Ratio: ${r.failure_ratio}\n`;

      if (r.throughput) {
        text += `Throughput:\n`;
        text += `  - Data received: ${r.throughput.data_received}\n`;
        text += `  - Data sent: ${r.throughput.data_sent}\n`;
      }

      if (r.checks) {
        text += `Checks:\n`;
        for (const [name, val] of Object.entries(r.checks || {})) {
          const c: any = val;
          text += `  - ${name}: ${c.passes || 0} passed, ${c.fails || 0} failed\n`;
        }
      }
    }

    if (result.type === 'postman') {
      const r = result as ParsedPostman;
      text += `Total Requests: ${r.total_requests}\n`;
      text += `Failed Requests: ${r.failed_requests}\n`;
      text += `Assertions: ${r.assertions.total}, Failed: ${r.assertions.failed}\n`;
      text += `Tests: ${r.tests.total}, Failed: ${r.tests.failed}\n`;
      text += `Response Time (ms): avg=${r.response_time.avg}, min=${r.response_time.min}, max=${r.response_time.max}\n`;
      if (r.failed_details.length > 0) {
        text += `Failed Details:\n`;
        for (const f of r.failed_details) {
          text += `  - ${f.name}: expected=${f.expected}, got=${f.got}\n`;
        }
      }
    }

    return text;
  }

  // ===== Parsers =====
  private parseQuick(data: any): ParsedK6Quick {
    const metrics = data.metrics || {};
    return {
      type: 'k6_quick',
      requests: metrics.http_reqs?.count || 0,
      vus_max: metrics.vus_max?.value || 0,
      http_req_duration: {
        avg: metrics.http_req_duration?.avg,
        min: metrics.http_req_duration?.min,
        med: metrics.http_req_duration?.med,
        max: metrics.http_req_duration?.max,
        p95: metrics.http_req_duration?.['p(95)'],
        p99: metrics.http_req_duration?.['p(99)'],
      },
      iteration_duration: {
        avg: metrics.iteration_duration?.avg,
        p95: metrics.iteration_duration?.['p(95)'],
        p99: metrics.iteration_duration?.['p(99)'],
      },
      failure_ratio: metrics.http_req_failed?.value || 0,
      checks: (data.root_group?.checks as any) || {},
      throughput: {
        data_received: `${metrics.data_received?.count || 0} bytes @ ${metrics.data_received?.rate || 0} B/s`,
        data_sent: `${metrics.data_sent?.count || 0} bytes @ ${metrics.data_sent?.rate || 0} B/s`,
      },
    };
  }

  private parsePostman(data: any): ParsedPostman {
    const runStats = data.run?.stats || {};
    const executions = data.run?.executions || [];
    const failedDetails =
      executions
        ?.filter((ex: any) => {
          const code = ex.response?.code;
          const assertionFailed = (ex.assertions || []).some((a: any) => a.error);
          return (typeof code === 'number' && code >= 400) || assertionFailed;
        })
        ?.map((ex: any) => ({
          name: ex.item?.name,
          expected:
            ex.item?.event?.[0]?.script?.exec?.join(' ') ||
            'Expected assertions to pass',
          got: ex.response?.code ?? 'No Response',
        })) || [];

    return {
      type: 'postman',
      total_requests: runStats.requests?.total || 0,
      failed_requests: runStats.requests?.failed || 0,
      assertions: {
        total: runStats.assertions?.total || 0,
        failed: runStats.assertions?.failed || 0,
      },
      tests: {
        total: runStats.tests?.total || 0,
        failed: runStats.tests?.failed || 0,
      },
      response_time: {
        avg: data.run?.timings?.responseAverage || 0,
        min: data.run?.timings?.responseMin || 0,
        max: data.run?.timings?.responseMax || 0,
      },
      failed_details: failedDetails,
    };
  }

  private parseK6(data: any): ParsedK6Perf {
    const metrics = data.metrics || {};
    return {
      type: 'k6_performance',
      requests: metrics.http_reqs?.count || 0,
      iterations: metrics.iterations?.count || 0,
      vus: metrics.vus?.value || 0,
      http_req_duration: {
        avg: metrics.http_req_duration?.avg,
        min: metrics.http_req_duration?.min,
        med: metrics.http_req_duration?.med,
        max: metrics.http_req_duration?.max,
        p90: metrics.http_req_duration?.['p(90)'],
        p95: metrics.http_req_duration?.['p(95)'],
      },
      failures: metrics.http_req_failed?.fails || 0,
      checks: (data.root_group?.checks as any) || {},
    };
  }
}