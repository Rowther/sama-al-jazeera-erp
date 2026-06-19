import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { payload: user, error } = requireAuth(request)
    if (error) return error

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
        workerAssignments: {
          include: { user: { select: { name: true, role: true } } },
        },
        materials: { orderBy: { createdAt: "asc" } },
        productionStages: { orderBy: { sortOrder: "asc" } },
        jobCard: {
          include: {
            generatedBy: { select: { name: true } },
            checklistItems: { orderBy: { sortOrder: "asc" } },
            qualityApprovedBy: { select: { name: true } },
            productionApprovedBy: { select: { name: true } },
            inventoryApprovedBy: { select: { name: true } },
            accountsApprovedBy: { select: { name: true } },
            coordinatorApprovedBy: { select: { name: true } },
            managerApprovedBy: { select: { name: true } },
          },
        },
        digitalSignature: {
          include: { approvedBy: { select: { name: true } } },
        },
        _count: { select: { designs: true } },
      },
    })

    if (!workOrder) {
      return NextResponse.json({ message: "Work order not found" }, { status: 404 })
    }

    const jc = workOrder.jobCard
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Job Card - ${workOrder.workOrderId}</title>
<style>
  @page { margin: 12mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #111; line-height: 1.4; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4F8EF7; padding-bottom: 10px; margin-bottom: 16px; }
  .header h1 { font-size: 18pt; color: #4F8EF7; font-weight: 700; }
  .header .ref { font-size: 10pt; color: #666; }
  .section { margin-bottom: 16px; }
  .section-title { background: #4F8EF7; color: white; padding: 6px 10px; font-size: 11pt; font-weight: 600; border-radius: 4px; margin-bottom: 8px; }
  .section-title.green { background: #36B37E; }
  .section-title.orange { background: #FFB648; }
  .section-title.purple { background: #8B5CF6; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
  .field { margin-bottom: 4px; }
  .field-label { font-size: 7.5pt; color: #888; text-transform: uppercase; letter-spacing: 0.3px; }
  .field-value { font-size: 10pt; font-weight: 500; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #f0f4ff; text-align: left; padding: 5px 6px; font-size: 7.5pt; text-transform: uppercase; color: #555; border: 1px solid #e0e0e0; }
  td { padding: 5px 6px; border: 1px solid #e0e0e0; font-size: 9pt; }
  .checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .check-item { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 3px; font-size: 9pt; }
  .check-item.done { background: #e8f5e9; }
  .check-item.pending { background: #f5f5f5; color: #888; }
  .approvals { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
  .approval-box { border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px; text-align: center; }
  .approval-box .title { font-size: 7pt; color: #888; text-transform: uppercase; }
  .approval-box .status { font-size: 12pt; margin: 4px 0; }
  .approval-box .name { font-size: 8pt; color: #555; }
  .footer { border-top: 2px solid #e0e0e0; padding-top: 8px; margin-top: 16px; font-size: 8pt; color: #888; text-align: center; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 7.5pt; font-weight: 600; }
  .badge-available { background: #e8f5e9; color: #2e7d32; }
  .badge-out-of-stock { background: #ffebee; color: #c62828; }
  .badge-partial { background: #fff8e1; color: #f57f17; }
  .badge-ordered { background: #e3f2fd; color: #1565c0; }
  .badge-pending { background: #f5f5f5; color: #757575; }
  .stage-row { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
  .stage-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .stage-dot.completed { background: #36B37E; }
  .stage-dot.in-progress { background: #4F8EF7; }
  .stage-dot.delayed { background: #F45D5D; }
  .stage-dot.pending { background: #ccc; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>JOB CARD</h1>
      <div class="ref">Work Order: ${workOrder.workOrderId}</div>
    </div>
    <div style="text-align:right">
      <div class="ref">Generated: ${new Date(jc?.generatedAt || workOrder.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</div>
      <div class="ref">Generated by: ${jc?.generatedBy?.name || workOrder.createdBy?.name}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">BASIC JOB DETAILS</div>
    <div class="grid-2">
      <div class="field"><div class="field-label">Customer Name</div><div class="field-value">${workOrder.customer?.name || "-"}</div></div>
      <div class="field"><div class="field-label">Customer Phone</div><div class="field-value">${workOrder.customer?.phone || "-"}</div></div>
      <div class="field"><div class="field-label">Address</div><div class="field-value">${workOrder.customer?.location || "-"}</div></div>
      <div class="field"><div class="field-label">Project Type</div><div class="field-value">${workOrder.projectType || "-"}</div></div>
      <div class="field"><div class="field-label">Estimate / Budget</div><div class="field-value">${workOrder.estimatedBudget ? "AED " + workOrder.estimatedBudget.toLocaleString() : "-"}</div></div>
      <div class="field"><div class="field-label">Award Date</div><div class="field-value">${workOrder.createdAt ? new Date(workOrder.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" }) : "-"}</div></div>
      <div class="field"><div class="field-label">Promise Date</div><div class="field-value">${workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString("en-US", { dateStyle: "medium" }) : "-"}</div></div>
      <div class="field"><div class="field-label">REF Number</div><div class="field-value">${workOrder.workOrderId}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title green">PRE-PRODUCTION CHECKLIST</div>
    <div class="checklist">
      ${[
        { label: "Design Completed", done: jc?.designCompleted || false },
        { label: "Design Approved", done: jc?.designApproved || false },
        { label: "Material Selection Completed", done: jc?.materialSelectionDone || false },
        { label: "Measurements Verified", done: jc?.measurementsVerified || false },
        { label: "Budget Approved", done: jc?.budgetApproved || false },
        { label: "Advance Payment Received", done: jc?.advancePaymentReceived || false },
      ].map(item => `
        <div class="check-item ${item.done ? 'done' : 'pending'}">
          ${item.done ? '✓' : '○'} ${item.label}
        </div>
      `).join("")}
    </div>
    ${jc?.checklistItems?.length ? `
    <table style="margin-top:6px">
      <tr><th>Item</th><th>Status</th><th>Completed At</th><th>Completed By</th></tr>
      ${jc.checklistItems.map((ci: any) => `
        <tr>
          <td>${ci.itemLabel}</td>
          <td>${ci.isCompleted ? '✓ Done' : '○ Pending'}</td>
          <td>${ci.completedAt ? new Date(ci.completedAt).toLocaleDateString() : "-"}</td>
          <td>${ci.completedBy || "-"}</td>
        </tr>
      `).join("")}
    </table>` : ""}
  </div>

  <div class="section">
    <div class="section-title orange">MATERIAL & PROCUREMENT</div>
    <table>
      <tr><th style="width:35%">Material Description</th><th style="width:12%">Qty</th><th style="width:15%">Availability</th><th style="width:18%">Source</th><th style="width:20%">Supplier</th></tr>
      ${workOrder.materials.length === 0 ? '<tr><td colspan="5" style="text-align:center;color:#888">No materials listed</td></tr>' :
        workOrder.materials.map((m: any) => `
        <tr>
          <td>${m.materialName}</td>
          <td>${m.requiredQuantity} ${m.unit}</td>
          <td><span class="badge ${m.status === 'AVAILABLE' || m.status === 'APPROVED' ? 'badge-available' : m.status === 'OUT_OF_STOCK' ? 'badge-out-of-stock' : m.status === 'PARTIALLY_AVAILABLE' ? 'badge-partial' : m.status === 'ORDERED' || m.status === 'RECEIVED' ? 'badge-ordered' : 'badge-pending'}">${m.status?.replace(/_/g, ' ') || 'PENDING'}</span></td>
          <td>${m.supplierPreference || "-"}</td>
          <td>${m.supplierPreference || "-"}</td>
        </tr>
      `).join("")}
    </table>
  </div>

  <div class="section">
    <div class="section-title purple">PRODUCTION SECTION</div>
    <div class="grid-3">
      <div class="field"><div class="field-label">Assigned Carpenter</div><div class="field-value">${workOrder.workerAssignments?.find((w: any) => w.role === "CARPENTER")?.user?.name || jc?.carpenterName || "Not assigned"}</div></div>
      <div class="field"><div class="field-label">Production Start</div><div class="field-value">${workOrder.productionStartedAt ? new Date(workOrder.productionStartedAt).toLocaleDateString() : jc?.productionStartDate ? new Date(jc.productionStartDate).toLocaleDateString() : "-"}</div></div>
      <div class="field"><div class="field-label">Expected Finish</div><div class="field-value">${jc?.expectedFinishDate ? new Date(jc.expectedFinishDate).toLocaleDateString() : "-"}</div></div>
      <div class="field"><div class="field-label">Actual Finish</div><div class="field-value">${workOrder.productionCompletedAt ? new Date(workOrder.productionCompletedAt).toLocaleDateString() : jc?.actualFinishDate ? new Date(jc.actualFinishDate).toLocaleDateString() : "-"}</div></div>
      <div class="field"><div class="field-label">Designs</div><div class="field-value">${workOrder._count?.designs || 0} design(s)</div></div>
      <div class="field"><div class="field-label">Assigned Workers</div><div class="field-value">${workOrder.workerAssignments?.map((w: any) => w.user?.name).join(", ") || "None"}</div></div>
    </div>
    ${jc?.productionNotes ? `<div class="field" style="margin-top:6px"><div class="field-label">Production Notes</div><div class="field-value">${jc.productionNotes}</div></div>` : ""}
    ${jc?.delayNotes ? `<div class="field" style="margin-top:4px"><div class="field-label">Delay Notes</div><div class="field-value" style="color:#F45D5D">${jc.delayNotes}</div></div>` : ""}
    ${jc?.workerComments ? `<div class="field" style="margin-top:4px"><div class="field-label">Worker Comments</div><div class="field-value">${jc.workerComments}</div></div>` : ""}

    ${workOrder.productionStages.length > 0 ? `
    <table style="margin-top:6px">
      <tr><th>Stage</th><th>Status</th><th>Assigned Worker</th><th>Duration</th></tr>
      ${workOrder.productionStages.map((s: any) => `
        <tr>
          <td><div class="stage-row"><span class="stage-dot ${s.status === 'COMPLETED' ? 'completed' : s.status === 'IN_PROGRESS' ? 'in-progress' : s.isDelayed ? 'delayed' : 'pending'}"></span> ${s.stageName}</div></td>
          <td>${s.status?.replace(/_/g, ' ')}</td>
          <td>${s.assignedTo?.name || "-"}</td>
          <td>${s.duration ? s.duration + " min" : "-"}</td>
        </tr>
      `).join("")}
    </table>` : ""}
  </div>

  <div class="section">
    <div class="section-title" style="background:#F45D5D">COMPLETION & DELIVERY APPROVALS</div>
    <div class="approvals">
      ${[
        { title: "Quality", done: jc?.qualityApproved, by: jc?.qualityApprovedBy?.name, at: jc?.qualityApprovedAt },
        { title: "Production", done: jc?.productionApproved, by: jc?.productionApprovedBy?.name, at: jc?.productionApprovedAt },
        { title: "Inventory", done: jc?.inventoryApproved, by: jc?.inventoryApprovedBy?.name, at: jc?.inventoryApprovedAt },
        { title: "Accounts", done: jc?.accountsApproved, by: jc?.accountsApprovedBy?.name, at: jc?.accountsApprovedAt },
        { title: "Coordinator", done: jc?.coordinatorApproved, by: jc?.coordinatorApprovedBy?.name, at: jc?.coordinatorApprovedAt },
        { title: "Manager", done: jc?.managerApproved, by: jc?.managerApprovedBy?.name, at: jc?.managerApprovedAt },
      ].map(a => `
        <div class="approval-box">
          <div class="title">${a.title}</div>
          <div class="status">${a.done ? '✓' : '○'}</div>
          <div class="name">${a.done ? (a.by || "Approved") : "Pending"}</div>
          ${a.at ? `<div class="name" style="font-size:6pt">${new Date(a.at).toLocaleDateString()}</div>` : ""}
        </div>
      `).join("")}
    </div>
    ${workOrder.digitalSignature ? `
    <div style="margin-top:8px;padding:6px;border:1px solid #36B37E;border-radius:4px;background:#e8f5e9;text-align:center">
      <strong>Digitally Signed</strong> by ${workOrder.digitalSignature.approvedBy?.name} on ${new Date(workOrder.digitalSignature.approvedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
    </div>` : ""}
  </div>

  <div class="footer">
    <p>FURNITURE ERP - Job Card System</p>
    <p>This is a computer-generated document. Printed on ${new Date().toLocaleDateString("en-US", { dateStyle: "full" })}</p>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="job-card-${workOrder.workOrderId}.html"`,
      },
    })
  } catch (error) {
    console.error("Job card PDF error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
