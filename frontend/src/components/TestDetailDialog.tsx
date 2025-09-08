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
import TestReportPDF from "./TestReportPDF";

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
  const [loading, setLoading] = useState(false);
  const [showRawDialog, setShowRawDialog] = useState(false);
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [loadingRaw, setLoadingRaw] = useState(false);

  const [showGptDialog, setShowGptDialog] = useState(false);
  const [gptContent, setGptContent] = useState<string | null>(null);
  const [loadingGpt, setLoadingGpt] = useState(false);

  useEffect(() => {
    if (open && testId) {
      fetchDetail();
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
      // Reset state when dialog closes
      if (!open) {
        setDetail(null);
        setLoading(false);
      }
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [open, testId]);

  async function fetchDetail() {
    if (!testId) return;

    setLoading(true);
    setDetail(null); // Clear previous data

    try {
      const res = await api.get(`/test-runs/${testId}/detail`);
      setDetail(res.data);
    } catch (err) {
      console.error("Fetch test detail error", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadGptAnalysis() {
    if (!testId || !detail?.testRun?.raw_result_path) {
      setGptContent("Không tìm thấy file raw result để phân tích.");
      setShowGptDialog(true);
      return;
    }

    setLoadingGpt(true);
    setShowGptDialog(true);

    try {
      // Call the AI analysis API with the raw result file path
      const res = await api.get(`/ai-analysis`, {
        params: {
          file: detail.testRun.raw_result_path,
        },
      });

      if (res.data && res.data.aiOutput) {
        setGptContent(res.data.aiOutput);
      } else if (res.data && res.data.error) {
        setGptContent(`Lỗi phân tích AI: ${res.data.error}`);
      } else {
        setGptContent(
          "Không thể thực hiện phân tích AI. Vui lòng thử lại sau."
        );
      }
    } catch (err: any) {
      console.error("GPT Analysis error:", err);
      if (err.response?.data?.error) {
        setGptContent(`Lỗi: ${err.response.data.error}`);
      } else if (err.response?.status === 500) {
        setGptContent(
          "Lỗi server khi thực hiện phân tích AI. Vui lòng kiểm tra:\n- Ollama đã được cài đặt và chạy\n- Model mistral đã được tải về\n- File raw result tồn tại và có định dạng đúng"
        );
      } else {
        setGptContent(
          "Không thể kết nối đến dịch vụ phân tích AI. Vui lòng thử lại sau."
        );
      }
    } finally {
      setLoadingGpt(false);
    }
  }

  function handleGptDialogClose() {
    if (loadingGpt) {
      const confirmed = window.confirm(
        "Phân tích AI chưa hoàn thành. Bạn có chắc chắn muốn đóng? Việc phân tích sẽ bị dừng lại."
      );
      if (!confirmed) {
        return;
      }
    }
    setShowGptDialog(false);
    setLoadingGpt(false);
    setGptContent(null);
  }

  async function downloadRawResult() {
    if (!testId) return;
    try {
      const response = await api.get(
        `/test-runs/${testId}/raw-result/download`,
        {
          responseType: "blob", // quan trọng để nhận file dạng blob
        }
      );

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

      let content = res.data;
      // Nếu là JSON thì format lại cho đẹp
      try {
        const parsed = JSON.parse(content);
        content = JSON.stringify(parsed, null, 2);
      } catch {
        // không phải JSON thì giữ nguyên (ví dụ log dạng text)
      }

      setRawContent(content);
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
      const p95Val = detail.summary.find(
        (m: any) => m.name === "http_req_duration_p95"
      )?.val;
      const avgVal = detail.summary.find(
        (m: any) => m.name === "http_req_duration_avg"
      )?.val;
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

  const durationParsed = PostmanDurationFormatter.parse(
    detail?.summary?.duration_ms ?? null
  );

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
      <div className="fixed inset-0 z-50 flex items-center justify-center font-[var(--font-nunito)] bg-black/70">
        <div className="bg-[#cae0ff] rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.6)] p-6 w-[100vw] max-w-4xl max-h-[100vh] h-[90vh] overflow-y-auto scrollbar-clear relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10"
          >
            ✕
          </Button>

          {loading ? (
            // Loading State - Simplified
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                {/* Simplified Single Loading Circle */}
                <div className="relative w-20 h-20 mx-auto mb-8">
                  <div
                    className="w-full h-full border-4 border-transparent rounded-full animate-spin"
                    style={{
                      borderTopColor: "#658ec7",
                      borderRightColor: "#658ec7",
                      borderLeftColor: "transparent",
                      borderBottomColor: "transparent",
                      animationDuration: "1s",
                    }}
                  ></div>
                  <div
                    className="absolute inset-4 rounded-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(45deg, #658ec7, #c4a5c2)",
                    }}
                  >
                    <span className="text-white text-xl">📊</span>
                  </div>
                </div>

                {/* Loading Text */}
                <h3 className="text-2xl font-bold text-[#658ec7] mb-3">
                  Loading Test Details
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Please wait while we fetch the comprehensive test results and
                  performance metrics...
                </p>

                {/* Simplified Progress Dots */}
                <div className="flex justify-center space-x-2 mb-6">
                  <div
                    className="w-3 h-3 rounded-full animate-bounce"
                    style={{
                      backgroundColor: "#658ec7",
                      animationDelay: "0ms",
                      animationDuration: "1.4s",
                    }}
                  ></div>
                  <div
                    className="w-3 h-3 rounded-full animate-bounce"
                    style={{
                      backgroundColor: "#c4a5c2",
                      animationDelay: "200ms",
                      animationDuration: "1.4s",
                    }}
                  ></div>
                  <div
                    className="w-3 h-3 rounded-full animate-bounce"
                    style={{
                      backgroundColor: "#658ec7",
                      animationDelay: "400ms",
                      animationDuration: "1.4s",
                    }}
                  ></div>
                </div>

                {/* Loading Steps */}
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Fetching test run data</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor: "#658ec7",
                        animationDelay: "0.5s",
                      }}
                    ></div>
                    <span>Processing performance metrics</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor: "#c4a5c2",
                        animationDelay: "1s",
                      }}
                    ></div>
                    <span>Preparing detailed analysis</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Main Content (when data is loaded)
            <>
              <div className="flex flex-col gap-2 mb-6">
                <h2 className="text-[24px] font-bold text-[#658ec7]">
                  {detail?.testRun?.project?.name || "Unknown Project"} —{" "}
                  {getTestTypeName(subType)}
                </h2>

                <p className="text-sm text-gray-500 flex flex-wrap items-center gap-3">
                  {detail?.testRun?.created_at &&
                    new Date(detail.testRun.created_at).toLocaleString(
                      "vi-VN",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }
                    )}

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
                      className={`px-2 rounded ${p95QuickFormatter.color(
                        p95QuickRaw
                      )}`}
                    >
                      P95 Duration: {p95QuickFormatter.parse(p95QuickRaw).value}{" "}
                      {p95QuickFormatter.parse(p95QuickRaw).suffix}
                    </span>
                  )}

                  {subType === "script" && p95ScriptParsed && (
                    <span
                      className={`px-2 rounded ${ScriptP95Formatter.color(
                        detail?.summary?.metrics_overview?.http_req_duration?.[
                          "p(95)"
                        ]
                      )}`}
                    >
                      P95 Duration: {p95ScriptParsed.value}{" "}
                      {p95ScriptParsed.suffix}
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
                <SummaryTable
                  summary={detail?.summary || {}}
                  subType={subType}
                />
              </div>

              <div className="rounded-xl space-y-3 p-0 mb-5 font-[var(--font-nunito)]">
                <DetailTable
                  details={detail?.details || []}
                  subType={subType}
                />
              </div>

              <div className="border rounded-xl p-5 space-y-3 bg-white mb-5">
                <h3 className="font-semibold text-[18px] text-[#658ec7]">
                  Raw Result
                </h3>
                <p className="text-sm text-gray-700 flex items-center justify-between">
                  <span
                    className="underline cursor-pointer text-[#658ec7]"
                    onClick={loadRawContent}
                    title="Click để xem nội dung file"
                  >
                    {rawFileName}
                  </span>

                  <Button
                    onClick={downloadRawResult}
                    size="sm"
                    className="text-white bg-[#658ec7] hover:bg-[#c4a5c2] hover:text-white shadow-md"
                  >
                    Download Raw Result
                  </Button>
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-10">
                {/* Export PDF */}
                {detail && <TestReportPDF detail={detail} />}

                <Button
                  onClick={loadGptAnalysis}
                  disabled={loadingGpt}
                  className="text-white shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(to right, #658ec7, #c4a5c2)",
                  }}
                  onMouseOver={(e) => {
                    if (!loadingGpt) {
                      e.currentTarget.style.background =
                        "linear-gradient(to right, #5a7fb8, #b896b3)";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!loadingGpt) {
                      e.currentTarget.style.background =
                        "linear-gradient(to right, #658ec7, #c4a5c2)";
                    }
                  }}
                >
                  {loadingGpt ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>🤖 AI Analysis</>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Enhanced GPT Analysis Dialog */}
      {showGptDialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center  p-4"
          onClick={handleGptDialogClose}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-[100vw] max-w-4xl max-h-[100vh] h-[90vh] border border-gray-200 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Enhanced Header */}
            <div
              className="p-6 border-b border-gray-200 flex-shrink-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(101, 142, 199, 0.1), rgba(196, 165, 194, 0.1))",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                    style={{
                      background: "linear-gradient(to right, #658ec7, #c4a5c2)",
                    }}
                  >
                    <span className="text-white text-xl">🤖</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-800">
                      AI Analysis Report
                    </h4>
                    <p className="text-sm text-gray-600">
                      Intelligent performance & quality analysis
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGptDialogClose}
                  className="hover:bg-white/80 rounded-full w-10 h-10"
                >
                  <span className="text-gray-500 text-lg">✕</span>
                </Button>
              </div>
            </div>

            {/* Enhanced Content Area */}
            <div
              className="flex-grow overflow-hidden"
              style={{
                background:
                  "linear-gradient(to bottom right, #f9fafb, rgba(101, 142, 199, 0.05))",
              }}
            >
              {loadingGpt ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                      <div
                        className="absolute inset-0 border-4 border-transparent rounded-full animate-spin"
                        style={{
                          borderTopColor: "#658ec7",
                          borderRightColor: "#c4a5c2",
                        }}
                      ></div>
                      <div
                        className="absolute inset-2 rounded-full flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(to right, #658ec7, #c4a5c2)",
                        }}
                      >
                        <span className="text-white text-lg">⚡</span>
                      </div>
                    </div>
                    <h5 className="text-lg font-semibold text-gray-800 mb-2">
                      Analyzing Test Results
                    </h5>
                    <p className="text-gray-600 mb-4">
                      AI is examining performance metrics and generating
                      insights...
                    </p>
                    <div className="flex justify-center space-x-1">
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{
                          backgroundColor: "#658ec7",
                          animationDelay: "0ms",
                        }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{
                          backgroundColor: "#c4a5c2",
                          animationDelay: "200ms",
                        }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{
                          backgroundColor: "#658ec7",
                          animationDelay: "400ms",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto p-6">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-full">
                    <div className="p-6">
                      {gptContent ? (
                        <div
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            lineHeight: "1.7",
                            fontSize: "14px",
                          }}
                        >
                          {gptContent}
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-gray-400 text-3xl">📄</span>
                          </div>
                          <h5 className="text-lg font-semibold text-gray-700 mb-2">
                            No Analysis Available
                          </h5>
                          <p className="text-gray-500">
                            No AI analysis content found for this test
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Footer */}
            <div className="bg-white p-6 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
              <div className="text-sm text-gray-500">
                {gptContent && !loadingGpt && (
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Analysis completed • {new Date().toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {gptContent && !loadingGpt && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(gptContent);
                    }}
                    className="text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400"
                  >
                    📋 Copy
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleGptDialogClose}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 shadow-md"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRawDialog && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowRawDialog(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-[100vw] max-w-4xl max-h-[90vh] border border-[#e5e7eb] flex flex-col "
            onClick={(e) => e.stopPropagation()}
            style={{ height: "90vh" }}
          >
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h4 className="text-lg font-semibold">{rawFileName}</h4>
            </div>

            <div
              className="p-6 overflow-y-auto scrollbar-clear text-sm text-gray-700 flex-grow"
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
