"use client"

import { useState, useRef, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"
import { PenSquare, CheckCircle2, Lock, Fingerprint } from "lucide-react"

interface DigitalSignatureProps {
  workOrderId: string
  currentStatus: string
  existingSignature: any
}

export function DigitalSignaturePanel({ workOrderId, currentStatus, existingSignature }: DigitalSignatureProps) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureType, setSignatureType] = useState<"DRAWN" | "PIN" | "TYPED">("DRAWN")
  const [approvalPin, setApprovalPin] = useState("")
  const [typedName, setTypedName] = useState("")
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const canSign = (user?.role === "OWNER" || user?.role === "MANAGER") && currentStatus === "PRODUCTION_COMPLETED" && !existingSignature

  const signMutation = useMutation({
    mutationFn: (data: any) => api.post(`/work-orders/${workOrderId}/signature`, data),
    onSuccess: () => {
      toast.success("Digital signature saved. Work order is ready for delivery.")
      setShowSignatureModal(false)
      queryClient.invalidateQueries({ queryKey: ["work-order", workOrderId] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = ("touches" in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = ("touches" in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "#1f2937"
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [isDrawing])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const handleSign = () => {
    const data: any = { signatureType }

    if (signatureType === "PIN") {
      if (!approvalPin || approvalPin.length < 4) {
        toast.error("Please enter a valid PIN (at least 4 digits)")
        return
      }
      data.approvalPin = approvalPin
    } else if (signatureType === "DRAWN") {
      const canvas = canvasRef.current
      if (!canvas) return
      const dataUrl = canvas.toDataURL("image/png")
      const blank = canvas.toDataURL()
      if (dataUrl === blank) {
        toast.error("Please draw your signature")
        return
      }
      data.signatureData = dataUrl
    } else if (signatureType === "TYPED") {
      if (!typedName.trim()) {
        toast.error("Please type your name")
        return
      }
      data.signatureData = typedName.trim()
    }

    signMutation.mutate(data)
  }

  if (existingSignature) {
    return (
      <Card className="border-t-4 border-t-[#36B37E]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#36B37E]" /> Digital Signature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50">
            <div className="p-2 rounded-lg bg-green-100 text-[#36B37E]">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Signed by {existingSignature.approvedBy?.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatDateTime(existingSignature.approvedAt)} • via {existingSignature.signatureType}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!canSign) return null

  return (
    <>
      <Card className="border-t-4 border-t-[#FFB648] border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenSquare className="h-5 w-5 text-[#FFB648]" /> Digital Signature Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Production is complete. Your digital signature is required to mark this work order as ready for delivery.
          </p>
          <Button onClick={() => setShowSignatureModal(true)} size="lg" className="w-full">
            <PenSquare className="h-5 w-5 mr-2" /> Sign & Approve for Delivery
          </Button>
        </CardContent>
      </Card>

      <Modal open={showSignatureModal} onClose={() => setShowSignatureModal(false)} title="Digital Signature" description="Approve this work order for delivery" size="lg">
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button
              variant={signatureType === "DRAWN" ? "default" : "outline"}
              size="sm"
              onClick={() => setSignatureType("DRAWN")}
            >
              <PenSquare className="h-4 w-4 mr-1" /> Draw
            </Button>
            <Button
              variant={signatureType === "TYPED" ? "default" : "outline"}
              size="sm"
              onClick={() => setSignatureType("TYPED")}
            >
              <PenSquare className="h-4 w-4 mr-1" /> Type
            </Button>
            <Button
              variant={signatureType === "PIN" ? "default" : "outline"}
              size="sm"
              onClick={() => setSignatureType("PIN")}
            >
              <Lock className="h-4 w-4 mr-1" /> PIN
            </Button>
          </div>

          {signatureType === "DRAWN" && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Draw your signature below</p>
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="w-full border-2 border-gray-200 rounded-xl bg-white cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <Button variant="ghost" size="sm" onClick={clearCanvas}>Clear</Button>
            </div>
          )}

          {signatureType === "TYPED" && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Type your full name as signature</p>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your full name"
                className="text-lg font-signature"
              />
              {typedName && (
                <div className="p-4 rounded-xl bg-gray-50 border font-signature text-xl text-gray-700">
                  {typedName}
                </div>
              )}
            </div>
          )}

          {signatureType === "PIN" && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Enter your approval PIN</p>
              <Input
                type="password"
                value={approvalPin}
                onChange={(e) => setApprovalPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter PIN"
                maxLength={6}
                className="text-lg tracking-widest"
              />
              <p className="text-xs text-gray-400">Enter your 4-6 digit security PIN to authorize</p>
            </div>
          )}

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800">
              By signing, you confirm that the work order production is complete and the item is ready for delivery.
            </p>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSign}
            disabled={signMutation.isPending}
          >
            <Fingerprint className="h-5 w-5 mr-2" /> Confirm Signature
          </Button>
        </div>
      </Modal>
    </>
  )
}
