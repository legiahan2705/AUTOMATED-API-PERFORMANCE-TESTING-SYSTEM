"use client"

import { useState } from "react"
// Lấy thông tin người dùng từ localStorage thông qua custom hook useUser
import { useUser } from "@/hooks/useUser"

import { UserProfile } from "./UserProfile"

// Icon dùng trong dropdown menu
import {
  IconDotsVertical,
  IconLogout,
  IconUserCircle,
  IconNotification,
  IconCreditCard,
  IconX,
} from "@tabler/icons-react"

// Các component tạo menu dạng dropdown
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Các thành phần trong Sidebar (menu bên trái)
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

// Component modal overlay
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog"
import { DialogTitle } from "@radix-ui/react-dialog"

export function NavUser() {
  const user = useUser() // Lấy user từ localStorage
  const { isMobile } = useSidebar() // Kiểm tra kích thước màn hình để điều chỉnh dropdown (mobile hay desktop)
  
  // State để control việc hiển thị UserProfile
  const [showUserProfile, setShowUserProfile] = useState(false)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer p-2 m-0 hover:bg-[#c4a5c2]"
              >
                {/* Avatar hiển thị ký tự đầu tên người dùng với gradient style */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] text-sm font-bold text-white shadow-lg">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>

                {/* Hiển thị tên và email của người dùng */}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user?.email}
                  </span>
                </div>

                {/* Icon mở menu 3 chấm */}
                <IconDotsVertical className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              // Menu dropdown hiển thị bên phải (hoặc bên dưới nếu là mobile)
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
              className="min-w-56 rounded-lg"
            >
              {/* Phần header trong dropdown: lặp lại avatar + thông tin user */}
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-2 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-[#658ec7] to-[#c4a5c2] text-sm font-bold text-white shadow-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="grid text-sm leading-tight">
                    <span className="truncate font-medium">{user?.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user?.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Nhóm các lựa chọn như Account, Billing, Notifications */}
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-[#c4a5c2] hover:text-white"
                  onClick={() => setShowUserProfile(true)}
                >
                  <IconUserCircle className="mr-2 size-4 hover:text-white" />
                  Account
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              {/* Nút logout: xoá token + user khỏi localStorage rồi redirect về trang chủ */}
              <DropdownMenuItem className="cursor-pointer hover:bg-[#c4a5c2] hover:text-white"
                onClick={() => {
                  localStorage.removeItem("token")
                  localStorage.removeItem("user")
                  location.href = "/" // về trang login
                }}
              >
                <IconLogout className="mr-2 size-4  hover:text-white" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Hiển thị UserProfile modal khi showUserProfile = true */}
      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} />
      )}
    </>
  )
}