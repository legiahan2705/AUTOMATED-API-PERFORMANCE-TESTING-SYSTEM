"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  RefreshCw,
  Search,
  Filter,
  Play,
  Pause,
  Trash2,
  Clock,
  Calendar,
  Loader2,
  AlertCircle,
  Activity,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

interface Project {
  id: number;
  name: string;
}

type SubType = "postman" | "quick" | "script";

export interface ScheduledTest {
  id: number;
  project: Project | null;
  projectId: number;
  category: "api" | "perf";
  subType: SubType;
  cronExpression: string;
  isActive: boolean | number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const toBool = (v: boolean | number) => !!Number(v);

function parseCronExpression(cronExpr: string) {
  const parts = cronExpr.trim().split(/\s+/);
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

const subtypeLabel = (s: SubType) =>
  s === "postman" ? "Postman" : s === "quick" ? "Quick Test" : "K6 Script";

const getSubtypeIcon = (s: SubType) => {
  switch (s) {
    case "postman":
      return <Activity className="w-4 h-4" />;
    case "quick":
      return <Clock className="w-4 h-4" />;
    case "script":
      return <Calendar className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

const statusBadge = (active: boolean) => (
  <Badge
    variant={active ? "default" : "secondary"}
    className="flex items-center gap-1.5 font-medium"
  >
    {active ? (
      <>
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        Active
      </>
    ) : (
      <>
        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
        Paused
      </>
    )}
  </Badge>
);

export default function ScheduledTestsTable() {
  const [data, setData] = useState<ScheduledTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">(
    "all"
  );

  const searchRef = useRef<number | null>(null);

  const fetchSchedules = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await axios.get<ScheduledTest[]>(
        `${API_BASE}/scheduled-tests`
      );
      setData(res.data || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch scheduled tests");
      console.error("Fetch schedules error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    const itv = setInterval(fetchSchedules, 30000);
    return () => clearInterval(itv);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((item) => {
      const active = toBool(item.isActive);
      const statusOk =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? active
          : !active;

      const matchQ =
        !q ||
        item.project?.name.toLowerCase().includes(q) ||
        item.subType.toLowerCase().includes(q) ||
        String(item.id).includes(q);

      return statusOk && matchQ;
    });
  }, [data, search, statusFilter]);

  const toggleActive = async (item: ScheduledTest) => {
    const newActive = !toBool(item.isActive);
    try {
      await axios.put(`${API_BASE}/scheduled-tests/${item.id}`, {
        isActive: newActive,
      });
      await fetchSchedules();
    } catch (e) {
      console.error("Toggle active failed", e);
      alert("Failed to toggle schedule status");
    }
  };

  const deleteSchedule = async (id: number) => {
    try {
      await axios.delete(`${API_BASE}/scheduled-tests/${id}`);
      await fetchSchedules();
    } catch (e) {
      console.error("Delete failed", e);
      alert("Failed to delete schedule");
    }
  };

  const runNow = async (item: ScheduledTest) => {
    try {
      let url = "";
      if (item.subType === "postman") {
        url = `${API_BASE}/test-run/postman/${item.projectId}`;
      } else if (item.subType === "quick") {
        url = `${API_BASE}/test-run/performance/quick/${item.projectId}`;
      } else if (item.subType === "script") {
        url = `${API_BASE}/test-run/performance/k6/${item.projectId}`;
      }
      await axios.post(url);
      alert("Test execution request sent successfully");
    } catch (e) {
      console.error("Run now failed", e);
      alert("Failed to execute test");
    }
  };

  const onSearchChange = (v: string) => {
    setSearch(v);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = window.setTimeout(() => {}, 250);
  };

  return (
    <div className="border-0 p-0 m-0 ">
      <div className="container mx-auto max-w-7xl border-0 p-0 m-0">
        <Card className="bg-gradient-card  overflow-hidden border-0 m-0 p-0 rounded-t-lg ">
          {/* Header */}
          <CardHeader className="bg-[#658ec7] text-white p-6 font-[var(--font-nunito)] border-0  rounded-t-lg">
            <div className="flex items-center justify-between border-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Scheduled Tests</h2>
                  <p className="text-white/80">
                    Manage and monitor your automated test schedules
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={fetchSchedules}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 p-0">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by project, type, or ID..."
                    className="pl-10 md:w-[320px] bg-background/50 border-border/50 focus:bg-background"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <Select
                    value={statusFilter}
                    onValueChange={(v: "all" | "active" | "paused") => {
                      setStatusFilter(v);
                    }}
                  >
                    <SelectTrigger className="w-[180px] pl-10 bg-background/50 border-border/50">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="paused">Paused Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span>
                    {data.filter((s) => toBool(s.isActive)).length} Active
                  </span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  <span>
                    {data.filter((s) => !toBool(s.isActive)).length} Paused
                  </span>
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="  shadow-soft overflow-hidden border-0 p-0">
              <div className="overflow-auto max-h-[600px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/50">
                <Table>
                  <TableHeader className="sticky top-0  backdrop-blur-sm  z-10">
                    <TableRow>
                      <TableHead className="w-[80px] text-center font-semibold">
                        #
                      </TableHead>
                      <TableHead className="font-semibold">Project</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Schedule</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Last Run</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">
                              Loading scheduled tests...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : err ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                              <AlertCircle className="w-6 h-6 text-destructive" />
                            </div>
                            <div>
                              <p className="text-destructive font-medium">
                                Error Loading Data
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {err}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={fetchSchedules}
                            >
                              Try Again
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">
                                No scheduled tests found
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {search || statusFilter !== "all"
                                  ? "Try adjusting your filters"
                                  : "Create your first scheduled test to get started"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((s, index) => {
                        const active = toBool(s.isActive);
                        return (
                          <TableRow
                            key={s.id}
                            className="hover:bg-[#cae0ffb5] transition-colors"
                          >
                            <TableCell className="text-center font-mono text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {s.project?.name ?? `Project #${s.projectId}`}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getSubtypeIcon(s.subType)}
                                <span className="font-medium">
                                  {subtypeLabel(s.subType)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm text-primary font-medium">
                                  {generateHumanReadable(
                                    parseCronExpression(s.cronExpression)
                                  )}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>{statusBadge(active)}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {s.lastRunAt ? (
                                  <>
                                    <div className="font-medium">
                                      {formatDistanceToNow(
                                        new Date(s.lastRunAt),
                                        {
                                          addSuffix: true,
                                        }
                                      )}
                                    </div>
                                    <div className="text-muted-foreground">
                                      {new Date(
                                        s.lastRunAt
                                      ).toLocaleDateString()}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">
                                    Never executed
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => runNow(s)}
                                  className="hover:bg-primary hover:text-primary-foreground"
                                >
                                  <Play className="w-3 h-3 mr-1" />
                                  Run
                                </Button>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={
                                        active
                                          ? "hover:bg-warning hover:text-warning-foreground"
                                          : "hover:bg-success hover:text-success-foreground"
                                      }
                                    >
                                      {active ? (
                                        <>
                                          <Pause className="w-3 h-3 mr-1" />
                                          Pause
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-3 h-3 mr-1" />
                                          Resume
                                        </>
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        {active
                                          ? "Pause Schedule"
                                          : "Resume Schedule"}
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {active
                                          ? "This will pause the scheduled test until you resume it manually."
                                          : "This will resume the scheduled test according to the configured cron schedule."}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => toggleActive(s)}
                                      >
                                        {active ? "Pause" : "Resume"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="hover:bg-destructive hover:text-destructive-foreground"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete Schedule
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete schedule
                                        #{s.id}? This action cannot be undone
                                        and will permanently remove the
                                        scheduled test and its cron job.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteSchedule(s.id)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Footer Stats */}
            {data.length > 0 && (
              <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Auto-refresh every 30 seconds</span>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
