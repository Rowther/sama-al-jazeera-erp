"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Search, ChevronDown } from "lucide-react"

export interface SearchableSelectProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (e: { target: { value: string } }) => void
  placeholder?: string
  className?: string
}

export function SearchableSelect({ options, value, onChange, placeholder, className }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  const selectedLabel = options.find((opt) => opt.value === value)?.label || ""

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer hover:border-gray-300 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value ? selectedLabel : placeholder || "Select..."}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              className="flex-1 border-0 outline-none text-sm bg-transparent placeholder:text-gray-400"
              placeholder="Type to search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="p-3 text-sm text-gray-400 text-center">No results</p>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between ${
                    opt.value === value ? "bg-[#EEF4FF] text-[#4F8EF7] font-medium" : "text-gray-900"
                  }`}
                  onClick={() => {
                    onChange({ target: { value: opt.value } })
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <span>{opt.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
