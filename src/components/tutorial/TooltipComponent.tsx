"use client"

import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"

interface TooltipProps {
  content: string
  side?: "top" | "bottom" | "left" | "right"
  delay?: number
  children: React.ReactNode
  className?: string
}

export function Tooltip({
  content,
  side = "top",
  delay = 400,
  children,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const tooltipWidth = 280
        const tooltipHeight = 0

        let top = 0
        let left = 0

        switch (side) {
          case "top":
            top = rect.top - 8
            left = rect.left + rect.width / 2 - tooltipWidth / 2
            break
          case "bottom":
            top = rect.bottom + 8
            left = rect.left + rect.width / 2 - tooltipWidth / 2
            break
          case "left":
            top = rect.top + rect.height / 2 - tooltipHeight / 2
            left = rect.left - tooltipWidth - 8
            break
          case "right":
            top = rect.top + rect.height / 2 - tooltipHeight / 2
            left = rect.right + 8
            break
        }

        left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8))

        setPosition({ top, left })
        setIsVisible(true)
      }
    }, delay)
  }

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={className}
      >
        {children}
      </div>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isVisible && (
              <motion.div
                initial={{ opacity: 0, y: side === "top" ? 4 : side === "bottom" ? -4 : 0, x: side === "left" ? 4 : side === "right" ? -4 : 0 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: side === "top" ? 2 : side === "bottom" ? -2 : 0, x: side === "left" ? 2 : side === "right" ? -2 : 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "fixed",
                  top: position.top,
                  left: position.left,
                  zIndex: 99999,
                  pointerEvents: "none",
                  maxWidth: "280px",
                }}
              >
                <div className="bg-gray-900 text-white text-xs leading-relaxed rounded-xl px-3 py-2.5 shadow-lg">
                  {content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
