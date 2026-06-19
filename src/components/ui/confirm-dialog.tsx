"use client"

import { Modal } from "./modal"
import { Button } from "./button"
import { AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "warning" | "info"
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: { button: "bg-red-600 hover:bg-red-700", icon: "bg-red-100 text-red-600" },
    warning: { button: "bg-amber-600 hover:bg-amber-700", icon: "bg-amber-100 text-amber-600" },
    info: { button: "bg-[#4F8EF7] hover:bg-[#3B7DE6]", icon: "bg-blue-100 text-blue-600" },
  }

  const styles = variantStyles[variant]

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center">
        <div className={`mx-auto h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${styles.icon}`}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{description}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} className={styles.button} disabled={loading}>
            {loading ? "Please wait..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
