import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

async function recalcWorkOrder(tx: any, workOrderId: string | null) {
  if (!workOrderId) return
  const wo = await tx.workOrder.findUnique({
    where: { id: workOrderId },
    select: { advanceReceived: true, finalPrice: true },
  })
  if (!wo) return
  await tx.workOrder.update({
    where: { id: workOrderId },
    data: {
      remainingAmount: wo.finalPrice ? Math.max(0, wo.finalPrice - (wo.advanceReceived || 0)) : null,
    },
  })
}

async function findMatchingInstallment(tx: any, payment: any) {
  if (payment.type !== "INSTALLMENT") return null
  return tx.installment.findFirst({
    where: { workOrderId: payment.workOrderId, notes: payment.notes },
    orderBy: { createdAt: "desc" },
  })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "ACCOUNTANT"])
    if (error) return error

    const payment = await prisma.payment.findUnique({ where: { id: params.id } })
    if (!payment) throw new Error("NOT_FOUND")

    const data = await request.json()
    const newAmount = data.amount != null ? parseFloat(data.amount) : payment.amount
    if (isNaN(newAmount) || newAmount < 0) {
      return NextResponse.json({ message: "Invalid amount" }, { status: 400 })
    }
    const delta = newAmount - payment.amount

    const method = data.paymentMethod ? String(data.paymentMethod).toUpperCase() : null
    if (method && !["CASH", "BANK_TRANSFER", "CHEQUE"].includes(method)) {
      return NextResponse.json({ message: "Invalid payment method" }, { status: 400 })
    }
    if (method && method !== "CASH" && !data.reference?.trim()) {
      return NextResponse.json({ message: `Reference number is required for ${method.replace("_", " ").toLowerCase()} payments` }, { status: 400 })
    }

    const notes = data.notes ?? payment.notes
    const reference = data.reference ?? payment.reference
    const detailLine = method
      ? `Paid via ${method}${reference?.trim() ? ` - Ref: ${reference.trim()}` : ""}`
      : (payment.notes?.match(/Paid via (CASH|BANK_TRANSFER|CHEQUE)/)?.[0] || "")

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: params.id },
        data: {
          ...(data.amount != null ? { amount: newAmount } : {}),
          ...(notes && detailLine ? { notes: `${notes.replace(/\s*\(Paid via .*\)?$/, "")} (${detailLine})` } : { notes: notes || null }),
          ...(data.reference != null ? { reference: reference?.trim() || null } : {}),
          ...(data.status != null ? { status: data.status } : {}),
        },
      })

      const installment = await findMatchingInstallment(tx, payment)
      if (installment) {
        await tx.installment.update({
          where: { id: installment.id },
          data: {
            ...(data.amount != null ? { amount: newAmount } : {}),
            notes: notes ? `${notes.replace(/\s*\(Paid via .*\)?$/, "")} (${detailLine})` : detailLine,
          },
        })
      }

      if (delta !== 0 && payment.workOrderId) {
        const wo = await tx.workOrder.findUnique({
          where: { id: payment.workOrderId },
          select: { advanceReceived: true },
        })
        if (wo) {
          await tx.workOrder.update({
            where: { id: payment.workOrderId },
            data: { advanceReceived: Math.max(0, (wo.advanceReceived || 0) + delta) },
          })
        }
      }

      await recalcWorkOrder(tx, payment.workOrderId)
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 })
    }
    console.error("Payment PATCH error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "ACCOUNTANT"])
    if (error) return error

    const payment = await prisma.payment.findUnique({ where: { id: params.id } })
    if (!payment) throw new Error("NOT_FOUND")

    await prisma.$transaction(async (tx) => {
      const installment = await findMatchingInstallment(tx, payment)
      if (installment) {
        await tx.installment.delete({ where: { id: installment.id } })
      }

      await tx.payment.delete({ where: { id: params.id } })

      if (payment.workOrderId) {
        const wo = await tx.workOrder.findUnique({
          where: { id: payment.workOrderId },
          select: { advanceReceived: true },
        })
        if (wo) {
          await tx.workOrder.update({
            where: { id: payment.workOrderId },
            data: { advanceReceived: Math.max(0, (wo.advanceReceived || 0) - payment.amount) },
          })
        }
      }

      await recalcWorkOrder(tx, payment.workOrderId)
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 })
    }
    console.error("Payment DELETE error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}