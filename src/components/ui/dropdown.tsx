import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
  danger?: boolean
}

interface DropdownProps {
  options: DropdownOption[]
  onSelect: (value: string) => void
  children: React.ReactNode
  align?: "left" | "right"
}

function Dropdown({ options, onSelect, children, align = "left" }: DropdownProps) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen(!open)}>{children}</div>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 min-w-[180px] rounded-xl bg-white border border-gray-100 shadow-lg py-1 animate-in fade-in-0 zoom-in-95",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onSelect(opt.value); setOpen(false) }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors hover:bg-gray-50",
                opt.danger ? "text-[#F45D5D]" : "text-gray-700"
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export { Dropdown }
export type { DropdownOption }
