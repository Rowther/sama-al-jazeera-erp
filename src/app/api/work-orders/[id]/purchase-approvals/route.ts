import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { Role } from "@prisma/client"

const APPROVAL_THRESHOLD = {
  MANAGER: 5000,
  OWNER: 15000,
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const approvals = await prisma.purchaseApproval.findMany({
      where: { workOrderId: params.id },
      include: {
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
        purchaseEntry: { select: { id: true, supplierName: true, totalCost: true, purchaseType: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ approvals })
  } catch (error) {
    console.error("Purchase approvals fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const data = await request.json()

    if (data.action === "REQUEST_APPROVAL") {
      const { purchaseEntryId, amount } = data
      if (!purchaseEntryId || !amount) {
        return NextResponse.json({ message: "purchaseEntryId and amount required" }, { status: 400 })
      }

      let threshold = 0
      if (amount > APPROVAL_THRESHOLD.OWNER) {
        threshold = APPROVAL_THRESHOLD.OWNER
      } else if (amount > APPROVAL_THRESHOLD.MANAGER) {
        threshold = APPROVAL_THRESHOLD.MANAGER
      }

      const existing = await prisma.purchaseApproval.findUnique({
        where: { purchaseEntryId },
      })
      if (existing) {
        return NextResponse.json({ message: "Approval request already exists" }, { status: 400 })
      }

      const approval = await prisma.purchaseApproval.create({
        data: {
          purchaseEntryId,
          workOrderId: params.id,
          requestedById: user.userId,
          amount,
          threshold,
          status: "PENDING",
        },
        include: {
          purchaseEntry: { select: { id: true, supplierName: true, totalCost: true, purchaseType: true } },
        },
      })

      const targetRoles: Role[] = amount > APPROVAL_THRESHOLD.OWNER ? ["OWNER"] : ["MANAGER", "OWNER"]
      const approvers = await prisma.user.findMany({
        where: { role: { in: targetRoles }, isActive: true },
      })
      if (approvers.length > 0) {
        await prisma.notification.createMany({
          data: approvers.map((a) => ({
            userId: a.id,
            type: "PURCHASE_APPROVAL_REQUIRED",
            title: "Purchase Approval Required",
            message: `Purchase of AED ${amount} needs your approval`,
            link: `/work-orders/${params.id}`,
          })),
        })
      }

      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: "PURCHASE_APPROVAL_REQUESTED",
          description: `Purchase approval requested for AED ${amount}`,
          metadata: { purchaseEntryId, amount },
        },
      })

      return NextResponse.json({ approval }, { status: 201 })
    }

    if (data.action === "APPROVE" || data.action === "REJECT") {
      const { approvalId, notes } = data
      if (!approvalId) return NextResponse.json({ message: "approvalId required" }, { status: 400 })

      const approval = await prisma.purchaseApproval.findUnique({
        where: { id: approvalId },
        include: { purchaseEntry: true },
      })
      if (!approval) return NextResponse.json({ message: "Approval not found" }, { status: 404 })
      if (approval.status !== "PENDING") {
        return NextResponse.json({ message: "Approval already processed" }, { status: 400 })
      }

      if (data.action === "APPROVE") {
        const isOwner = user.role === "OWNER"
        const isManager = user.role === "MANAGER"
        if (!isOwner && !isManager) {
          return NextResponse.json({ message: "Only managers and owners can approve" }, { status: 403 })
        }
        if (approval.amount > APPROVAL_THRESHOLD.OWNER && !isOwner) {
          return NextResponse.json({ message: "Only owner can approve purchases over AED 15,000" }, { status: 403 })
        }

        await prisma.purchaseApproval.update({
          where: { id: approvalId },
          data: {
            status: "APPROVED",
            approvedById: user.userId,
            approvedAt: new Date(),
            notes: notes || null,
          },
        })

        const requester = await prisma.user.findUnique({ where: { id: approval.requestedById } })
        if (requester) {
          await prisma.notification.create({
            data: {
              userId: requester.id,
              type: "PURCHASE_APPROVED",
              title: "Purchase Approved",
              message: `Purchase of AED ${approval.amount} has been approved`,
              link: `/work-orders/${params.id}`,
            },
          })
        }
      } else {
        await prisma.purchaseApproval.update({
          where: { id: approvalId },
          data: {
            status: "REJECTED",
            approvedById: user.userId,
            approvedAt: new Date(),
            rejectedReason: notes || "No reason provided",
          },
        })
      }

      await prisma.activityHistory.create({
        data: {
          workOrderId: params.id,
          userId: user.userId,
          action: `PURCHASE_${data.action === "APPROVE" ? "APPROVED" : "REJECTED"}`,
          description: `Purchase ${data.action === "APPROVE" ? "approved" : "rejected"} for AED ${approval.amount}`,
          metadata: { approvalId, action: data.action },
        },
      })

      return NextResponse.json({ message: `Purchase ${data.action === "APPROVE" ? "approved" : "rejected"}` })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Purchase approval error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
