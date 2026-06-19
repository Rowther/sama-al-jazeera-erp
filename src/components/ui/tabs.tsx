"use client"

import { cn } from "@/lib/utils"

interface Tab {
  id: string
  label: string
  count?: number
  icon?: React.ReactNode
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  return (
    <div className={cn("flex border-b border-gray-200 gap-0", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 -mb-px",
            activeTab === tab.id
              ? "border-[#4F8EF7] text-[#4F8EF7]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              activeTab === tab.id ? "bg-[#EEF4FF] text-[#4F8EF7]" : "bg-gray-100 text-gray-500"
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
