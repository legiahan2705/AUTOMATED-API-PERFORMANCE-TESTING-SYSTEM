"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import TestDetailDialog from "@/components/TestDetailDialog";
import CompareTestDialog from "@/components/CompareTestDialog";
import { useEffect, useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import toast from "react-hot-toast";
import ColoredCell from "@/components/ui/colored-cell";
import {
  PostmanDurationFormatter,
  QuickP95Formatter,
  ScriptP95Formatter,
  ErrorRateFormatter,
  FailRateFormatter,
} from "@/utils/testFormatters";

interface TestRun {
  id: number;
  created_at: string;
  sub_type: string;
  summary?: any;
  duration?: number | null;
}

interface TestHistoryScheduledProps {
  projectId?: number;
  scheduleId?: number;
  mode: "project" | "schedule";
  refreshTrigger?: number;
  // Các props để tùy chỉnh giao diện
  showTitle?: boolean;
  showFilters?: boolean;
  showCompare?: boolean;
  showActions?: boolean;
  maxHeight?: string;
  className?: string;
  // Để có thể truyền data từ bên ngoài (cho schedule detail)
  externalData?: TestRun[];
  loading?: boolean;
  // Để fix sub_type khi dùng cho schedule (không cần filter)
  fixedSubType?: string;
}

export default function TestHistoryScheduled({
  projectId,
  scheduleId,
  mode,
  refreshTrigger = 0,
  showTitle = true,
  showFilters = true,
  showCompare = true,
  showActions = true,
  maxHeight = "280px",
  className = "",
  externalData,
  loading: externalLoading = false,
  fixedSubType,
}: TestHistoryScheduledProps) {
  const [testHistory, setTestHistory] = useState<TestRun[]>([]);
  const [selectedSubType, setSelectedSubType] = useState<string>(
    fixedSubType || "postman"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [openDetail, setOpenDetail] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);

  const [selectedCompareIds, setSelectedCompareIds] = useState<number[]>([]);
  const [openCompare, setOpenCompare] = useState(false);
  const [internalLoading, setInternalLoading] = useState(false);

  // Sử dụng external data nếu có, nếu không thì dùng internal state
  const currentTestHistory = externalData || testHistory;
  const isLoading = externalLoading || internalLoading;

  const testA = currentTestHistory.find((t) => t.id === selectedCompareIds[0]);
  const testB = currentTestHistory.find((t) => t.id === selectedCompareIds[1]);

  const testATime = testA
    ? new Date(testA.created_at).toLocaleString("vi-VN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const testBTime = testB
    ? new Date(testB.created_at).toLocaleString("vi-VN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  function toggleCompareSelection(id: number) {
    setSelectedCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      } else {
        if (prev.length < 2) return [...prev, id];
        toast.error("Chỉ chọn tối đa 2 test để so sánh.");
        return prev;
      }
    });
  }

  function handleCompare() {
    if (selectedCompareIds.length !== 2) {
      toast.error("Vui lòng chọn đúng 2 test để so sánh.");
      return;
    }
    setOpenCompare(true);
  }

  function handleDeleteTest(testId: number) {
    toast(
      (t) => (
        <div>
          <p>Bạn có chắc muốn xoá test này?</p>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await api.get(`/test-runs/${testId}/delete`);
                  toast.success("Đã xoá test thành công.");
                  if (!externalData) {
                    fetchTestHistory();
                  }
                } catch {
                  toast.error("Không thể xoá test. Vui lòng thử lại.");
                }
              }}
            >
              Xác nhận
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.dismiss(t.id)}
            >
              Huỷ
            </Button>
          </div>
        </div>
      ),
      { duration: 5000 }
    );
  }

  function summaryToMap(summaryArray: any[] = []) {
    return summaryArray.reduce((acc, item) => {
      acc[item.name] = item;
      return acc;
    }, {} as Record<string, any>);
  }

  useEffect(() => {
    // Chỉ fetch data nội bộ khi không có external data
    if (
      !externalData &&
      ((mode === "project" && projectId) || (mode === "schedule" && scheduleId))
    ) {
      fetchTestHistory();
    }
  }, [
    projectId,
    scheduleId,
    selectedSubType,
    sortOrder,
    refreshTrigger,
    mode,
    externalData,
    fixedSubType,
  ]);

  async function fetchTestHistory() {
    if (externalData) return; // Không fetch nếu đã có external data

    setInternalLoading(true);
    try {
      let endpoint = "";
      const params: any = {
        sort: sortOrder,
        sub_type: fixedSubType || selectedSubType,
      };

      if (mode === "project" && projectId) {
        endpoint = "/test-runs/history";
        params.projectId = projectId;
      } else if (mode === "schedule" && scheduleId) {
        endpoint = `/test-runs/schedule/${scheduleId}`;
        // Có thể cần điều chỉnh params cho schedule mode
      }

      if (["quick", "script"].includes(fixedSubType || selectedSubType)) {
        params.category = "performance";
      }

      const res = await api.get(endpoint, { params });
      setTestHistory(res.data);
      setSelectedCompareIds([]);
    } catch (error) {
      console.error("Fetch test history error:", error);
      toast.error("Không thể tải lịch sử test.");
    } finally {
      setInternalLoading(false);
    }
  }

  function viewDetail(testId: number) {
    setSelectedTestId(testId);
    setOpenDetail(true);
  }

  function renderColumns() {
    const currentSubType = fixedSubType || selectedSubType;
    return (
      <>
        {currentSubType === "quick" && (
          <>
            <TableHead className="text-center w-[80px]">Requests</TableHead>
            <TableHead className="text-center w-[120px]">
              P95 Duration
            </TableHead>
            <TableHead className="text-center w-[120px]">Error Rate</TableHead>
          </>
        )}
        {currentSubType === "script" && (
          <>
            <TableHead className="text-center w-[80px]">Metrics</TableHead>
            <TableHead className="text-center w-[120px]">
              P95 Duration
            </TableHead>
            <TableHead className="text-center w-[120px]">Error Rate</TableHead>
          </>
        )}
        {currentSubType === "postman" && (
          <>
            <TableHead className="text-center w-[80px]">Requests</TableHead>
            <TableHead className="text-center w-[120px]">Duration</TableHead>
            <TableHead className="text-center w-[120px]">Fail Rate</TableHead>
          </>
        )}

        {showActions && (
          <TableHead className="text-center w-[50px]"></TableHead>
        )}
        {showCompare && (
          <TableHead className="text-center w-[50px]"></TableHead>
        )}
      </>
    );
  }

  function renderRow(test: TestRun) {
    const checked = selectedCompareIds.includes(test.id);
    const checkbox = showCompare ? (
      <TableCell className="text-center">
        <input
          type="checkbox"
          checked={checked}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleCompareSelection(test.id)}
          className="cursor-pointer"
        />
      </TableCell>
    ) : null;

    const actions = showActions ? (
      <TableCell className="text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer hover:bg-[#c4a5c2] "
            >
              <MoreHorizontal className="h-4 w-4 cursor-pointer " />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                viewDetail(test.id);
              }}
              className="cursor-pointer hover:bg-[#c4a5c2] hover:text-white"
            >
              View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTest(test.id);
              }}
              className="cursor-pointer hover:bg-[#c4a5c2] hover:text-white"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    ) : null;

    switch (test.sub_type) {
      case "quick": {
        const summaryMap = summaryToMap(test.summary);

        const totalReqs = summaryMap["http_reqs"]?.val ?? 0;
        const p95Val = summaryMap["http_req_duration_p95"]?.val ?? null;
        const errorRateRaw = summaryMap["error_rate"]?.val ?? 0;

        const p95Parsed = QuickP95Formatter.parse(p95Val);
        const errorRateParsed = ErrorRateFormatter.parse(errorRateRaw);

        return (
          <>
            <TableCell className="text-center">{totalReqs || "-"}</TableCell>
            <TableCell className="text-center">
              <ColoredCell
                value={p95Parsed.value}
                getColor={() => QuickP95Formatter.color(p95Val)}
                suffix={p95Parsed.suffix}
              />
            </TableCell>
            <TableCell className="text-center">
              <ColoredCell
                value={errorRateParsed.value}
                getColor={() => ErrorRateFormatter.color(errorRateRaw)}
                suffix={errorRateParsed.suffix}
              />
            </TableCell>

            {actions}
            {checkbox}
          </>
        );
      }

      case "script": {
        const metrics = test.summary?.total_metrics ?? "-";
        const p95Raw =
          test.summary?.metrics_overview?.http_req_duration?.["p(95)"] ?? null;
        const p95Parsed = ScriptP95Formatter.parse(p95Raw);
        const errorRateRaw =
          (test.summary?.metrics_overview?.http_req_failed?.value ?? 0) * 100;
        const errorRateParsed = ErrorRateFormatter.parse(errorRateRaw);

        return (
          <>
            <TableCell className="text-center">{metrics}</TableCell>
            <TableCell className="text-center">
              <ColoredCell
                value={p95Parsed.value}
                getColor={() => ScriptP95Formatter.color(p95Raw)}
                suffix={p95Parsed.suffix}
              />
            </TableCell>
            <TableCell className="text-center">
              <ColoredCell
                value={errorRateParsed.value}
                getColor={() => ErrorRateFormatter.color(errorRateRaw)}
                suffix={errorRateParsed.suffix}
              />
            </TableCell>

            {actions}
            {checkbox}
          </>
        );
      }

      case "postman": {
        const requests = test.summary?.total_requests ?? 0;
        const durRaw = test.summary?.duration_ms ?? test.duration ?? null;
        const durParsed = PostmanDurationFormatter.parse(durRaw);
        const passes = test.summary?.passes ?? 0;
        const fails = test.summary?.failures ?? 0;
        const total = passes + fails;
        const failRateRaw = total > 0 ? (fails / total) * 100 : 0;
        const failRateParsed = FailRateFormatter.parse(failRateRaw);

        return (
          <>
            <TableCell className="text-center">{requests || "-"}</TableCell>
            <TableCell className="text-center">
              <ColoredCell
                value={durParsed.value}
                getColor={() => PostmanDurationFormatter.color(durRaw)}
                suffix={durParsed.suffix}
              />
            </TableCell>
            <TableCell className="text-center">
              <ColoredCell
                value={failRateParsed.value}
                getColor={() => FailRateFormatter.color(failRateRaw)}
                suffix={failRateParsed.suffix}
              />
            </TableCell>

            {actions}
            {checkbox}
          </>
        );
      }

      default:
        return (
          <>
            <TableCell className="text-center">{test.sub_type}</TableCell>
            {actions}
            {checkbox}
          </>
        );
    }
  }

  // Lọc dữ liệu theo selectedSubType nếu cần
  const currentSubType = fixedSubType || selectedSubType;
  const filteredHistory =
    showFilters && !fixedSubType
      ? currentTestHistory.filter((test) => test.sub_type === currentSubType)
      : currentTestHistory;

  return (
    <>
      <div
        className={`border-none shadow-none rounded-none ${className}`}
      >
        { (
          <div className="flex items-end">
            {showFilters && (
              <div className="flex gap-2 ">
                {!fixedSubType && (
                  <Select
                    value={selectedSubType}
                    onValueChange={setSelectedSubType}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Test Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postman">API (Postman)</SelectItem>
                      <SelectItem value="quick">Quick Performance</SelectItem>
                      <SelectItem value="script">
                        K6 Script Performance
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Select
                  value={sortOrder}
                  onValueChange={(val) => setSortOrder(val as "asc" | "desc")}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
                {showCompare && (
                 <Button
              onClick={handleCompare}
              disabled={selectedCompareIds.length !== 2}
              className="bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] text-white hover:opacity-90 transition mb-8"
            >
              Compare
            </Button>
                )}
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Đang tải...</span>
          </div>
        ) : (
          <div
            className="overflow-y-auto scrollbar-clear"
            style={{ maxHeight }}
          >
            <Table className="min-w-full table-fixed ">
              <TableHeader className="sticky top-0 border-none">
                <TableRow>
                  <TableHead className="text-center w-[50px]">STT</TableHead>
                  <TableHead className="w-[180px]">Execution Date</TableHead>
                  {renderColumns()}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        4 + (showActions ? 1 : 0) + (showCompare ? 1 : 0)
                      }
                      className="text-center text-gray-500"
                    >
                      Không có dữ liệu test nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((test, index) => (
                    <TableRow
                      key={test.id}
                      onClick={() => viewDetail(test.id)}
                      className="cursor-pointer hover:bg-[#cae0ffb5]"
                    >
                      <TableCell className="text-center w-[50px]">
                        {index + 1}
                      </TableCell>
                      <TableCell className="w-[180px]">
                        {new Date(test.created_at).toLocaleString("vi-VN", {
                          hour12: false,
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      {renderRow(test)}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <TestDetailDialog
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        testId={selectedTestId}
      />

      {showCompare && (
        <CompareTestDialog
          open={openCompare}
          onOpenChange={setOpenCompare}
          idA={selectedCompareIds[0]}
          idB={selectedCompareIds[1]}
          subType={currentSubType as "quick" | "postman" | "script"}
          title={`Compare ${
            currentSubType === "quick"
              ? "Quick Performance Test"
              : currentSubType === "postman"
              ? "API (Postman) Test"
              : "K6 Script Performance Test"
          } - ${testATime} vs ${testBTime}`}
          testATime={testATime}
          testBTime={testBTime}
        />
      )}
    </>
  );
}
