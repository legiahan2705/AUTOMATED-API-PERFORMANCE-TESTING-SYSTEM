'use client'

import { useState, useEffect } from "react"
import type { AxiosError } from "axios"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"
import api from "@/lib/api"
import { useUser } from "@/hooks/useUser"
import { IconX } from "@tabler/icons-react"
import { DialogClose } from "@radix-ui/react-dialog"
import React from "react"
import { Textarea } from "./ui/textarea"

interface CreateProjectDialogProps {
  trigger: React.ReactNode
  onCreated?: () => void
}

export default function CreateProjectDialog({ trigger, onCreated }: CreateProjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [projectDesc, setProjectDesc] = useState("")
  const [postmanFile, setPostmanFile] = useState<File | null>(null)
  const [k6File, setK6File] = useState<File | null>(null)
  const [apiUrl, setApiUrl] = useState("")
  const [vus, setVus] = useState("")
  const [durationVal, setDurationVal] = useState("")
  const [durationUnit, setDurationUnit] = useState<"ms"|"s"|"m">("s")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { token } = useUser() || {}
  const [method, setMethod] = useState("")
  const [headersJson, setHeadersJson] = useState("")
  const [bodyJson, setBodyJson] = useState("")


  useEffect(() => {
    if (!isOpen) resetForm()
  }, [isOpen])

  function resetForm() {
    setProjectName("")
    setProjectDesc("")
    setPostmanFile(null)
    setK6File(null)
    setApiUrl("")
    setVus("")
    setDurationVal("")
    setDurationUnit("s")
  }

  async function handleCreate() {
    if (!projectName.trim()) {
      toast.error("Tên project không được để trống")
      return
    }
    setIsSubmitting(true)

    const form = new FormData()
    form.append("name", projectName.trim())
    form.append("method", method)
    if (projectDesc.trim()) form.append("description", projectDesc.trim())

    if (postmanFile) form.append("files", postmanFile)
    if (k6File) form.append("files", k6File)

    if (apiUrl && vus && durationVal) {
      form.append("apiUrl", apiUrl.trim())
      form.append("vus", vus.trim())
      form.append("duration", durationVal + durationUnit)
    }

    if (headersJson.trim()) form.append("headers", headersJson.trim())
    if (bodyJson.trim()) form.append("body", bodyJson.trim())


    try {
      await api.post("/project", form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
      toast.success("Tạo project thành công ")
      setIsOpen(false)
      onCreated?.()
    }  catch (err) {
  console.error(err)

  const axiosError = err as AxiosError<any>
  const resMessage = axiosError?.response?.data?.message

  const msg =
    Array.isArray(resMessage) ? resMessage[0] :
    typeof resMessage === "string" ? resMessage :
    "Xảy ra lỗi khi tạo project "

  toast.error(msg)

    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl bg-[#51627862] backdrop-blur-md">
        <DialogHeader>
          <DialogTitle className="text-white">Tạo Project mới</DialogTitle>
          <DialogDescription className="text-gray-300">
            Nhập thông tin cần thiết để bắt đầu
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-auto max-h-[60vh] scrollbar-clear pr-3 pb-6">
          <div>
            <label className="block text-white font-semibold mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Nhập tên project..."
              className="bg-transparent text-white placeholder:text-white"
            />
          </div>
          <div>
            <label className="block text-white font-semibold mb-1">Description</label>
            <Input
              value={projectDesc}
              onChange={e => setProjectDesc(e.target.value)}
              placeholder="Mô tả ngắn gọn..."
              className="bg-transparent text-white placeholder:text-white"
            />
          </div>

          <div className="border rounded-md p-4">
            <p className="text-white font-semibold mb-2">
              Upload Postman (.json)
            </p>
            <label
              htmlFor="postman-upload"
              className={`flex justify-between items-center p-2 border rounded cursor-pointer ${
                postmanFile ? "bg-[#658ec7] text-white" : "text-gray-300"
              }`}
            >
              <span className="truncate">
                {postmanFile?.name || "Chọn file .json"}
              </span>
              {postmanFile && (
                <IconX
                  onClick={e => { e.stopPropagation(); setPostmanFile(null) }}
                  size={20}
                  className="text-red-400"
                />
              )}
            </label>
            <input
              id="postman-upload"
              type="file"
              accept=".json"
              className="hidden"
              onChange={e => setPostmanFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="border rounded-md p-4">
  <p className="text-white font-semibold mb-2">
    Performance Quick Test 
  </p>

  {/* API URL */}
  <Input
    placeholder="API URL"
    value={apiUrl}
    onChange={e => setApiUrl(e.target.value)}
    className="bg-transparent text-white mb-2 placeholder:text-white"
  />

          {/* Headers */}
          <div className="mb-2">
            <p className="text-white text-sm font-medium mb-1">Headers (JSON)</p>
            <Textarea
          placeholder='{ "Authorization": "Bearer abc123" }'
          value={headersJson}
          onChange={(e) => setHeadersJson(e.target.value)}
          className="bg-transparent text-white placeholder:text-white"
        />
          </div>

          {/* Body */}
          <div className="mb-2">
            <p className="text-white text-sm font-medium mb-1">Body (JSON)</p>
            <Textarea
          placeholder='{ "name": "sữa rửa mặt", "price": 99 }'
          value={bodyJson}
          onChange={(e) => setBodyJson(e.target.value)}
          className="bg-transparent text-white placeholder:text-white"
        />
          </div>

  {/* Method + VUs + Duration */}
  <div className="grid grid-cols-[auto_auto_1fr] gap-2 text-white">
    <Select value={method} onValueChange={(v) => setMethod(v)}>
      <SelectTrigger className="!text-white select-arrow w-25">
        <SelectValue placeholder="Method" className="placeholder:text-white" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="GET">GET</SelectItem>
        <SelectItem value="POST">POST</SelectItem>
        <SelectItem value="PUT">PUT</SelectItem>
        <SelectItem value="DELETE">DELETE</SelectItem>
        <SelectItem value="PATCH">PATCH</SelectItem>
      </SelectContent>
    </Select>

    <Input
      type="number"
      placeholder="VUs"
      value={vus}
      onChange={e => setVus(e.target.value)}
      className="bg-transparent text-white placeholder:text-white w-25"
    />

    <div className="flex gap-2">
      <Input
        type="number"
        placeholder="Duration"
        value={durationVal}
        onChange={e => setDurationVal(e.target.value)}
        className="bg-transparent text-white placeholder:text-white"
      />
      <Select
        value={durationUnit}
        onValueChange={(v) => setDurationUnit(v as any)}
      >
        <SelectTrigger className="w-20 text-white select-arrow">
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
</div>


          <div className="border rounded-md p-4">
            <p className="text-white font-semibold mb-2">
              Upload K6 Script (.js)
            </p>
            <label
              htmlFor="k6-upload"
              className={`flex justify-between items-center p-2 border rounded cursor-pointer ${
                k6File ? "bg-[#658ec7] text-white" : "text-gray-300"
              }`}
            >
              <span className="truncate">
                {k6File?.name || "Chọn script .js"}
              </span>
              {k6File && (
                <IconX
                  onClick={e => { e.stopPropagation(); setK6File(null) }}
                  size={20}
                  className="text-red-400"
                />
              )}
            </label>
            <input
              id="k6-upload"
              type="file"
              accept=".js"
              className="hidden"
              onChange={e => setK6File(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting}
            className="bg-[#658ec7] text-white hover:bg-[#c4a5c2] transition duration-200"
          >
            {isSubmitting ? "Đang tạo..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
