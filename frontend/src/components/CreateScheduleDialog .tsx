"use client";

import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Plus,
  FolderPlus,
  FlaskConical,
  SlidersHorizontal,
  Beaker,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

import api from "@/lib/api";
import CreateProjectDialog from "@/components/CreateProjectDialog";
import CronBuilder from "@/components/CronBuilder";
import FileUpload from "./FileUpload";
import { cn } from "@/lib/utils";

type SubType = "postman" | "quick" | "script";

interface Project {
  id: number;
  name: string;
}

interface CreateScheduleDialogProps {
  trigger?: React.ReactNode;
  onCreated?: () => void;
}

const TEST_TYPE_OPTIONS = [
  {
    key: "postman" as SubType,
    label: "Postman API",
    icon: FlaskConical,
    description: "Run Postman Collection",
    color: "from-[#658ec7] to-[#8396c9]",
  },
  {
    key: "quick" as SubType,
    label: "Performance - Quick",
    icon: SlidersHorizontal,
    description: "Send quick requests with VUs & duration",
    color: "from-[#658ec7] to-[#8396c9]",
  },
  {
    key: "script" as SubType,
    label: "Performance - Script",
    icon: Beaker,
    description: "Run K6 Script ",
    color: "from-[#658ec7] to-[#c4a5c2]",
  },
];

