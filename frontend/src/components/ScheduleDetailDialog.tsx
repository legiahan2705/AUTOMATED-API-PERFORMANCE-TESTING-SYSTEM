"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent } from "@/components/ui/card";

import api from "@/lib/api";
import toast from "react-hot-toast";

interface Project {
  id: number;
  name: string;
}

type SubType = "postman" | "quick" | "script";

interface ScheduledTestDetail {
  id: number;
  project: Project | null;
  userId: number;
  projectId: number;
  category: "api" | "perf";
  subType: SubType;
  cronExpression: string;
  isActive: boolean | number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  emailTo?: string | null;
  configJson?: any;
  scheduledTestId?: number | null;
  scheduledTest?: ScheduledTestDetail | null;
  testRuns?: TestRun[];
  inputFilePath?: string | null;
  inputFileName?: string | null;
  inputFileType?: string | null;
  inputFileSize?: number | null;
  inputFileUrl?: string | null;
  inputFileContent?: string | null;
  inputFileContentType?: string | null;
  inputFileContentSize?: number | null;
  inputFileContentUrl?: string | null;
  rawResultPath?: string | null;
  summaryPath?: string | null;
  timeSeriesPath?: string | null;
  rawResult?: any;
  summary?: any;
  timeSeries?: any;
  originalFileName?: string | null;
  status?: string;
  
  duration?: number;
  p95?: number;
  errorRate?: number;
  failRate?: number;
  perfQuickResultDetails?: any[];


}

interface TestRun {
  id: number;
  status: string;
  createdAt: string;
  duration?: number;
  p95?: number;
  errorRate?: number;
  failRate?: number;
  scheduledTestId?: number | null;
  scheduledTest?: ScheduledTestDetail | null;
  projectId: number;
  project?: Project | null;
  category: "api" | "performance";
  subType: SubType;
  configJson?: any;
  inputFilePath?: string | null;

  perfQuickResultDetails?: any[];
  inputFileName?: string | null;
  inputFileType?: string | null;


  inputFileSize?: number | null;
  inputFileUrl?: string | null;
  inputFileContent?: string | null;
  inputFileContentType?: string | null;
  inputFileContentSize?: number | null;
  inputFileContentUrl?: string | null;
  rawResultPath?: string | null;
  summaryPath?: string | null;
  timeSeriesPath?: string | null;

  rawResult?: any;
  summary?: any;
  timeSeries?: any;

  originalFileName?: string | null;
}

function subtypeLabel(s: SubType) {
  return s === "postman"
    ? "API (Postman) Test"
    : s === "quick"
    ? "Quick Performance Test"
    : "K6 Script Performance Test";
}

function parseCronExpression(cronExpr: string) {
  const parts = cronExpr?.trim()?.split(/\s+/) ?? [];
  if (parts.length === 5) {
    return {
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4],
    };
  }
  return {
    minute: "*",
    hour: "*",
    dayOfMonth: "*",
    month: "*",
    dayOfWeek: "*",
  };
}

function generateHumanReadable(config: {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}) {
  const parts: string[] = [];

  if (config.minute === "*") parts.push("mỗi phút");
  else if (config.minute.startsWith("*/"))
    parts.push(`mỗi ${config.minute.slice(2)} phút`);
  else parts.push(`phút ${config.minute}`);

  if (config.hour !== "*") {
    if (config.hour.startsWith("*/"))
      parts.push(`mỗi ${config.hour.slice(2)} giờ`);
    else parts.push(`lúc ${config.hour}:00`);
  }

  if (config.dayOfMonth !== "*") {
    if (config.dayOfMonth.startsWith("*/"))
      parts.push(`mỗi ${config.dayOfMonth.slice(2)} ngày`);
    else parts.push(`ngày ${config.dayOfMonth}`);
  }

  if (config.dayOfWeek !== "*") {
    const dayNames = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    parts.push(dayNames[parseInt(config.dayOfWeek)] || config.dayOfWeek);
  }

  return parts.join(", ");
}

interface Props {
  open: boolean;
  scheduleId: number | null;
  onClose: () => void;
}

