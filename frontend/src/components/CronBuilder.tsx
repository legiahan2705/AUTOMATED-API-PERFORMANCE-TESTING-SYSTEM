"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CronBuilderProps {
  value: string;
  onChange: (cronExpression: string) => void;
  className?: string;
}

interface CronConfig {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

const MINUTE_OPTIONS = [
  { value: "*", label: "Every minute" },
  { value: "0", label: "Minute 0" },
  { value: "*/5", label: "Every 5 minutes" },
  { value: "*/10", label: "Every 10 minutes" },
  { value: "*/15", label: "Every 15 minutes" },
  { value: "*/30", label: "Every 30 minutes" },
];

const HOUR_OPTIONS = [
  { value: "*", label: "Every hour" },
  { value: "0", label: "00:00" },
  { value: "3", label: "03:00" },
  { value: "6", label: "06:00" },
  { value: "9", label: "09:00" },
  { value: "12", label: "12:00" },
  { value: "15", label: "15:00" },
  { value: "18", label: "18:00" },
  { value: "21", label: "21:00" },
];

const DAY_OF_MONTH_OPTIONS = [
  { value: "*", label: "Every day" },
  { value: "1", label: "Day 1" },
  { value: "15", label: "Day 15" },
  { value: "*/7", label: "Every 7 days" },
];

const MONTH_OPTIONS = [
  { value: "*", label: "Every month" },
  { value: "1", label: "January" },
  { value: "6", label: "June" },
  { value: "12", label: "December" },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: "*", label: "Every day of week" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "0", label: "Sunday" },
];

const PRESETS = [
  { label: "Every 5 minutes", cron: "*/5 * * * *", description: "Runs continuously every 5 minutes" },
  { label: "Hourly", cron: "0 * * * *", description: "Runs at minute 0 of every hour" },
  { label: "Daily at 3 AM", cron: "0 3 * * *", description: "Runs at 3:00 AM every day" },
  { label: "Weekly on Monday", cron: "0 9 * * 1", description: "Runs at 9:00 AM every Monday" },
  { label: "Monthly on 1st", cron: "0 8 1 * *", description: "Runs at 8:00 AM on the 1st of every month" },
];

function parseCronExpression(cronExpr: string): CronConfig {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length === 5) {
    return {
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4],
    };
  }
  return {
    minute: "*",
    hour: "*",
    dayOfMonth: "*",
    month: "*",
    dayOfWeek: "*",
  };
}

function buildCronExpression(config: CronConfig): string {
  return `${config.minute} ${config.hour} ${config.dayOfMonth} ${config.month} ${config.dayOfWeek}`;
}

function generateHumanReadable(config: CronConfig): string {
  let parts: string[] = [];

  // Minute
  if (config.minute === "*") parts.push("every minute");
  else if (config.minute.startsWith("*/")) parts.push(`every ${config.minute.slice(2)} minutes`);
  else parts.push(`at minute ${config.minute}`);

  // Hour
  if (config.hour === "*") {
    if (config.minute === "*") parts.push("of every hour"); 
  } else if (config.hour.startsWith("*/")) {
    parts.push(`every ${config.hour.slice(2)} hours`);
  } else {
    parts.push(`at ${config.hour.padStart(2, "0")}:00`);
  }

  // Day of month
  if (config.dayOfMonth !== "*") {
    if (config.dayOfMonth.startsWith("*/")) parts.push(`every ${config.dayOfMonth.slice(2)} days`);
    else parts.push(`on day ${config.dayOfMonth}`);
  }

  // Month
  if (config.month !== "*") {
    const monthNames = ["", "January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    parts.push(`in ${monthNames[parseInt(config.month)] || `month ${config.month}`}`);
  }

  // Day of week
  if (config.dayOfWeek !== "*") {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    parts.push(`on ${dayNames[parseInt(config.dayOfWeek)] || config.dayOfWeek}`);
  }

  // Build final sentence
  return "Runs " + parts.join(" ");
}

export default function CronBuilder({ value, onChange, className }: CronBuilderProps) {
  const [config, setConfig] = useState<CronConfig>(parseCronExpression(value || "*/5 * * * *"));

  useEffect(() => {
    if (value) {
      setConfig(parseCronExpression(value));
    }
  }, [value]);

  const handleConfigChange = (field: keyof CronConfig, newValue: string) => {
    const newConfig = { ...config, [field]: newValue };
    setConfig(newConfig);
    const cronExpr = buildCronExpression(newConfig);
    onChange(cronExpr);
  };

  const handlePresetSelect = (cronExpr: string) => {
    setConfig(parseCronExpression(cronExpr));
    onChange(cronExpr);
  };

  const isValidCron = (expr: string) => {
    const parts = expr.trim().split(/\s+/);
    return parts.length === 5 && parts.every((p) => /^[\d*/,\-A-Za-z]+$/.test(p));
  };

  const currentCronExpr = buildCronExpression(config);
  const isValid = isValidCron(currentCronExpr);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Presets */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Common Schedules:</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.cron}
              type="button"
              onClick={() => handlePresetSelect(preset.cron)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all duration-200 hover:shadow-md",
                currentCronExpr === preset.cron
                  ? "border-[#658ec7] bg-[#658ec7]/10 shadow-md ring-1 ring-[#658ec7]/20"
                  : " hover:border-[#658ec7]/30 hover:bg-[#658ec7]/5 border-white"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{preset.label}</span>
                {currentCronExpr === preset.cron && (
                  <CheckCircle2 className="w-4 h-4 text-[#658ec7]" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Builder */}
      <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#658ec7]" />
          Custom Schedule:
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Minute</Label>
            <Select value={config.minute} onValueChange={(v) => handleConfigChange("minute", v)} >
              <SelectTrigger className="h-8 border-[#658ec7] focus:border-[#658ec7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MINUTE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hour</Label>
            <Select value={config.hour} onValueChange={(v) => handleConfigChange("hour", v)}>
              <SelectTrigger className="h-8 border-[#658ec7] focus:border-[#658ec7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Day of Month</Label>
            <Select
              value={config.dayOfMonth}
              onValueChange={(v) => handleConfigChange("dayOfMonth", v)}
            >
              <SelectTrigger className="h-8 border-[#658ec7] focus:border-[#658ec7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OF_MONTH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Month</Label>
            <Select value={config.month} onValueChange={(v) => handleConfigChange("month", v)}>
              <SelectTrigger className="h-8 border-[#658ec7] focus:border-[#658ec7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Day of Week</Label>
            <Select
              value={config.dayOfWeek}
              onValueChange={(v) => handleConfigChange("dayOfWeek", v)}
            >
              <SelectTrigger className="h-8 border-[#658ec7] focus:border-[#658ec7]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OF_WEEK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Status & Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handlePresetSelect("*/5 * * * *");
            }}
            className="hover:bg-white text-[#658ec7] hover:text-[#c4a5c2]"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>

      
          <div className="p-3 rounded-lg bg-gradient-to-r from-[#658ec7]/10 to-[#c4a5c2]/10 border border-[#658ec7]/20">
            <div className="flex items-start gap-2 text-sm">
              <Clock className="w-4 h-4 text-[#658ec7] mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-[#658ec7]">Will run:</span>
                <p className="text-foreground mt-1">{generateHumanReadable(config)}</p>
              </div>
            </div>
          </div>
        
      </div>
    </div>
  );
}