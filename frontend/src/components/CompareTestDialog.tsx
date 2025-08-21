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

const formatNumberNoRound = (num: number | null) => {
  if (num == null) return NaN;
  return Math.floor(num * 100) / 100;
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

  const metricLabels: Record<string, string> = {
    p95Duration: "P95 Duration",
    avgDuration: "Average Duration",
    errorRate: "Error Rate",
    requests: "Total Requests",
    totalRequests: "Total Requests",
    avgResponseTime: "Average Response Time",
    duration: "Total Duration",
    failAssertions: "Fail Assertions",
    passAssertions: "Pass Assertions",
  };

  const metricUnits: Record<string, string> = {
    p95Duration: "ms",
    avgDuration: "ms",
    errorRate: "%",
    avgResponseTime: "ms",
    duration: "ms",
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setCompareResult({});
    setLineDataA([]);
    setLineDataB([]);
    setCheckData(null);
    setLineChartMessage(null);

    (async () => {
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
      } catch {
        setError("Không thể tải dữ liệu so sánh");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, idA, idB]);

  const getTrendIcon = (metric: CompareMetric) => {
    if (!metric || metric.diff == null) return <Minus className="w-4 h-4" />;
    switch (metric.trend) {
      case "decrease":
        return <TrendingDown className="w-4 h-4" />;
      case "increase":
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const formatValue = (val: number | null, key: string) => {
    if (val == null) return "-";
    const num = formatNumberNoRound(val);
    if (isNaN(num)) return "-";
    const formatted = num.toFixed(2);
    return `${formatted}${metricUnits[key] ? ` ${metricUnits[key]}` : ""}`;
  };

  const getTrendBadge = (metric: CompareMetric, key: string) => {
    if (!metric || metric.diff == null) return null;
    const num = formatNumberNoRound(metric.diff);
    if (isNaN(num)) return null;
    const diffFormatted = num.toFixed(2);
    return (
      <Badge
        variant={
          metric.trend === "decrease"
            ? "success"
            : metric.trend === "increase"
            ? "destructive"
            : "secondary"
        }
        className="flex items-center gap-1 font-medium"
      >
        {getTrendIcon(metric)}
        {metric.diff > 0 ? "+" : ""}
        {diffFormatted}
        {metricUnits[key] && (
          <span className="text-xs opacity-75">{metricUnits[key]}</span>
        )}
      </Badge>
    );
  };

  const renderMetricsTable = () => {
    const metricEntries = Object.entries(compareResult).filter(
      ([k, v]) => k !== "checks" && v && typeof v === "object" && "diff" in v
    );
    if (!metricEntries.length) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <p>Không có dữ liệu metrics để hiển thị</p>
        </div>
      );
    }
    return (
      <div className="overflow-hidden rounded-xl border bg-gradient-card shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-6 py-4 text-left text-sm font-semibold">Metric</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Test A</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Test B</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {metricEntries.map(([key, val]) => {
                const m = val as CompareMetric;
                return (
                  <tr key={key} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium">{metricLabels[key] || key}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono bg-secondary/50 px-3 py-1 rounded-full">
                        {formatValue(m.testA, key)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono bg-secondary/50 px-3 py-1 rounded-full">
                        {formatValue(m.testB, key)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center flex justify-center">
                      {getTrendBadge(m, key)}
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

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "bg-white border-0 rounded-xl",
          "!w-[100vw] !max-w-4xl !max-h-[90vh]",
          "shadow-elegant overflow-y-auto scrollbar-thin scrollbar-clear"
        )}
      >
        <DialogHeader className="relative">
          <DialogTitle className="text-3xl font-bold">
            Performance Test Comparison
          </DialogTitle>
          <p className="text-muted-foreground mt-1">
            Detailed comparison between Test A ({testATime}) and Test B ({testBTime})
          </p>
          <div className="absolute top-0 right-10">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-8 pt-4">
          {loading ? (
            <div className="flex flex-col items-center py-24 space-y-4">
              <Loader2 className="animate-spin w-10 h-10 text-primary" />
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-24 space-y-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Thử lại
              </Button>
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <h3 className="text-xl font-semibold">Performance Metrics</h3>
                {renderMetricsTable()}
              </section>

              <section className="space-y-8">
                {["postman", "script"].includes(subType) && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Response Time Trends</h3>
                    {lineDataA.length || lineDataB.length ? (
                      <div className="p-6 rounded-xl bg-gradient-card border shadow-soft">
                      
                        <ResponseTimeLineChart
                          dataA={lineDataA}
                          dataB={lineDataB}
                          pointSpacing={80}
                          minChartWidth={800}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground rounded-xl bg-gradient-card border">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <p>
                          {lineChartMessage ||
                            "Không có dữ liệu time-series để hiển thị"}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {checkData && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Test Results Analysis</h3>
                    <div className="p-6 rounded-xl bg-gradient-card border shadow-soft">
                      <CheckBarChart data={checkData} />
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
