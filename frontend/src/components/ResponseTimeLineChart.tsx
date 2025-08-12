"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ResponseTimeLineChart({
  dataA,
  dataB,
}: {
  dataA: any[];
  dataB: any[];
}) {
  const mergedData = [...dataA.map((d) => ({
    ...d,
    test: "A",
    label: new Date(d.timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  })),
  ...dataB.map((d) => ({
    ...d,
    test: "B",
    label: new Date(d.timestamp).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }))];

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          width={800}
          height={300}
          data={mergedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="duration"
            data={dataA}
            stroke="#8884d8"
            name="Test A"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="duration"
            data={dataB}
            stroke="#82ca9d"
            name="Test B"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
