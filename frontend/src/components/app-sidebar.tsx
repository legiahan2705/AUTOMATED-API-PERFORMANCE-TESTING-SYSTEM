"use client"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onProjectCreated?: () => void
  onScrollToProjects?: () => void
}

import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFilePlus,
  IconFileWord,
  IconFolder,
  IconFolders,
  IconHelp,
  IconInnerShadowTop,
  IconLayoutDashboard,
  IconListDetails,
  IconNewSection,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"


import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import CreateProjectDialog from "./CreateProjectDialog"
import type { NavItem } from "@/components/nav-main"

function getNavMain(
  onProjectCreated?: () => void,
  onScrollToProjects?: () => void
): NavItem[] {
  return [
    {
      title: "Dashboard",
      url: "#",
      icon: IconLayoutDashboard,
    },
    {
      title: "Create new project",
      icon: IconFilePlus,
      custom: (item: NavItem) => {
        const Icon = item.icon
        return (
          <CreateProjectDialog
            onCreated={onProjectCreated}
            trigger={
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={item.title}
                  className="cursor-pointer hover:bg-[#c4a5c2]"
                >
                  {Icon && <Icon className="w-5 h-5" />}
                  <span className="text-[18px]">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            }
          />
        )
      },
    }
    ,
    {
      title: "Your projects",
      icon: IconFolders,
      custom: (item: NavItem) => {
        const Icon = item.icon
        return (
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={item.title}
              className="cursor-pointer hover:bg-[#c4a5c2]"
              onClick={onScrollToProjects} // scroll
            >
              {Icon && <Icon className="w-5 h-5" />}
              <span className="text-[18px]">{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      },
    }
  ]
}


export const data = {
  navSecondary: [
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
  ],
}


export function AppSidebar({ onProjectCreated, onScrollToProjects, ...restProps }: AppSidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...restProps} className="font-[var(--font-nunito)] bg-[#cae0ffb5]">
      <SidebarHeader className="p-0 m-0">
        <h1 className="text-base text-[30px] font-lora font-bold text-[#658ec7] pl-4 cursor-default bg-[#cae0ffb5]">
          Test Mate
        </h1>
      </SidebarHeader>
      <SidebarContent className="bg-[#cae0ffb5]">
        
        <NavMain items={getNavMain(onProjectCreated, onScrollToProjects)} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="pl-2 m-0 bg-[#cae0ffb5]">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
