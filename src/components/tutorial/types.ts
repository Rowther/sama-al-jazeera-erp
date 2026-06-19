import type { Role } from "@/types"

export interface TutorialStep {
  target?: string
  title: string
  content: string
  placement?: "top" | "bottom" | "left" | "right" | "center"
  actionLabel?: string
  actionHref?: string
}

export interface Tutorial {
  id: string
  title: string
  description?: string
  steps: TutorialStep[]
  roles: Role[]
  pages: string[]
}

export interface TooltipData {
  content: string
  side?: "top" | "bottom" | "left" | "right"
}

export interface TutorialState {
  isActive: boolean
  currentTutorial: Tutorial | null
  currentStep: number
  seenTutorials: Record<string, boolean>
  tutorialsEnabled: boolean
}
