"use client"

import { createContext, useContext, useEffect, useRef, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"
import { useTutorialStore, isFirstLogin, markFirstLoginComplete } from "@/stores/tutorialStore"
import { getTutorialForRoleAndPage, getTutorialsForPage } from "./tutorialConfig"
import { TourManager } from "./TourManager"
import { HelpButton } from "./HelpButton"
import type { Tutorial } from "./types"

interface TutorialContextValue {
  startTutorial: (tutorial: Tutorial) => void
  isActive: boolean
  currentTutorial: Tutorial | null
}

const TutorialContext = createContext<TutorialContextValue>({
  startTutorial: () => {},
  isActive: false,
  currentTutorial: null,
})

export function useTutorial() {
  return useContext(TutorialContext)
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const { startTutorial, isActive, currentTutorial, checkAndStartAutoTutorial } = useTutorialStore()
  const hasTriggered = useRef(false)

  useEffect(() => {
    if (!user || !pathname) return
    if (pathname.startsWith("/auth/")) return
    if (hasTriggered.current) return

    const isFirst = isFirstLogin()
    if (isFirst) {
      const tutorial = getTutorialForRoleAndPage(user.role, pathname)
      if (tutorial && useTutorialStore.getState().tutorialsEnabled) {
        hasTriggered.current = true
        markFirstLoginComplete()
        startTutorial(tutorial)
        return
      }
    }

    checkAndStartAutoTutorial(user.role, pathname)
    hasTriggered.current = true
  }, [user, pathname, startTutorial, checkAndStartAutoTutorial])

  useEffect(() => {
    hasTriggered.current = false
  }, [pathname])

  const value: TutorialContextValue = { startTutorial, isActive, currentTutorial }

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <TourManager />
      <HelpButton />
    </TutorialContext.Provider>
  )
}
