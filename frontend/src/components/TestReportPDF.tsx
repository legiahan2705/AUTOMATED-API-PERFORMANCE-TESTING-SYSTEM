"use client";
import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// import 3 chart component
import { PostmanCharts } from "./PostmanCharts";
import { QuickCharts } from "./QuickCharts";
import { ScriptCharts } from "./ScriptCharts";

interface TestReportPDFProps {
  detail: any;
}

export default function TestReportPDF({ detail }: TestReportPDFProps) {
  const [postmanImgs, setPostmanImgs] = useState<{
    assertions?: string;
    response?: string;
  } | null>(null);

  const [quickImgs, setQuickImgs] = useState<{
    bar?: string;
    doughnut?: string;
  } | null>(null);

  const [scriptImg, setScriptImg] = useState<string | null>(null);
  const [isChartsReady, setIsChartsReady] = useState(false);

  const subType = detail?.testRun?.sub_type;
  const testData = detail?.details || [];

  // Kiểm tra xem chart đã ready chưa dựa trên loại test
  useEffect(() => {
    let ready = false;

    if (subType === "postman") {
      ready = Boolean(postmanImgs?.assertions || postmanImgs?.response);
    } else if (subType === "quick") {
      ready = Boolean(quickImgs?.bar || quickImgs?.doughnut);
    } else if (subType === "script") {
      ready = Boolean(scriptImg);
    }

    setIsChartsReady(ready);
  }, [subType, postmanImgs, quickImgs, scriptImg]);

  function getTestTypeName(type: string) {
    switch (type) {
      case "quick":
        return "Quick Performance Test";
      case "script":
        return "K6 Script Performance Test";
      case "postman":
        return "API (Postman) Test";
      default:
        return type;
    }
  }

  function getTestStatusInfo(detail: any) {
    const summary = detail?.summary || {};

    if (subType === "postman") {
      const passes = summary.passes || 0;
      const failures = summary.failures || 0;
      const total = passes + failures;
      const successRate = total > 0 ? (passes / total) * 100 : 0;

      return {
        status:
          successRate >= 90
            ? "PASSED"
            : successRate >= 60
            ? "WARNING"
            : "FAILED",
        color:
          successRate >= 90
            ? [34, 197, 94]
            : successRate >= 60
            ? [234, 179, 8]
            : [239, 68, 68],
        details: `${passes}/${total} tests passed (${successRate.toFixed(1)}%)`,
      };
    } else if (subType === "quick") {
      // Simplified status logic for quick tests
      return {
        status: "COMPLETED",
        color: [59, 130, 246],
        details: `${
          Array.isArray(summary) ? summary.length : Object.keys(summary).length
        } metrics collected`,
      };
    } else if (subType === "script") {
      const totalChecks = summary.total_checks || 0;
      return {
        status: totalChecks > 0 ? "COMPLETED" : "NO_CHECKS",
        color: totalChecks > 0 ? [34, 197, 94] : [156, 163, 175],
        details: `${summary.total_metrics || 0} metrics, ${totalChecks} checks`,
      };
    }

    return {
      status: "UNKNOWN",
      color: [156, 163, 175],
      details: "Status information not available",
    };
  }

  // Helper để thêm chart với kích thước cố định
  function addChartToNewPage(
    doc: jsPDF,
    title: string,
    img?: string,
    landscape = false
  ) {
    if (!img || !img.startsWith("data:image")) {
      console.warn("Chart image không hợp lệ, bỏ qua:", title);
      return false;
    }

    // Tạo trang mới
    doc.addPage(landscape ? "a4" : "a4", landscape ? "landscape" : "portrait");

    // Lấy kích thước trang
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 20;
    const titleHeight = 15;

    // Tiêu đề chart
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, margin);

    // Kích thước chart
    const chartWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin - titleHeight - margin;
    let chartHeight;

    if (landscape) {
      chartHeight = availableHeight * 0.8; // 80% chiều cao có sẵn
    } else {
      chartHeight = Math.min(availableHeight * 0.7, 180); // Tối đa 180px cho portrait
    }

    try {
      doc.addImage(
        img,
        "PNG",
        margin,
        margin + titleHeight + 10,
        chartWidth,
        chartHeight
      );
      return true;
    } catch (err) {
      console.error("addImage failed for", title, err);
      return false;
    }
  }

  function generateSummaryTable(doc: jsPDF, startY: number) {
    const summary = detail?.summary || {};
    let rows: any[] = [];

    if (subType === "postman") {
      const totalAssertions = (summary.passes || 0) + (summary.failures || 0);
      const successRate =
        totalAssertions > 0
          ? ((summary.passes / totalAssertions) * 100).toFixed(1)
          : "0";

      rows = [
        ["Collection Name", summary.collection_name || "Unknown"],
        ["Total Requests", (summary.total_requests || 0).toString()],
        ["Duration (ms)", (summary.duration_ms || 0).toString()],
        ["Passes", (summary.passes || 0).toString()],
        ["Failures", (summary.failures || 0).toString()],
        ["Success Rate (%)", successRate + "%"],
        ["Total Assertions", totalAssertions.toString()],
        [
          "Average Response Time",
          summary.avg_response_time
            ? `${summary.avg_response_time.toFixed(2)}ms`
            : "N/A",
        ],
      ];
    } else if (subType === "quick") {
      // Quick test - xử lý cả array và object
      if (Array.isArray(summary)) {
        rows = summary.slice(0, 15).map((metric: any) => [
          // Giới hạn 15 rows
          metric.name || metric.metric_name || "Unknown",
          `${metric.val || metric.value || 0} ${metric.unit || ""}`,
        ]);
      } else {
        const entries = Object.entries(summary);
        rows = entries
          .slice(0, 15)
          .map(([key, val]: any) => [
            key,
            typeof val === "object"
              ? "Complex Object"
              : String(val).substring(0, 50),
          ]);
      }
    } else if (subType === "script") {
      rows = [
        ["Script File", summary.original_file_name || "N/A"],
        ["Total Metrics", (summary.total_metrics || 0).toString()],
        ["Total Checks", (summary.total_checks || 0).toString()],
      ];

      // Thêm key metrics
      if (summary.metrics_overview) {
        const keyMetrics = [
          "http_req_duration",
          "http_req_failed",
          "vus_max",
          "iterations",
        ];
        keyMetrics.forEach((metricName) => {
          const metric = summary.metrics_overview[metricName];
          if (metric && metric.avg !== undefined) {
            rows.push([`${metricName} (avg)`, metric.avg.toFixed(2)]);
          }
          if (metric && metric.max !== undefined) {
            rows.push([`${metricName} (max)`, metric.max.toFixed(2)]);
          }
        });
      }
    }

    autoTable(doc, {
      head: [["Metric", "Value"]],
      body: rows,
      startY: startY,
      styles: {
        fontSize: 10,
        cellPadding: 4,
        overflow: "linebreak",
        cellWidth: "wrap",
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      columnStyles: {
        0: { cellWidth: 80 }, // Metric column
        1: { cellWidth: "auto" }, // Value column
      },
      margin: { left: 20, right: 20 },
      tableWidth: "auto",
    });

    return (doc as any).lastAutoTable.finalY + 15;
  }

  function generateDetailedResultsTable(doc: jsPDF, startY: number) {
    const details = testData;
    if (!details || details.length === 0) return startY;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Detailed Test Results", 40, startY);
    startY += 20;

    let tableData: any[] = [];
    let headers: string[] = [];

    if (subType === "postman") {
      headers = [
        "Endpoint",
        "Method",
        "Status",
        "Response Time",
        "Result",
        "Error",
      ];
      tableData = details
        .slice(0, 20)
        .map((item: any) => [
          item.endpoint || "N/A",
          item.method || "N/A",
          item.status_code?.toString() || "N/A",
          `${item.response_time || 0}ms`,
          item.is_passed ? "PASS" : "FAIL",
          item.error_message || "-",
        ]);
    } else if (subType === "quick") {
      headers = ["Metric", "Category", "Value", "Unit"];
      tableData = details
        .slice(0, 20)
        .map((item: any) => [
          item.metric_name || "N/A",
          item.category || "-",
          (item.value || 0).toString(),
          item.unit || "-",
        ]);
    } else if (subType === "script") {
      const metrics = details
        .filter((d: any) => d.type === "metric")
        .slice(0, 15);
      headers = ["Metric Name", "Average", "Min", "Max", "P95"];
      tableData = metrics.map((item: any) => [
        item.name || "N/A",
        item.avg?.toFixed(2) || "-",
        item.min?.toFixed(2) || "-",
        item.max?.toFixed(2) || "-",
        item.p95?.toFixed(2) || "-",
      ]);
    }

    if (tableData.length > 0) {
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: startY,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [52, 152, 219],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        margin: { left: 20, right: 20 },
      });

      return (doc as any).lastAutoTable.finalY + 20;
    }

    return startY;
  }

  function generateRecommendationsSection(doc: jsPDF, startY: number) {
    const summary = detail?.summary || {};
    let recommendations: string[] = [];

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Recommendations & Analysis", 40, startY);
    startY += 20;

    if (subType === "postman") {
      const totalAssertions = (summary.passes || 0) + (summary.failures || 0);
      const successRate =
        totalAssertions > 0 ? (summary.passes / totalAssertions) * 100 : 0;
      const avgResponseTime =
        summary.duration_ms / (summary.total_requests || 1);

      if (successRate < 90) {
        recommendations.push(
          "• Consider reviewing failed test cases and fixing API issues"
        );
      }
      if (avgResponseTime > 2000) {
        recommendations.push(
          "• API response times are high. Consider performance optimization"
        );
      }
      if (summary.failures > 0) {
        recommendations.push(
          "• Investigate and fix failing assertions to improve test reliability"
        );
      }
      if (successRate >= 95) {
        recommendations.push(
          "• Excellent test pass rate! Consider expanding test coverage"
        );
      }
    } else if (subType === "quick") {
      if (Array.isArray(summary)) {
        const p95Metric = summary.find((m: any) => m.name?.includes("p95"));
        const errorMetric = summary.find((m: any) => m.name?.includes("error"));

        if (p95Metric && p95Metric.val > 2000) {
          recommendations.push(
            "• High P95 response time detected. Consider load balancing or caching"
          );
        }
        if (errorMetric && errorMetric.val > 0.1) {
          recommendations.push(
            "• Error rate is elevated. Review error logs and fix issues"
          );
        }
        recommendations.push(
          "• Monitor key performance metrics regularly for trend analysis"
        );
      }
    } else if (subType === "script") {
      const httpDuration = summary.metrics_overview?.http_req_duration;
      const httpFailed = summary.metrics_overview?.http_req_failed;

      if (httpDuration?.avg > 1000) {
        recommendations.push(
          "• Average request duration is high. Optimize backend performance"
        );
      }
      if (httpFailed?.rate > 0.05) {
        recommendations.push(
          "• Request failure rate is concerning. Check system stability"
        );
      }
      if (summary.total_checks > 0) {
        recommendations.push(
          "• Good test coverage with validation checks. Continue monitoring"
        );
      }
    }

    // General recommendations
    recommendations.push(
      "• Schedule regular performance testing to track trends"
    );
    recommendations.push(
      "• Set up monitoring alerts for critical performance thresholds"
    );
    recommendations.push(
      "• Document and share test results with development team"
    );

    if (recommendations.length === 0) {
      recommendations.push(
        "• No specific recommendations available for this test type"
      );
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    const textWidth = doc.internal.pageSize.getWidth() - 80; // 40px margin on each side
    let currentY = startY;

    recommendations.forEach((rec) => {
      const lines = doc.splitTextToSize(rec, textWidth);
      lines.forEach((line: string) => {
        if (currentY > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          currentY = 40;
        }
        doc.text(line, 40, currentY);
        currentY += 15;
      });
      currentY += 5; // Extra space between recommendations
    });

    return currentY + 10;
  }

  function generatePDF() {
    const doc = new jsPDF("portrait", "pt", "a4");
    const testRun = detail?.testRun;
    const statusInfo = getTestStatusInfo(detail);

    // === 1. Trang đầu với header cải tiến ===
    // Background header
    doc.setFillColor(45, 55, 72);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 120, "F");

    // Title
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Performance Test Report", 40, 60);

    // Subtitle
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text(`${getTestTypeName(subType)}`, 40, 85);

    // Status badge
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(
      statusInfo.color[0],
      statusInfo.color[1],
      statusInfo.color[2]
    );
    doc.roundedRect(40, 95, 80, 20, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(statusInfo.status, 50, 108);

    // Reset colors
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    // Executive Summary Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(
      40,
      140,
      doc.internal.pageSize.getWidth() - 80,
      100,
      5,
      5,
      "F"
    );
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(
      40,
      140,
      doc.internal.pageSize.getWidth() - 80,
      100,
      5,
      5,
      "S"
    );

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Executive Summary", 50, 160);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const basicInfo = [
      `Project: ${testRun?.project?.name || "Unknown"}`,
      `Test Type: ${getTestTypeName(subType)}`,
      `Execution Date: ${new Date(testRun?.created_at).toLocaleString(
        "vi-VN"
      )}`,
      `Status: ${statusInfo.details}`,
      `Generated: ${new Date().toLocaleString("vi-VN")}`,
    ];

    if (detail?.summary?.duration_ms) {
      basicInfo.push(`Total Duration: ${detail.summary.duration_ms} ms`);
    }

    let yPosition = 180;
    basicInfo.forEach((info) => {
      doc.text(info, 50, yPosition);
      yPosition += 15;
    });

    // === 2. Summary Table ===
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Test Results Summary", 40, 280);

    const summaryEndY = generateSummaryTable(doc, 300);

    // === 3. Detailed Results Table ===
    let detailEndY = summaryEndY;
    if (summaryEndY < doc.internal.pageSize.getHeight() - 200) {
      detailEndY = generateDetailedResultsTable(doc, summaryEndY + 20);
    } else {
      doc.addPage();
      detailEndY = generateDetailedResultsTable(doc, 60);
    }

    // === 4. Recommendations Section ===
    if (detailEndY < doc.internal.pageSize.getHeight() - 150) {
      generateRecommendationsSection(doc, detailEndY + 20);
    } else {
      doc.addPage();
      generateRecommendationsSection(doc, 60);
    }

    // === 5. Charts - Mỗi chart một trang ===
    if (subType === "postman") {
      if (postmanImgs?.assertions) {
        addChartToNewPage(
          doc,
          "Test Results - Pass vs Fail Analysis",
          postmanImgs.assertions,
          false
        );
      }

      if (postmanImgs?.response) {
        addChartToNewPage(
          doc,
          "Response Time Performance by Endpoint",
          postmanImgs.response,
          true
        );
      }
    } else if (subType === "quick") {
      if (quickImgs?.bar) {
        addChartToNewPage(
          doc,
          "Quick Test - Validation Results",
          quickImgs.bar,
          false
        );
      }

      if (quickImgs?.doughnut) {
        addChartToNewPage(
          doc,
          "Quick Test - Error Distribution Analysis",
          quickImgs.doughnut,
          false
        );
      }
    } else if (subType === "script") {
      if (scriptImg) {
        addChartToNewPage(
          doc,
          "K6 Script - Performance Metrics Trends",
          scriptImg,
          true
        );
      }
    }

    // === 6. Footer cho tất cả các trang ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(128, 128, 128);

      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.line(
        40,
        doc.internal.pageSize.getHeight() - 40,
        doc.internal.pageSize.getWidth() - 40,
        doc.internal.pageSize.getHeight() - 40
      );

      // Footer text
      doc.text(
        `Generated by Performance Testing Suite | ${new Date().toLocaleDateString(
          "vi-VN"
        )} | Page ${i} of ${pageCount}`,
        40,
        doc.internal.pageSize.getHeight() - 25
      );

      // Project name on right
      doc.text(
        `${testRun?.project?.name || "Unknown Project"}`,
        doc.internal.pageSize.getWidth() - 200,
        doc.internal.pageSize.getHeight() - 25
      );
    }

    // === 7. Lưu PDF ===
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, "");
    const fileName = `${
      testRun?.project?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "TestReport"
    }_${subType}_${timestamp}.pdf`;
    doc.save(fileName);
  }

  // Render chart tương ứng với loại test
  const renderCharts = () => {
    if (subType === "postman") {
      return <PostmanCharts data={testData} onReady={setPostmanImgs} />;
    } else if (subType === "quick") {
      return <QuickCharts data={testData} onReady={setQuickImgs} />;
    } else if (subType === "script") {
      return <ScriptCharts data={testData} onReady={setScriptImg} />;
    }
    return null;
  };

  return (
    <div>
      <button
        onClick={generatePDF}
        disabled={!isChartsReady}
       className={`p-2 rounded-lg text-white transition-all duration-200 font-semibold shadow-lg font-[var(--font-nunito)] text-[15px] 
  ${
    isChartsReady
      ? "bg-[linear-gradient(to_right,#658ec7,#c4a5c2)] hover:opacity-90 hover:shadow-xl"
      : "bg-gray-400 cursor-not-allowed"
  }`}
      >
        {isChartsReady
          ? ` Export Detailed ${getTestTypeName(subType)} Report`
          : " Preparing Charts..."}
      </button>

      {/* Render chart ẩn để lấy ảnh với kích thước lớn hơn */}
      <div
        style={{
          visibility: "hidden",
          position: "absolute",
          top: "-9999px",
          width: "1400px", // Tăng kích thước để chart rõ nét hơn
          height: "900px",
        }}
      >
        {testData.length > 0 && renderCharts()}
      </div>
    </div>
  );
}
