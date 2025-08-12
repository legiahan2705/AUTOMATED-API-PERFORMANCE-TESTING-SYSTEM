import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  description?: string;
}

export default function ChartContainer({ title, children, description }: ChartContainerProps) {
  return (
    <Card className="bg-gradient-card border-border/50 shadow-elegant animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="w-full h-80 bg-muted/10 rounded-lg p-4 border border-border/30">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}