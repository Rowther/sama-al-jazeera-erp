import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const jobCard = await prisma.jobCard.findUnique({
      where: { workOrderId: params.id },
      include: {
        generatedBy: { select: { id: true, name: true } },
        signature: {
          include: { approvedBy: { select: { id: true, name: true } } },
        },
        checklistItems: { orderBy: { sortOrder: "asc" } },
        qualityApprovedBy: { select: { id: true, name: true } },
        productionApprovedBy: { select: { id: true, name: true } },
        inventoryApprovedBy: { select: { id: true, name: true } },
        accountsApprovedBy: { select: { id: true, name: true } },
        coordinatorApprovedBy: { select: { id: true, name: true } },
        managerApprovedBy: { select: { id: true, name: true } },
        workOrder: {
          include: {
            customer: true,
            createdBy: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
            teamMembers: { include: { user: { select: { id: true, name: true, role: true } } } },
            workerAssignments: { include: { user: { select: { id: true, name: true, role: true } } } },
            materials: true,
            productionStages: {
              include: { assignedTo: { select: { id: true, name: true, role: true } } },
              orderBy: { sortOrder: "asc" },
            },
            designs: true,
            expenses: true,
            payments: true,
            installments: true,
            digitalSignature: { include: { approvedBy: { select: { id: true, name: true } } } },
            workOrderItems: {
              include: {
                workerAssignments: { include: { user: { select: { id: true, name: true, role: true } } } },
                productionStages: {
                  include: { assignedTo: { select: { id: true, name: true, role: true } } },
                  orderBy: { sortOrder: "asc" },
                },
                materials: true,
                laborEntries: { include: { worker: { select: { id: true, name: true, role: true } } } },
              },
              orderBy: { createdAt: "asc" },
            },
            laborEntries: {
              include: {
                worker: { select: { id: true, name: true, role: true } },
                productionStage: { select: { stageName: true } },
              },
              orderBy: { date: "desc" },
            },
            activities: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    })

    return NextResponse.json({ jobCard })
  } catch (error) {
    console.error("Job card fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER"])
    if (error) return error

    const existing = await prisma.jobCard.findUnique({ where: { workOrderId: params.id } })
    if (existing) {
      return NextResponse.json({ message: "Job card already exists for this work order", jobCard: existing }, { status: 400 })
    }

    const jobCard = await prisma.jobCard.create({
      data: {
        workOrderId: params.id,
        generatedById: user.userId,
      },
      include: {
        generatedBy: { select: { id: true, name: true } },
        workOrder: { select: { workOrderId: true } },
      },
    })

    return NextResponse.json({ jobCard }, { status: 201 })
  } catch (error) {
    console.error("Job card create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request, ["OWNER", "MANAGER", "PRODUCTION_MANAGER"])
    if (error) return error

    const data = await request.json()

    const jobCard = await prisma.jobCard.findUnique({ where: { workOrderId: params.id } })
    if (!jobCard) {
      return NextResponse.json({ message: "Job card not found. Create one first." }, { status: 404 })
    }

    const allowedFields = [
      "designCompleted", "designApproved", "materialSelectionDone", "measurementsVerified",
      "budgetApproved", "advancePaymentReceived",
      "carpenterName", "productionStartDate", "expectedFinishDate", "actualFinishDate",
      "productionNotes", "delayNotes", "workerComments",
      "qualityApproved", "qualityApprovedById", "qualityApprovedAt",
      "productionApproved", "productionApprovedById", "productionApprovedAt",
      "inventoryApproved", "inventoryApprovedById", "inventoryApprovedAt",
      "accountsApproved", "accountsApprovedById", "accountsApprovedAt",
      "coordinatorApproved", "coordinatorApprovedById", "coordinatorApprovedAt",
      "managerApproved", "managerApprovedById", "managerApprovedAt",
    ]

    const updateData: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        if (key.endsWith("At") || key.endsWith("Date")) {
          updateData[key] = data[key] ? new Date(data[key]) : null
        } else {
          updateData[key] = data[key]
        }
      }
    }

    const updated = await prisma.jobCard.update({
      where: { workOrderId: params.id },
      data: updateData,
      include: {
        checklistItems: { orderBy: { sortOrder: "asc" } },
        qualityApprovedBy: { select: { id: true, name: true } },
        productionApprovedBy: { select: { id: true, name: true } },
        inventoryApprovedBy: { select: { id: true, name: true } },
        accountsApprovedBy: { select: { id: true, name: true } },
        coordinatorApprovedBy: { select: { id: true, name: true } },
        managerApprovedBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ jobCard: updated })
  } catch (error) {
    console.error("Job card update error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
