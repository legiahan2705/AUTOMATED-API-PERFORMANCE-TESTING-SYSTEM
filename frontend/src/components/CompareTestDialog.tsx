"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, AlertCircle } from "lucide-react";
import ResponseTimeLineChart from "./ResponseTimeLineChart";
import CheckBarChart from "./CheckBarChart";

interface DetailCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idA: number;
  idB: number;
  subType: "quick" | "postman" | "script";
  title: string;
}

interface CompareMetric {
  testA: number | null;
  testB: number | null;
  diff: number | null;
}

export default function DetailCompareDialog({
  open,
  onOpenChange,
  idA,
  idB,
  subType,
  title,
}: DetailCompareDialogProps) {
  const [loading, setLoading] = useState(false);
  const [compareData, setCompareData] = useState<Record<string, CompareMetric>>({});
  const [lineDataA, setLineDataA] = useState<any[]>([]);
  const [lineDataB, setLineDataB] = useState<any[]>([]);
  const [checkData, setCheckData] = useState<{
    testA: { pass: number; fail: number };
    testB: { pass: number; fail: number };
  } | null>(null);
  const [error, setError] = useState("");

  const metricLabels: Record<string, string> = {
    p95Duration: "P95 Duration (ms)",
    avgDuration: "Average Duration (ms)",
    errorRate: "Error Rate (%)",
    requests: "Total Requests",
    duration: "Total Duration (ms)",
    failAssertions: "Fail Assertions",
    passAssertions: "Pass Assertions",
  };

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError("");
    setCompareData({});
    setLineDataA([]);
    setLineDataB([]);
    setCheckData(null);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

    async function fetchCompareData() {
      try {
        console.log("Fetching compare data from:", `${baseUrl}/test-runs/compare?idA=${idA}&idB=${idB}`);
        const resCompare = await fetch(`${baseUrl}/test-runs/compare?idA=${idA}&idB=${idB}`);
        if (!resCompare.ok) {
          const text = await resCompare.text();
          console.error("Compare API error response:", text);
          throw new Error(`Failed to fetch compare data, status ${resCompare.status}`);
        }
        const compareRes = await resCompare.json();

        const resSeriesA = await fetch(`${baseUrl}/test-runs/${idA}/time-series`);
        const seriesA = resSeriesA.ok ? await resSeriesA.json() : [];
        if (!resSeriesA.ok) console.warn(`Time-series A fetch failed: status ${resSeriesA.status}`);

        const resSeriesB = await fetch(`${baseUrl}/test-runs/${idB}/time-series`);
        const seriesB = resSeriesB.ok ? await resSeriesB.json() : [];
        if (!resSeriesB.ok) console.warn(`Time-series B fetch failed: status ${resSeriesB.status}`);

        setCompareData(compareRes || {});
        setLineDataA(Array.isArray(seriesA) ? seriesA : []);
        setLineDataB(Array.isArray(seriesB) ? seriesB : []);

        if (compareRes?.checks) {
          setCheckData({
            testA: {
              pass: compareRes.checks.testA?.pass ?? 0,
              fail: compareRes.checks.testA?.fail ?? 0,
            },
            testB: {
              pass: compareRes.checks.testB?.pass ?? 0,
              fail: compareRes.checks.testB?.fail ?? 0,
            },
          });
        } else {
          setCheckData(null);
        }
      } catch (err) {
        console.error("Fetch compare data error:", err);
        setError("Không thể tải dữ liệu so sánh");
      } finally {
        setLoading(false);
      }
    }

    fetchCompareData();
  }, [open, idA, idB]);

  const getColor = (diff: number | null) => {
    if (diff == null) return "text-gray-400";
    if (diff < 0) return "text-green-600 font-semibold";
    if (diff > 0) return "text-red-600 font-semibold";
    return "text-gray-400";
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-300 bg-white p-8 shadow-lg">
        <DialogHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <DialogTitle className="text-4xl font-extrabold text-gray-900">
            {title}
          </DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
            onClick={() => window.print()}
          >
            <Download className="w-5 h-5" />
            <span>Export PDF</span>
          </Button>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="animate-spin text-blue-600 w-12 h-12" />
          </div>
        )}

        {error && (
          <p className="text-center text-red-700 font-semibold text-lg">{error}</p>
        )}

        {!loading && !error && (
          <div className="space-y-12">
            {/* Summary Table */}
            <section>
              <h3 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-3">
                Summary So Sánh
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
                <table className="min-w-full table-auto border-collapse text-left">
                  <thead className="bg-gray-50 text-gray-700 uppercase font-semibold text-base">
                    <tr>
                      <th className="px-6 py-4">Metric</th>
                      <th className="px-6 py-4">Test A</th>
                      <th className="px-6 py-4">Test B</th>
                      <th className="px-6 py-4">Δ (Chênh lệch)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(compareData).map(([key, val]) => {
                      if (
                        key === "checks" ||
                        !val ||
                        typeof val !== "object" ||
                        val.testA === undefined
                      )
                        return null;
                      return (
                        <tr
                          key={key}
                          className="even:bg-gray-50 border-t border-gray-200 text-lg"
                        >
                          <td className="px-6 py-4 font-medium">{metricLabels[key] || key}</td>
                          <td className="px-6 py-4">{val.testA ?? "-"}</td>
                          <td className="px-6 py-4">{val.testB ?? "-"}</td>
                          <td className={`px-6 py-4 ${getColor(val.diff)}`}>
                            {val.diff != null ? `${val.diff > 0 ? "+" : ""}${val.diff}` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Charts */}
            <section className="space-y-8">
              {(lineDataA.length > 0 || lineDataB.length > 0) ? (
                <div>
                  <h3 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-3">
                    Response Time Over Time
                  </h3>
                  <ResponseTimeLineChart dataA={lineDataA} dataB={lineDataB} />
                </div>
              ) : (
                <p className="text-center italic text-gray-500 text-lg">
                  Không có dữ liệu time-series để hiển thị
                </p>
              )}

              {checkData && (
                <div>
                  <h3 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-3">
                    Checks Pass/Fail
                  </h3>
                  <CheckBarChart data={checkData} />
                </div>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
