"use client"

import React from "react"
import Link from "next/link"
import type { Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem, // thực chất là <li>
} from "@/components/ui/sidebar"

export interface NavItem {
  title: string
  url?: string
  icon?: Icon
  custom?: (item: NavItem) => React.ReactNode
}

export function NavMain({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) =>
            item.custom ? (
              <React.Fragment key={item.title}>{item.custom(item)}</React.Fragment>
            ) : (
              <SidebarMenuItem key={item.title}>
                {/* nếu có url thì bọc Link, không thì chỉ render button */}
                {item.url ? (
                  <Link href={item.url} className="flex w-full">
                    <SidebarMenuButton
                      tooltip={item.title}
                      className="cursor-pointer hover:bg-[#c4a5c2] flex w-full"
                    >
                      {item.icon && <item.icon />}
                      <span className="text-[18px]">{item.title}</span>
                    </SidebarMenuButton>
                  </Link>
                ) : (
                  <SidebarMenuButton
                    tooltip={item.title}
                    className="cursor-pointer hover:bg-[#c4a5c2]"
                  >
                    {item.icon && <item.icon />}
                    <span className="text-[18px]">{item.title}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
