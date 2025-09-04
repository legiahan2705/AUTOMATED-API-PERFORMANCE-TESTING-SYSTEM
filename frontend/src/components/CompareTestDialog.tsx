"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Download,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Clock,
  Activity,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import ResponseTimeLineChart from "./ResponseTimeLineChart";
import CheckBarChart from "./CheckBarChart";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface DetailCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idA: number;
  idB: number;
  subType: "quick" | "postman" | "script";
  title: string;
  testATime?: string;
  testBTime?: string;
}

interface CompareMetric {
  testA: number | null;
  testB: number | null;
  diff: number | null;
  trend?: "increase" | "decrease" | "same" | "unknown";
}

interface MetricConfig {
  label: string;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  betterWhen: "lower" | "higher" | "neutral";
}

const formatNumberNoRound = (num: number | null) => {
  if (num == null) return NaN;
  return Math.floor(num * 100) / 100;
};

const METRIC_CONFIGS: Record<string, MetricConfig> = {
  p95Duration: {
    label: "95th Percentile Duration",
    unit: "ms",
    icon: Clock,
    description: "95% of requests completed within this time",
    betterWhen: "lower",
  },
  avgDuration: {
    label: "Average Duration",
    unit: "ms",
    icon: Activity,
    description: "Mean response time across all requests",
    betterWhen: "lower",
  },
  errorRate: {
    label: "Error Rate",
    unit: "%",
    icon: AlertCircle,
    description: "Percentage of failed requests",
    betterWhen: "lower",
  },
  requests: {
    label: "Total Requests",
    icon: BarChart3,
    description: "Total number of requests processed",
    betterWhen: "neutral",
  },
  totalRequests: {
    label: "Total Requests",
    icon: BarChart3,
    description: "Total number of requests processed",
    betterWhen: "neutral",
  },
  avgResponseTime: {
    label: "Average Response Time",
    unit: "ms",
    icon: Zap,
    description: "Mean time to receive response",
    betterWhen: "lower",
  },
  duration: {
    label: "Total Duration",
    unit: "ms",
    icon: Clock,
    description: "Total time for test execution",
    betterWhen: "lower",
  },
  failAssertions: {
    label: "Failed Assertions",
    icon: XCircle,
    description: "Number of assertion failures",
    betterWhen: "lower",
  },
  passAssertions: {
    label: "Passed Assertions",
    icon: CheckCircle,
    description: "Number of successful assertions",
    betterWhen: "higher",
  },
};

