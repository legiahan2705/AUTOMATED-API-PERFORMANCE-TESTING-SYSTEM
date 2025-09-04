"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Code2,
  Activity,
  Globe,
  Clock,
  BarChart3,
  Eye,
  EyeOff,
  Zap,
  ZapIcon,
  ChartBarIcon,
  ChartColumn,
  ChartColumnIcon,
} from "lucide-react";
import { PostmanCharts } from "./PostmanCharts";
import { QuickCharts } from "./QuickCharts";
import { ScriptCharts } from "./ScriptCharts";
import { Chart } from "chart.js";

// ==== Type cho từng loại row ====
type PostmanDetail = {
  endpoint: string;
  method: string;
  status_code: number;
  response_time: number;
  is_passed: boolean;
  error_message: string;
  raw_values?: Record<string, any>;
};

type QuickDetail = {
  metric_name: string;
  description?: string;
  category?: string;
  value: number;
  unit?: string;
  raw_values?: Record<string, any>;
};

type ScriptDetail = {
  type: "metric" | "check";
  name: string;
  avg?: number;
  min?: number;
  max?: number;
  p90?: number;
  p95?: number;
  rate?: number;
  value?: number;
  passes?: number;
  fails?: number;
  raw_values?: Record<string, any>;
};

type DetailTableProps = {
  details: any[];
  subType?: "quick" | "script" | "postman";
};

const StatusBadge = ({ passed }: { passed: boolean }) => (
  <Badge
    className={`font-medium flex items-center ${
      passed
        ? "bg-green-100 text-green-700 border border-green-300"
        : "bg-red-100 text-red-700 border border-red-300"
    }`}
  >
    {passed ? (
      <CheckCircle className="w-3 h-3 mr-1" />
    ) : (
      <XCircle className="w-3 h-3 mr-1" />
    )}
    {passed ? "Pass" : "Fail"}
  </Badge>
);

const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-green-100 text-green-700 border-green-300",
    POST: "bg-blue-100 text-blue-700 border-blue-300",
    PUT: "bg-yellow-100 text-yellow-700 border-yellow-300",
    DELETE: "bg-red-100 text-red-700 border-red-300",
    PATCH: "bg-purple-100 text-purple-700 border-purple-300",
  };

  return (
    <Badge
      variant="outline"
      className={`${
        colors[method.toUpperCase()] ||
        "bg-gray-100 text-gray-700 border-gray-300"
      } font-medium`}
    >
      {method.toUpperCase()}
    </Badge>
  );
};

