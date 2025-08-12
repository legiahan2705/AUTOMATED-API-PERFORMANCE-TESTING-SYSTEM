// utils/testFormatters.ts
import {
  getDurationColor,
  getP95Color,
  getErrorRateColor,
  getFailRateColor,
} from "./testColors";

// Parse Duration: đổi số hiển thị (2 chữ số), giữ ms gốc cho màu
function parseDuration(ms: number | null) {
  if (ms == null) return { value: null, suffix: "" };
  if (ms >= 1000) {
    const seconds = ms / 1000;
    return { value: Number(seconds.toFixed(2)), suffix: " s" };
  }
  return { value: Number(ms.toFixed(2)), suffix: " ms" };
}

// Parse Percent (auto nhân 100 nếu < 1) và làm tròn 2 chữ số
function parsePercent(val: number | null) {
  if (val == null) return { value: null, suffix: "" };
  const percent = val <= 1 ? val * 100 : val;
  return { value: Number(percent.toFixed(2)), suffix: " %" };
}

// --- Formatters ---
export const PostmanDurationFormatter = {
  color: (ms: number | null) => getDurationColor(ms), // dùng ms gốc cho màu
  parse: parseDuration,
};

export const QuickP95Formatter = {
  color: (ms: number | null) => getP95Color(ms),
  parse: parseDuration,
};

export const ScriptP95Formatter = {
  color: (ms: number | null) => getP95Color(ms),
  parse: parseDuration,
};

export const ErrorRateFormatter = {
  color: getErrorRateColor,
  parse: parsePercent,
};

export const FailRateFormatter = {
  color: getFailRateColor,
  parse: parsePercent,
};
