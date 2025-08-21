export interface TimeSeriesItem {
  timestamp?: string;
  time?: string;
  created_at?: string;
  date?: string;
  response_time?: number;
  responseTime?: number;
  duration?: number;
  value?: number;
  metric?: string;
  data?: { value?: number };
  test?: { responseTime?: number };
  [key: string]: any;
}

export interface ChartDataPoint {
  time: number; // thời gian từ đầu test (ms)
  testA?: number;
  testB?: number;
}

export function prepareChartData(
  dataA: TimeSeriesItem[],
  dataB: TimeSeriesItem[]
): ChartDataPoint[] {
  if (!dataA?.length && !dataB?.length) return [];

  // Chuẩn hóa data: chuyển timestamp sang ms, loại bỏ null
  const normalize = (data: TimeSeriesItem[]) =>
    (data || [])
      .map((item) => {
        const timeStr = extractTime(item);
        const value = extractResponseTime(item);
        if (!timeStr || value === null) return null;
        const timeMs = new Date(timeStr).getTime(); // chắc chắn number
        return { timeMs, value };
      })
      .filter(
        (item): item is { timeMs: number; value: number } => item !== null
      );

  const normalizedA = normalize(dataA);
  const normalizedB = normalize(dataB);

  // Lấy thời điểm bắt đầu của từng test
  const startA = normalizedA.length ? normalizedA[0].timeMs : 0;
  const startB = normalizedB.length ? normalizedB[0].timeMs : 0;

  // Tìm chiều dài dài nhất
  const maxLen = Math.max(normalizedA.length, normalizedB.length);

  const chartData: ChartDataPoint[] = [];

  for (let i = 0; i < maxLen; i++) {
    const itemA = normalizedA[i];
    const itemB = normalizedB[i];

    chartData.push({
      time: i * 100, // mỗi point cách nhau 100ms, hoặc có thể dùng itemA?.timeMs - startA để chuẩn xác
      testA: itemA?.value,
      testB: itemB?.value,
    });
  }

  return chartData;
}

function extractTime(item: TimeSeriesItem): string | undefined {
  return item.timestamp || item.time || item.created_at || item.date;
}

function extractResponseTime(item: TimeSeriesItem): number | null {
  if (typeof item.response_time === "number") return item.response_time;
  if (typeof item.responseTime === "number") return item.responseTime;
  if (typeof item.duration === "number") return item.duration;
  if (typeof item.value === "number") return item.value;
  if (
    item.metric === "http_req_duration" &&
    typeof item.data?.value === "number"
  )
    return item.data.value;
  if (item.test?.responseTime && typeof item.test.responseTime === "number")
    return item.test.responseTime;
  return null;
}