const ScheduleDetailDialog: React.FC<Props> = ({
  open,
  scheduleId,
  onClose,
}) => {
  const [schedule, setSchedule] = useState<ScheduledTestDetail | null>(null);
  const [email, setEmail] = useState<string>("");
  const [cron, setCron] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  useEffect(() => {
    if (open && scheduleId) {
      fetchSchedule(scheduleId);
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => document.body.classList.remove("overflow-hidden");
  }, [open, scheduleId]);

  async function fetchSchedule(id: number) {
    setLoading(true);
    try {
      const res = await api.get<ScheduledTestDetail>(`/scheduled-tests/${id}`);
      setSchedule(res.data);
      setEmail(res.data?.emailTo || "");
      setCron(res.data?.cronExpression || "");
      await fetchTestRuns(id);
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      console.error("Fetch schedule detail error:", err);
      toast.error("Không thể tải thông tin schedule.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTestRuns(id: number) {
    setLoadingRuns(true);
    try {
      const res = await api.get<TestRun[]>(`/test-runs/schedule/${id}`);
      setTestRuns(res.data);
    } catch (err) {
      console.error("Fetch test runs error:", err);
      toast.error("Không thể tải lịch sử test.");
    } finally {
      setLoadingRuns(false);
    }
  }

  async function saveChanges() {
    if (!scheduleId) return;
    setSaving(true);
    try {
      await api.put(`/scheduled-tests/${scheduleId}`, {
        emailTo: email || null,
        cronExpression: cron,
      });
      await fetchSchedule(scheduleId);
      toast.success("Cập nhật thành công!");
    } catch (err) {
      console.error("Update schedule error:", err);
      toast.error("Cập nhật thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleScheduleStatus() {
    if (!schedule || !scheduleId) return;
    const newStatus = !schedule.isActive;

    try {
      await api.put(`/scheduled-tests/${scheduleId}`, {
        isActive: newStatus,
      });
      await fetchSchedule(scheduleId);
      toast.success(`Đã ${newStatus ? "kích hoạt" : "tạm dừng"} lịch test!`);
    } catch (err) {
      console.error("Toggle schedule status error:", err);
      toast.error("Không thể thay đổi trạng thái lịch test.");
    }
  }

  async function runScheduleNow() {
    if (!schedule) return;

    try {
      let url = "";
      if (schedule.subType === "postman") {
        url = `/test-run/postman/${schedule.projectId}`;
      } else if (schedule.subType === "quick") {
        url = `/test-run/performance/quick/${schedule.projectId}`;
      } else if (schedule.subType === "script") {
        url = `/test-run/performance/k6/${schedule.projectId}`;
      }

      await api.post(url);
      toast.success("Đã gửi yêu cầu chạy test thành công!");
      setTimeout(() => {
        fetchTestRuns(schedule.id);
      }, 2000);
    } catch (err) {
      console.error("Run schedule now error:", err);
      toast.error("Không thể chạy test ngay lúc này.");
    }
  }

  if (!open) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-[var(--font-nunito)]">
        <div className="bg-white rounded-xl shadow-xl p-8 flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p>Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-[var(--font-nunito)]">
        <div className="bg-white rounded-xl shadow-xl p-8 flex flex-col items-center gap-4">
          <p className="text-red-600">Không thể tải thông tin schedule.</p>
          <Button onClick={onClose}>Đóng</Button>
        </div>
      </div>
    );
  }

  const cronReadable = generateHumanReadable(
    parseCronExpression(cron || schedule.cronExpression)
  );

  const isActive = Boolean(schedule.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-[var(--font-nunito)]">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[95vw] max-w-6xl max-h-[95vh] h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-10"
        >
          ✕
        </Button>

        {/* Header */}
        <div className="mb-6 pr-12">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">
              {schedule.project?.name ?? `Project #${schedule.projectId}`} — 
              Schedule #{schedule.id}
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {isActive ? "Đang hoạt động" : "Tạm dừng"}
              </span>
            </div>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <strong>Loại test:</strong> {subtypeLabel(schedule.subType)}
            </p>
            <p>
              <strong>Tạo lúc:</strong>{" "}
              {new Date(schedule.createdAt).toLocaleString("vi-VN", {
                hour12: false,
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p>
              <strong>Cập nhật:</strong>{" "}
              {new Date(schedule.updatedAt).toLocaleString("vi-VN", {
                hour12: false,
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {schedule.lastRunAt && (
              <p>
                <strong>Chạy gần nhất:</strong>{" "}
                {new Date(schedule.lastRunAt).toLocaleString("vi-VN", {
                  hour12: false,
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <div className="flex gap-3">
            <Button
              onClick={runScheduleNow}
              className="bg-blue-600 hover:bg-blue-700"
            >
              ▶ Chạy ngay
            </Button>
            <Button
              onClick={toggleScheduleStatus}
              variant={isActive ? "destructive" : "default"}
            >
              {isActive ? "⏸ Tạm dừng" : "▶ Kích hoạt"}
            </Button>
          </div>
        </div>

        {/* Edit Form */}
        <Card className="mb-6">
          <CardContent className="space-y-4 p-4">
            <h3 className="font-semibold text-lg mb-3">Cài đặt lịch</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email nhận báo cáo</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="abc@example.com"
                  type="email"
                />
              </div>
              <div>
                <Label htmlFor="cron">Cron Expression</Label>
                <Input
                  id="cron"
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  placeholder="0 0 * * *"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {cron
                    ? `→ ${cronReadable}`
                    : `→ ${generateHumanReadable(
                        parseCronExpression(schedule.cronExpression)
                      )}`}
                </p>
              </div>
            </div>
            <Button
              onClick={saveChanges}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? "Đang lưu..." : "💾 Lưu thay đổi"}
            </Button>
          </CardContent>
        </Card>

        {/* Test History Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg mb-3">Lịch sử test</h3>
          {loadingRuns ? (
            <p>Đang tải lịch sử test...</p>
          ) : (
            <div className="space-y-2">
              {testRuns.length > 0 ? (
                testRuns.map((run) => (
                  <div
                    key={run.id}
                    className="p-4 border rounded-lg bg-white shadow-sm"
                  >
                    <h4 className="font-semibold">
                      Test #{run.id} - {run.status}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Thời gian:{" "}
                      {new Date(run.createdAt).toLocaleString("vi-VN", {
                        hour12: false,
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {run.duration && (
                      <p className="text-sm text-gray-600">
                        Thời gian chạy: {run.duration} ms
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p>Chưa có lịch sử test nào.</p>
              )}
            </div>
          )}


       
      </div>
      </div>
    </div>
      );
    
};

export default ScheduleDetailDialog;