export default function DetailCompareDialog({
  open,
  onOpenChange,
  idA,
  idB,
  subType,
  title,
  testATime = "",
  testBTime = "",
}: DetailCompareDialogProps) {
  const [loading, setLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<any>({});
  const [lineDataA, setLineDataA] = useState<any[]>([]);
  const [lineDataB, setLineDataB] = useState<any[]>([]);
  const [checkData, setCheckData] = useState<{
    testA: { pass: number; fail: number };
    testB: { pass: number; fail: number };
  } | null>(null);
  const [error, setError] = useState("");
  const [lineChartMessage, setLineChartMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    
    const loadData = async () => {
      setLoading(true);
      setError("");
      setCompareResult({});
      setLineDataA([]);
      setLineDataB([]);
      setCheckData(null);
      setLineChartMessage(null);

      try {
        const { data } = await api.get(
          `/test-runs/compare?idA=${idA}&idB=${idB}`
        );
        setCompareResult(data.compareResult || {});
        setLineDataA(data.lineChartDataA || []);
        setLineDataB(data.lineChartDataB || []);
        if (data.compareResult?.checks) {
          setCheckData(data.compareResult.checks);
        }
      } catch (err) {
        setError("Failed to load comparison data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, idA, idB]);

  const getTrendIcon = (metric: CompareMetric, metricKey: string) => {
    if (!metric || metric.diff == null) return <Minus className="w-4 h-4 text-muted-foreground" />;
    
    const config = METRIC_CONFIGS[metricKey];
    const isImprovement = 
      (config?.betterWhen === "lower" && metric.trend === "decrease") ||
      (config?.betterWhen === "higher" && metric.trend === "increase");
    
    switch (metric.trend) {
      case "decrease":
        return <TrendingDown className={cn("w-4 h-4", isImprovement ? "text-green-600" : "text-red-600")} />;
      case "increase":
        return <TrendingUp className={cn("w-4 h-4", isImprovement ? "text-green-600" : "text-red-600")} />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatValue = (val: number | null, key: string) => {
    if (val == null) return "-";
    const num = formatNumberNoRound(val);
    if (isNaN(num)) return "-";
    
    const config = METRIC_CONFIGS[key];
    const formatted = num >= 1000 ? num.toLocaleString() : num.toFixed(2);
    return `${formatted}${config?.unit ? ` ${config.unit}` : ""}`;
  };

  const getTrendBadge = (metric: CompareMetric, key: string) => {
    if (!metric || metric.diff == null) return null;
    
    const num = formatNumberNoRound(metric.diff);
    if (isNaN(num)) return null;
    
    const config = METRIC_CONFIGS[key];
    const isImprovement = 
      (config?.betterWhen === "lower" && metric.diff < 0) ||
      (config?.betterWhen === "higher" && metric.diff > 0);
    
    const diffFormatted = Math.abs(num) >= 1000 ? 
      Math.abs(num).toLocaleString() : 
      Math.abs(num).toFixed(2);
    
    return (
      <Badge
        variant={
          isImprovement
            ? "default"
            : metric.trend === "same"
            ? "secondary"
            : "destructive"
        }
        className={cn(
          "flex items-center gap-1.5 font-medium transition-all duration-200 hover:scale-105",
          isImprovement && "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
        )}
      >
        {getTrendIcon(metric, key)}
        {metric.diff > 0 ? "+" : ""}
        {diffFormatted}
        {config?.unit && (
          <span className="text-xs opacity-75">{config.unit}</span>
        )}
      </Badge>
    );
  };

  const getPerformanceScore = () => {
    const metricEntries = Object.entries(compareResult).filter(
      ([k, v]) => k !== "checks" && v && typeof v === "object" && "diff" in v
    );
    
    if (!metricEntries.length) return null;
    
    let improvements = 0;
    let regressions = 0;
    
    metricEntries.forEach(([key, val]) => {
      const metric = val as CompareMetric;
      const config = METRIC_CONFIGS[key];
      
      if (config?.betterWhen !== "neutral" && metric.diff != null) {
        const isImprovement = 
          (config.betterWhen === "lower" && metric.diff < 0) ||
          (config.betterWhen === "higher" && metric.diff > 0);
        
        if (isImprovement) improvements++;
        else if (metric.diff !== 0) regressions++;
      }
    });
    
    const total = improvements + regressions;
    if (total === 0) return null;
    
    const score = (improvements / total) * 100;
    return { score, improvements, regressions, total };
  };

  const renderPerformanceOverview = () => {
    const perfScore = getPerformanceScore();
    if (!perfScore) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-[#658ec7]/10 to-[#658ec7]/20 border border-[#658ec7]/30 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#658ec7] rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h4 className="font-semibold text-[#658ec7]">Performance Score</h4>
          </div>
          <div className="text-3xl font-bold text-[#658ec7] mb-1">
            {Math.round(perfScore.score)}%
          </div>
          <p className="text-sm text-[#658ec7]/80">
            Test B vs Test A comparison
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h4 className="font-semibold text-green-900">Improvements</h4>
          </div>
          <div className="text-3xl font-bold text-green-900 mb-1">
            {perfScore.improvements}
          </div>
          <p className="text-sm text-green-700">
            Metrics showing improvement
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500 rounded-lg">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <h4 className="font-semibold text-red-900">Regressions</h4>
          </div>
          <div className="text-3xl font-bold text-red-900 mb-1">
            {perfScore.regressions}
          </div>
          <p className="text-sm text-red-700">
            Metrics showing regression
          </p>
        </div>
      </div>
    );
  };

  const renderMetricsTable = () => {
    const metricEntries = Object.entries(compareResult).filter(
      ([k, v]) => k !== "checks" && v && typeof v === "object" && "diff" in v
    );
    
    if (!metricEntries.length) {
      return (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#658ec7]/20 to-[#c4a5c2]/20 flex items-center justify-center shadow-inner">
            <AlertCircle className="w-10 h-10 text-[#658ec7]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Metrics Available</h3>
          <p className="text-gray-600">No performance metrics data could be found for comparison.</p>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-[#658ec7]/20 bg-white shadow-lg">
        <div>
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-[#658ec7]/10 to-[#c4a5c2]/10 border-b border-[#658ec7]/20">
                <th className="px-8 py-5 text-left">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#658ec7]" />
                    <span className="text-sm font-semibold text-gray-900">Metric</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-center text-sm font-semibold text-gray-900">
                  Test A
                  <div className="text-xs text-gray-500 font-normal mt-1">
                    {testATime}
                  </div>
                </th>
                <th className="px-6 py-5 text-center text-sm font-semibold text-gray-900">
                  Test B
                  <div className="text-xs text-gray-500 font-normal mt-1">
                    {testBTime}
                  </div>
                </th>
                <th className="px-6 py-5 text-center text-sm font-semibold text-gray-900">
                  Difference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metricEntries.map(([key, val], index) => {
                const metric = val as CompareMetric;
                const config = METRIC_CONFIGS[key];
                const IconComponent = config?.icon || Info;
                
                return (
                  <tr 
                    key={key} 
                    className={cn(
                      "group hover:bg-gradient-to-r hover:from-[#658ec7]/5 hover:to-[#c4a5c2]/5 transition-all duration-200",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    )}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#658ec7] to-[#c4a5c2] rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                          <IconComponent className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 group-hover:text-[#658ec7] transition-colors">
                            {config?.label || key}
                          </div>
                          {config?.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {config.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-[#658ec7]/10 to-[#658ec7]/20 border border-[#658ec7]/30 shadow-sm">
                        <span className="font-mono text-sm font-medium text-[#658ec7]">
                          {formatValue(metric.testA, key)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-[#c4a5c2]/10 to-[#c4a5c2]/20 border border-[#c4a5c2]/30 shadow-sm">
                        <span className="font-mono text-sm font-medium text-[#c4a5c2]">
                          {formatValue(metric.testB, key)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex justify-center">
                        {getTrendBadge(metric, key)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderLoadingState = () => (
    <div className="flex flex-col items-center py-32 space-y-6">
      <div className="relative">
        <div className="w-16 h-16 bg-gradient-to-br from-[#658ec7] to-[#c4a5c2] rounded-full flex items-center justify-center shadow-lg">
          <Loader2 className="animate-spin w-8 h-8 text-white" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#658ec7] to-[#c4a5c2] rounded-full animate-ping opacity-20"></div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Comparison</h3>
        <p className="text-gray-600">Analyzing performance metrics and generating insights...</p>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center py-32 space-y-6">
      <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center shadow-inner">
        <AlertCircle className="w-10 h-10 text-red-500" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Data</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    </div>
  );

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-white rounded-2xl",
          "!max-w-4xl !max-h-[100vh] !h-[90vh] ",
          "shadow-2xl overflow-y-auto scrollbar-clear"
        )}
      >
        <DialogHeader className="pb-6 border-b border-[#658ec7]/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-[#658ec7] to-[#c4a5c2] rounded-xl shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] bg-clip-text text-transparent">
                Performance Test Comparison
              </DialogTitle>
              <p className="text-gray-600 mt-2 font-medium">
                Comprehensive analysis between Test A and Test B
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-10 pt-8">
          {loading ? renderLoadingState() : error ? renderErrorState() : (
            <>
              {renderPerformanceOverview()}

              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <Activity className="w-6 h-6 text-[#658ec7]" />
                  <h3 className="text-xl font-bold text-gray-900">Performance Metrics</h3>
                </div>
                {renderMetricsTable()}
              </section>

              {["postman", "script"].includes(subType) && (
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-[#c4a5c2]" />
                    <h3 className="text-xl font-bold text-gray-900">Response Time Analysis</h3>
                  </div>
                  {lineDataA.length || lineDataB.length ? (
                    <div className="p-8 rounded-2xl bg-gradient-to-br from-white to-[#658ec7]/5 border border-[#658ec7]/20 shadow-lg">
                      <ResponseTimeLineChart
                        dataA={lineDataA}
                        dataB={lineDataB}
                        pointSpacing={80}
                        minChartWidth={800}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-16 rounded-2xl bg-gradient-to-br from-[#658ec7]/5 to-[#c4a5c2]/5 border border-[#658ec7]/20">
                      <AlertCircle className="w-10 h-10 mx-auto mb-4 text-[#658ec7]" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">No Time Series Data</h4>
                      <p className="text-gray-600">
                        {lineChartMessage || "Response time trends are not available for this comparison."}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {checkData && (
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="text-xl font-bold text-gray-900">Test Results Analysis</h3>
                  </div>
                  <div className="p-8 rounded-2xl bg-gradient-to-br from-white to-[#c4a5c2]/5 border border-[#c4a5c2]/20 shadow-lg">
                    <CheckBarChart data={checkData} />
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}