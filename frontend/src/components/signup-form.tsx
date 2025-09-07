"use client";

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import toast from "react-hot-toast"
import { CheckCircleIcon } from "lucide-react"
import axiosInstance from "@/lib/axiosInstance"

export function SignUpForm({
  onBackToLogin,
  className,
  ...props
}: React.ComponentProps<"form"> & { onBackToLogin?: () => void }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setName("")
    setEmail("")
    setPassword("")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      //  Sử dụng axiosInstance để gửi POST
      const res = await axiosInstance.post("/auth/signup", {
        name,
        email,
        password,
      })

      const data = res.data // Lấy dữ liệu từ res.data

      toast.custom((t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } flex items-center gap-3 bg-[#aadcac] border border-[#caf3cb] text-[#172418] px-4 py-3 rounded-lg shadow-lg`}
        >
          <CheckCircleIcon className="w-5 h-5 text-[#1f3b22]" />
          <span className="text-sm font-medium text-[#1f3b22]">
            Đăng ký thành công!
          </span>
          <button
            className="ml-auto text-sm text-[#1f3b22] hover:bg-[#699c6a] px-2 py-1 bg-[#86bf88] rounded-md font-bold"
            onClick={() => {
              toast.dismiss(t.id)
              onBackToLogin?.()
            }}
          >
            OK
          </button>
        </div>
      ), { duration: 5000 })

    } catch (err: any) {
      resetForm()
      // Nếu có response từ server (VD: email trùng)
      if (err.response?.status === 409 || err.response?.data?.message?.includes("email")) {
        toast.error("Email đã được sử dụng!")
      } else {
        toast.error(err.response?.data?.message || "Đăng ký thất bại!")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[20px] font-bold text-[#658ec7] font-[var(--font-nunito)]">
          Create your account to get started
        </h1>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-3">
          <Label htmlFor="name" className="text-[#658ec7] text-[18px] font-[var(--font-nunito)]">
            Your Name
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="email" className="text-[#658ec7] text-[18px] font-[var(--font-nunito)]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-3">
          <Label htmlFor="password" className="text-[#658ec7] text-[18px] font-[var(--font-nunito)]">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full md:font-bold bg-[#658ec7] font-[var(--font-nunito)] text-[16px] cursor-pointer hover:bg-[#c4a5c2] active:scale-90 transition-transform duration-120"
          disabled={loading}
        >
          {loading ? "Signing up..." : "Sign up"}
        </Button>
      </div>

      <div className="text-center text-[16px] text-[#658ec7] font-[var(--font-nunito)]">
        Have an account?{" "}
        <button
          type="button"
          onClick={onBackToLogin}
          className="inline-block md:font-bold hover:text-[#c4a5c2] active:scale-90 transition-transform duration-120 cursor-pointer"
        >
          Back to Login
        </button>
      </div>
    </form>
  )
}
