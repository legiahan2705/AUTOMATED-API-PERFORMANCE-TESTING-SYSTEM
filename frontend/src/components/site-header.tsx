"use client";

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useUser } from "@/hooks/useUser"

import { MdWavingHand } from "react-icons/md" // icon

export function SiteHeader() {
  const user = useUser()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-[#658ec7] border-l transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) bg-[#658ec7]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 text-[white]" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
       <h1 className="text-base text-[25px] font-lora flex items-center gap-2 font-bold text-[white]">
          {user?.name ? `Welcome back, ${user.name}!` : "Welcome back"}{" "}
          <MdWavingHand className="text-[#ffffff] text-[25px]"  />
        </h1>
       
      </div>
    </header>
  )
}
