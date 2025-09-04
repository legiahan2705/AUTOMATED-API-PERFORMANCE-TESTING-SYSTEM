"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { ProjectTable } from "@/components/project-table";
import ScheduledTestsTable, {
  ScheduledTest,
} from "@/components/ScheduledTestsTable";

import { useState, useRef } from "react";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Page() {
  const [refreshTrigger, setRefreshTrigger] = useState(0); // dùng để trigger reload dữ liệu project
  const [highlightProjectSection, setHighlightProjectSection] = useState(false); // dùng để highlight khối Your projects
  const yourProjectsRef = useRef<HTMLDivElement>(null); // ref để cuộn tới khối Your projects

  // Hàm xử lý cuộn xuống phần "Your projects" và highlight nó
  const scrollToProjects = () => {
    yourProjectsRef.current?.scrollIntoView({ behavior: "smooth" });
    setHighlightProjectSection(true);
    setTimeout(() => setHighlightProjectSection(false), 1500); // highlight trong 1.5s
  };

  // Hàm này dùng để cập nhật trigger khi có thao tác tạo hoặc xoá project
  const handleReloadProjects = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        className="border-r border-[#658ec7]"
        onProjectCreated={handleReloadProjects}
        onScrollToProjects={scrollToProjects}
      />

      <SidebarInset className="bg-[#cae0ffb5] border-l border-[#658ec7] p-0 m-0">
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Phần SectionCards truyền callback khi tạo project mới */}
              <SectionCards onProjectCreated={handleReloadProjects} />

              {/* Khối hiển thị danh sách project */}
              <div className="space-y-3 px-4 lg:px-6">
                <div
                  ref={yourProjectsRef}
                  className={`bg-[white] rounded-lg transition-shadow duration-500 ${
                    highlightProjectSection
                      ? "shadow-[0_2px_20px_#c4a5c2]"
                      : "shadow-[0_2px_10px_#658ec7]"
                  }`}
                >
                  

                  {/* Truyền thêm onDeleted vào ProjectTable */}
                  <div className="mt-4 rounded-b-lg border-0">
                    <ProjectTable
                      refreshTrigger={refreshTrigger}
                      onDeleted={handleReloadProjects}
                    />
                  </div>
                </div>
              </div>

              <div className=" ml-6 mr-6  bg-[white] rounded-lg transition-shadow duration-500 shadow-[0_2px_10px_#658ec7] border-0">
                <ScheduledTestsTable/>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
