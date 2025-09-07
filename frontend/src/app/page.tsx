"use client";

import { useState } from "react"
import { LoginForm } from "@/components/login-form"
import { SignUpForm } from "@/components/signup-form"
import { ForgotPasswordForm } from "@/components/forgot-password-form"



export default function LoginPage() {
  const [formType, setFormType] = useState<"login" | "signup" | "forgot">("login")

  return (
    <div className="relative min-h-svh">
      {/* Background image */}
      <img
        src="/welcome-bg.png"
        alt="Image"
        className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
      />

      {/* Wrapper chứa chữ và form */}
      <div className="absolute inset-0 z-10">
        {/* Chữ Welcome */}
        <div className="absolute top-[12%] left-[33%] drop-shadow-lg text-left">
          <h1 className="text-[40px] leading-snug text-center font-[var(--font-nunito)]  text-[#6e9ee1]">
            Welcome to<br />
            <span className=" text-[50px] font-lora font-bold text-[#658ec7]">Test Mate</span><br />
            <p className="text-[20px] font-[var(--font-nunito)] text-[#658ec7c3] font-bold">
              Automated API & Performance Testing <br /> with a Visual Interface
            </p>
          </h1>
        </div>

        {/* Form (login/signup/forgot) */}

          {formType === "login" && (
            <div className="absolute top-[12%] left-[67%]">
              <div className="w-[400px] min-h-[420px] bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6">
                <LoginForm
                  onSignUpClick={() => setFormType("signup")}
                  onForgotClick={() => setFormType("forgot")}
                />
              </div>
            </div>
          )}

  
          {formType === "signup" && (
            <div className="absolute top-[9%] left-[67%]"> 
              <div className="w-[400px] min-h-[460px] bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6">
                <SignUpForm onBackToLogin={() => setFormType("login")} />
              </div>
            </div>
          )}

        
          {formType === "forgot" && (
            <div className="absolute top-[12%] left-[67%]">
              <div className="w-[400px] min-h-[420px] bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6">
                <ForgotPasswordForm onBackToLogin={() => setFormType("login")}  onGoToSignUp={() => setFormType("signup")}/>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
