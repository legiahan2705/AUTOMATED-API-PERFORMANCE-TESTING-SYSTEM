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
}

export default function TestHistorySection({
  projectId,
  refreshTrigger,
}: {
  projectId: number;
  refreshTrigger: number;
}) {
  const [testHistory, setTestHistory] = useState<TestRun[]>([]);
  const [selectedSubType, setSelectedSubType] = useState<string>("postman");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [openDetail, setOpenDetail] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);

  const [selectedCompareIds, setSelectedCompareIds] = useState<number[]>([]);
  const [openCompare, setOpenCompare] = useState(false);

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
                  fetchTestHistory();
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

  useEffect(() => {
    if (projectId) fetchTestHistory();
  }, [projectId, selectedSubType, sortOrder, refreshTrigger]);

  async function fetchTestHistory() {
    try {
      const params: any = {
        projectId,
        sort: sortOrder,
        sub_type: selectedSubType,
      };
      if (["quick", "script"].includes(selectedSubType)) {
        params.category = "performance";
      }
      const res = await api.get("/test-runs/history", { params });
      setTestHistory(res.data);
      setSelectedCompareIds([]);
    } catch {
      toast.error("Không thể tải lịch sử test.");
    }
  }

  function viewDetail(testId: number) {
    setSelectedTestId(testId);
    setOpenDetail(true);
  }

  function renderColumns() {
    return (
      <>
        {selectedSubType === "quick" && (
          <>
            <TableHead className="text-center w-[80px]">Requests</TableHead>
            <TableHead className="text-center w-[120px]">
              P95 Duration
            </TableHead>
            <TableHead className="text-center w-[120px]">Error Rate</TableHead>
          </>
        )}
        {selectedSubType === "script" && (
          <>
            <TableHead className="text-center w-[80px]">Metrics</TableHead>
            <TableHead className="text-center w-[120px]">
              P95 Duration
            </TableHead>
            <TableHead className="text-center w-[120px]">Error Rate</TableHead>
          </>
        )}
        {selectedSubType === "postman" && (
          <>
            <TableHead className="text-center w-[80px]">Requests</TableHead>
            <TableHead className="text-center w-[120px]">Duration</TableHead>
            <TableHead className="text-center w-[120px]">Fail Rate</TableHead>
          </>
        )}

        <TableHead className="text-center w-[50px]"></TableHead>
        <TableHead className="text-center w-[50px]"></TableHead>
      </>
    );
  }

  function renderRow(test: TestRun) {
    const checked = selectedCompareIds.includes(test.id);
    const checkbox = (
      <TableCell className="text-center">
        <input
          type="checkbox"
          checked={checked}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleCompareSelection(test.id)}
          className="cursor-pointer"
        />
      </TableCell>
    );

    const actions = (
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
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteTest(test.id);
              }}
              className="cursor-pointer hover:bg-[#c4a5c2] hover:text-white"
            >
              Xóa test
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    );

    switch (test.sub_type) {
      case "quick": {
        const totalReqs = test.summary?.http_reqs?.value ?? 0;
        const fails = test.summary?.http_req_failed?.fails ?? 0;
        const p95Val = test.summary?.http_req_duration_p95?.value;
        const avgVal = test.summary?.http_req_duration_avg?.value;

        let p95Raw;
        let p95Formatter;

        if (p95Val != null) {
          p95Raw = p95Val;
          p95Formatter = QuickP95Formatter;
        } else {
          p95Raw = avgVal;
          p95Formatter = PostmanDurationFormatter;
        }

        const p95Parsed = p95Formatter.parse(p95Raw);
        const errorRateRaw = totalReqs > 0 ? (fails / totalReqs) * 100 : 0;
        const errorRateParsed = ErrorRateFormatter.parse(errorRateRaw);

        return (
          <>
            <TableCell className="text-center">{totalReqs || "-"}</TableCell>
            <TableCell className="text-center">
              <ColoredCell
                value={p95Parsed.value}
                getColor={() => p95Formatter.color(p95Raw)}
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
            {checkbox}
            {actions}
          </>
        );
      }

      case "postman": {
        const requests = test.summary?.total_requests ?? 0;
        const durRaw = test.summary?.duration_ms ?? null;
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

  return (
    <>
      <div className="mt-6 border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Test History</h3>
          <div className="flex gap-2 items-center">
            <Select value={selectedSubType} onValueChange={setSelectedSubType}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Loại test" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postman">API (Postman)</SelectItem>
                <SelectItem value="quick">Quick Performance</SelectItem>
                <SelectItem value="script">K6 Script Performance</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortOrder}
              onValueChange={(val) => setSortOrder(val as "asc" | "desc")}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Mới nhất</SelectItem>
                <SelectItem value="asc">Cũ nhất</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleCompare}
              disabled={selectedCompareIds.length !== 2}
            >
              Compare
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[280px] scrollbar-clear">
          <Table className="min-w-full table-fixed border-collapse">
            <TableHeader className="sticky top-0 bg-white shadow">
              <TableRow>
                <TableHead className="text-center w-[50px]">STT</TableHead>
                <TableHead className="w-[180px]">Ngày chạy</TableHead>
                {renderColumns()}
              </TableRow>
            </TableHeader>
            <TableBody>
              {testHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    Không có dữ liệu test nào.
                  </TableCell>
                </TableRow>
              ) : (
                testHistory.map((test, index) => (
                  <TableRow
                    key={test.id}
                    onClick={() => viewDetail(test.id)}
                    className="cursor-pointer hover:bg-gray-50"
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
      </div>
      <TestDetailDialog
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        testId={selectedTestId}
      />

      <CompareTestDialog
        open={openCompare}
        onOpenChange={setOpenCompare}
        idA={selectedCompareIds[0]}
        idB={selectedCompareIds[1]}
        subType={selectedSubType as "quick" | "postman" | "script"}
        title={`Compare ${
          selectedSubType === "quick"
            ? "Quick Performance Test"
            : selectedSubType === "postman"
            ? "API (Postman) Test"
            : "K6 Script Performance Test"
        }
          - ${new Date(
            testHistory.find((t) => t.id === selectedCompareIds[0])
              ?.created_at ?? ""
          ).toLocaleDateString("vi-VN")}
          vs ${new Date(
            testHistory.find((t) => t.id === selectedCompareIds[1])
              ?.created_at ?? ""
          ).toLocaleDateString("vi-VN")}`}
      />
    </>
  );
}