export default function CreateScheduleDialog({
  trigger,
  onCreated,
}: CreateScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // State
  const [subType, setSubType] = useState<SubType>("postman");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);

  // Quick test config
  const [method, setMethod] = useState<
    "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | ""
  >("");
  const [apiUrl, setApiUrl] = useState("");
  const [headersJson, setHeadersJson] = useState("");
  const [bodyJson, setBodyJson] = useState("");
  const [vus, setVus] = useState<string>("");
  const [durationVal, setDurationVal] = useState<string>("");
  const [durationUnit, setDurationUnit] = useState<"ms" | "s" | "m">("s");

  // Script config
  const [noteScript, setNoteScript] = useState("");
  const [scriptFile, setScriptFile] = useState<File | null>(null);

  // Postman config
  const [postmanFile, setPostmanFile] = useState<File | null>(null);

  // Schedule config
  const [cronExpression, setCronExpression] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch projects when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingProjects(true);
    api
      .get<Project[]>("/project")
      .then((res) => setProjects(res.data ?? []))
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load project list");
      })
      .finally(() => setLoadingProjects(false));
  }, [open]);

  const handleProjectCreated = async () => {
    try {
      setLoadingProjects(true);
      const res = await api.get<Project[]>("/project");
      const list = res.data ?? [];
      setProjects(list);
      if (list.length) setProjectId(list[0].id);
      toast.success("Project list refreshed");
    } catch (e) {
      toast.error("Failed to refresh project list");
    } finally {
      setLoadingProjects(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setSubType("postman");
    setProjectId(null);
    setMethod("");
    setApiUrl("");
    setHeadersJson("");
    setBodyJson("");
    setVus("");
    setDurationVal("");
    setDurationUnit("s");
    setNoteScript("");
    setScriptFile(null);
    setPostmanFile(null);
    setCronExpression("");
    setEmailTo("");
  };

  // Validation helpers
  const parseJsonSafe = (text: string) => {
    try {
      if (!text.trim()) return undefined;
      return JSON.parse(text);
    } catch {
      return Symbol("invalid-json");
    }
  };

  const quickConfigInvalid = useMemo(() => {
    if (subType !== "quick") return false;
    if (!apiUrl.trim() || !method) return true;
    if (
      headersJson.trim() &&
      parseJsonSafe(headersJson) === Symbol.for("invalid-json")
    )
      return true;
    if (
      bodyJson.trim() &&
      parseJsonSafe(bodyJson) === Symbol.for("invalid-json")
    )
      return true;
    if (vus && Number(vus) <= 0) return true;
    if (durationVal && Number(durationVal) <= 0) return true;
    return false;
  }, [subType, apiUrl, method, headersJson, bodyJson, vus, durationVal]);

  const isValidCron = (expr: string) => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5 && parts.length !== 6) return false;
    return parts.every((p) => /^[\d*/,\-A-Za-z]+$/.test(p));
  };

  const canNextFromStep1 = !!subType;
  const canNextFromStep2 = projectId !== null;
  const canNextFromStep3 =
    (subType === "quick" && !quickConfigInvalid) ||
    (subType === "script" && scriptFile !== null) ||
    (subType === "postman" && postmanFile !== null);
  const canCreate =
    !!projectId &&
    !!cronExpression.trim() &&
    isValidCron(cronExpression) &&
    ((subType === "quick" && !quickConfigInvalid) ||
      (subType === "script" && scriptFile !== null) ||
      (subType === "postman" && postmanFile !== null));

  const buildConfigJson = () => {
    if (subType === "quick") {
      const headers = headersJson.trim()
        ? parseJsonSafe(headersJson)
        : undefined;
      const body = bodyJson.trim() ? parseJsonSafe(bodyJson) : undefined;
      return {
        apiUrl: apiUrl.trim(),
        method,
        headers: headers && typeof headers !== "symbol" ? headers : undefined,
        body: body && typeof body !== "symbol" ? body : undefined,
        vus: vus ? Number(vus) : undefined,
        duration: durationVal ? `${durationVal}${durationUnit}` : undefined,
      };
    }
    if (subType === "script") {
      return {
        note: noteScript || undefined,
        fileName: scriptFile?.name,
        fileSize: scriptFile?.size,
      };
    }
    if (subType === "postman") {
      return {
        fileName: postmanFile?.name,
        fileSize: postmanFile?.size,
      };
    }
    return {};
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);

      if (subType === "quick") {
        // Send JSON
        const payload = {
          projectId,
          category: "perf",
          subType,
          cronExpression,
          emailTo,
          isActive: true,
          configJson: buildConfigJson(),
        };

        await api.post("/scheduled-tests", payload);
      } else {
        // Send FormData
        const form = new FormData();
        form.append("projectId", String(projectId));
        form.append("category", subType === "postman" ? "api" : "perf");
        form.append("subType", subType);
        form.append("cronExpression", cronExpression);
        if (emailTo) form.append("emailTo", emailTo);
        form.append("isActive", "true");
        form.append("configJson", JSON.stringify(buildConfigJson()));

        if (subType === "postman" && postmanFile) {
          form.append("file", postmanFile);
        }
        if (subType === "script" && scriptFile) {
          form.append("file", scriptFile);
        }

        await api.post("/scheduled-tests", form, {});
      }

      toast.success("Schedule created successfully");
      setOpen(false);
      resetAll();
      onCreated?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message ?? "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const StepIndicator = ({
    stepNum,
    title,
    active,
  }: {
    stepNum: number;
    title: string;
    active: boolean;
  }) => (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-300",
        active
          ? "bg-gradient-to-r from-[#658ec7]/20 to-[#c4a5c2]/20 border border-[#658ec7]/30 shadow-md"
          : "bg-[#f3f7f7ca] hover:bg-muted/50"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all",
          active
            ? "bg-[#658ec7] text-white shadow-sm"
            : "bg-muted-foreground text-background"
        )}
      >
        {stepNum}
      </div>
      <span
        className={cn(
          "text-sm font-medium transition-colors",
          active ? "text-[#658ec7]" : "text-muted-foreground"
        )}
      >
        {title}
      </span>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetAll();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="rounded-2xl shadow-lg hover:shadow-xl bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] hover:from-[#5a7db5] hover:to-[#b394b0]">
            <Plus className="w-4 h-4" />
            New Schedule
          </Button>
        )}
      </DialogTrigger>

      <DialogContent
        className={cn(
          "bg-[#cae0ff] border-0 rounded-xl",
          "!w-[100vw] !max-w-4xl !max-h-[90vh]",
          "shadow-[0_0_10px_rgba(255,255,255,0.6)] overflow-y-auto scrollbar-clear"
        )}
      >
        <DialogHeader className="text-center space-y-3">
          <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-3 text-[#658ec7]">
            <div className="p-2 rounded-xl bg-gradient-to-r from-[#658ec7]/20 to-[#c4a5c2]/20">
              <CalendarClock className="w-6 h-6 text-[#658ec7]" />
            </div>
            Create New Schedule
          </DialogTitle>
          <DialogDescription className="text-base">
            Set up automated test schedules for your projects
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicators */}
        <div className="grid gap-2 sm:grid-cols-4 mb-6">
          <StepIndicator stepNum={1} title="Test Type" active={step === 1} />
          <StepIndicator stepNum={2} title="Project" active={step === 2} />
          <StepIndicator
            stepNum={3}
            title="Configuration"
            active={step === 3}
          />
          <StepIndicator stepNum={4} title="Schedule" active={step === 4} />
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] space-y-6">
          {/* STEP 1: Test Type Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 text-[#658ec7]">Choose Test Type</h3>
                <p className="text-muted-foreground">
                  Select the type of test that fits your needs
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {TEST_TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = subType === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSubType(option.key)}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
                        isActive
                          ? "border-[#658ec7]  bg-[#658ec7] shadow-md ring-2 ring-[#658ec7]/30"
                          : "border-white hover:border-[#658ec7]/50"
                      )}
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                          <Icon
                            className={cn(
                              "w-8 h-8 transition-colors",
                              isActive
                                ? "text-[white]"
                                : "text-[#658ec7] group-hover:text-[#658ec7]"
                            )}
                          />
                          {isActive && (
                            <CheckCircle2 className="w-5 h-5 text-[white]" />
                          )}
                        </div>
                        <h4
                          className={`font-semibold mb-2 ${
                            isActive ? "text-white" : "text-[#658ec7]"
                          }`}
                        >
                          {option.label}
                        </h4>

                        <p
                          className={`text-sm ${
                            isActive ? "text-white" : "text-[#658ec7]"
                          }`}
                        >
                          {option.description}
                        </p>
                      </div>

                      {isActive && (
                        <div
                          className={cn(
                            "absolute inset-0 bg-gradient-to-r opacity-5 ",
                            option.color
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Project Selection */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 text-[#658ec7]">Select Project</h3>
                <p className="text-muted-foreground">
                  Choose a project to run tests on
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-4">
                <div className="space-y-3">
                  
                  <div className="flex gap-3">
                    <Select
                      value={projectId ? String(projectId) : ""}
                      onValueChange={(v) => setProjectId(Number(v))}
                      disabled={loadingProjects}
                    >
                      <SelectTrigger className="flex-1 h-12 rounded-xl border-white">
                        <SelectValue
                          placeholder={
                            loadingProjects ? "Loading..." : "Select project"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <CreateProjectDialog
                      trigger={
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl hover:bg-[#658ec7]/10 hover:border-[#658ec7]/50"
                        >
                          <FolderPlus className="w-5 h-5" />
                        </Button>
                      }
                      onCreated={handleProjectCreated}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground text-center">
                    Don't see the right project? Create a new one
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Configuration */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 text-[#658ec7]">
                  Test Configuration
                </h3>
                <p className="text-muted-foreground">
                  Configure parameters for{" "}
                  {TEST_TYPE_OPTIONS.find((t) => t.key === subType)?.label}
                </p>
              </div>

              {subType === "quick" && (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[#658ec7]">API URL</Label>
                      <Input
                        placeholder="https://api.example.com/v1/products"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        className="h-12 rounded-xl  focus:border-[#658ec7] border-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[#658ec7]">HTTP Method</Label>
                      <Select
                        value={method}
                        onValueChange={(v) => setMethod(v as any)}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-white">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "GET",
                            "POST",
                            "PUT",
                            "DELETE",
                            "PATCH",
                          ].map((m) => (
                            <SelectItem key={m} value={m}>
                              <Badge variant="outline" className="mr-2">
                                {m}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Label className="text-[#658ec7]">Virtual Users</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          value={vus}
                          onChange={(e) => setVus(e.target.value)}
                          className="h-12 rounded-xl border-white  focus:border-[#658ec7]"
                          min={1}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-[#658ec7]">Duration</Label>
                        <Input
                          type="number"
                          placeholder="30"
                          value={durationVal}
                          onChange={(e) => setDurationVal(e.target.value)}
                          className="h-12 rounded-xl border-white focus:border-[#658ec7]"
                          min={1}
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <Label className="text-[#658ec7]">Unit</Label>
                        <Select
                          value={durationUnit}
                          onValueChange={(v) => setDurationUnit(v as any)}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ms">ms</SelectItem>
                            <SelectItem value="s">s</SelectItem>
                            <SelectItem value="m">m</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[#658ec7]">Headers (JSON)</Label>
                      <Textarea
                        placeholder='{ "Authorization": "Bearer xxx" }'
                        value={headersJson}
                        onChange={(e) => setHeadersJson(e.target.value)}
                        className="rounded-xl min-h-[100px] border-white focus:border-[#658ec7]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[#658ec7]">Body (JSON)</Label>
                      <Textarea
                        placeholder='{ "name": "product", "price": 99 }'
                        value={bodyJson}
                        onChange={(e) => setBodyJson(e.target.value)}
                        className="rounded-xl min-h-[100px] border-white focus:border-[#658ec7]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {subType === "script" && (
                <div className="max-w-lg mx-auto space-y-6 text-[#658ec7]">
                  <FileUpload
                    accept=".js,.ts"
                    maxSize={5}
                    onFileSelect={setScriptFile}
                    selectedFile={scriptFile}
                    label="K6 Script File"
                    description="Upload k6 script file (.js)"
                    placeholder="Choose K6 Script"
                  />
                </div>
              )}

              {subType === "postman" && (
                <div className="max-w-lg mx-auto space-y-6 text-[#658ec7]">
                  <FileUpload
                    accept=".json"
                    maxSize={10}
                    onFileSelect={setPostmanFile}
                    selectedFile={postmanFile}
                    label="Postman Collection"
                    description="Upload Postman collection file (.json)"
                    placeholder="Choose Postman collection"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Schedule & Email */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2 text-[#658ec7]">
                  Schedule Settings
                </h3>
                <p className="text-muted-foreground">
                  Configure timing and email notifications
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2 text-[#658ec7]">
                    <Clock className="w-5 h-5 text-[#658ec7]" />
                    Automated Schedule
                  </Label>
                  <CronBuilder
                    value={cronExpression}
                    onChange={setCronExpression}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-medium flex items-center gap-2 text-[#658ec7]">
                    <Mail className="w-5 h-5 text-[#658ec7]" />
                    Report Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="your-email@example.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="h-12 rounded-xl border-white focus:border-[#658ec7]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Test results will be sent to this email
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
            className="rounded-xl text-[#658ec7] hover:text-[#c4a5c2]"
          >
            Cancel
          </Button>

          <div className="flex gap-3">
            {step > 1 && (
              <Button
                variant="ghost"
                onClick={() => setStep((s) => Math.max(1, s - 1) as any)}
                disabled={submitting}
                className="rounded-xl hover:bg-white text-[#658ec7] hover:text-[#c4a5c2]"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}

            {step < 4 ? (
              <Button
                onClick={() => setStep((s) => Math.min(4, s + 1) as any)}
                disabled={
                  (step === 1 && !canNextFromStep1) ||
                  (step === 2 && !canNextFromStep2) ||
                  (step === 3 && !canNextFromStep3)
                }
                className="rounded-xl bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] hover:from-[#5a7db5] hover:to-[#b394b0]"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={!canCreate || submitting}
                className="rounded-xl min-w-[120px] bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] hover:from-[#5a7db5] hover:to-[#b394b0]"
              >
                {submitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Create Schedule
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
