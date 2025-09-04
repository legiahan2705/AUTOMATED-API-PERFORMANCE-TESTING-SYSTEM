import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  BarChart3,
  Target,
  Globe,
  Timer,
  TrendingUp,
  AlertTriangle,
  Folder,
} from "lucide-react";
import {
  getDurationColor,
  getErrorRateColor,
  getFailRateColor,
  getP95Color,
} from "@/utils/testColors";

export function getMetricColor(metricName: string, value: number | null) {
  if (value == null) return "";

  const name = metricName.toLowerCase();

  // Không tô màu cho vus_max
  if (name === "vus_max") return "";

  if (name.includes("p95") || name.includes("p(95)")) return getP95Color(value);
  if (name.includes("error")) return getErrorRateColor(value);
  if (name.includes("fail")) return getFailRateColor(value);

  return getDurationColor(value);
}

type SummaryTableProps = {
  summary: any[] | Record<string, any>;
  subType?: "quick" | "script" | "postman";
};

type MetricStats = {
  avg?: number;
  min?: number;
  max?: number;
  "p(95)"?: number;
  "p(99)"?: number;
};

const HIGHLIGHT_METRICS = [
  "http_req_duration",
  "iteration_duration",
  "http_req_failed",
  "http_req_blocked",
  "vus_max",
];

