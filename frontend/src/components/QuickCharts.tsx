"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import React from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const QuickCharts = ({ data }: { data: any[] }) => {
  const checksPass = data.find((d) => d.metric_name === "checks_pass")?.value ?? 0;
  const checksFail = data.find((d) => d.metric_name === "checks_fail")?.value ?? 0;
  const errorRate = data.find((d) => d.metric_name === "error_rate")?.value ?? 0;

  const barChartData = {
    labels: ["Pass", "Fail"],
    datasets: [
      {
        label: "Checks",
        data: [checksPass, checksFail],
        backgroundColor: ["#22c55e", "#ef4444"],
      },
    ],
  };

  const errorRateData = {
    labels: ["Error Rate", "Success Rate"],
    datasets: [
      {
        data: [errorRate, 100 - errorRate],
        backgroundColor: ["#ef4444", "#22c55e"],
        hoverBackgroundColor: ["#f87171", "#4ade80"],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mt-6">
      {(checksPass > 0 || checksFail > 0) && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Checks Pass vs Fail</h4>
          <Bar data={barChartData} options={{ responsive: true }} />
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Error Rate</h4>
        <div className="flex flex-col items-center">
          <div className="w-48 h-48">
            <Doughnut
              data={errorRateData}
              options={{
                cutout: "70%",
                responsive: true,
                plugins: {
                  legend: {
                    display: false, // tắt legend mặc định
                  },
                },
              }}
            />
          </div>

          {/* Custom Legend */}
          <div className="flex space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-sm bg-red-500"></div>
              <span className="text-sm">Error Rate</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-sm bg-green-500"></div>
              <span className="text-sm">Success Rate</span>
            </div>
          </div>

          <p className="text-center mt-2 text-lg font-bold">{errorRate.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
};