export const DetailTable: React.FC<DetailTableProps> = ({
  details,
  subType,
}) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!details || details.length === 0) {
    return (
      <Card className="border-dashed border-2 shadow-card-elegant">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-4 mb-4">
            <AlertTriangle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Data</h3>
          <p className="text-muted-foreground text-center">
            No detailed data available for this test.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderRawRow = (row: any, colSpan: number) =>
    showRaw && row.raw_values ? (
      <tr className="border-t border-table-border">
        <td colSpan={colSpan} className="p-0">
          <div className="bg-muted/30 m-4 rounded-lg overflow-hidden">
            <div className="bg-gradient-primary text-primary-foreground px-4 py-2 text-sm font-medium">
              Raw Data
            </div>
            <pre className="p-4 text-xs overflow-auto max-h-60 whitespace-pre-wrap text-muted-foreground">
              {JSON.stringify(row.raw_values, null, 2)}
            </pre>
          </div>
        </td>
      </tr>
    ) : null;

  // 1️ POSTMAN
  if (subType === "postman") {
    return (
      <div className="space-y-6">
        {/* Details section */}
        <Card className="shadow-card-elegant border-1 pb-0">
          <CardHeader className="bg-gradient-info text-info-foreground rounded-t-lg">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-[#658ec7]" />
              <CardTitle className="text-[18px] font-semibold text-[#658ec7]">
                Postman Test Results
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex justify-between items-center p-6 pt-0 bg-table-header  border-table-border">
              <div className="text-sm text-muted-foreground">
                {details.length} API endpoint{details.length > 1 ? "s" : ""}{" "}
                tested
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRaw(!showRaw)}
                className="gap-2 text-[#658ec7] hover:text-[#c4a5c2]"
              >
                {showRaw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {showRaw ? "Hide" : "Show"} Raw Data
              </Button>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-table-header border-b border-table-border">
                  <tr>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Endpoint
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Method
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Status
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Response Time
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Result
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Error Message
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row: PostmanDetail, idx: number) => (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-table-hover transition-colors border-b border-table-border/50">
                        <td className="p-4">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                            {row.endpoint}
                          </code>
                        </td>
                        <td className="p-4">
                          <MethodBadge method={row.method} />
                        </td>
                        <td className="p-4">
                          <Badge
                            className={`font-mono ${
                              row.status_code < 300
                                ? "bg-green-500 text-white" // 2xx OK → xanh lá
                                : row.status_code < 400
                                ? "bg-yellow-500 text-black" // 3xx Redirect → vàng
                                : row.status_code < 500
                                ? "bg-red-500 text-white" // 4xx Client Error → đỏ
                                : "bg-purple-500 text-white" // 5xx Server Error → tím
                            }`}
                          >
                            {row.status_code}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm">
                              {row.response_time}ms
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <StatusBadge passed={row.is_passed} />
                        </td>
                        <td className="p-4">
                          {row.error_message ? (
                            <div className="text-destructive text-sm bg-destructive/10 px-2 py-1 rounded">
                              {row.error_message}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                      {renderRawRow(row, 6)}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/*  Chart Section */}
        <Card className="shadow-card-elegant border-0">
          <CardHeader className="bg-gradient-primary rounded-t-lg">
            <div className="flex items-center gap-3">
              <ChartColumnIcon className="w-5 h-5 text-[#658ec7]" />
              <CardTitle className="text-[18px] font-semibold text-[#658ec7]">
                Postman Test Charts
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <PostmanCharts data={details} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2️ QUICK
  if (subType === "quick") {
    return (
      <div className="space-y-6">
        {/* Detail section */}

        <Card className="shadow-card-elegant border-0 pb-0">
          <CardHeader className="bg-gradient-info text-info-foreground rounded-t-lg">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-[#658ec7]" />
              <CardTitle className="text-[18px] font-semibold text-[#658ec7]">
                Quick Test Results
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex justify-between items-center p-6 pt-0 bg-table-header border-b border-table-border">
              <div className="text-sm text-muted-foreground">
                {details.length} performance metric
                {details.length > 1 ? "s" : ""} collected
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRaw(!showRaw)}
                className="gap-2 text-[#658ec7] hover:text-[#c4a5c2]"
              >
                {showRaw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {showRaw ? "Hide" : "Show"} Raw Data
              </Button>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full">
                <thead className="bg-table-header border-b border-table-border">
                  <tr>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Metric
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Description
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Category
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row: QuickDetail, idx: number) => (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-table-hover transition-colors border-b border-table-border/50">
                        <td className="p-4">
                          <div className="font-medium text-foreground">
                            {row.metric_name}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-muted-foreground max-w-xs">
                            {row.description || "-"}
                          </div>
                        </td>
                        <td className="p-4">
                          {row.category ? (
                            <Badge variant="secondary" className="font-medium">
                              {row.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono font-semibold text-lg">
                              {row.value}
                            </span>
                            {row.unit && (
                              <span className="text-muted-foreground text-sm">
                                {row.unit}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {renderRawRow(row, 4)}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {/*  Chart Section */}
        <Card className="shadow-card-elegant border-0 ">
          <CardHeader className="bg-gradient-primary rounded-t-lg">
            <div className="flex items-center gap-3">
              <ChartColumnIcon className="w-5 h-5 text-[#658ec7]" />
              <CardTitle className="text-[18px] font-semibold text-[#658ec7]">
                Quick Performance Charts
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="mt-[-10px]">
            <QuickCharts data={details} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3️ SCRIPT
  if (subType === "script") {
    const metrics = details.filter((d: ScriptDetail) => d.type === "metric");
    const checks = details.filter((d: ScriptDetail) => d.type === "check");

    return (
      <div className="space-y-6">
        <Card className="shadow-card-elegant border-0 pb-0">
          <CardHeader className="bg-gradient-warning text-warning-foreground rounded-t-lg">
            <div className="flex items-center gap-3">
              <ZapIcon className="w-5 h-5 text-[#658ec7]" />
              <CardTitle className="text-[18px] font-semibold text-[#658ec7]">
                Script Performance Metrics
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex justify-between items-center p-6 pt-0 bg-table-header border-b border-table-border">
              <div className="text-sm text-muted-foreground">
                {metrics.length} performance metric
                {metrics.length > 1 ? "s" : ""} tracked
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRaw(!showRaw)}
                className="gap-2 text-[#658ec7] hover:text-[#c4a5c2]"
              >
                {showRaw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
                {showRaw ? "Hide" : "Show"} Raw Data
              </Button>
            </div>

            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full table-fixed">
                <thead className="bg-table-header border-b border-table-border">
                  <tr>
                    <th className="text-left p-4 font-semibold text-foreground w-[200px]">
                      Name
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Avg
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Min
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Max
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      P90
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      P95
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Rate
                    </th>
                    <th className="text-left p-4 font-semibold text-foreground">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m: ScriptDetail, idx: number) => (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-table-hover transition-colors border-b border-table-border/50">
                        <td
  className="p-4 font-medium max-w-[200px] truncate"
  title={m.name}
>
  {m.name}
</td>
                        <td className="p-4 font-mono text-sm">
                          {m.avg || "-"}
                        </td>
                        <td className="p-4 font-mono text-sm">
                          {m.min || "-"}
                        </td>
                        <td className="p-4 font-mono text-sm">
                          {m.max || "-"}
                        </td>
                        <td className="p-4 font-mono text-sm">
                          {m.p90 || "-"}
                        </td>
                        <td className="p-4 font-mono text-sm">
                          {m.p95 || "-"}
                        </td>
                        <td className="p-4 font-mono text-sm">
                          {m.rate || "-"}
                        </td>
                        <td className="p-4 font-mono text-sm font-semibold">
                          {m.value || "-"}
                        </td>
                      </tr>
                      {renderRawRow(m, 8)}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card-elegant border-0">
          <CardContent className="p-6 pt-0">
            <div className="text-sm text-muted-foreground mb-4">
              {checks.length} validation check{checks.length > 1 ? "s" : ""}{" "}
              performed
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {checks.map((c: ScriptDetail, idx: number) => {
                const total = (c.passes || 0) + (c.fails || 0);
                const successRate =
                  total > 0 ? ((c.passes || 0) / total) * 100 : 0;

                const bgColor =
                  successRate >= 90
                    ? "bg-green-500"
                    : successRate >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500";

                return (
                  <React.Fragment key={idx}>
                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium text-sm">{c.name}</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          Success Rate
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded text-white ${bgColor}`}
                        >
                          {successRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-2 ${bgColor} rounded-full`}
                          style={{ width: `${successRate}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Passes
                          </p>
                          <p className="font-bold text-green-600">
                            {c.passes ?? "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fails</p>
                          <p className="font-bold text-red-600">
                            {c.fails ?? "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {renderRawRow(c, 1)}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/*  Chart Section */}
        <Card className="shadow-card-elegant border-0">
          <CardHeader className="bg-gradient-primary rounded-t-lg">
            <div className="flex items-center gap-3">
              <ChartColumn className="w-5 h-5 text-[#658ec7]" />
              <CardTitle className="text-[18px] font-semibold text-[#658ec7]">
                Script Performance Charts
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ScriptCharts data={details} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-dashed border-2 shadow-card-elegant">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          Loại test không được hỗ trợ
        </h3>
        <p className="text-muted-foreground text-center">
          Loại test "{subType}" chưa được hỗ trợ.
        </p>
      </CardContent>
    </Card>
  );
};
