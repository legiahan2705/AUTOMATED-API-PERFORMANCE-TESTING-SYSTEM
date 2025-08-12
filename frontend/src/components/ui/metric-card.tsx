import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MetricCardProps {
  title: string;
  valueA: number | null;
  valueB: number | null;
  diff: number | null;
  unit?: string;
  formatter?: (value: number) => string;
}

export default function MetricCard({ 
  title, 
  valueA, 
  valueB, 
  diff, 
  unit = "",
  formatter = (value) => value.toString()
}: MetricCardProps) {
  const getDiffColor = (diff: number | null) => {
    if (diff == null) return "secondary";
    if (diff < 0) return "success"; // negative is better
    if (diff > 0) return "destructive"; // positive is worse
    return "secondary";
  };

  const getDiffIcon = (diff: number | null) => {
    if (diff == null) return "";
    if (diff < 0) return "↓";
    if (diff > 0) return "↑";
    return "→";
  };

  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant hover:shadow-glow transition-all duration-300 animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Test A</div>
            <div className="text-xl font-bold text-foreground">
              {valueA !== null ? `${formatter(valueA)}${unit}` : "—"}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="text-xs text-muted-foreground">Test B</div>
            <div className="text-xl font-bold text-foreground">
              {valueB !== null ? `${formatter(valueB)}${unit}` : "—"}
            </div>
          </div>
        </div>
        
        {diff !== null && (
          <div className="flex justify-center">
            <Badge 
              variant={getDiffColor(diff) as any}
              className="px-3 py-1 text-xs font-medium"
            >
              {getDiffIcon(diff)} {diff > 0 ? "+" : ""}{formatter(diff)}{unit}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}