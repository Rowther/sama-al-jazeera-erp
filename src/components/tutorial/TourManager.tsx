"use client"

import { useEffect, useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useTutorialStore } from "@/stores/tutorialStore"
import { X, ChevronLeft, ChevronRight, SkipForward, Play } from "lucide-react"

export function TourManager() {
  const { isActive, currentTutorial, currentStep, nextStep, prevStep, skipTutorial, endTutorial } =
    useTutorialStore()

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 })
  const [cardPlacement, setCardPlacement] = useState<"top" | "bottom" | "left" | "right" | "center">("bottom")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updatePosition = useCallback(() => {
    if (!currentTutorial) return
    const step = currentTutorial.steps[currentStep]
    if (!step) return

    if (!step.target || step.placement === "center") {
      setTargetRect(null)
      setCardPlacement("center")
      return
    }

    const el = document.querySelector(step.target) as HTMLElement
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      setTimeout(() => {
        const rect = el.getBoundingClientRect()
        setTargetRect(rect)
        setCardPlacement(step.placement || "bottom")
      }, 400)
    } else {
      setTargetRect(null)
      setCardPlacement("center")
    }
  }, [currentTutorial, currentStep])

  useEffect(() => {
    updatePosition()
    const handleResize = () => updatePosition()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updatePosition])

  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isActive])

  if (!mounted || !isActive || !currentTutorial) return null

  const step = currentTutorial.steps[currentStep]
  const totalSteps = currentTutorial.steps.length
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1
  const progress = ((currentStep + 1) / totalSteps) * 100

  const overlayStyle: React.CSSProperties = targetRect
    ? {
        position: "fixed",
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
        borderRadius: "12px",
        zIndex: 9998,
        pointerEvents: "none",
      }
    : {}

  return createPortal(
    <div className="fixed inset-0 z-[9997]">
      <div
        className="absolute inset-0"
        style={targetRect ? undefined : { backgroundColor: "rgba(0,0,0,0.55)" }}
        onClick={skipTutorial}
      />

      {targetRect && <div style={overlayStyle} />}

      {targetRect && (
        <div
          className="absolute inset-0 z-[9999]"
          style={{
            clipPath: `inset(${targetRect.top - 4}px ${window.innerWidth - targetRect.right - 4}px ${window.innerHeight - targetRect.bottom - 4}px ${targetRect.left - 4}px round 14px)`,
          }}
          onClick={skipTutorial}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`fixed z-[10000] w-[min(420px,calc(100vw-32px))] ${
            cardPlacement === "center"
              ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              : ""
          }`}
          style={
            cardPlacement !== "center" && targetRect
              ? getCardPositionStyle(targetRect, cardPlacement)
              : undefined
          }
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="h-1.5 bg-gray-100">
              <div
                className="h-full bg-gradient-to-r from-[#4F8EF7] to-[#8B5CF6] transition-all duration-500 ease-out rounded-r-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#4F8EF7] bg-[#EEF4FF] px-2.5 py-1 rounded-full">
                  Step {currentStep + 1} of {totalSteps}
                </span>
                <button
                  onClick={endTutorial}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close tutorial"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{step.content}</p>
            </div>

            <div className="px-5 pb-5 flex items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {currentTutorial.steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "w-5 bg-[#4F8EF7]"
                        : i < currentStep
                          ? "w-1.5 bg-[#4F8EF7]/40"
                          : "w-1.5 bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!isFirst && (
                  <button
                    onClick={prevStep}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                  </button>
                )}

                <button
                  onClick={skipTutorial}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <SkipForward className="h-3.5 w-3.5" /> Skip
                </button>

                <button
                  onClick={nextStep}
                  className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-[#4F8EF7] hover:bg-[#3B7EE6] rounded-xl shadow-sm transition-all hover:shadow-md"
                >
                  {isLast ? "Done" : "Next"}
                  {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  )
}

function getCardPositionStyle(
  rect: DOMRect,
  placement: "top" | "bottom" | "left" | "right"
): React.CSSProperties {
  const gap = 16
  const cardWidth = 420
  const cardHeight = 260
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight

  switch (placement) {
    case "bottom": {
      let left = rect.left + rect.width / 2 - cardWidth / 2
      left = Math.max(16, Math.min(left, viewportW - cardWidth - 16))
      const top = rect.bottom + gap
      return { top: Math.min(top, viewportH - cardHeight - 16), left }
    }
    case "top": {
      let left = rect.left + rect.width / 2 - cardWidth / 2
      left = Math.max(16, Math.min(left, viewportW - cardWidth - 16))
      return { top: rect.top - cardHeight - gap, left }
    }
    case "left": {
      let top = rect.top + rect.height / 2 - cardHeight / 2
      top = Math.max(16, Math.min(top, viewportH - cardHeight - 16))
      return { top, left: rect.left - cardWidth - gap }
    }
    case "right": {
      let top = rect.top + rect.height / 2 - cardHeight / 2
      top = Math.max(16, Math.min(top, viewportH - cardHeight - 16))
      return { top, left: rect.right + gap }
    }
  }
}
