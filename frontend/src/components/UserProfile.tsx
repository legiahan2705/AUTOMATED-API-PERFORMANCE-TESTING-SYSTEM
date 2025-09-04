"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/hooks/useUser"
import {
  IconEdit,
  IconCheck,
  IconX,
  IconEye,
  IconEyeOff,
  IconUserCircle,
  IconMail,
  IconLock,
  IconLoader2,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import toast from "react-hot-toast"

interface EditState {
  name: boolean
  email: boolean
  password: boolean
}

interface UserProfileProps {
  onClose?: () => void
}

export function UserProfile({ onClose }: UserProfileProps) {
  const user = useUser()
  
  const [editMode, setEditMode] = useState<EditState>({
    name: false,
    email: false,
    password: false,
  })
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
      }))
      setInitialLoading(false)
    }
  }, [user])

  const updateProfile = async (field: keyof EditState) => {
    if (!user) return

    setIsLoading(true)
    const token = localStorage.getItem("token")
    
    try {
      let endpoint = ""
      let body = {}

      switch (field) {
        case "name":
          endpoint = "/auth/update-profile"
          body = { name: formData.name }
          break
        case "email":
          endpoint = "/auth/update-email"
          body = { newEmail: formData.email }
          break
        case "password":
          if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match")
            return
          }
          endpoint = "/auth/forgot-password"
          body = { email: user.email, newPassword: formData.password }
          break
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (response.ok) {
        if (field === "name" || field === "email") {
          const updatedUser = {
            ...user,
            name: field === "name" ? formData.name : user.name,
            email: field === "email" ? formData.email : user.email,
          }
          localStorage.setItem("user", JSON.stringify(updatedUser))
        }

        if (field === "password") {
          setFormData(prev => ({
            ...prev,
            password: "",
            confirmPassword: "",
          }))
        }

        setEditMode(prev => ({ ...prev, [field]: false }))
        
        toast.success("Updated successfully")
        window.location.reload()
      } else {
        toast.error(result.message || "Update failed")
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const cancelEdit = (field: keyof EditState) => {
    setEditMode(prev => ({ ...prev, [field]: false }))
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        password: "",
        confirmPassword: "",
      }))
    }
  }

  // Enhanced loading state
  if (initialLoading || !user) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 font-[var(--font-nunito)]">
        <div className="bg-[#cae0ff] rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.6)] p-12 flex flex-col items-center gap-6 animate-slide-in max-w-md">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-[#658ec7]/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-[#658ec7] border-r-[#c4a5c2] rounded-full animate-spin"></div>
            <div className="absolute inset-3 bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] rounded-full flex items-center justify-center">
              <IconUserCircle className="w-6 h-6 text-white animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-bold text-[#658ec7] mb-2">Loading Profile</h3>
            <p className="text-gray-600">Getting your account information...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-[var(--font-nunito)]">
      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center w-full h-full"> 
        <Card className="bg-[#cae0ff] border-0 shadow-[0_0_20px_rgba(255,255,255,0.6)] overflow-hidden w-[60vw] max-w-[50vw] max-h-[80vh] animate-slide-in pb-0  ">
          <CardHeader className="relative  ">
            <CardTitle className="flex items-center justify-between text-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] shadow-lg">
                  <IconUserCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-[#658ec7] font-bold">Account Settings</h2>
                  <p className="text-sm text-gray-600 font-normal">Manage your profile information</p>
                </div>
              </div>
              {onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="hover:bg-white/20 rounded-full w-10 h-10"
                >
                  <IconX className="h-5 w-5 text-gray-600" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8 bg-white overflow-y-auto max-h-[calc(80vh-120px)]">
            {/* Enhanced Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] text-3xl font-bold text-white shadow-lg">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-[#658ec7]">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>

            {/* Enhanced Name Field */}
            <div className="space-y-3">
              <Label htmlFor="name" className="flex items-center gap-3 text-[#658ec7] font-semibold text-base">
                <div className="p-1.5 rounded-lg bg-[#658ec7]/10">
                  <IconUserCircle className="h-4 w-4 text-[#658ec7]" />
                </div>
                Display Name
              </Label>
              
              {editMode.name ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your display name"
                      className="h-12 pl-4 pr-4 border-2 border-[#658ec7]/20 focus:border-[#658ec7] focus:ring-4 focus:ring-[#658ec7]/20 rounded-lg text-base font-medium transition-all duration-200"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => updateProfile("name")}
                      disabled={isLoading || !formData.name.trim()}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold h-11 rounded-lg transition-all duration-200"
                    >
                      {isLoading ? (
                        <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <IconCheck className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => cancelEdit("name")}
                      disabled={isLoading}
                      className="flex-1 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold h-11 rounded-lg transition-all duration-200"
                    >
                      <IconX className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gradient-to-r from-[#658ec7]/5 to-[#c4a5c2]/5 rounded-lg p-4 border border-[#658ec7]/20">
                    <p className="text-gray-800 font-medium text-base">{user.name}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(prev => ({ ...prev, name: true }))}
                    className="bg-white hover:bg-[#658ec7]/5 border-[#658ec7]/30 text-[#658ec7] font-semibold px-4 h-11 rounded-lg transition-all duration-200"
                  >
                    <IconEdit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Enhanced Email Field */}
            <div className="space-y-3">
              <Label htmlFor="email" className="flex items-center gap-3 text-[#658ec7] font-semibold text-base">
                <div className="p-1.5 rounded-lg bg-[#c4a5c2]/10">
                  <IconMail className="h-4 w-4 text-[#c4a5c2]" />
                </div>
                Email Address
              </Label>
              
              {editMode.email ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email address"
                      className="h-12 pl-4 pr-4 border-2 border-[#c4a5c2]/20 focus:border-[#c4a5c2] focus:ring-4 focus:ring-[#c4a5c2]/20 rounded-lg text-base font-medium transition-all duration-200"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => updateProfile("email")}
                      disabled={isLoading || !formData.email.trim()}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold h-11 rounded-lg transition-all duration-200"
                    >
                      {isLoading ? (
                        <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <IconCheck className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => cancelEdit("email")}
                      disabled={isLoading}
                      className="flex-1 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold h-11 rounded-lg transition-all duration-200"
                    >
                      <IconX className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gradient-to-r from-[#c4a5c2]/5 to-[#658ec7]/5 rounded-lg p-4 border border-[#c4a5c2]/20">
                    <p className="text-gray-800 font-medium text-base">{user.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(prev => ({ ...prev, email: true }))}
                    className="bg-white hover:bg-[#c4a5c2]/5 border-[#c4a5c2]/30 text-[#c4a5c2] font-semibold px-4 h-11 rounded-lg transition-all duration-200"
                  >
                    <IconEdit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Enhanced Password Field */}
            <div className="space-y-3">
              <Label htmlFor="password" className="flex items-center gap-3 text-[#658ec7] font-semibold text-base">
                <div className="p-1.5 rounded-lg bg-orange-500/10">
                  <IconLock className="h-4 w-4 text-orange-500" />
                </div>
                Password
              </Label>
              
              {editMode.password ? (
                <div className="space-y-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter new password"
                        className="h-11 pl-4 pr-12 border-2 border-orange-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 rounded-lg font-medium transition-all duration-200"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-orange-100"
                      >
                        {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                        className="h-11 pl-4 pr-12 border-2 border-orange-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 rounded-lg font-medium transition-all duration-200"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-orange-100"
                      >
                        {showConfirmPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => updateProfile("password")}
                      disabled={isLoading || !formData.password.trim() || !formData.confirmPassword.trim()}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold h-11 rounded-lg transition-all duration-200"
                    >
                      {isLoading ? (
                        <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <IconCheck className="h-4 w-4 mr-2" />
                      )}
                      Update Password
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => cancelEdit("password")}
                      disabled={isLoading}
                      className="flex-1 border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold h-11 rounded-lg transition-all duration-200"
                    >
                      <IconX className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-gray-800 font-medium text-base">••••••••••••</p>
                        
                      </div>
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <IconLock className="h-4 w-4 text-orange-600" />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(prev => ({ ...prev, password: true }))}
                    className="bg-white hover:bg-orange-50 border-orange-300 text-orange-600 font-semibold px-4 h-11 rounded-lg transition-all duration-200"
                  >
                    <IconEdit className="h-4 w-4 mr-2" />
                    Change
                  </Button>
                </div>
              )}
            </div>

            {/* Footer info */}
            <div className="pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Your information is encrypted and secure. Changes take effect immediately.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}