"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import {
  PostmanDurationFormatter,
  QuickP95Formatter,
  ScriptP95Formatter,
} from "@/utils/testFormatters";

import {
  getDurationColor,
  getP95Color,
  getErrorRateColor,
  getFailRateColor,
} from "@/utils/testColors";

import { getTestStatus } from "@/utils/testStatus";
import { SummaryTable } from "./SummaryTable";
import { DetailTable } from "./DetailTable";

interface TestDetailDialogProps {
  open: boolean;
  testId: number | null;
  onClose: () => void;
}

const TestDetailDialog: React.FC<TestDetailDialogProps> = ({
  open,
  testId,
  onClose,
}) => {
  const [detail, setDetail] = useState<any>(null);
  const [showRawDialog, setShowRawDialog] = useState(false);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [loadingRaw, setLoadingRaw] = useState(false);

  useEffect(() => {
    if (open && testId) {
      fetchDetail();
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [open, testId]);

  async function fetchDetail() {
    try {
      const res = await api.get(`/test-runs/${testId}/detail`);
      setDetail(res.data);
    } catch (err) {
      console.error("Fetch test detail error", err);
    }
  }

  async function downloadRawResult() {
    if (!testId) return;
    try {
      const response = await api.get(`/test-runs/${testId}/raw-result/download`, {
        responseType: "blob", // quan trọng để nhận file dạng blob
      });

      // Tạo URL cho blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Đặt tên file giống tên file gốc
      link.setAttribute("download", rawFileName);
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download raw result failed", err);
      alert("Tải file thất bại!");
    }
  }

  async function loadRawContent() {
    if (!testId) return;
    setLoadingRaw(true);
    try {
      const res = await api.get(`/test-runs/${testId}/raw-result/content`, {
        responseType: "text",
      });
      setRawContent(res.data);
      setShowRawDialog(true);
    } catch (err) {
      setRawContent("Không thể tải nội dung file raw result.");
      setShowRawDialog(true);
    } finally {
      setLoadingRaw(false);
    }
  }

  function getTestTypeName(type: string) {
    switch (type) {
      case "quick":
        return "Quick Performance Test";
      case "script":
        return "K6 Script Performance Test";
      case "postman":
        return "API (Postman) Test";
      default:
        return type;
    }
  }

  if (!open) return null;

  const subType = detail?.testRun?.sub_type;

  // Handle summary for quick test (could be array or object)
  let p95QuickRaw = null;
  let p95QuickFormatter = QuickP95Formatter;
  if (subType === "quick") {
    if (Array.isArray(detail?.summary)) {
      const p95Val = detail.summary.find((m: any) => m.name === "http_req_duration_p95")?.val;
      const avgVal = detail.summary.find((m: any) => m.name === "http_req_duration_avg")?.val;
      if (p95Val != null) {
        p95QuickRaw = p95Val;
      } else if (avgVal != null) {
        p95QuickRaw = avgVal;
        p95QuickFormatter = PostmanDurationFormatter; // fallback
      }
    } else if (detail?.summary?.http_req_duration_p95) {
      p95QuickRaw = detail.summary.http_req_duration_p95.value;
    }
  }

  const durationParsed = PostmanDurationFormatter.parse(detail?.summary?.duration_ms ?? null);

  const p95ScriptParsed =
    subType === "script"
      ? ScriptP95Formatter.parse(
          detail?.summary?.metrics_overview?.http_req_duration?.["p(95)"]
        )
      : null;

  const rawResultPath = detail?.testRun?.raw_result_path || "";
  const rawFileName = rawResultPath.split("/").pop() || "unknown_result.json";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 font-[var(--font-nunito)]">
        <div className="bg-white rounded-xl shadow-xl p-6 w-[100vw] max-w-4xl max-h-[100vh] h-[90vh] border border-[#e5e7eb] overflow-y-auto scrollbar-clear relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10"
          >
            ✕
          </Button>

          <div className="flex flex-col gap-2 mb-6">
            <h2 className="text-[24px] font-bold">
              {detail?.testRun?.project?.name || "Unknown Project"} —{" "}
              {getTestTypeName(subType)}
            </h2>

            <p className="text-sm text-gray-500 flex flex-wrap items-center gap-3">
              {new Date(detail?.testRun?.created_at).toLocaleString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}

              {durationParsed?.value !== null && (
                <span
                  className={`px-2 rounded ${PostmanDurationFormatter.color(
                    detail?.summary?.duration_ms
                  )}`}
                >
                  Duration: {durationParsed.value} {durationParsed.suffix}
                </span>
              )}

              {subType === "quick" && p95QuickRaw !== null && (
                <span
                  className={`px-2 rounded ${p95QuickFormatter.color(p95QuickRaw)}`}
                >
                  P95 Duration: {p95QuickFormatter.parse(p95QuickRaw).value}{" "}
                  {p95QuickFormatter.parse(p95QuickRaw).suffix}
                </span>
              )}

              {subType === "script" && p95ScriptParsed && (
                <span
                  className={`px-2 rounded ${ScriptP95Formatter.color(
                    detail?.summary?.metrics_overview?.http_req_duration?.["p(95)"]
                  )}`}
                >
                  P95 Duration: {p95ScriptParsed.value} {p95ScriptParsed.suffix}
                </span>
              )}
            </p>

            {detail && (
              <span
                className={`px-2 py-1 rounded text-sm w-fit ${
                  getTestStatus(detail).color
                }`}
              >
                {getTestStatus(detail).label}
              </span>
            )}
          </div>

          <div className="rounded-xl space-y-3 mb-5 font-[var(--font-nunito)]">
            <h3 className="font-semibold text-lg">Summary</h3>
            <SummaryTable summary={detail?.summary || {}} subType={subType} />
          </div>

          <div className="rounded-xl space-y-3 p-0 mb-5 font-[var(--font-nunito)]">
            <h3 className="font-semibold text-lg">Details</h3>
            <DetailTable details={detail?.details || []} subType={subType} />
          </div>

          <div className="border rounded-xl p-5 space-y-3 bg-white mb-5">
            <h3 className="font-semibold text-lg">Raw Result</h3>
            <p className="text-sm text-gray-700 flex items-center justify-between">
              <span
                className="underline cursor-pointer text-blue-600"
                onClick={loadRawContent}
                title="Click để xem nội dung file"
              >
                {rawFileName}
              </span>

              <Button onClick={downloadRawResult} size="sm" variant="outline">
                Download Raw Result
              </Button>
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button>Export PDF</Button>
            <Button>GPT Phân tích</Button>
          </div>
        </div>
      </div>

      {showRawDialog && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowRawDialog(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-[100vw] max-w-4xl max-h-[90vh] border border-[#e5e7eb] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ height: "90vh" }}
          >
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h4 className="text-lg font-semibold">{rawFileName}</h4>
            </div>

            <div
              className="p-6 overflow-y-auto text-sm text-gray-700 flex-grow"
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {loadingRaw ? (
                <p>Đang tải nội dung...</p>
              ) : (
                <pre>{rawContent || "Không có nội dung để hiển thị."}</pre>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowRawDialog(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TestDetailDialog;
