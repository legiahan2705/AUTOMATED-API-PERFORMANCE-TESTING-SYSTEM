// utils/testStatus.ts
import {
  getDurationColor,
  getP95Color,
  getErrorRateColor,
  getFailRateColor,
} from "@/utils/testColors";

export function getTestStatus(test: any) {
  const summary =
  test?.summary ??
  test?.testRun?.summary ??
  test?.testRun?.rawSummary ??
  {};


  // ===== Lấy dữ liệu =====
  const durationPostman = summary.duration_ms ?? null;
  const p95Quick = summary.http_req_duration_p95?.value ?? null;
  const p95Script = summary.metrics_overview?.http_req_duration?.["p(95)"] ?? null;

  const errorRatePostman = summary.error_rate?.value ?? null;
  const totalReqsQuick = summary.http_reqs?.value ?? 0;
  const failCountQuick = summary.http_req_failed?.fails ?? 0;
  const errorRateQuick =
    totalReqsQuick > 0 ? (failCountQuick / totalReqsQuick) * 100 : null;

  const errorRateScript = summary.metrics_overview?.http_req_failed?.value
    ? summary.metrics_overview.http_req_failed.value * 100
    : null;

  const failures = summary.failures ?? null;
  const passes = summary.passes ?? null;

  const failRatePostman =
    failures !== null && passes !== null && (failures + passes) > 0
      ? (failures / (failures + passes)) * 100
      : null;

  // ===== Check Failed =====
  const isFail =
    (errorRatePostman ?? -1) > 5 ||
    (errorRateQuick ?? -1) > 5 ||
    (errorRateScript ?? -1) > 5 ||
    (failRatePostman ?? -1) >= 20;

  if (isFail) {
    return { label: "Failed", color: "bg-red-100 text-red-600 rounded-full" };
  }

  // ===== Check Warning =====
  const isWarning =
    (durationPostman ?? -1) > 3000 ||
    (p95Quick ?? -1) > 200 ||
    (p95Script ?? -1) > 200 ||
    ((errorRatePostman ?? -1) > 0 && (errorRatePostman ?? -1) <= 5) ||
    ((errorRateQuick ?? -1) > 0 && (errorRateQuick ?? -1) <= 5) ||
    ((errorRateScript ?? -1) > 0 && (errorRateScript ?? -1) <= 5) ||
    ((failRatePostman ?? -1) > 0 && (failRatePostman ?? -1) < 20);

  if (isWarning) {
    return { label: "Warning", color: "bg-yellow-100 text-yellow-700 rounded-full" };
  }

  // ===== Passed =====
  return { label: "Passed", color: "bg-green-100 text-green-600 rounded-full" };
}
