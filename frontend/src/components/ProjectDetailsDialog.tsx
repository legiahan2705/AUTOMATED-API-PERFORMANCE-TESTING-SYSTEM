"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchProjectById } from "@/lib/api";

import {
  Pencil,
  FileText,
  Info,
  UploadCloud,
  Zap,
  FileCode2,
  CalendarDays,
  Users,
  Timer,
  AlignLeft,
  Loader,
  FolderOpen,
} from "lucide-react";
import { Project } from "./project-table";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { on } from "events";
import TestHistorySection from "./ui/TestHistorySection";

interface ProjectDetailsDialogProps {
  open: boolean;
  project: Project;
  onClose: () => void;
  onUpdated?: () => void;
}

const ProjectDetailsDialog: React.FC<ProjectDetailsDialogProps> = ({
  open,
  project,
  onClose,
  onUpdated,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);

  const [isEditingApiUrl, setIsEditingApiUrl] = useState(false);
  const [apiUrl, setApiUrl] = useState(project.apiUrl || "");

  const [isEditingVus, setIsEditingVus] = useState(false);
  const [vus, setVus] = useState((project.vus ?? 1).toString());

  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState("s");

  const [isEditingMethod, setIsEditingMethod] = useState(false);
  const [method, setMethod] = useState(project.method || "");

  const [isEditingBody, setIsEditingBody] = useState(false);
  const [bodyJson, setBodyJson] = useState(project.body || "");
  const [isEditingHeaders, setIsEditingHeaders] = useState(false);
  const [headersJson, setHeadersJson] = useState(project.headers || "");
  const [viewFileContent, setViewFileContent] = useState<{
    name: string;
    content: string;
    language: string;
  } | null>(null);

  const [isEditingPostmanFile, setIsEditingPostmanFile] = useState(false);
  const [isEditingK6File, setIsEditingK6File] = useState(false);

  const [isRunningPostman, setIsRunningPostman] = useState(false);
  const [isRunningQuick, setIsRunningQuick] = useState(false);
  const [isRunningK6, setIsRunningK6] = useState(false);

  const [newPostmanFile, setNewPostmanFile] = useState<File | null>(null);
  const [newK6File, setNewK6File] = useState<File | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description);
      setApiUrl(project.apiUrl || "");
      setVus((project.vus ?? 1).toString());

      const match = (project.duration || "").match(/^(\d+)([smh])$/);
      if (match) {
        setDuration(match[1]);
        setDurationUnit(match[2]);
      } else {
        setDuration("30");
        setDurationUnit("s");
      }
    }
  }, [project]);

  const handleViewFile = async (filePath: string, fileName: string) => {
    try {
      const res = await api.get("/project/view-file", {
        params: { path: filePath }, // truyền nguyên gs://...
        responseType: "text",
      });

      let content = res.data;
      if (fileName.toLowerCase().includes(".json")) {
        try {
          const parsed = JSON.parse(content);
          content = JSON.stringify(parsed, null, 2);
        } catch {}
      }

      const language = fileName.toLowerCase().includes(".json")
        ? "json"
        : "javascript";
      setViewFileContent({ name: fileName, content, language });
    } catch (error) {
      alert("Không thể tải file!");
    }
  };

  // API update project

  const handleSaveField = async (
    field: keyof Project,
    value: string | number | null
  ) => {
    try {
      await api.put(`/project/${project.id}`, { [field]: value });
      toast.success("Cập nhật thành công!"); // Thêm thông báo cho người dùng

      // Chỉ cần gọi callback để component cha làm mới dữ liệu
      onUpdated?.();
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Cập nhật thất bại!");
    }
  };
  const handleUpdateFile = async (file: File, type: "postman" | "k6") => {
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description ?? "");
      formData.append("apiUrl", apiUrl);
      formData.append("vus", vus);
      formData.append("duration", duration + durationUnit);
      formData.append("method", method);
      formData.append("headers", headersJson);
      formData.append("body", bodyJson);
      formData.append("file", file);

      const res = await api.put(`/project/${project.id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Cập nhật file thành công!");
      // Update project state thủ công
      if (type === "postman") {
        project.postmanFilePath = res.data.postmanFilePath;
        project.originalPostmanFileName = res.data.originalPostmanFileName;
        setNewPostmanFile(null);
        setIsEditingPostmanFile(false);
      } else {
        project.k6ScriptFilePath = res.data.k6ScriptFilePath;
        project.originalK6ScriptFileName = res.data.originalK6ScriptFileName;
        setNewK6File(null);
        setIsEditingK6File(false);
      }
      onUpdated?.();

      // Clear file sau khi lưu
      if (type === "postman") setNewPostmanFile(null);
      else setNewK6File(null);
    } catch (err) {
      console.error(err);
      alert("Cập nhật file thất bại!");
    }
  };

  // Postman Test
  const handleTestPostman = async () => {
    if (!project?.id) return;

    try {
      setIsRunningPostman(true);
      const res = await api.post(`/test-run/postman/${project.id}`);
      setIsRunningPostman(false);
      toast.success("Đã chạy kiểm thử thành công!");
      setRefreshTrigger((v) => v + 1);
      console.log("Summary:", res.data.summary);
    } catch (err) {
      console.error(err);
      toast.error("Kiểm thử thất bại ");
    }
  };

  // Quick Performance Test
  const handleQuickPerformanceTest = async () => {
    if (!project?.id) return;

    try {
      setIsRunningQuick(true);
      const res = await api.post(`/test-run/performance/quick/${project.id}`);
      setIsRunningQuick(false);

      toast.success("Đã chạy kiểm thử hiệu năng thành công!");
      setRefreshTrigger((v) => v + 1);

      console.log("Performance Summary:", res.data.summary);
      // TODO: hiển thị kết quả
    } catch (err) {
      console.error(err);
      toast.error("Kiểm thử hiệu năng thất bại!");
    }
  };
  // K6 Script Test
  const handleTestK6Script = async () => {
    try {
      setIsRunningK6(true);
      const res = await api.post(`/test-run/performance/script/${project.id}`);
      setIsRunningK6(false);

      toast.success("Đã chạy kiểm thử K6 thành công!");
      setRefreshTrigger((v) => v + 1);
      console.log("K6 Summary:", res.data.summary);
    } catch (err) {
      console.error(err);
      setIsRunningK6(false);
      toast.error("Kiểm thử K6 thất bại!");
    }
  };

  if (!open || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 font-[var(--font-nunito)]">
      <div className="bg-[#cae0ff] rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.6)] p-6 w-[100vw] max-w-4xl max-h-[90vh]  overflow-y-auto scrollbar-clear relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-10  "
          aria-label="Đóng"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            className="w-6 h-6 hover:text-white text-[#658ec7]"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </Button>

        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="w-7 h-7 text-[#658ec7]" />
          <h2 className="text-[30px] font-bold text-[#658ec7] font-[var(--font-nunito)]">
            Project Details
          </h2>
        </div>

        {/* Project Information */}
        <div className="border rounded-xl p-5 space-y-5 bg-[#658ec7] text-white ">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5  text-white/80" />
            <h3 className="font-semibold text-lg">Project Information</h3>
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium flex items-center gap-1 text-[#ffffffd5]">
              Project Name
            </label>
            <div className="flex gap-2 items-center mt-1">
              {isEditingName ? (
                <>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      handleSaveField("name", name);
                      setIsEditingName(false);
                    }}
                    className="hover:bg-[#c4a5c2] bg-[#cae0ffb5] "
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-semibold flex-1 text-[30px]">{name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingName(true)}
                    className="hover:bg-[#c4a5c2] hover:text-white"
                  >
                    <Pencil className="w-4 h-4 " />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium flex items-center gap-1 text-white/80">
              Description
            </label>
            <div className="flex gap-2 items-start mt-1">
              {isEditingDesc ? (
                <>
                  <Textarea
                    placeholder="Brief description of your testing project"
                    className="placeholder:text-[#b9c4d3]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSaveField("description", description ?? "");
                        setIsEditingDesc(false);
                      }}
                      className="hover:bg-[#c4a5c2] bg-[#cae0ffb5]"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingDesc(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white rounded-lg p-4 text-sm text-muted-foreground flex-1 border border-[#e5e7eb]">
                    {description}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditingDesc(true)}
                    className="hover:bg-[#c4a5c2] hover:text-white"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Created At */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2 text-white">
            <CalendarDays className="w-4 h-4 text-white" />
            <span>
              Created:{" "}
              {new Date(project.createdAt).toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour12: false,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Test Section */}
        <div className="grid grid-cols-1 gap-5 mt-7">
          {/* Postman */}
          <div className="border rounded-xl p-5 bg-white flex flex-col gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5  text-[#658ec7]" />
              <h4 className="font-medium text-[#658ec7]">
                Postman Collection Test
              </h4>
            </div>

            <label className="text-sm text-muted-foreground">File:</label>

            {!isEditingPostmanFile ? (
              <div className="flex items-center gap-2 flex-wrap">
                {project.postmanFilePath && (
                  <button
                    className="text-[#658ec7] underline text-sm"
                    onClick={() =>
                      handleViewFile(
                        project.postmanFilePath!,
                        project.originalPostmanFileName ||
                          "Postman Collection.json"
                      )
                    }
                  >
                    {project.originalPostmanFileName ||
                      project.postmanFilePath.split("/").pop()}
                  </button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingPostmanFile(true)}
                  className="hover:bg-[#c4a5c2] hover:text-white"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".json"
                    className="flex-1"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("Chọn file Postman mới:", file.name);
                        setNewPostmanFile(file);
                      }
                    }}
                  />
                </div>

                {/* Nút Save/Cancel */}
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    disabled={!newPostmanFile}
                    onClick={() => {
                      if (newPostmanFile) {
                        handleUpdateFile(newPostmanFile, "postman");
                        setIsEditingPostmanFile(false);
                      }
                    }}
                    className="hover:bg-[#c4a5c2] bg-[#658ec7]"
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingPostmanFile(false);
                      setNewPostmanFile(null);
                    }}
                    className=" hover:text-black"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}

            <Button
              className="mt-auto w-full bg-[#658ec7] hover:bg-[#c4a5c2] text-white"
              size="sm"
              onClick={handleTestPostman}
              disabled={isRunningPostman}
            >
              Run Postman Test
            </Button>
            {isRunningPostman && (
              <div className="flex items-center justify-center mt-2 text-sm text-gray-600">
                <Loader className="animate-spin w-5 h-5 text-primary" />
                <span className="ml-2 italic">Running...</span>
              </div>
            )}
          </div>

          {/* Quick Test */}
          <div className="border rounded-xl p-5 bg-white flex flex-col gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#658ec7]" />
              <h4 className="font-medium text-[#658ec7]">
                Quick Performance Test
              </h4>
            </div>

            {/* API URL */}
            <div>
              <label className="text-sm text-muted-foreground">API URL:</label>
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-1">
                {isEditingApiUrl ? (
                  <>
                    <Input
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      className="flex-1 min-w-0"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        handleSaveField("apiUrl", apiUrl);
                        setIsEditingApiUrl(false);
                      }}
                      className="hover:bg-[#c4a5c2] bg-[#658ec7]"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingApiUrl(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 min-w-0 bg-[#f8fafc] rounded px-3 py-2 text-sm border truncate">
                      {apiUrl || "No API URL"}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingApiUrl(true)}
                      className="hover:bg-[#c4a5c2] hover:text-white"
                    >
                      <Pencil className="w-4 h-4 " />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-row gap-4 mt-2">
                {/* HTTP Method */}
                <div className="flex-1 min-w-[120px]">
                  <label className="text-sm text-muted-foreground">
                    HTTP Method:
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {isEditingMethod ? (
                      <>
                        <Select value={method} onValueChange={setMethod}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => {
                            handleSaveField("method", method);
                            setIsEditingMethod(false);
                          }}
                          className="hover:bg-[#c4a5c2] bg-[#658ec7]"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingMethod(false)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-black font-medium">{method}</div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEditingMethod(true)}
                          className="hover:bg-[#c4a5c2] hover:text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* VUs */}
                <div className="flex-1 min-w-[100px]">
                  <label className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-4 h-4" /> VUs:
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {isEditingVus ? (
                      <>
                        <Input
                          value={vus}
                          onChange={(e) => setVus(e.target.value)}
                          className="w-20"
                          type="number"
                          min={1}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!/^\d+$/.test(vus))
                              return alert("VUs phải là số nguyên!");
                            handleSaveField("vus", Number(vus));
                            setIsEditingVus(false);
                          }}
                          className="hover:bg-[#c4a5c2] bg-[#658ec7]"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingVus(false)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-black font-medium">{vus}</div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEditingVus(true)}
                          className="hover:bg-[#c4a5c2] hover:text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Duration */}
                <div className="flex-1 min-w-[160px]">
                  <label className="text-sm text-muted-foreground flex items-center gap-1">
                    <Timer className="w-4 h-4" /> Duration:
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {isEditingDuration ? (
                      <>
                        <Input
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="w-20"
                          type="number"
                          min={1}
                        />
                        <Select
                          value={durationUnit}
                          onValueChange={setDurationUnit}
                        >
                          <SelectTrigger className="w-[70px]">
                            <SelectValue placeholder="s" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="s">s</SelectItem>
                            <SelectItem value="m">m</SelectItem>
                            <SelectItem value="h">h</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!/^\d+$/.test(duration))
                              return alert("Duration phải là số nguyên!");
                            handleSaveField(
                              "duration",
                              duration + durationUnit
                            );
                            setIsEditingDuration(false);
                          }}
                          className="hover:bg-[#c4a5c2] bg-[#658ec7]"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingDuration(false)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="text-black font-medium">
                          {duration}
                          {durationUnit}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEditingDuration(true)}
                          className="hover:bg-[#c4a5c2] hover:text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* Headers */}
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlignLeft className="w-4 h-4" /> Headers (JSON):
                </label>
                <div className="mt-1 flex flex-col gap-2">
                  {isEditingHeaders ? (
                    <>
                      <Textarea
                        value={headersJson}
                        onChange={(e) => setHeadersJson(e.target.value)}
                        className="min-h-[100px]"
                        placeholder={`{\n  "Authorization": "Bearer ...",\n  "Content-Type": "application/json"\n}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            try {
                              JSON.parse(headersJson);
                              handleSaveField("headers", headersJson);
                              setIsEditingHeaders(false);
                            } catch {
                              alert("Headers phải là JSON hợp lệ!");
                            }
                          }}
                          className="hover:bg-[#c4a5c2] bg-[#658ec7]"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingHeaders(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-2">
                      <pre className="bg-[#f8fafc] text-sm px-3 py-2 rounded border flex-1 overflow-x-auto max-h-[120px]">
                        {headersJson || "Không có headers"}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsEditingHeaders(true)}
                        className="hover:bg-[#c4a5c2] hover:text-white"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Body */}
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="w-4 h-4" /> Body (JSON):
                </label>
                <div className="mt-1 flex flex-col gap-2">
                  {isEditingBody ? (
                    <>
                      <Textarea
                        value={bodyJson}
                        onChange={(e) => setBodyJson(e.target.value)}
                        className="min-h-[100px]"
                        placeholder={`{\n  "key": "value"\n}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            try {
                              JSON.parse(bodyJson);
                              handleSaveField("body", bodyJson);
                              setIsEditingBody(false);
                            } catch {
                              alert("Body phải là JSON hợp lệ!");
                            }
                          }}
                          className="hover:bg-[#c4a5c2] bg-[#658ec7]"
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingBody(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-2">
                      <pre className="bg-[#f8fafc] text-sm px-3 py-2 rounded border flex-1 overflow-x-auto max-h-[120px]">
                        {bodyJson || "Không có body"}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsEditingBody(true)}
                        className="hover:bg-[#c4a5c2] hover:text-white"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Run Test Button */}
            <Button
              className="mt-2 w-full bg-[#658ec7] hover:bg-[#c4a5c2] text-white"
              size="sm"
              onClick={handleQuickPerformanceTest}
              disabled={isRunningQuick}
            >
              Run Quick Performance Test
            </Button>
            {isRunningQuick && (
              <div className="flex items-center justify-center mt-2">
                <Loader className="animate-spin w-5 h-5 text-primary" />
                <span className="ml-2">Running...</span>
              </div>
            )}
          </div>

          {/* K6 Script */}
          {/* K6 Script Upload Section */}
          <div className="border rounded-xl p-5 bg-white flex flex-col gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#658ec7]" />
              <h4 className="font-medium text-[#658ec7]">K6 Script Test</h4>
            </div>

            <label className="text-sm text-muted-foreground">File:</label>

            {!isEditingK6File ? (
              <div className="flex items-center gap-2 flex-wrap">
                {project.k6ScriptFilePath && (
                  <button
                    className="text-[#658ec7] underline text-sm"
                    onClick={() =>
                      handleViewFile(
                        project.k6ScriptFilePath!,
                        project.originalK6ScriptFileName || "K6 Script.js"
                      )
                    }
                  >
                    {project.originalK6ScriptFileName ||
                      project.k6ScriptFilePath.split("/").pop()}
                  </button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditingK6File(true)}
                  className="hover:bg-[#c4a5c2] hover:text-white"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".js"
                    className="flex-1"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("Chọn file K6 Script mới:", file.name);
                        setNewK6File(file);
                      }
                    }}
                  />
                </div>

                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    disabled={!newK6File}
                    onClick={() => {
                      if (newK6File) {
                        handleUpdateFile(newK6File, "k6");
                        setIsEditingK6File(false);
                      }
                    }}
                    className="hover:bg-[#c4a5c2] bg-[#658ec7]"
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingK6File(false);
                      setNewK6File(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}

            <Button
              className="mt-auto w-full bg-[#658ec7] hover:bg-[#c4a5c2] text-white"
              size="sm"
              onClick={handleTestK6Script}
              disabled={isRunningK6}
            >
              Run K6 Script
            </Button>
            {isRunningK6 && (
              <div className="flex items-center justify-center mt-2">
                <Loader className="animate-spin w-5 h-5 text-primary" />
                <span className="ml-2">Running...</span>
              </div>
            )}
          </div>
        </div>

        {/* File Viewer */}
        {viewFileContent && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-lg w-[100vw] max-w-4xl max-h-[90vh] p-0 flex flex-col">
              {/* Header cố định */}
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {viewFileContent.name}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewFileContent(null)}
                >
                  ✕
                </Button>
              </div>

              {/* Nội dung cuộn */}
              <div
                className="p-6 pt-4 overflow-y-auto"
                style={{ maxHeight: "calc(90vh - 72px)" }}
              >
                <SyntaxHighlighter
                  language={viewFileContent.language}
                  customStyle={{ borderRadius: 8, padding: 16, fontSize: 14 }}
                  wrapLongLines
                  showLineNumbers
                >
                  {viewFileContent.content}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>
        )}

        {/* Test History Section */}
        <TestHistorySection
          projectId={project.id}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
};

export default ProjectDetailsDialog;
