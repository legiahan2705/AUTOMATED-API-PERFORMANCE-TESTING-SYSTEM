"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import React from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

type ScriptDetail = {
  type: "metric";
  name: string;
  avg?: number;
  min?: number;
  max?: number;
  p90?: number;
  p95?: number;
};

const shortenName = (name: string) => {
  return name
    .replace("http_req_", "")
    .replace("tls_", "tls ")
    .replace("expected_response:true", "ok")
    .replace(/_/g, " ");
};

export const ScriptCharts = ({ data }: { data: ScriptDetail[] }) => {
  const metrics = data.filter((d) => d.type === "metric");

  const lineChartData = {
    labels: metrics.map((m) => shortenName(m.name)),
    datasets: [
      {
        label: "Avg",
        data: metrics.map((m) => m.avg ?? null),
        borderColor: "#3b82f6",
        backgroundColor: "#3b82f6",
        tension: 0.3,
      },
      {
        label: "Min",
        data: metrics.map((m) => m.min ?? null),
        borderColor: "#22c55e",
        backgroundColor: "#22c55e",
        tension: 0.3,
      },
      {
        label: "Max",
        data: metrics.map((m) => m.max ?? null),
        borderColor: "#ef4444",
        backgroundColor: "#ef4444",
        tension: 0.3,
      },
      {
        label: "P90",
        data: metrics.map((m) => m.p90 ?? null),
        borderColor: "#eab308",
        backgroundColor: "#eab308",
        tension: 0.3,
      },
      {
        label: "P95",
        data: metrics.map((m) => m.p95 ?? null),
        borderColor: "#8b5cf6",
        backgroundColor: "#8b5cf6",
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems: any) => {
            const index = tooltipItems[0].dataIndex;
            return metrics[index].name; // full name in tooltip
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
  <div >
    <h4 className="text-sm font-semibold mb-2">Response Time Metrics</h4>
    <div className="overflow-x-auto  p-4">
      <div style={{ minWidth: `${metrics.length * 100}px`, height: "500px" }}>
        <Line data={lineChartData} options={chartOptions} />
      </div>
    </div>
  </div>
);

};
