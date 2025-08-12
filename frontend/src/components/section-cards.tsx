"use client"

interface SectionCardsProps {
  onProjectCreated?: () => void
}

import {
  Card,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card"
import CreateProjectDialog from "@/components/CreateProjectDialog"
import { IconFilePlus } from "@tabler/icons-react"

export function SectionCards({ onProjectCreated }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 lg:px-6 items-stretch">
      {/* Trigger card + dialog */}
      <CreateProjectDialog
        onCreated={onProjectCreated}
        trigger={
          <Card className="cursor-pointer transition duration-150 hover:shadow-[0_2px_10px_#658ec7] active:scale-95 h-[185px]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#658ec7] text-[25px] font-[var(--font-nunito)]">
                <IconFilePlus className="w-8 h-8" />
                Click here to create a new test project
              </CardTitle>
            </CardHeader>
            <CardFooter>
              <CardDescription className="text-[18px] font-lora">
                Set up a workspace to test APIs, measure performance, and view results.
              </CardDescription>
            </CardFooter>
          </Card>
        }
      />

      {/* Illustration */}
      <Card className="flex items-center justify-center h-[185px] p-0 bg-[#658ec7] m-0 border-0">
        <img
          src="/dashboard_pic.png"
          alt="Dashboard preview"
          className="w-full h-full object-cover rounded-2xl"
        />
      </Card>
    </div>
  )
}
