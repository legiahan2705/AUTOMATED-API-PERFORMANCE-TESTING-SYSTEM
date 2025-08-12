"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";

type TestRun = {
  projectName: string;
  testType: string;
  createdAt: string | Date;
  details: any[];
};

type ReportProps = {
  testRun: TestRun;
  children: React.ReactNode;
};

export const TestReport: React.FC<ReportProps> = ({ testRun, children }) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const exportPdf = async () => {
    if (!reportRef.current) return;

    // Lấy innerHTML báo cáo + bọc style inline trong <style>
    const html = `
      <html>
        <head>
          <style>
            body {
              font-family: 'Nunito', sans-serif;
              color: #2563eb;
              background-color: #e0f2fe;
              padding: 16px;
            }
            h1 {
              color: #2563eb;
            }
            p {
              margin: 4px 0;
            }
            /* Bạn có thể thêm các style khác nếu cần */
          </style>
        </head>
        <body>
          ${reportRef.current.innerHTML}
        </body>
      </html>
    `;

    try {
      const response = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });

      if (!response.ok) {
        alert("Failed to generate PDF");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeProjectName = testRun.projectName
        .replace(/\s+/g, "_")
        .replace(/[^\w\-]/g, "");
      a.href = url;
      a.download = `test-report-${safeProjectName}-${Date.now()}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Error while generating PDF");
      console.error(error);
    }
  };

  return (
    <div>
      <Button onClick={exportPdf} className="mb-4">
        Export PDF
      </Button>

      <div
        ref={reportRef}
        className="p-4 rounded shadow-md"
        style={{
          color: "#2563eb", // tương tự text-blue-600
          backgroundColor: "#e0f2fe", // tương tự bg-blue-100
        }}
      >
        <h1>Test Report</h1>
        <p>Project: {testRun.projectName}</p>
        <p>Test Type: {testRun.testType}</p>
        <p>Created at: {new Date(testRun.createdAt).toLocaleString()}</p>
        {/* Render thêm nội dung chi tiết test nếu có */}
        {children}
      </div>
    </div>
  );
};
