import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TableData {
  [key: string]: {
    testA: number | null;
    testB: number | null;
    diff: number | null;
  };
}

interface EnhancedTableProps {
  title: string;
  data: TableData;
  metricLabels: Record<string, string>;
}

export default function EnhancedTable({ title, data, metricLabels }: EnhancedTableProps) {
  const getColor = (diff: number | null) => {
    if (diff == null) return "text-muted-foreground";
    if (diff < 0) return "text-success"; 
    if (diff > 0) return "text-destructive";   
    return "text-muted-foreground";
  };

  const getDiffIcon = (diff: number | null) => {
    if (diff == null) return "";
    if (diff < 0) return "↓ ";
    if (diff > 0) return "↑ ";
    return "";
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border border-border/50">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Metric
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Test A
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Test B
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  Difference
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data).map(([key, val], index) => {
                if (
                  key === "checks" ||
                  !val ||
                  typeof val !== "object" ||
                  val.testA === undefined
                )
                  return null;
                
                return (
                  <tr 
                    key={key} 
                    className={`border-b border-border/30 hover:bg-muted/20 transition-colors duration-200 ${
                      index % 2 === 0 ? 'bg-muted/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {metricLabels[key] || key}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {val.testA ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {val.testB ?? "—"}
                    </td>
                    <td className={`px-4 py-3 font-medium ${getColor(val.diff)}`}>
                      {val.diff != null
                        ? `${getDiffIcon(val.diff)}${val.diff > 0 ? "+" : ""}${val.diff}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}