"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import toast from "react-hot-toast"
import { CheckCircleIcon } from "lucide-react"
import axiosInstance from "@/lib/axiosInstance" 

export function ForgotPasswordForm({
  onBackToLogin,
  onGoToSignUp,
  className,
  ...props
}: React.ComponentProps<"form"> & {
  onBackToLogin?: () => void
  onGoToSignUp?: () => void
}) {
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Gọi API bằng axiosInstance
      const res = await axiosInstance.post("/auth/forgot-password", {
        email,
        newPassword,
      })

      toast.custom((t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } flex items-center gap-3 bg-[#aadcac] border border-[#caf3cb] text-[#172418] px-4 py-3 rounded-lg shadow-lg`}
        >
          <CheckCircleIcon className="w-5 h-5 text-[#1f3b22]" />
          <span className="text-sm font-medium">
            Đổi mật khẩu thành công!
          </span>
          <button
            className="ml-auto text-sm px-2 py-1 font-bold bg-[#86bf88] text-[#1f3b22] hover:bg-[#699c6a] rounded-md active:scale-90 transition-all"
            onClick={() => {
              toast.dismiss(t.id)
              onBackToLogin?.()
            }}
          >
            OK
          </button>
        </div>
      ), { duration: 5000 })

      setEmail("")
      setNewPassword("")
    } catch (err: any) {
      if (
        err.response?.data?.message?.toLowerCase().includes("not found") ||
        err.response?.data?.message?.toLowerCase().includes("không tìm thấy")
      ) {
        toast((t) => (
          <span className="flex flex-col gap-2 text-[#000000] font-[var(--font-nunito)]">
            <b>Email chưa được đăng ký!</b>
            <Button
              className="w-full bg-[#c4a5c2] hover:bg-[#658ec7] text-white text-sm active:scale-90"
              onClick={() => {
                toast.dismiss(t.id)
                onGoToSignUp?.()
              }}
            >
              Sign up
            </Button>
          </span>
        ))
      } else {
        toast.error(err.response?.data?.message || "Có lỗi xảy ra khi đổi mật khẩu")
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
      {/* Phần tiêu đề */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[20px] font-bold text-[#658ec7] font-[var(--font-nunito)]">
          Reset your password to regain access
        </h1>
      </div>

      {/* Inputs */}
      <div className="grid gap-4">
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
          <Label htmlFor="new-password" className="text-[#658ec7] text-[18px] font-[var(--font-nunito)]">
            New Password
          </Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full md:font-bold bg-[#658ec7] font-[var(--font-nunito)] text-[16px] cursor-pointer hover:bg-[#c4a5c2] active:scale-90 transition-transform duration-120"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </Button>
      </div>

      <div className="text-center text-[16px] text-[#658ec7] font-[var(--font-nunito)]">
        Remember your password?{" "}
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
