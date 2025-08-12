// utils/testColors.ts
type Threshold = [number, string];

function createThresholdColorFn(thresholds: Threshold[]) {
  return (value: number | null) => {
    if (value == null) return "";
    for (const [limit, color] of thresholds) {
      if (value <= limit) return color;
    }
    return thresholds[thresholds.length - 1][1]; // fallback last color
  };
}

// Postman: thời gian toàn bộ collection (có thể dài hơn)
export const getDurationColor = createThresholdColorFn([
  [3000, "bg-green-100 text-green-700"],     // ≤ 3s: Rất tốt
  [10000, "bg-yellow-100 text-yellow-700"],  // ≤ 10s: Trung bình
  [30000, "bg-orange-100 text-orange-700"],  // ≤ 30s: Chậm
  [Infinity, "bg-red-100 text-red-700"],     // > 30s: Rất chậm
]);

// Quick + Script: thời gian phản hồi P95 (nhanh hơn, yêu cầu nghiêm hơn)
export const getP95Color = createThresholdColorFn([
  [500, "bg-green-100 text-green-700"],     // ≤ 500ms: OK
  [1000, "bg-yellow-100 text-yellow-700"],  // ≤ 1s: Chấp nhận
  [2000, "bg-orange-100 text-orange-700"],  // ≤ 2s: Chậm
  [Infinity, "bg-red-100 text-red-700"],    // > 2s: Quá chậm
]);

// Error Rate: rất nhỏ là tốt
export const getErrorRateColor = createThresholdColorFn([
  [0, "bg-green-100 text-green-700"],     // 0%: Không lỗi
  [5, "bg-yellow-100 text-yellow-700"],   // ≤ 5%: Có lỗi nhẹ
  [Infinity, "bg-red-100 text-red-700"],  // > 5%: Nhiều lỗi
]);

// Fail Rate: dùng cho test assertion trong Postman
export const getFailRateColor = createThresholdColorFn([
  [0, "bg-green-100 text-green-700"],      // 0%
  [5, "bg-yellow-100 text-yellow-700"],    // ≤ 5%
  [20, "bg-orange-100 text-orange-700"],   // ≤ 20%
  [Infinity, "bg-red-100 text-red-700"],   // > 20%
]);
