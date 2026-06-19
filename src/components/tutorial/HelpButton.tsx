"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"
import { useTutorialStore } from "@/stores/tutorialStore"
import { getTutorialForRoleAndPage } from "./tutorialConfig"
import { HelpCircle, X } from "lucide-react"

export function HelpButton() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const { startTutorial, isActive } = useTutorialStore()
  const [isOpen, setIsOpen] = useState(false)

  if (pathname.startsWith("/auth/")) return null

  const pageTutorial = user ? getTutorialForRoleAndPage(user.role, pathname) : null

  if (!pageTutorial) return null

  const handleStartTutorial = () => {
    startTutorial(pageTutorial)
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[9996] h-12 w-12 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
          isActive ? "bg-gray-400 cursor-not-allowed" : "bg-[#4F8EF7] hover:bg-[#3B7EE6]"
        }`}
        aria-label="Help"
        disabled={isActive}
      >
        <HelpCircle className="h-5 w-5 text-white" />
      </button>

      <AnimatePresence>
        {isOpen && !isActive && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-[9996] w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#EEF4FF] flex items-center justify-center">
                  <HelpCircle className="h-3.5 w-3.5 text-[#4F8EF7]" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Help</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Need help understanding this page? Start a guided tour that explains everything.
              </p>

              <button
                onClick={handleStartTutorial}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4F8EF7] text-white text-sm font-medium rounded-xl hover:bg-[#3B7EE6] transition-all shadow-sm hover:shadow-md"
              >
                <HelpCircle className="h-4 w-4" />
                How does this page work?
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                This will walk you through each section of the {pageTutorial.title}.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
