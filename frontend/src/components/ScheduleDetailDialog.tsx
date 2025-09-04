"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TestHistoryScheduled from "./TestHistoryScheduled";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Play,
  Pause,
  Save,
  X,
  Calendar,
  Mail,
  Activity,
  Settings,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Zap,
  Globe,
  Timer,
  TrendingUp,
  PenIcon,
  GlobeIcon,
  Folder,
  PlayCircle,
  AlertCircle,
} from "lucide-react";

import api from "@/lib/api";
import toast from "react-hot-toast";
import CronBuilder from "./CronBuilder";

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
}

interface TestRun {
  id: number;
  project_id: number;
  category: "api" | "performance";
  sub_type: SubType;
  created_at: string;
  duration?: number | null;
  summary?: any;
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

  if (config.minute === "*") parts.push("every minute");
  else if (config.minute.startsWith("*/"))
    parts.push(`every ${config.minute.slice(2)} minutes`);
  else parts.push(`at minute ${config.minute}`);

  if (config.hour !== "*") {
    if (config.hour.startsWith("*/"))
      parts.push(`every ${config.hour.slice(2)} hours`);
    else parts.push(`at ${config.hour}:00`);
  }

  if (config.dayOfMonth !== "*") {
    if (config.dayOfMonth.startsWith("*/"))
      parts.push(`every ${config.dayOfMonth.slice(2)} days`);
    else parts.push(`on day ${config.dayOfMonth}`);
  }

