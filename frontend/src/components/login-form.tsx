"use client";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useRef, useState } from "react"
import { toast } from "react-hot-toast" // Import thư viện toast để hiện thông báo
import { useRouter } from "next/navigation"
import axios from "../lib/axiosInstance" // Hàm gọi API tự định nghĩa
import { CheckCircleIcon } from "lucide-react";

// Component LoginForm nhận props điều hướng đến form đăng ký và quên mật khẩu
export function LoginForm({
  onSignUpClick,
  onForgotClick,
  ...props
}: React.ComponentProps<"form"> & {
  onSignUpClick: () => void
  onForgotClick: () => void
}) {
  // Tạo ref để truy cập trực tiếp input email và password
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Biến state để lưu lỗi khi form bị thiếu hoặc khi đăng nhập thất bại
  const [error, setError] = useState<string | null>(null)

  // điều hướng trang sau khi đăng nhập thành công
  const router = useRouter()

  // Hàm xử lý khi submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // Ngăn reload trang khi submit form
    setError(null)     // Reset lỗi cũ

    const email = emailRef.current?.value
    const password = passwordRef.current?.value

    // Kiểm tra xem email và password đã được nhập chưa
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin")
      return
    }

    try {
      // Gửi request đăng nhập đến API
      const res = await axios.post("/auth/login", {
        email,
        password,
      })

const { token, user } = res.data


      // Lưu token và thông tin user vào localStorage
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))

      // Hiển thị toast thành công khi đăng nhập đúng
      toast.custom((t) => (
      <div
        className={`${
          t.visible ? "animate-enter" : "animate-leave"
        } flex items-center gap-3 bg-[#aadcac] border border-[#caf3cb] text-[#172418] px-4 py-3 rounded-lg shadow-lg`}
      >
        {/* Icon */}
        <CheckCircleIcon className="w-5 h-5 text-[#1f3b22]" />

        {/* Message */}
        <span className="text-sm font-medium text-[#1f3b22]">
          Chào mừng trở lại, {user.name}!
        </span>
      </div>
      ), {duration:100}
      )

      
      setTimeout(() => router.push("/dashboard"), 50)
    } catch (err: any) {
      // Nếu API trả về lỗi, xử lý hiển thị phù hợp
      const message =
        err.message === "Sai email hoặc mật khẩu"
          ? "Sai email hoặc mật khẩu. Vui lòng thử lại!"
          : "Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại sau."

      // Hiển thị toast lỗi
      toast.error(message)

      // Gán lỗi để hiện dưới form
      setError(message)

      // Xoá nội dung đã nhập để user nhập lại
      if (emailRef.current) emailRef.current.value = ""
      if (passwordRef.current) passwordRef.current.value = ""
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" {...props}>
      {/* Tiêu đề form */}
      <div className="text-center">
        <h1 className="text-[20px] font-bold text-[#658ec7] font-[var(--font-nunito)]">
          Login to your account to continue
        </h1>
      </div>

      <div className="grid gap-4">
        {/* Nhập email */}
        <div className="grid gap-3">
          <Label
            htmlFor="email"
            className="text-[#658ec7] text-[18px] font-[var(--font-nunito)]"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            required
            ref={emailRef}
          />
        </div>

        {/* Nhập mật khẩu */}
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label
              htmlFor="password"
              className="text-[#658ec7] text-[18px] font-[var(--font-nunito)]"
            >
              Password
            </Label>
            {/* Nút quên mật khẩu */}
            <button
              type="button"
              onClick={onForgotClick}
              className="ml-auto text-sm text-[#658ec7] hover:text-[#c4a5c2] active:scale-90 transition-transform duration-120 font-[var(--font-nunito)] cursor-pointer"
            >
              Forgot your password?
            </button>
          </div>
          <Input id="password" type="password" required ref={passwordRef} />
        </div>

        {/* Nút submit form */}
        <Button
          type="submit"
          className="w-full bg-[#658ec7] md:font-bold text-[16px] hover:bg-[#c4a5c2] active:scale-90 transition-transform duration-120 cursor-pointer"
        >
          Log in
        </Button>

        {/* Hiển thị lỗi nếu có */}
        {error && (
          <p className="text-red-500 text-center text-sm font-[var(--font-nunito)]">
            {error}
          </p>
        )}
      </div>

      {/* Nút điều hướng sang đăng ký */}
      <div className="text-center text-[16px] text-[#658ec7] font-[var(--font-nunito)]">
        Don’t have an account?{" "}
        <button
          type="button"
          onClick={onSignUpClick}
          className="inline-block font-bold hover:text-[#c4a5c2] active:scale-90 transition-transform duration-120 cursor-pointer"
        >
          Sign up
        </button>
      </div>
    </form>
  )
}
