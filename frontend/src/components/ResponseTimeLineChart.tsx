import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  ChartDataPoint,
  prepareChartData,
  TimeSeriesItem,
} from "../utils/prepareChartData";

interface Props {
  dataA: TimeSeriesItem[] | null;
  dataB: TimeSeriesItem[] | null;
  testNameA?: string;
  testNameB?: string;
  height?: number;
  pointSpacing?: number; // khoảng cách giữa các point
  minChartWidth?: number; // width tối thiểu
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[160px]">
        <p className="font-semibold text-gray-800 text-sm mb-2 border-b border-gray-100 pb-1">
          Time: {label} ms
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center gap-2">
            <span className="text-gray-700 text-sm">{entry.name}</span>
            <span className="font-semibold text-gray-900 text-sm">
              {entry.value} ms
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ResponseTimeLineChart({
  dataA,
  dataB,
  testNameA = "Test A",
  testNameB = "Test B",
  height = 400,
  pointSpacing = 80,
  minChartWidth = 800,
}: Props) {
  const chartData: ChartDataPoint[] = useMemo(() => {
    return prepareChartData(dataA || [], dataB || []);
  }, [dataA, dataB]);

  if (!chartData.length) return <p>No data</p>;

  const calculatedWidth = Math.max(
    Math.max(dataA?.length || 0, dataB?.length || 0) * pointSpacing,
    minChartWidth
  );

  return (
    <div
      className="overflow-x-auto max-w-[830px]"
      style={{ paddingBottom: "8px" }}
    >
      <div style={{ width: `${calculatedWidth}px` }}>
        <LineChart
          width={calculatedWidth}
          height={height}
          data={chartData} // giữ nguyên data gốc, không offset
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="time"
            stroke="#64748b"
            fontSize={12}
            label={{
              value: "Time from start (ms)",
              position: "insideBottom",
              offset: -5,
            }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            label={{
              value: "Response Time (ms)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" />
          <Line
            type="monotone"
            dataKey="testA"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={{ r: 3 }}
            name={testNameA}
          />
          <Line
            type="monotone"
            dataKey="testB"
            stroke="#06b6d4"
            strokeWidth={3}
            dot={{ r: 3, stroke: "#fff", strokeWidth: 2 }} // marker dễ phân biệt
            strokeDasharray="5 5" // line dashed
            name={testNameB}
          />
        </LineChart>
      </div>
    </div>
  );
}
