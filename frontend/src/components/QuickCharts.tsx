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
import React, { useEffect, useRef } from "react";

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

export const QuickCharts = ({
  data,
  onReady,
}: {
  data: any[];
  onReady?: (imgs: { bar?: string; doughnut?: string }) => void;
}) => {
  const barRef = useRef<any>(null);
  const doughnutRef = useRef<any>(null);
  const hasExported = useRef(false); // ✅ chặn gọi nhiều lần

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

  //  Xuất base64 chỉ 1 lần
 useEffect(() => {
  if (!hasExported.current && (barRef.current || doughnutRef.current)) {
    const timeout = setTimeout(() => {
      const barImg = barRef.current?.toBase64Image("image/png", 1.0);
      const doughnutImg = doughnutRef.current?.toBase64Image("image/png", 1.0);

      onReady?.({ bar: barImg, doughnut: doughnutImg });
      hasExported.current = true;
    }, 300); //  đợi 300ms cho chart vẽ xong

    return () => clearTimeout(timeout);
  }
}, [data, onReady]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mt-6">
      {(checksPass > 0 || checksFail > 0) && (
  <div>
    <h4 className="text-sm font-semibold mb-2">Checks Pass vs Fail</h4>
    <div style={{ height: "300px" }}>   {/* fix height để chart không bị kéo dài */}
      <Bar
        ref={barRef}
        data={barChartData}
        options={{
          responsive: true,
          maintainAspectRatio: false, // cho phép fit chiều cao 300px
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: { beginAtZero: true },
          },
        }}
      />
    </div>
  </div>
)}


      <div>
        <h4 className="text-sm font-semibold mb-2">Error Rate</h4>
        <div className="flex flex-col items-center">
          <div className="w-48 h-48">
            <Doughnut
              ref={doughnutRef}
              data={errorRateData}
              options={{
                cutout: "70%",
                responsive: true,
                plugins: { legend: { display: false } },
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

          <p className="text-center mt-2 text-lg font-bold">
            {errorRate.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
};
