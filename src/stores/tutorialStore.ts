import { create } from "zustand"
import type { Tutorial } from "@/components/tutorial/types"
import { getTutorialForRoleAndPage } from "@/components/tutorial/tutorialConfig"

const TUTORIAL_STORAGE_KEY = "erp_tutorial_progress"
const TUTORIAL_SETTINGS_KEY = "erp_tutorial_settings"

interface TutorialSettings {
  tutorialsEnabled: boolean
  seenTutorials: Record<string, boolean>
}

function loadSettings(): TutorialSettings {
  if (typeof window === "undefined") return { tutorialsEnabled: true, seenTutorials: {} }
  try {
    const stored = localStorage.getItem(TUTORIAL_SETTINGS_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return { tutorialsEnabled: true, seenTutorials: {} }
}

function saveSettings(settings: TutorialSettings) {
  try {
    localStorage.setItem(TUTORIAL_SETTINGS_KEY, JSON.stringify(settings))
  } catch {}
}

function markTutorialCompleted(tutorialId: string) {
  try {
    const completed = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || "[]")
    if (!completed.includes(tutorialId)) {
      completed.push(tutorialId)
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(completed))
    }
  } catch {}
}

export function hasCompletedTutorial(tutorialId: string): boolean {
  if (typeof window === "undefined") return false
  try {
    const completed = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || "[]")
    return completed.includes(tutorialId)
  } catch {
    return false
  }
}

export function isFirstLogin(): boolean {
  if (typeof window === "undefined") return false
  const flag = localStorage.getItem("erp_first_login_completed")
  return !flag
}

export function markFirstLoginComplete() {
  localStorage.setItem("erp_first_login_completed", "true")
}

interface TutorialStoreState {
  isActive: boolean
  currentTutorial: Tutorial | null
  currentStep: number
  tutorialsEnabled: boolean
  seenTutorials: Record<string, boolean>

  startTutorial: (tutorial: Tutorial) => void
  nextStep: () => void
  prevStep: () => void
  skipTutorial: () => void
  endTutorial: () => void
  goToStep: (step: number) => void

  setTutorialsEnabled: (enabled: boolean) => void
  markSeen: (tutorialId: string) => void
  resetTutorials: () => void
  resetTutorial: (tutorialId: string) => void
  checkAndStartAutoTutorial: (role: string, page: string) => void
}

export const useTutorialStore = create<TutorialStoreState>((set, get) => {
  const settings = loadSettings()

  return {
    isActive: false,
    currentTutorial: null,
    currentStep: 0,
    tutorialsEnabled: settings.tutorialsEnabled,
    seenTutorials: settings.seenTutorials,

    startTutorial: (tutorial: Tutorial) => {
      set({
        isActive: true,
        currentTutorial: tutorial,
        currentStep: 0,
      })
    },

    nextStep: () => {
      const { currentTutorial, currentStep } = get()
      if (!currentTutorial) return
      if (currentStep < currentTutorial.steps.length - 1) {
        set({ currentStep: currentStep + 1 })
      } else {
        const tutorial = get().currentTutorial
        if (tutorial) {
          markTutorialCompleted(tutorial.id)
          get().markSeen(tutorial.id)
        }
        set({ isActive: false, currentTutorial: null, currentStep: 0 })
      }
    },

    prevStep: () => {
      const { currentStep } = get()
      if (currentStep > 0) {
        set({ currentStep: currentStep - 1 })
      }
    },

    skipTutorial: () => {
      const tutorial = get().currentTutorial
      if (tutorial) {
        markTutorialCompleted(tutorial.id)
        get().markSeen(tutorial.id)
      }
      set({ isActive: false, currentTutorial: null, currentStep: 0 })
    },

    endTutorial: () => {
      set({ isActive: false, currentTutorial: null, currentStep: 0 })
    },

    goToStep: (step: number) => {
      const { currentTutorial } = get()
      if (currentTutorial && step >= 0 && step < currentTutorial.steps.length) {
        set({ currentStep: step })
      }
    },

    setTutorialsEnabled: (enabled: boolean) => {
      const settings = loadSettings()
      settings.tutorialsEnabled = enabled
      saveSettings(settings)
      set({ tutorialsEnabled: enabled })
      if (!enabled) {
        set({ isActive: false, currentTutorial: null, currentStep: 0 })
      }
    },

    markSeen: (tutorialId: string) => {
      const settings = loadSettings()
      settings.seenTutorials[tutorialId] = true
      saveSettings(settings)
      set((s) => ({ seenTutorials: { ...s.seenTutorials, [tutorialId]: true } }))
    },

    resetTutorials: () => {
      localStorage.removeItem(TUTORIAL_STORAGE_KEY)
      localStorage.removeItem("erp_first_login_completed")
      const settings = loadSettings()
      settings.seenTutorials = {}
      saveSettings(settings)
      set({ seenTutorials: {} })
    },

    resetTutorial: (tutorialId: string) => {
      try {
        const completed = JSON.parse(localStorage.getItem(TUTORIAL_STORAGE_KEY) || "[]")
        const filtered = completed.filter((id: string) => id !== tutorialId)
        localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(filtered))
      } catch {}
      const settings = loadSettings()
      delete settings.seenTutorials[tutorialId]
      saveSettings(settings)
      set((s) => {
        const seen = { ...s.seenTutorials }
        delete seen[tutorialId]
        return { seenTutorials: seen }
      })
    },

    checkAndStartAutoTutorial: (role: string, page: string) => {
      const state = get()
      if (!state.tutorialsEnabled || state.isActive) return
      const tutorial = getTutorialForRoleAndPage(role, page)
      if (!tutorial) return
      if (hasCompletedTutorial(tutorial.id)) return
      if (state.seenTutorials[tutorial.id]) return
      set({ isActive: true, currentTutorial: tutorial, currentStep: 0 })
    },
  }
})