export const SummaryTable: React.FC<SummaryTableProps> = ({
  summary,
  subType,
}) => {
  if (
    !summary ||
    (Array.isArray(summary)
      ? summary.length === 0
      : Object.keys(summary).length === 0)
  ) {
    return (
      <Card className="border-destructive/20 font-[var(--font-nunito)]">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertTriangle size={16} />
            <span>Không có dữ liệu summary.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper function để xử lý giá trị number an toàn
  const getNumericValue = (obj: any, defaultValue: number | null = null): number | null => {
    if (typeof obj === 'number') return obj;
    if (typeof obj === 'object' && obj !== null && typeof obj.value === 'number') {
      return obj.value;
    }
    return defaultValue;
  };

  // 1. POSTMAN
  if (subType === "postman") {
    const postmanSummary = summary as Record<string, any>;
    const {
      collection_name = "Unknown Collection",
      duration_ms = 0,
      total_requests = 0,
      passes = 0,
      failures = 0,
      original_file_name = "",
    } = postmanSummary;
    
    const total_assertions = passes + failures;
    const success_rate = total_assertions > 0 ? (passes / total_assertions) * 100 : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-[var(--font-nunito)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[18px] font-medium flex items-center gap-2 text-[#658ec7]">
              <Folder size={16} />
              Collection Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-gray-600">Collection Name</p>
              <p className="font-semibold text-black">{collection_name}</p>
            </div>
            {original_file_name && (
              <div>
                <p className="text-xs text-gray-600">File Name</p>
                <p className="font-medium text-sm text-black truncate">{original_file_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-600">Total Requests</p>
              <p className="font-semibold text-2xl text-black">{total_requests}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[18px] font-medium flex items-center gap-2 text-[#658ec7]">
              <Target size={16} />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Success Rate</span>
              <Badge
                className={
                  success_rate >= 90
                    ? "bg-green-500 text-white"
                    : success_rate >= 60
                    ? "bg-yellow-500 text-black"
                    : "bg-red-500 text-white"
                }
              >
                {success_rate.toFixed(1)}%
              </Badge>
            </div>
            <Progress
              value={success_rate}
              className="h-2"
              indicatorClassName={
                success_rate >= 90
                  ? "bg-green-500"
                  : success_rate >= 60
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }
            />

            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-600">Passes</p>
                <p className="font-bold text-green-600 flex items-center justify-center gap-1">
                  <CheckCircle size={14} />
                  {passes}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Failures</p>
                <p className="font-bold text-red-600 flex items-center justify-center gap-1">
                  <XCircle size={14} />
                  {failures}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-[18px] font-medium flex items-center gap-2 text-[#658ec7]">
              <Clock size={16} />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`p-2 rounded-md ${getDurationColor(duration_ms)}`}>
              <p className="text-xs text-gray-600">Duration</p>
              <p className="font-semibold text-2xl text-black">
                {duration_ms}ms
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Assertions</p>
              <p className="font-medium text-black">{total_assertions}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. QUICK PERFORMANCE TEST  
  if (subType === "quick") {
    let metricsToDisplay: any[] = [];
    
    if (Array.isArray(summary)) {
      // Array format từ backend parseMetrics
      metricsToDisplay = summary;
    } else {
      // Object format từ validateSummaryByType
      const summaryObj = summary as Record<string, any>;
      
      // Convert object format sang array format để hiển thị nhất quán
      const p95Val = getNumericValue(summaryObj.http_req_duration_p95);
      const errorVal = getNumericValue(summaryObj.error_rate);
      const reqsVal = getNumericValue(summaryObj.http_reqs);
      const passesVal = getNumericValue(summaryObj.passes);
      const failsVal = getNumericValue(summaryObj.failures);

      metricsToDisplay = [
        ...(p95Val !== null ? [{
          name: "http_req_duration_p95",
          desc: "HTTP Req Duration P95",
          val: p95Val,
          unit: "ms",
          cat: "Performance"
        }] : []),
        ...(errorVal !== null ? [{
          name: "error_rate", 
          desc: "Error Rate",
          val: errorVal,
          unit: "%",
          cat: "Errors"
        }] : []),
        ...(reqsVal !== null ? [{
          name: "http_reqs",
          desc: "HTTP Requests",
          val: reqsVal,
          unit: "count", 
          cat: "Requests"
        }] : []),
        ...(passesVal !== null ? [{
          name: "checks_pass",
          desc: "Checks Passed",
          val: passesVal,
          unit: "count",
          cat: "Checks"
        }] : []),
        ...(failsVal !== null ? [{
          name: "checks_fail",
          desc: "Checks Failed", 
          val: failsVal,
          unit: "count",
          cat: "Checks"
        }] : [])
      ];
    }

    if (metricsToDisplay.length === 0) {
      return (
        <Card className="border-destructive/20 font-[var(--font-nunito)]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle size={16} />
              <span>Không có dữ liệu metrics cho quick test.</span>
            </div>
          </CardContent>
        </Card>
      );
    }

    const groupedMetrics = metricsToDisplay.reduce((acc, metric) => {
      const category = metric.cat || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(metric);
      return acc;
    }, {} as Record<string, any[]>);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 font-[var(--font-nunito)]">
        {Object.entries(groupedMetrics).map(([category, metrics]) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-[18px] font-medium flex items-center gap-2 text-[#658ec7]">
                <Activity size={16} className="text-[#658ec7]" />
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {(metrics as any[]).map((metric, idx) => {
                  const color =
                    typeof metric.val === "number"
                      ? getMetricColor(metric.name, metric.val)
                      : "";
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-md ${color} space-y-1`}
                    >
                      <p className="font-semibold text-lg text-black">
                        {typeof metric.val === "number"
                          ? `${metric.val.toFixed(2)} ${metric.unit || ""}`
                          : metric.val || "-"}
                      </p>
                      <p className="text-xs text-gray-600">{metric.desc || metric.name}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 3. SCRIPT PERFORMANCE TEST
  if (subType === "script") {
    const scriptSummary = summary as Record<string, any>;
    const {
      original_file_name,
      total_metrics,
      total_checks,
      metrics_overview = {},
      checks_overview = [],
      passes,
      failures
    } = scriptSummary;

    const highlightRows = Object.entries(metrics_overview)
      .filter(([name]) =>
        HIGHLIGHT_METRICS.some((metric) => name.startsWith(metric))
      )
      .map(([name, stats]) => {
        const metric = stats as MetricStats;
        return {
          name,
          avg: metric.avg,
          min: metric.min,
          max: metric.max,
          p95: metric["p(95)"],
          p99: metric["p(99)"],
        };
      });

    // Tính tổng passes/fails từ summary hoặc checks_overview
    const totalPasses = getNumericValue(passes) || 
      (Array.isArray(checks_overview) ? checks_overview.reduce((sum, check) => sum + (check.passes || 0), 0) : 0);
    const totalFails = getNumericValue(failures) || 
      (Array.isArray(checks_overview) ? checks_overview.reduce((sum, check) => sum + (check.fails || 0), 0) : 0);

    return (
      <div className="space-y-6 font-[var(--font-nunito)]">
        {/* Test Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle
              className="text-[18px] font-medium flex items-center gap-2"
              style={{ color: "#658ec7" }}
            >
              <Folder size={16} className="text-[#658ec7]" />
              Test Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-3 gap-20">
              {original_file_name && (
                <div>
                  <p className="text-xs text-gray-600">Script File</p>
                  <p className="font-medium text-black " title={original_file_name}>
                    {original_file_name}
                  </p>
                </div>
              )}
              {typeof total_metrics === "number" && (
                <div>
                  <p className="text-xs text-gray-600">Total Metrics</p>
                  <p className="font-semibold text-2xl text-black">{total_metrics}</p>
                </div>
              )}
              {typeof total_checks === "number" && (
                <div>
                  <p className="text-xs text-gray-600">Total Checks</p>
                  <p className="font-semibold text-2xl text-black">{total_checks}</p>
                </div>
              )}
              {(totalPasses > 0 || totalFails > 0) && (
                <div>
                  <p className="text-xs text-gray-600">Check Results</p>
                  <div className="flex gap-10 items-center">
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle size={14} />
                      {totalPasses}
                    </span>
                    <span className="text-red-600 font-medium flex items-center gap-1">
                      <XCircle size={14} />
                      {totalFails}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Performance Metrics */}
        {highlightRows.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-[18px] font-medium flex items-center gap-2 text-[#658ec7]">
                <TrendingUp size={16} className="text-[#658ec7]" />
                Key Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {highlightRows.map((row, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm">{row.name}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                      <div>
                        <p className="text-xs text-gray-600">Average</p>
                        <p
                          className={`font-semibold px-2 py-1 rounded ${getMetricColor(
                            row.name,
                            row.avg ?? null
                          )}`}
                        >
                          {row.avg !== undefined && row.avg !== null ? row.avg.toFixed(2) : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Min</p>
                        <p
                          className={`font-semibold px-2 py-1 rounded ${getMetricColor(
                            row.name,
                            row.min ?? null
                          )}`}
                        >
                          {row.min !== undefined && row.min !== null ? row.min.toFixed(2) : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Max</p>
                        <p
                          className={`font-semibold px-2 py-1 rounded ${getMetricColor(
                            row.name,
                            row.max ?? null
                          )}`}
                        >
                          {row.max !== undefined && row.max !== null ? row.max.toFixed(2) : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">P95</p>
                        <p
                          className={`font-semibold px-2 py-1 rounded ${getMetricColor(
                            row.name + "_p95",
                            row.p95 ?? null
                          )}`}
                        >
                          {row.p95 !== undefined && row.p95 !== null ? row.p95.toFixed(2) : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">P99</p>
                        <p
                          className={`font-semibold px-2 py-1 rounded ${getMetricColor(
                            row.name + "_p99",
                            row.p99 ?? null
                          )}`}
                        >
                          {row.p99 !== undefined && row.p99 !== null ? row.p99.toFixed(2) : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Fallback cho các loại test không xác định
  return (
    <Card className="border-muted font-[var(--font-nunito)]">
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle size={16} />
          <span>Không rõ loại test hoặc dữ liệu không hợp lệ.</span>
        </div>
        <details className="mt-4">
          <summary className="text-xs cursor-pointer text-blue-600">Debug: Xem raw data</summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
};