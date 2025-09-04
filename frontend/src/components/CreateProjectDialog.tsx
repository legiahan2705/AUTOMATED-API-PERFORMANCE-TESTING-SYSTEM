"use client";

import { useState, useEffect } from "react";
import type { AxiosError } from "axios";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useUser } from "@/hooks/useUser";
import { IconX, IconUpload, IconCode, IconZip, IconInfoCircle, IconInfoHexagon, IconPower, IconNewSection, IconFilePlus} from "@tabler/icons-react";
import { DialogClose } from "@radix-ui/react-dialog";
import React from "react";
import { Textarea } from "./ui/textarea";
import { FolderOpen, Info, Zap } from "lucide-react";

interface CreateProjectDialogProps {
  trigger: React.ReactNode;
  onCreated?: () => void;
}

export default function CreateProjectDialog({
  trigger,
  onCreated,
}: CreateProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [postmanFile, setPostmanFile] = useState<File | null>(null);
  const [k6File, setK6File] = useState<File | null>(null);
  const [apiUrl, setApiUrl] = useState("");
  const [vus, setVus] = useState("");
  const [durationVal, setDurationVal] = useState("");
  const [durationUnit, setDurationUnit] = useState<"ms" | "s" | "m">("s");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useUser() || {};
  const [method, setMethod] = useState("");
  const [headersJson, setHeadersJson] = useState("");
  const [bodyJson, setBodyJson] = useState("");

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  function resetForm() {
    setProjectName("");
    setProjectDesc("");
    setPostmanFile(null);
    setK6File(null);
    setApiUrl("");
    setVus("");
    setDurationVal("");
    setDurationUnit("s");
    setMethod("");
    setHeadersJson("");
    setBodyJson("");
  }

  async function handleCreate() {
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    setIsSubmitting(true);

    const form = new FormData();
    form.append("name", projectName.trim());
    form.append("method", method);
    if (projectDesc.trim()) form.append("description", projectDesc.trim());

    if (postmanFile) form.append("files", postmanFile);
    if (k6File) form.append("files", k6File);

    if (apiUrl && vus && durationVal) {
      form.append("apiUrl", apiUrl.trim());
      form.append("vus", vus.trim());
      form.append("duration", durationVal + durationUnit);
    }

    if (headersJson.trim()) form.append("headers", headersJson.trim());
    if (bodyJson.trim()) form.append("body", bodyJson.trim());

    try {
      await api.post("/project", form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Project created successfully!");
      setIsOpen(false);
      onCreated?.();
    } catch (err) {
      console.error(err);

      const axiosError = err as AxiosError<any>;
      const resMessage = axiosError?.response?.data?.message;

      const msg = Array.isArray(resMessage)
        ? resMessage[0]
        : typeof resMessage === "string"
        ? resMessage
        : "An error occurred while creating the project";

      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="!w-[100vw]  !max-w-4xl !max-h-[90vh] !h-[90vh] bg-[#cae0ff] backdrop-blur-xl border-[#658ec7]/30 srounded-xl shadow-[0_0_10px_rgba(255,255,255,0.6)]">
        <DialogHeader className="pb-6  border-[#658ec7]/30">
          <DialogTitle className="text-2xl font-bold text-[#658ec7] flex items-center gap-2">
            <IconFilePlus className="h-6 w-6 text-[#658ec7]" />
            Create New Project
          </DialogTitle>
          <DialogDescription className="text-[#4a6fa5] text-base">
            Set up your testing project with the required configuration
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 overflow-auto max-h-[65vh] scrollbar-clear pr-2">
          {/* Basic Information */}
          <div className="space-y-4 p-4 rounded-lg bg-white border border-[#658ec7]/30">
            <h3 className="text-[#658ec7] font-semibold text-lg flex items-center gap-2">
               <IconInfoHexagon className="h-5 w-5 text-[#658ec7]" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[#658ec7] font-medium mb-2">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter your project name (e.g., API Load Test)"
                  className="bg-white/70 border-[#658ec7]/40 text-black placeholder:text-[#a5a3a3]] focus:border-[#658ec7] focus:ring-[#658ec7]/20 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-[#658ec7] font-medium mb-2">
                  Description
                </label>
                <Input
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Brief description of your testing project"
                  className="bg-white/70 border-[#658ec7]/40 text-black placeholder:text-[#a5a3a3] focus:border-[#658ec7] focus:ring-[#658ec7]/20 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Postman Collection Upload */}
          <div className="p-4 rounded-lg bg-white border border-[#c4a5c2]/40">
            <h3 className="text-[#658ec7] font-semibold text-lg mb-3 flex items-center gap-2">
              <IconUpload className="h-5 w-5 text-[#658ec7]" />
              Postman Collection
            </h3>
            <p className="text-[#a5a3a3] text-sm mb-3">
              Upload your Postman collection file to import API requests
            </p>
            
            <label
              htmlFor="postman-upload"
              className={`flex justify-between items-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:border-[#c4a5c2]/70 ${
                postmanFile 
                  ? "bg-[#c4a5c2]/20 border-[#c4a5c2]/60 text-[#2c5aa0]" 
                  : "border-[#658ec7]/40 text-[#4a6fa5] hover:bg-white/30"
              }`}
            >
              <span className="truncate font-medium">
                {postmanFile?.name || "Select Postman collection (.json)"}
              </span>
              {postmanFile && (
                <IconX
                  onClick={(e) => {
                    e.stopPropagation();
                    setPostmanFile(null);
                  }}
                  size={20}
                  className="text-red-500 hover:text-red-400 transition-colors"
                />
              )}
            </label>
            <input
              id="postman-upload"
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => setPostmanFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Quick Performance Test */}
          <div className="p-4 rounded-lg bg-white border border-[#658ec7]/40">
            <h3 className="text-[#658ec7] font-semibold text-lg mb-3 flex items-center gap-2">
             <Zap className="w-5 h-5 text-[#658ec7]" />
              Quick Performance Test
            </h3>
            <p className="text-[#a5a3a3] text-sm mb-4">
              Configure a simple API endpoint test with custom parameters
            </p>

            <div className="space-y-4">
              {/* API URL */}
              <div>
                <label className="block text-[#2c5aa0] font-medium mb-2">API Endpoint</label>
                <Input
                  placeholder="https://api.example.com/users"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="bg-white/70 border-[#658ec7]/40 text-[#2c5aa0] placeholder:text-[#a5a3a3] focus:border-[#658ec7] focus:ring-[#658ec7]/20 transition-colors"
                />
              </div>

              {/* Method, VUs, Duration in a row */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#2c5aa0] font-medium mb-2 text-sm">HTTP Method</label>
                  <Select value={method} onValueChange={(v) => setMethod(v)}>
                    <SelectTrigger className="bg-white/70 border-[#658ec7]/40 text-[#2c5aa0] focus:border-[#658ec7] focus:ring-[#658ec7]/20">
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-[#658ec7]/40">
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-[#2c5aa0] font-medium mb-2 text-sm">Virtual Users</label>
                  <Input
                    type="number"
                    placeholder="10"
                    value={vus}
                    onChange={(e) => setVus(e.target.value)}
                    className="bg-white/70 border-[#658ec7]/40 text-[#2c5aa0] placeholder:text-[#a5a3a3] focus:border-[#658ec7] focus:ring-[#658ec7]/20 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[#2c5aa0] font-medium mb-2 text-sm">Duration</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="30"
                      value={durationVal}
                      onChange={(e) => setDurationVal(e.target.value)}
                      className="bg-white/70 border-[#658ec7]/40 text-[#2c5aa0] placeholder:text-[#a5a3a3] focus:border-[#658ec7] focus:ring-[#658ec7]/20 transition-colors"
                    />
                    <Select
                      value={durationUnit}
                      onValueChange={(v) => setDurationUnit(v as any)}
                    >
                      <SelectTrigger className="w-16 bg-white/70 border-[#658ec7]/40 text-[#2c5aa0] focus:border-[#658ec7] focus:ring-[#658ec7]/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-[#658ec7]/40">
                        <SelectItem value="ms">ms</SelectItem>
                        <SelectItem value="s">s</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Headers */}
              <div>
                <label className="block text-[#2c5aa0] font-medium mb-2">
                  Request Headers <span className="text-[#4a6fa5] text-sm">(JSON format)</span>
                </label>
                <Textarea
                  placeholder='{"Authorization": "Bearer your-token", "Content-Type": "application/json"}'
                  value={headersJson}
                  onChange={(e) => setHeadersJson(e.target.value)}
                  className="bg-white/70 border-[#658ec7]/40 text-[#2c5aa0] placeholder:text-[#a5a3a3] focus:border-[#658ec7] focus:ring-[#658ec7]/20 transition-colors min-h-[80px] font-mono text-sm"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[#2c5aa0] font-medium mb-2">
                  Request Body <span className="text-[#4a6fa5] text-sm">(JSON format)</span>
                </label>
                <Textarea
                  placeholder='{"name": "Product Name", "price": 99.99, "category": "Electronics"}'
                  value={bodyJson}
                  onChange={(e) => setBodyJson(e.target.value)}
                  className="bg-white/70 border-[#658ec7]/40 text-[#2c5aa0] placeholder:text-[#a5a3a3] focus:border-[#658ec7] focus:ring-[#658ec7]/20 transition-colors min-h-[80px] font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* K6 Script Upload */}
          <div className="p-4 rounded-lg bg-white border border-[#c4a5c2]/40">
            <h3 className="text-[#658ec7] font-semibold text-lg mb-3 flex items-center gap-2">
              <IconCode className="h-5 w-5 text-[#658ec7]" />
              K6 Script
            </h3>
            <p className="text-[#a5a3a3] text-sm mb-3">
              Upload your custom K6 JavaScript file for advanced testing scenarios
            </p>
            
            <label
              htmlFor="k6-upload"
              className={`flex justify-between items-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all hover:border-[#c4a5c2]/70 ${
                k6File 
                  ? "bg-[#c4a5c2]/20 border-[#c4a5c2]/60 text-[#2c5aa0]" 
                  : "border-[#658ec7]/40 text-[#4a6fa5] hover:bg-white/30"
              }`}
            >
              <span className="truncate font-medium">
                {k6File?.name || "Select K6 script (.js)"}
              </span>
              {k6File && (
                <IconX
                  onClick={(e) => {
                    e.stopPropagation();
                    setK6File(null);
                  }}
                  size={20}
                  className="text-red-500 hover:text-red-400 transition-colors"
                />
              )}
            </label>
            <input
              id="k6-upload"
              type="file"
              accept=".js"
              className="hidden"
              onChange={(e) => setK6File(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <DialogFooter className="pt-6 border-[#658ec7]/30">
          <DialogClose asChild>
            <Button 
              variant="ghost" 
              disabled={isSubmitting}
              className="text-[#658ec7] hover:text-white hover:bg-[#c4a5c2] transition-colors"
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] text-white hover:from-[#5780b8] hover:to-[#b594b3] transition-all duration-200 shadow-lg hover:shadow-[#658ec7]/25 px-8"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Creating...
              </div>
            ) : (
              "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}