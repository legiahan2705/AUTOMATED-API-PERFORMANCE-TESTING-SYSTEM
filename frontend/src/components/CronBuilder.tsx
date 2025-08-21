"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, RotateCcw, CheckCircle2 } from "lucide-react";
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
  { value: "*", label: "Mỗi phút" },
  { value: "0", label: "Phút 0" },
  { value: "*/5", label: "Mỗi 5 phút" },
  { value: "*/10", label: "Mỗi 10 phút" },
  { value: "*/15", label: "Mỗi 15 phút" },
  { value: "*/30", label: "Mỗi 30 phút" },
];

const HOUR_OPTIONS = [
  { value: "*", label: "Mỗi giờ" },
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
  { value: "*", label: "Mỗi ngày" },
  { value: "1", label: "Ngày 1" },
  { value: "15", label: "Ngày 15" },
  { value: "*/7", label: "Mỗi 7 ngày" },
];

const MONTH_OPTIONS = [
  { value: "*", label: "Mỗi tháng" },
  { value: "1", label: "Tháng 1" },
  { value: "6", label: "Tháng 6" },
  { value: "12", label: "Tháng 12" },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: "*", label: "Mọi ngày trong tuần" },
  { value: "1", label: "Thứ Hai" },
  { value: "2", label: "Thứ Ba" },
  { value: "3", label: "Thứ Tư" },
  { value: "4", label: "Thứ Năm" },
  { value: "5", label: "Thứ Sáu" },
  { value: "6", label: "Thứ Bảy" },
  { value: "0", label: "Chủ Nhật" },
];

const PRESETS = [
  { label: "Mỗi 5 phút", cron: "*/5 * * * *", description: "Chạy liên tục mỗi 5 phút" },
  { label: "Mỗi giờ", cron: "0 * * * *", description: "Chạy vào phút 0 của mỗi giờ" },
  { label: "Hằng ngày 03:00", cron: "0 3 * * *", description: "Chạy lúc 3 giờ sáng mỗi ngày" },
  { label: "Thứ Hai hàng tuần", cron: "0 9 * * 1", description: "Chạy lúc 9 giờ sáng thứ Hai" },
  { label: "Đầu tháng", cron: "0 8 1 * *", description: "Chạy lúc 8 giờ sáng ngày 1 mỗi tháng" },
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
  const parts = [];
  
  if (config.minute === "*") parts.push("mỗi phút");
  else if (config.minute.startsWith("*/")) parts.push(`mỗi ${config.minute.slice(2)} phút`);
  else parts.push(`phút ${config.minute}`);
  
  if (config.hour !== "*") {
    if (config.hour.startsWith("*/")) parts.push(`mỗi ${config.hour.slice(2)} giờ`);
    else parts.push(`lúc ${config.hour}:00`);
  }
  
  if (config.dayOfMonth !== "*") {
    if (config.dayOfMonth.startsWith("*/")) parts.push(`mỗi ${config.dayOfMonth.slice(2)} ngày`);
    else parts.push(`ngày ${config.dayOfMonth}`);
  }
  
  if (config.dayOfWeek !== "*") {
    const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    parts.push(dayNames[parseInt(config.dayOfWeek)] || config.dayOfWeek);
  }
  
  return parts.join(", ");
}

export default function CronBuilder({ value, onChange, className }: CronBuilderProps) {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [config, setConfig] = useState<CronConfig>(parseCronExpression(value || "*/5 * * * *"));
  const [customCron, setCustomCron] = useState(value || "");

  useEffect(() => {
    if (value) {
      setConfig(parseCronExpression(value));
      setCustomCron(value);
    }
  }, [value]);

  const handleConfigChange = (field: keyof CronConfig, newValue: string) => {
    const newConfig = { ...config, [field]: newValue };
    setConfig(newConfig);
    const cronExpr = buildCronExpression(newConfig);
    setCustomCron(cronExpr);
    onChange(cronExpr);
  };

  const handlePresetSelect = (cronExpr: string) => {
    setConfig(parseCronExpression(cronExpr));
    setCustomCron(cronExpr);
    onChange(cronExpr);
  };

  const handleCustomCronChange = (newCron: string) => {
    setCustomCron(newCron);
    onChange(newCron);
    if (isValidCron(newCron)) {
      setConfig(parseCronExpression(newCron));
    }
  };

  const isValidCron = (expr: string) => {
    const parts = expr.trim().split(/\s+/);
    return parts.length === 5 && parts.every(p => /^[\d*/,\-A-Za-z]+$/.test(p));
  };

  const currentCronExpr = mode === "simple" ? buildCronExpression(config) : customCron;
  const isValid = isValidCron(currentCronExpr);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Mode Toggle */}
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Chế độ:</Label>
        <div className="flex rounded-lg border p-1">
          <Button
            variant={mode === "simple" ? "stepper-active" : "stepper"}
            size="sm"
            onClick={() => setMode("simple")}
            className="rounded-md"
          >
            Đơn giản
          </Button>
          <Button
            variant={mode === "advanced" ? "stepper-active" : "stepper"}
            size="sm"
            onClick={() => setMode("advanced")}
            className="rounded-md"
          >
            Nâng cao
          </Button>
        </div>
      </div>

      {mode === "simple" ? (
        <div className="space-y-4">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Lịch phổ biến:</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.cron}
                  type="button"
                  onClick={() => handlePresetSelect(preset.cron)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-all hover:shadow-md",
                    currentCronExpr === preset.cron
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{preset.label}</span>
                    {currentCronExpr === preset.cron && (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
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
              <Calendar className="w-4 h-4" />
              Tùy chỉnh lịch:
            </Label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Phút</Label>
                <Select value={config.minute} onValueChange={(v) => handleConfigChange("minute", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MINUTE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Giờ</Label>
                <Select value={config.hour} onValueChange={(v) => handleConfigChange("hour", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUR_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ngày trong tháng</Label>
                <Select value={config.dayOfMonth} onValueChange={(v) => handleConfigChange("dayOfMonth", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OF_MONTH_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tháng</Label>
                <Select value={config.month} onValueChange={(v) => handleConfigChange("month", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Ngày trong tuần</Label>
                <Select value={config.dayOfWeek} onValueChange={(v) => handleConfigChange("dayOfWeek", v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OF_WEEK_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Cron Expression:</Label>
          <Input
            value={customCron}
            onChange={(e) => handleCustomCronChange(e.target.value)}
            placeholder="*/5 * * * *"
            className="font-mono"
          />
          <div className="text-xs text-muted-foreground">
            Format: phút giờ ngày_tháng tháng ngày_tuần
          </div>
        </div>
      )}

      {/* Status & Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isValid ? (
              <Badge variant="outline" className="border-success text-success bg-success/10">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Hợp lệ
              </Badge>
            ) : (
              <Badge variant="outline" className="border-destructive text-destructive">
                Không hợp lệ
              </Badge>
            )}
            <span className="text-xs font-mono text-muted-foreground">{currentCronExpr}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setConfig({ minute: "*/5", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*" });
              handlePresetSelect("*/5 * * * *");
            }}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
        
        {isValid && (
          <div className="p-2 rounded-md bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium">Sẽ chạy:</span>
              <span className="text-primary">{generateHumanReadable(config)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}