  if (config.dayOfWeek !== "*") {
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
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
  const [runningNow, setRunningNow] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [showCronBuilder, setShowCronBuilder] = useState(false);

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
      toast.error("Failed to load schedule information.");
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
      toast.error("Failed to load test history.");
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
      toast.success("Updated successfully!");
      setShowCronBuilder(false);
    } catch (err) {
      console.error("Update schedule error:", err);
      toast.error("Update failed. Please try again.");
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
      toast.success(`Schedule ${newStatus ? "activated" : "paused"}!`);
    } catch (err) {
      console.error("Toggle schedule status error:", err);
      toast.error("Failed to change schedule status.");
    }
  }

  async function runScheduleNow() {
    if (!schedule) return;

    setRunningNow(true);
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
      toast.success("Test execution request sent successfully!");
      setTimeout(() => {
        fetchTestRuns(schedule.id);
        setRefreshTrigger((n) => n + 1);
      }, 2000);
    } catch (err) {
      console.error("Run schedule now error:", err);
      toast.error("Failed to execute test now.");
    } finally {
      setRunningNow(false);
    }
  }

  if (!open) return null;

  // Enhanced Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center font-[var(--font-nunito)] bg-black/70">
        <div className="bg-[#cae0ff] rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.6)] p-12 flex flex-col items-center gap-6 animate-slide-in max-w-md">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-[#658ec7]/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-[#658ec7] border-r-[#c4a5c2] rounded-full animate-spin"></div>
            <div className="absolute inset-3 bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] rounded-full flex items-center justify-center">
              <Settings className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-[#658ec7] mb-2">
              Loading Schedule
            </h3>
            <p className="text-gray-600">Fetching schedule information...</p>
          </div>
          <div className="flex justify-center space-x-2">
            <div
              className="w-2 h-2 bg-[#658ec7] rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            ></div>
            <div
              className="w-2 h-2 bg-[#8ba3d1] rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            ></div>
            <div
              className="w-2 h-2 bg-[#b8a4c9] rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></div>
            <div
              className="w-2 h-2 bg-[#c4a5c2] rounded-full animate-bounce"
              style={{ animationDelay: "450ms" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced Error state
  if (!schedule) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center font-[var(--font-nunito)] bg-black/70">
        <div className="bg-[#cae0ff] rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.6)] p-12 flex flex-col items-center gap-6 animate-slide-in max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-red-200 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-red-600 mb-2">
              Failed to Load
            </h3>
            <p className="text-gray-600 mb-4">
              Schedule information could not be retrieved
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => scheduleId && fetchSchedule(scheduleId)}
              variant="outline"
              className="text-[#658ec7] border-[#658ec7]"
            >
              Try Again
            </Button>
            <Button
              onClick={onClose}
              className="bg-[#658ec7] hover:bg-[#c4a5c2] text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const cronReadable = generateHumanReadable(
    parseCronExpression(cron || schedule.cronExpression)
  );

  const isActive = Boolean(schedule.isActive);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-[var(--font-nunito)]">
      <div className="bg-[#cae0ff] rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.6)] w-[100vw] max-w-4xl max-h-[90vh]  overflow-y-auto scrollbar-clear relative">
        {/* Enhanced Header */}
        <div className="relative px-8 py-6 ">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 hover:bg-white/20 rounded-full w-10 h-10"
          >
            <X className="h-5 w-5 text-gray-600" />
          </Button>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] shadow-lg">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#658ec7]">
                Schedule Management
              </h1>
              <p className="text-gray-600">
                Configure automated test execution
              </p>
            </div>
          </div>

          {/* Enhanced Project Info Card */}
          <div className="bg-white rounded-xl p-6  mb-[-15px] shadow-xl border border-white/40 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-[#658ec7]/10">
                  <Folder className="w-6 h-6 text-[#658ec7]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#658ec7] mb-1">
                    {schedule.project?.name || `Project #${schedule.projectId}`}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-[#658ec7]/10">
                      {schedule.subType === "postman" ? (
                        <Zap className="w-3 h-3 text-[#658ec7]" />
                      ) : schedule.subType === "quick" ? (
                        <Timer className="w-3 h-3 text-[#658ec7]" />
                      ) : (
                        <TrendingUp className="w-3 h-3 text-[#658ec7]" />
                      )}
                    </div>
                    <span className="text-gray-600 text-sm font-medium">
                      {subtypeLabel(schedule.subType)}
                    </span>
                  </div>
                </div>
              </div>

              <Badge
                className={`
                  px-4 py-2 text-sm font-bold rounded-full border-2 transition-all duration-300 shadow-md
                  ${
                    isActive
                      ? "bg-green-500 text-white border-green-400 shadow-green-200"
                      : "bg-gray-400 text-white border-gray-300 shadow-gray-200"
                  }
                `}
              >
                {isActive ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-200 mr-2 animate-pulse" />
                    Active
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gray-200 mr-2" />
                    Paused
                  </>
                )}
              </Badge>
            </div>

            {/* Timeline and Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-[#658ec7]/5 rounded-lg p-4 border border-[#658ec7]/20">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-[#658ec7]" />
                  <span className="text-sm font-medium text-gray-600">
                    Created
                  </span>
                </div>
                <p className="text-gray-800 font-semibold">
                  {new Date(schedule.createdAt).toLocaleString("en-US", {
                    hour12: false,
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              {schedule.lastRunAt && (
                <div className="bg-[#c4a5c2]/5 rounded-lg p-4 border border-[#c4a5c2]/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-[#c4a5c2]" />
                    <span className="text-sm font-medium text-gray-600">
                      Last Run
                    </span>
                  </div>
                  <p className="text-gray-800 font-semibold">
                    {new Date(schedule.lastRunAt).toLocaleString("en-US", {
                      hour12: false,
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={toggleScheduleStatus}
                className={`
                  font-semibold px-6 py-2 rounded-lg shadow-lg transition-all duration-200
                  ${
                    isActive
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }
                `}
              >
                {isActive ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-8 space-y-8">
          {/* Enhanced Settings Card */}
          <Card className="shadow-xl border-0 overflow-hidden mb-10">
            <CardContent className="p-8 pt-1 pb-1 relative">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-xl bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-[#658ec7]">
                    Schedule Settings
                  </h3>
                  <p className="text-gray-600">
                    Configure execution schedule and notifications
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Email Configuration */}
                <div className="bg-gradient-to-r from-[#658ec7]/5 to-[#c4a5c2]/5 rounded-xl p-6 border border-[#658ec7]/20">
                  <Label className="text-[#658ec7] flex items-center gap-3 font-bold text-lg mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-[#658ec7] to-[#c4a5c2]">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    Email Notifications
                  </Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address for test reports..."
                    type="email"
                    className="bg-white border-2 border-[#658ec7]/20 focus:border-[#658ec7] focus:ring-4 focus:ring-[#658ec7]/20 transition-all duration-200 h-12 rounded-lg px-4 text-base font-medium"
                  />
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    Reports will be sent automatically after each scheduled test
                    execution
                  </p>
                </div>

                {/* Schedule Configuration */}
                <div className="bg-gradient-to-r from-[#c4a5c2]/5 to-[#658ec7]/5 rounded-xl p-6 border border-[#c4a5c2]/20">
                  <Label className="text-[#658ec7] flex items-center gap-3 font-bold text-lg mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-[#c4a5c2] to-[#658ec7]">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    Execution Schedule
                  </Label>

                  {!showCronBuilder ? (
                    <div className="flex items-center justify-between bg-white rounded-lg p-4 border-2 border-[#c4a5c2]/20 hover:border-[#c4a5c2]/40 transition-colors">
                      <div>
                        <p className="text-lg font-semibold text-gray-800 mb-1">
                          {cronReadable || "No schedule configured"}
                        </p>
                        <p className="text-sm text-gray-500 font-mono">
                          {cron || schedule.cronExpression || "* * * * *"}
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowCronBuilder(true)}
                        className="bg-gradient-to-r from-[#c4a5c2] to-[#658ec7] hover:from-[#b896b3] hover:to-[#5a7fb8] text-white"
                      >
                        <PenIcon className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-4 border-2 border-[#c4a5c2]/20">
                      <CronBuilder
                        value={cron}
                        onChange={setCron}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 mt-3 pt-6  border-gray-200">
                <Button
                  onClick={saveChanges}
                  disabled={saving}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold px-8 py-3 rounded-lg shadow-lg transition-all duration-200"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    setShowCronBuilder(false);
                    setEmail(schedule?.emailTo || "");
                    setCron(schedule?.cronExpression || "");
                  }}
                  variant="outline"
                  className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold px-8 py-3 rounded-lg transition-all duration-200"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Test History Section */}
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardContent className="p-0 relative">
              <div className="p-8 pb-1  pt-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-[#c4a5c2] to-[#658ec7] shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-2xl text-[#658ec7]">
                      Test Execution History
                    </h3>
                    <p className="text-gray-600">
                      Monitor performance and track test results over time
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-8 pb-8">
                <div className="bg-white border-gray-100">
                  <TestHistoryScheduled
                    projectId={schedule.projectId}
                    scheduleId={schedule.id}
                    mode="schedule"
                    externalData={testRuns}
                    loading={loadingRuns}
                    fixedSubType={schedule.subType}
                    className="border-none shadow-none rounded-xl"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDetailDialog;
