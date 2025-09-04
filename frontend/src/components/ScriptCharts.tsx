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
import { Bar, Line } from "react-chartjs-2";
import React, { useEffect, useRef, useState } from "react";

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

export const ScriptCharts = ({
  data,
  onReady,
}: {
  data: ScriptDetail[];
  onReady?: (img: string) => void;
}) => {
  const chartRef = useRef<any>(null);
  const hasExported = useRef(false);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

  const metrics = data.filter((d) => d.type === "metric");

  // Chart dạng overview - chỉ hiển thị Average và P95 (quan trọng nhất)
  const overviewChartData = {
    labels: metrics.map((m) => shortenName(m.name)),
    datasets: [
      {
        label: "Average",
        data: metrics.map((m) => m.avg ?? 0),
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderColor: "#3b82f6",
        borderWidth: 2,
      },
      {
        label: "P95 (95th percentile)",
        data: metrics.map((m) => m.p95 ?? 0),
        backgroundColor: "rgba(139, 92, 246, 0.6)",
        borderColor: "#8b5cf6",
        borderWidth: 2,
      },
    ],
  };

  // Chart chi tiết - hiển thị tất cả metrics
  const detailedChartData = {
    labels: metrics.map((m) => shortenName(m.name)),
    datasets: [
      {
        label: "Min",
        data: metrics.map((m) => m.min ?? null),
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.3,
        pointRadius: 4,
      },
      {
        label: "Avg",
        data: metrics.map((m) => m.avg ?? null),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.3,
        pointRadius: 4,
        borderWidth: 3,
      },
      {
        label: "P90",
        data: metrics.map((m) => m.p90 ?? null),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        tension: 0.3,
        pointRadius: 4,
      },
      {
        label: "P95",
        data: metrics.map((m) => m.p95 ?? null),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        tension: 0.3,
        pointRadius: 4,
        borderWidth: 3,
      },
      {
        label: "Max",
        data: metrics.map((m) => m.max ?? null),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: "top" as const,
        labels: {
          padding: 20,
          font: { size: 12, weight: 'bold' as const }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        cornerRadius: 6,
        callbacks: {
          title: (tooltipItems: any) => {
            const index = tooltipItems[0].dataIndex;
            return `${metrics[index].name}`;
          },
          label: (context: any) => {
            const value = context.raw;
            const unit = context.dataset.label.includes('duration') || 
                        context.dataset.label.includes('time') ? 'ms' : '';
            return `${context.dataset.label}: ${value}${unit}`;
          }
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          autoSkip: false,
          font: { size: 11 }
        },
        grid: {
          display: false
        }
      },
      y: { 
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: { size: 11 }
        }
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: "top" as const,
        labels: {
          padding: 20,
          font: { size: 12, weight: 'bold' as const }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        cornerRadius: 6,
        callbacks: {
          title: (tooltipItems: any) => {
            const index = tooltipItems[0].dataIndex;
            return `${metrics[index].name}`;
          },
          label: (context: any) => {
            const value = context.raw;
            const unit = context.dataset.label.includes('duration') || 
                        context.dataset.label.includes('time') ? 'ms' : '';
            return `${context.dataset.label}: ${value}${unit}`;
          }
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 0,
          autoSkip: false,
          font: { size: 11 }
        },
        grid: {
          display: false
        }
      },
      y: { 
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          font: { size: 11 }
        }
      },
    },
  };

  // Xuất ảnh chart 1 lần duy nhất sau khi render
  useEffect(() => {
    if (chartRef.current && !hasExported.current) {
      const timeout = setTimeout(() => {
        const img = chartRef.current?.toBase64Image("image/png", 1.0);
        if (img) {
          onReady?.(img);
          hasExported.current = true;
        }
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [data, onReady, viewMode]);

  return (
    <div className=" rounded-lg ">
      <div className="p-4 border-b ">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-lg font-semibold text-gray-800">Performance Metrics</h4>
            <p className="text-sm text-gray-600 mt-1">
              {viewMode === 'overview' 
                ? 'Key performance indicators (Average & 95th percentile)'
                : 'Detailed breakdown of all metrics'
              }
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('overview')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'overview'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'detailed'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {viewMode === 'overview' ? (
          <div>
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>Average:</strong> Typical response time | 
                <strong> P95:</strong> 95% of requests were faster than this value
              </p>
            </div>
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${Math.max(metrics.length * 120, 600)}px`, height: "400px" }}>
                <Bar ref={chartRef} data={overviewChartData} options={barChartOptions} />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                <strong>Min/Max:</strong> Fastest/Slowest response | 
                <strong> P90/P95:</strong> 90%/95% of requests were faster
              </p>
            </div>
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${Math.max(metrics.length * 120, 600)}px`, height: "400px" }}>
                <Line ref={chartRef} data={detailedChartData} options={lineChartOptions} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="p-4 border-t">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {Math.min(...metrics.map(m => m.min ?? Infinity)).toFixed(1)}ms
            </div>
            <div className="text-xs text-gray-600">Best Response</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {(metrics.reduce((sum, m) => sum + (m.avg ?? 0), 0) / metrics.length).toFixed(1)}ms
            </div>
            <div className="text-xs text-gray-600">Average</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {(metrics.reduce((sum, m) => sum + (m.p95 ?? 0), 0) / metrics.length).toFixed(1)}ms
            </div>
            <div className="text-xs text-gray-600">P95 Average</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {Math.max(...metrics.map(m => m.max ?? 0)).toFixed(1)}ms
            </div>
            <div className="text-xs text-gray-600">Worst Response</div>
          </div>
        </div>
      </div>
    </div>
  );
};