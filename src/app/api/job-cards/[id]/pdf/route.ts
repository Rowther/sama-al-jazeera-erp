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
        workOrderItems: { orderBy: { createdAt: "asc" } },
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
      },
    })

    if (!workOrder) {
      return NextResponse.json({ message: "Work order not found" }, { status: 404 })
    }

    const jc = workOrder.jobCard
    const fmtMoney = (v: number | null | undefined) => (v != null && v !== 0 ? "AED " + v.toLocaleString() : v === 0 ? "AED 0" : "-")
    const fmtDate = (d: Date | string | null | undefined) =>
      d ? new Date(d).toLocaleDateString("en-US", { dateStyle: "medium" }) : "-"

    const checklist = [
      jc?.designCompleted,
      jc?.designApproved,
      jc?.materialSelectionDone,
      jc?.measurementsVerified,
      jc?.budgetApproved,
      jc?.advancePaymentReceived,
    ]
    const completedChecklist = checklist.filter(Boolean).length

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
  .statbar { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .stat { border: 1px solid #e0e0e0; border-radius: 6px; padding: 8px 10px; background: #f8faff; }
  .stat-label { font-size: 7.5pt; color: #888; text-transform: uppercase; letter-spacing: 0.3px; }
  .stat-value { font-size: 12pt; font-weight: 700; color: #111; margin-top: 2px; }
  .section { margin-bottom: 16px; }
  .section-title { background: #4F8EF7; color: white; padding: 6px 10px; font-size: 11pt; font-weight: 600; border-radius: 4px; margin-bottom: 8px; }
  .section-title.green { background: #36B37E; }
  .section-title.purple { background: #8B5CF6; }
  .section-title.red { background: #F45D5D; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
  .field { margin-bottom: 4px; }
  .field-label { font-size: 7.5pt; color: #888; text-transform: uppercase; letter-spacing: 0.3px; }
  .field-value { font-size: 10pt; font-weight: 500; color: #111; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #f0f4ff; text-align: left; padding: 5px 6px; font-size: 7.5pt; text-transform: uppercase; color: #555; border: 1px solid #e0e0e0; }
  td { padding: 5px 6px; border: 1px solid #e0e0e0; font-size: 9pt; vertical-align: top; }
  .item-name { font-size: 10pt; font-weight: 600; color: #111; }
  .qty { font-size: 15pt; font-weight: 700; color: #4F8EF7; }
  .item-desc { font-size: 8pt; color: #666; margin-top: 2px; }
  .item-meta { font-size: 7.5pt; color: #999; }
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
      <div class="ref">Generated: ${fmtDate(jc?.generatedAt || workOrder.createdAt)}</div>
      <div class="ref">Generated by: ${jc?.generatedBy?.name || workOrder.createdBy?.name}</div>
    </div>
  </div>

  <div class="section">
    <div class="statbar">
      <div class="stat"><div class="stat-label">Status</div><div class="stat-value">${(workOrder.status || "").replace(/_/g, " ")}</div></div>
      <div class="stat"><div class="stat-label">Checklist</div><div class="stat-value">${completedChecklist}/6</div></div>
      <div class="stat"><div class="stat-label">Production Manager Budget</div><div class="stat-value">${fmtMoney(workOrder.productionManagerBudget)}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">SECTION 1: BASIC JOB DETAILS</div>
    <div class="grid-3">
      <div class="field"><div class="field-label">Work Order Ref</div><div class="field-value">${workOrder.workOrderId}</div></div>
      <div class="field"><div class="field-label">Estimate No</div><div class="field-value">${workOrder.estimateRef || "-"}</div></div>
      <div class="field"><div class="field-label">Estimate / Budget</div><div class="field-value">${fmtMoney(workOrder.estimatedBudget)}</div></div>
      <div class="field"><div class="field-label">Award Date</div><div class="field-value">${fmtDate(workOrder.createdAt)}</div></div>
      <div class="field"><div class="field-label">Promise Date</div><div class="field-value">${fmtDate(workOrder.dueDate)}</div></div>
      <div class="field"><div class="field-label">Project Type</div><div class="field-value">${workOrder.projectType || "-"}</div></div>
      <div class="field"><div class="field-label">Customer Name</div><div class="field-value">${workOrder.customer?.name || "-"}</div></div>
      <div class="field"><div class="field-label">Customer Phone</div><div class="field-value">${workOrder.customer?.phone || "-"}</div></div>
      <div class="field"><div class="field-label">Address</div><div class="field-value">${workOrder.customer?.location || "-"}</div></div>
      <div class="field"><div class="field-label">Assigned Manager</div><div class="field-value">${workOrder.assignedTo?.name || workOrder.createdBy?.name || "-"}</div></div>
      <div class="field"><div class="field-label">Assigned Carpenter</div><div class="field-value">${workOrder.workerAssignments?.find((w: any) => w.role === "CARPENTER")?.user?.name || jc?.carpenterName || "-"}</div></div>
      <div class="field"><div class="field-label">Production Manager</div><div class="field-value">${workOrder.createdBy?.name || "-"}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title purple">SECTION 2: WORK ORDER ITEMS</div>
    ${workOrder.workOrderItems.length === 0 ? '<p style="text-align:center;color:#888;padding:8px">No items listed for this work order</p>' : `
    <table>
      <tr><th style="width:50%">Item</th><th style="width:12%">Qty</th><th style="width:18%">Status</th><th style="width:20%">Progress</th></tr>
      ${workOrder.workOrderItems.map((it: any) => `
        <tr>
          <td>
            <div class="item-name">${it.name}</div>
            ${it.description ? `<div class="item-desc">${it.description}</div>` : ""}
            ${it.dimensions ? `<div class="item-meta">Dimensions: ${it.dimensions}</div>` : ""}
            ${it.notes ? `<div class="item-meta">${it.notes}</div>` : ""}
          </td>
          <td style="text-align:center"><span class="qty">×${it.quantity}</span></td>
          <td>${(it.status || "").replace(/_/g, " ")}</td>
          <td>${it.progress}%</td>
        </tr>
      `).join("")}
    </table>`}
  </div>

  <div class="section">
    <div class="section-title green">SECTION 3: PRE-PRODUCTION CHECKLIST</div>
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
  </div>

  <div class="section">
    <div class="section-title red">SECTION 4: COMPLETION & DELIVERY APPROVALS</div>
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
          ${a.at ? `<div class="name" style="font-size:6pt">${fmtDate(a.at)}</div>` : ""}
        </div>
      `).join("")}
    </div>
    ${workOrder.digitalSignature ? `
    <div style="margin-top:8px;padding:6px;border:1px solid #36B37E;border-radius:4px;background:#e8f5e9;text-align:center">
      <strong>Digitally Signed</strong> by ${workOrder.digitalSignature.approvedBy?.name} on ${fmtDate(workOrder.digitalSignature.approvedAt)}
    </div>` : ""}
  </div>

  <div class="footer">
    <p>FURNITURE ERP - Job Card System</p>
    <p>Generated on ${jc?.generatedAt ? new Date(jc.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "N/A"} • This is a computer-generated document</p>
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
