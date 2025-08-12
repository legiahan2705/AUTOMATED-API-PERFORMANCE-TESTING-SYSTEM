"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import React from "react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function getRandomColor(index: number) {
  const colors = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
    "#0ea5e9", "#14b8a6", "#f97316", "#eab308", "#a855f7", "#f43f5e",
  ];
  return colors[index % colors.length];
}

export const PostmanCharts = ({ data }: { data: any[] }) => {
  const passCount = data.filter((d) => d.is_passed).length;
  const failCount = data.length - passCount;

  const maxAssertions = Math.max(passCount, failCount);
  const dynamicHeight = Math.min(400 + maxAssertions * 20, 800); // auto scale but limit max

  const responseTimeChart = {
    labels: data.map((d) => d.endpoint),
    datasets: [
      {
        label: "Response Time (ms)",
        data: data.map((d) => d.response_time),
        backgroundColor: data.map((_, i) => getRandomColor(i)),
        barThickness: 40,
        maxBarThickness: 50,
      },
    ],
  };

  const assertionsChart = {
    labels: ["Pass", "Fail"],
    datasets: [
      {
        label: "Assertions",
        data: [passCount, failCount],
        backgroundColor: ["#22c55e", "#ef4444"],
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 gap-15">
      {/* Assertions */}
      <div style={{ height: `${dynamicHeight}px` }} className="p-4">
        <h4 className="text-base font-semibold mb-3">Assertions Pass vs Fail</h4>
        <Bar
          data={assertionsChart}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true },
            },
            scales: {
              y: { beginAtZero: true },
            },
          }}
        />
      </div>

      {/* Response Time */}
      <div className="overflow-x-auto p-4 ">
        <h4 className="text-base font-semibold mb-3">Response Time per Request</h4>
        <div style={{ minWidth: `${data.length * 100}px`, height: "500px" }}>
          <Bar
            data={responseTimeChart}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    title: (tooltipItems) => {
                      const index = tooltipItems[0].dataIndex;
                      return data[index].endpoint;
                    },
                  },
                },
              },
              scales: {
                x: {
                  ticks: {
                    autoSkip: false,
                    padding: 10,
                    maxRotation: 0,
                    minRotation: 0,
                  },
                },
                y: { beginAtZero: true },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};
