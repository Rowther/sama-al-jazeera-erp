import { PrismaClient, WorkOrderStatus, MaterialStatus, PaymentStatus, PurchaseType, DesignRevisionStatus, InventoryMovementType, NotificationType, Role, StageStatus, ApprovalStatus, MaterialRequestStatus } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)] }

const furnitureTypes = ["Sofa", "Bed", "Wardrobe", "Dining Table", "Office Desk", "Bookshelf", "Cabinet", "Nightstand", "Coffee Table", "Dresser"]
const projectTypes = ["Custom Design", "Renovation", "New Installation", "Restoration", "Mass Production"]
const materialNames = ["Oak Wood", "Pine Wood", "MDF Board", "Plywood Sheet", "Glass Panel", "Aluminum Frame", "Steel Bracket", "Leather Fabric", "Foam Cushion", "Nylon Thread", "Wood Screws", "Hinges", "Drawer Slides", "Handles", "Varnish", "Wood Glue", "Sandpaper", "Nails Pack", "Lacquer", "Padding"]
const categories = ["Wood", "Hardware", "Fabric", "Glass", "Metal"]
const supplierNames = ["Al-Futtaim Timber", "Dubai Hardware Co", "Emirates Glass", "Gulf Fabrics", "Sharjah Steel", "Abu Dhabi Wood", "Rak Ceramics", "Ajman Hardware", "Fujairah Timber", "Umm Al Quwain Supplies"]
const customerFirstNames = ["Mohammed", "Ahmed", "Ali", "Fatima", "Khalid", "Noora", "Omar", "Saeed", "Hessa", "Rashid"]
const customerLastNames = ["Al Mansouri", "Al Habtoor", "Al Qasimi", "Al Nuaimi", "Al Zaabi", "Al Shamsi", "Al Ameri", "Al Dhaheri", "Al Mazrouei", "Al Suwaidi"]
const employeeNames = ["Hassan Ibrahim", "Yusuf Karim", "Aisha Mahmoud", "Layla Salim", "Jamal Hassan", "Mona Faisal", "Tariq Nasser", "Samira Othman"]
const departments = ["Production", "Design", "Logistics", "Quality Control", "Administration"]
const stageNames = ["Cutting", "Shaping", "Assembly", "Sanding", "Painting", "Finishing", "Polishing", "Quality Check", "Packaging"]

async function main() {
  console.log("Seeding database with comprehensive test data...\n")
  const start = Date.now()

  // Clean in dependency order
  await prisma.jobCardChecklistItem.deleteMany()
  await prisma.digitalSignature.deleteMany()
  await prisma.jobCard.deleteMany()
  await prisma.workerAssignment.deleteMany()
  await prisma.delayAlert.deleteMany()
  await prisma.installment.deleteMany()
  await prisma.laborEntry.deleteMany()
  await prisma.purchaseApproval.deleteMany()
  await prisma.materialRequest.deleteMany()
  await prisma.scheduleEvent.deleteMany()
  await prisma.productionStage.deleteMany()
  await prisma.activityHistory.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.purchaseEntryItem.deleteMany()
  await prisma.purchaseDocument.deleteMany()
  await prisma.purchaseEntry.deleteMany()
  await prisma.designApproval.deleteMany()
  await prisma.designRevision.deleteMany()
  await prisma.design.deleteMany()
  await prisma.document.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.workOrderInventory.deleteMany()
  await prisma.inventoryMovement.deleteMany()
  await prisma.inventoryItem.deleteMany()
  await prisma.inventoryCategory.deleteMany()
  await prisma.workOrderTeamMember.deleteMany()
  await prisma.workOrderMaterial.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.payroll.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.workOrder.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()

  const password = await bcrypt.hash("password123", 12)

  // ─────────────────────────────
  // Users (8 main + 8 labour + 10 carpenters = 26)
  // ─────────────────────────────
  const users = await Promise.all([
    prisma.user.create({ data: { email: "owner@samaaljazeera.com", password, name: "Ahmed Al Maktoum", role: "OWNER", phone: "+971501234567", isActive: true, hourlyRate: 0, dailyRate: 0, overtimeRate: 0 } }),
    prisma.user.create({ data: { email: "manager@samaaljazeera.com", password, name: "Khalid Hassan", role: "MANAGER", phone: "+971507654321", isActive: true, hourlyRate: 0, dailyRate: 0, overtimeRate: 0 } }),
    prisma.user.create({ data: { email: "designer1@samaaljazeera.com", password, name: "Fatima Ali", role: "DESIGNER", phone: "+971505555111", isActive: true, hourlyRate: 0, dailyRate: 0, overtimeRate: 0 } }),
    prisma.user.create({ data: { email: "designer2@samaaljazeera.com", password, name: "Omar Rashid", role: "DESIGNER", phone: "+971505555222", isActive: true, hourlyRate: 0, dailyRate: 0, overtimeRate: 0 } }),
    prisma.user.create({ data: { email: "inventory@samaaljazeera.com", password, name: "Saeed Mohammed", role: "INVENTORY_MANAGER", phone: "+971505555333", isActive: true, hourlyRate: 0, dailyRate: 0, overtimeRate: 0 } }),
    prisma.user.create({ data: { email: "accountant@samaaljazeera.com", password, name: "Noora Ahmed", role: "ACCOUNTANT", phone: "+971505555444", isActive: true, hourlyRate: 0, dailyRate: 0, overtimeRate: 0 } }),
  ])
  const prodManager = await prisma.user.create({ data: { email: "production@samaaljazeera.com", password, name: "Mansoor Saeed", role: "PRODUCTION_MANAGER", phone: "+971505555555", isActive: true, hourlyRate: 0, dailyRate: 0, overtimeRate: 0 } })
  const hrManager = await prisma.user.create({ data: { email: "hr@samaaljazeera.com", password, name: "Layla Salim", role: "HR", phone: "+971505555666", isActive: true, hourlyRate: 0, dailyRate: 0, overtimeRate: 0 } })
  const allUsers = [...users, prodManager, hrManager]

  // Labour users
  const extraLabourNames = ["Rashid Ali", "Faisal Omar", "Sultan Ahmed", "Nasser Khalid", "Majid Abdullah", "Khalid Mansour", "Saif Mohammed", "Abdullah Hassan"]
  const extraLabours: any[] = []
  for (let i = 0; i < extraLabourNames.length; i++) {
    const u = await prisma.user.create({
      data: { email: `labour${i + 1}@samaaljazeera.com`, password, name: extraLabourNames[i], role: "LABOUR", phone: `+97150${String(7770000 + i).padStart(7, "0")}`, isActive: true, hourlyRate: 25, dailyRate: 200, overtimeRate: 37.5 },
    })
    extraLabours.push(u)
  }

  // Carpenter users
  const carpenterNames = ["Hassan Ibrahim", "Yusuf Karim", "Jamal Hassan", "Tariq Nasser", "Rashid Ali", "Mansoor Saeed", "Faisal Omar", "Sultan Ahmed", "Nasser Khalid", "Majid Abdullah"]
  const carpenterUsers: any[] = []
  for (let i = 0; i < carpenterNames.length; i++) {
    const u = await prisma.user.create({
      data: { email: `carpenter${i + 1}@samaaljazeera.com`, password, name: carpenterNames[i], role: "LABOUR", phone: `+97150${String(6660000 + i).padStart(7, "0")}`, isActive: true, hourlyRate: 35, dailyRate: 280, overtimeRate: 52.5 },
    })
    carpenterUsers.push(u)
  }
  const allLabours = [...extraLabours, ...carpenterUsers]
  const allUserIds = [...allUsers, ...allLabours]
  console.log(`  ${allUserIds.length} users created (${allLabours.length} labour)`)

  // ─────────────────────────────
  // Employees
  // ─────────────────────────────
  const employees: any[] = []
  for (let i = 0; i < Math.min(employeeNames.length, users.length); i++) {
    const emp = await prisma.employee.create({
      data: { employeeId: `EMP-${String(i + 1).padStart(3, "0")}`, userId: users[i].id, phone: `+97150${String(5550000 + i).padStart(7, "0")}`, department: pick(departments), designation: pick(["Senior", "Junior", "Lead", "Assistant"]), joiningDate: new Date(2023, rand(0, 11), rand(1, 28)), salary: rand(3000, 15000), leaveBalance: 30 },
    })
    employees.push(emp)
  }
  // Employee records for all labour users
  for (let i = 0; i < allLabours.length; i++) {
    const emp = await prisma.employee.create({
      data: { employeeId: `EMP-${String(employees.length + i + 1).padStart(3, "0")}`, userId: allLabours[i].id, phone: allLabours[i].phone, department: "Production", designation: i < extraLabours.length ? "General Labour" : "Carpenter", joiningDate: new Date(2023, rand(0, 11), rand(1, 28)), salary: rand(2000, 6000), leaveBalance: 30, overtimeRate: 1.5, workingHours: 8 },
    })
    employees.push(emp)
  }
  console.log(`  ${employees.length} employees created`)

  // ─────────────────────────────
  // Customers (50)
  // ─────────────────────────────
  const customers: any[] = []
  for (let i = 0; i < 50; i++) {
    const c = await prisma.customer.create({
      data: { name: `${pick(customerFirstNames)} ${pick(customerLastNames)}`, phone: `+971${String(50 + rand(0, 5))}${String(1000000 + i).padStart(7, "0")}`, email: `customer${i + 1}@example.com`, location: pick(["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah"]), notes: pick(["VIP client", "Repeat customer", "Referred by partner", "", "", ""]) },
    })
    customers.push(c)
  }
  console.log(`  ${customers.length} customers created`)

  // ─────────────────────────────
  // Suppliers (10)
  // ─────────────────────────────
  const suppliers: any[] = []
  for (let i = 0; i < supplierNames.length; i++) {
    const s = await prisma.supplier.create({
      data: { name: supplierNames[i], phone: `+9714${String(2000000 + i * 111111).slice(0, 7)}`, email: `info@${supplierNames[i].replace(/\s+/g, "").toLowerCase()}.ae`, contactPerson: pick(employeeNames) },
    })
    suppliers.push(s)
  }
  console.log(`  ${suppliers.length} suppliers created`)

  // ─────────────────────────────
  // Inventory Categories (5)
  // ─────────────────────────────
  const categories_objs: any[] = []
  for (const name of categories) {
    const cat = await prisma.inventoryCategory.create({ data: { name, description: `${name} materials` } })
    categories_objs.push(cat)
  }
  console.log(`  ${categories_objs.length} inventory categories created`)

  // ─────────────────────────────
  // Inventory Items (100)
  // ─────────────────────────────
  const inventoryItems: any[] = []
  for (let i = 0; i < 100; i++) {
    const item = await prisma.inventoryItem.create({
      data: { name: pick(materialNames), categoryId: pick(categories_objs).id, sku: `SKU-${String(i + 1).padStart(4, "0")}`, unit: pick(["pcs", "m", "kg", "l", "sheet"]), price: rand(5, 500), stockQuantity: rand(0, 200), minStock: rand(5, 30), maxStock: rand(100, 999), supplierId: pick(suppliers).id, location: pick(["Warehouse A", "Warehouse B", "Shelf 1-12", "Shelf 13-24"]) },
    })
    inventoryItems.push(item)
  }
  console.log(`  ${inventoryItems.length} inventory items created`)

  // ─────────────────────────────
  // Work Orders (100)
  // ─────────────────────────────
  const statuses: WorkOrderStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "DESIGN_ASSIGNED", "DESIGN_IN_PROGRESS", "DESIGN_COMPLETED", "DESIGN_APPROVED", "READY_FOR_PRODUCTION", "PRODUCTION_STARTED", "PRODUCTION_COMPLETED", "DELIVERED", "CLOSED", "CANCELLED"]
  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]
  const workOrders: any[] = []

  for (let i = 0; i < 100; i++) {
    const status = i < 10 ? "DRAFT" : i < 20 ? "SUBMITTED" : i < 35 ? "APPROVED" : i < 50 ? "DESIGN_IN_PROGRESS" : i < 65 ? "PRODUCTION_STARTED" : i < 80 ? "DELIVERED" : i < 90 ? "CLOSED" : "CANCELLED"
    const isDelayed = i > 30 && i < 45
    const priority = i < 5 ? "URGENT" : i < 15 ? "HIGH" : pick(priorities)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + rand(-30, 90))
    const estimatedBudget = rand(5000, 150000)
    const advanceReceived = rand(0, estimatedBudget * 0.5)

    const wo = await prisma.workOrder.create({
      data: {
        workOrderId: `WO-${String(i + 1).padStart(4, "0")}`, customerId: pick(customers).id, projectType: pick(projectTypes),
        furnitureType: pick(furnitureTypes), description: `Custom ${pick(furnitureTypes)} for ${pick(customerFirstNames)} ${pick(customerLastNames)}`,
        priority, dueDate, estimatedBudget, estimatedMaterialCost: Math.round(estimatedBudget * 0.6),
        estimatedLaborCost: Math.round(estimatedBudget * 0.25), estimatedTransportCost: Math.round(estimatedBudget * 0.05),
        advanceReceived, status: status as WorkOrderStatus, assignedToId: i < 50 ? users[2].id : users[3].id,
        createdById: users[1].id, totalCost: rand(3000, estimatedBudget + 20000),
        isDelayed, delayDays: isDelayed ? rand(1, 30) : 0,
        completedAt: ["DELIVERED", "CLOSED"].includes(status) ? new Date(2024, rand(0, 11), rand(1, 28)) : null,
      },
    })
    workOrders.push(wo)
  }
  console.log(`  ${workOrders.length} work orders created`)

  // ─────────────────────────────
  // Work Order Materials
  // ─────────────────────────────
  let materialCount = 0
  for (const wo of workOrders) {
    const numMaterials = rand(2, 8)
    for (let j = 0; j < numMaterials; j++) {
      const estCost = rand(100, 5000)
      const matStatuses: MaterialStatus[] = ["PENDING", "AVAILABLE", "PARTIALLY_AVAILABLE", "ORDERED", "RECEIVED"]
      await prisma.workOrderMaterial.create({
        data: { workOrderId: wo.id, materialName: pick(materialNames), category: pick(categories), requiredQuantity: rand(1, 50), unit: pick(["pcs", "m", "kg", "l"]), estimatedCost: estCost, actualCost: rand(80, Math.round(estCost * 1.3)), status: pick(matStatuses), availableQuantity: rand(0, 30), reservedQuantity: rand(0, 15), missingQuantity: rand(0, 20) },
      })
      materialCount++
    }
  }
  console.log(`  ${materialCount} work order materials created`)

  // ─────────────────────────────
  // Worker Assignments
  // ─────────────────────────────
  let waCount = 0
  for (const wo of workOrders.slice(0, 40)) {
    const numWorkers = rand(1, 3)
    for (let j = 0; j < numWorkers; j++) {
      const worker = pick(allLabours)
      await prisma.workerAssignment.create({
        data: {
          workOrderId: wo.id, userId: worker.id, role: pick(["CARPENTER", "FINISHER", "ASSEMBLER", "PAINTER"]),
          assignedDate: new Date(2024, rand(0, 11), rand(1, 28)), progress: rand(0, 100),
          hourlyRate: worker.hourlyRate, dailyRate: worker.dailyRate, overtimeRate: worker.overtimeRate,
          totalHoursWorked: rand(10, 80), totalCost: rand(500, 5000),
          notes: Math.random() < 0.3 ? pick(["Good work", "Needs supervision", "", ""]) : null,
        },
      }).catch(() => {})
      waCount++
    }
  }
  console.log(`  ${waCount} worker assignments created`)

  // ─────────────────────────────
  // Expenses
  // ─────────────────────────────
  let expenseCount = 0
  for (const wo of workOrders.slice(0, 60)) {
    const numExpenses = rand(1, 5)
    for (let j = 0; j < numExpenses; j++) {
      await prisma.expense.create({
        data: { workOrderId: wo.id, category: pick(["Materials", "Labor", "Transport", "Tools", "Misc"]), amount: rand(100, 10000), description: pick(["Material purchase", "Worker payment", "Delivery fee", "Tool rental", "Miscellaneous"]), approvedById: pick(allUsers).id, date: new Date(2024, rand(0, 11), rand(1, 28)) },
      })
      expenseCount++
    }
  }
  console.log(`  ${expenseCount} expenses created`)

  // ─────────────────────────────
  // Payments
  // ─────────────────────────────
  let paymentCount = 0
  for (const wo of workOrders.slice(0, 70)) {
    const numPayments = rand(1, 3)
    for (let j = 0; j < numPayments; j++) {
      const payStatuses: PaymentStatus[] = ["PAID", "PENDING", "PARTIALLY_PAID"]
      await prisma.payment.create({
        data: { workOrderId: wo.id, type: pick(["ADVANCE", "INSTALLMENT", "FINAL", "DEPOSIT"]), amount: rand(500, 50000), status: pick(payStatuses), reference: `PAY-${wo.workOrderId}-${j + 1}`, receivedById: pick(allUsers).id, date: new Date(2024, rand(0, 11), rand(1, 28)) },
      })
      paymentCount++
    }
  }
  console.log(`  ${paymentCount} payments created`)

  // ─────────────────────────────
  // Installments
  // ─────────────────────────────
  let installmentCount = 0
  for (const wo of workOrders.slice(0, 30)) {
    const numInst = rand(1, 4)
    for (let j = 0; j < numInst; j++) {
      await prisma.installment.create({
        data: { workOrderId: wo.id, amount: rand(1000, 25000), date: new Date(2024, rand(0, 11), rand(1, 28)), notes: Math.random() < 0.3 ? `Installment ${j + 1} of ${numInst}` : null },
      })
      installmentCount++
    }
  }
  console.log(`  ${installmentCount} installments created`)

  // ─────────────────────────────
  // Designs
  // ─────────────────────────────
  let designCount = 0
  for (const wo of workOrders.slice(0, 80)) {
    const numDesigns = rand(1, 2)
    for (let j = 0; j < numDesigns; j++) {
      const design = await prisma.design.create({
        data: {
          workOrderId: wo.id, title: `${wo.furnitureType} Design v${j + 1}`, description: `Design concept for ${wo.workOrderId}`,
          files: [{ name: `design_${wo.workOrderId}_v${j + 1}.pdf`, url: `/uploads/designs/${wo.id}_v${j + 1}.pdf` }],
          status: pick(["PENDING_REVIEW", "APPROVED", "REVISION_REQUESTED"] as DesignRevisionStatus[]), version: j + 1,
          createdById: wo.assignedToId || users[2].id,
        },
      })
      if (j > 0) {
        await prisma.designRevision.create({
          data: { designId: design.id, files: [{ name: `revision_${wo.workOrderId}_v${j + 1}.pdf`, url: `/uploads/revisions/${wo.id}_v${j + 1}.pdf` }], notes: `Revised per client feedback`, version: j + 1, createdById: wo.assignedToId || users[2].id },
        })
      }
      if (["APPROVED", "REVISION_REQUESTED"].includes(design.status)) {
        await prisma.designApproval.create({
          data: { designId: design.id, approvedById: users[0].id, status: design.status, comments: pick(["Looks great!", "Minor changes needed", "Approved", "Update required for dimensions"]) },
        })
      }
      designCount++
    }
  }
  console.log(`  ${designCount} designs created`)

  // ─────────────────────────────
  // Purchase Entries + Items
  // ─────────────────────────────
  let purchaseEntryCount = 0
  for (let i = 0; i < 40; i++) {
    const wo = pick(workOrders)
    const itemsCount = rand(1, 5)
    const items: any[] = []
    let totalCost = 0
    for (let j = 0; j < itemsCount; j++) {
      const qty = rand(1, 20)
      const price = rand(10, 300)
      totalCost += qty * price
      items.push({ materialName: pick(materialNames), quantity: qty, unitPrice: price, totalPrice: qty * price })
    }
    const entry = await prisma.purchaseEntry.create({
      data: {
        workOrderId: wo.id, supplierId: pick(suppliers).id, supplierName: pick(supplierNames),
        purchaseType: pick(["CASH", "LPO"] as PurchaseType[]), invoiceNumber: `INV-${String(i + 1).padStart(5, "0")}`,
        totalCost, paymentStatus: pick(["PENDING", "PAID", "PARTIALLY_PAID"] as PaymentStatus[]),
        notes: pick(["", "", "Urgent order", "Monthly stock", "Client requested rush"]), createdById: pick(allUsers).id,
        items: { create: items },
      },
    })
    if (i % 5 === 0) {
      await prisma.purchaseDocument.create({
        data: { purchaseEntryId: entry.id, fileUrl: `/uploads/purchases/invoice_${i + 1}.pdf`, fileType: "pdf", uploadedById: users[4].id },
      })
    }
    purchaseEntryCount++
  }
  console.log(`  ${purchaseEntryCount} purchase entries created`)

  // ─────────────────────────────
  // Purchase Approvals
  // ─────────────────────────────
  const purchaseEntries = await prisma.purchaseEntry.findMany({ take: 20 })
  let paCount = 0
  for (const pe of purchaseEntries) {
    const isApproved = Math.random() < 0.6
    await prisma.purchaseApproval.create({
      data: {
        purchaseEntryId: pe.id, workOrderId: pe.workOrderId, requestedById: pick(allUsers).id,
        approvedById: isApproved ? pick(allUsers).id : null, status: isApproved ? "APPROVED" : pick(["PENDING", "REJECTED"] as ApprovalStatus[]),
        amount: pe.totalCost, threshold: pe.totalCost > 15000 ? 15000 : 5000,
        notes: isApproved ? "Approved" : Math.random() < 0.5 ? "Need more details" : null,
        approvedAt: isApproved ? new Date() : null, rejectedReason: null,
      },
    })
    paCount++
  }
  console.log(`  ${paCount} purchase approvals created`)

  // ─────────────────────────────
  // Material Requests
  // ─────────────────────────────
  let mrCount = 0
  for (let i = 0; i < 30; i++) {
    const wo = pick(workOrders)
    const status = pick(["PENDING", "APPROVED", "REJECTED"] as MaterialRequestStatus[])
    await prisma.materialRequest.create({
      data: {
        requestNumber: `MR-${String(i + 1).padStart(4, "0")}`, title: `Material request for ${wo.workOrderId}`,
        description: pick(["Urgent materials needed", "Standard restock", "Client-specified materials", ""]),
        workOrderId: wo.id, items: [{ name: pick(materialNames), qty: rand(1, 20) }, { name: pick(materialNames), qty: rand(1, 10) }],
        status, requestedById: pick(allUsers).id, approvedById: status === "APPROVED" ? pick(allUsers).id : null,
        rejectedReason: status === "REJECTED" ? "Budget constraints" : null,
      },
    })
    mrCount++
  }
  console.log(`  ${mrCount} material requests created`)

  // ─────────────────────────────
  // Inventory Movements
  // ─────────────────────────────
  let movCount = 0
  for (let i = 0; i < 100; i++) {
    const item = pick(inventoryItems)
    const types: InventoryMovementType[] = ["IN", "OUT", "RESERVED", "RETURNED", "DAMAGED"]
    await prisma.inventoryMovement.create({
      data: { itemId: item.id, type: pick(types), quantity: rand(-20, 50), createdById: pick(allUsers).id, notes: pick(["Stock received", "Issued to production", "Reserved for order", "Returned from site", "Damaged in storage"]) },
    })
    movCount++
  }
  console.log(`  ${movCount} inventory movements created`)

  // ─────────────────────────────
  // Work Order Inventory (allocations)
  // ─────────────────────────────
  let allocCount = 0
  for (const wo of workOrders.slice(0, 40)) {
    const numItems = rand(1, 4)
    for (let j = 0; j < numItems; j++) {
      const item = pick(inventoryItems)
      const qty = rand(1, 20)
      await prisma.workOrderInventory.create({
        data: { workOrderId: wo.id, itemId: item.id, quantityAllocated: qty, quantityUsed: rand(0, qty), quantityWasted: rand(0, 3) },
      })
      allocCount++
    }
  }
  console.log(`  ${allocCount} inventory allocations created`)

  // ─────────────────────────────
  // Production Stages
  // ─────────────────────────────
  const stageNamesList = ["Cutting", "Edge Banding", "Assembly", "Sanding", "Painting", "Polishing", "Upholstery", "Installation", "Quality Check", "Packaging"]
  let stageCount = 0
  for (const wo of workOrders.slice(0, 30)) {
    const numStages = rand(3, 6)
    for (let j = 0; j < numStages; j++) {
      const isStarted = j === 0 || Math.random() < 0.3
      await prisma.productionStage.create({
        data: {
          workOrderId: wo.id, stageName: stageNamesList[j], department: pick(["Production", "Finishing", "Upholstery", "Installation", "QA", "Packaging"]),
          sortOrder: j + 1, status: isStarted ? pick(["IN_PROGRESS", "COMPLETED"] as StageStatus[]) : "PENDING",
          startTime: isStarted ? new Date(Date.now() - rand(1, 14) * 86400000) : null,
          endTime: Math.random() < 0.4 && isStarted ? new Date() : null,
          completionPercentage: isStarted ? rand(10, 100) : 0, isDelayed: Math.random() < 0.1,
          assignedToId: Math.random() < 0.5 ? pick(allLabours).id : null,
          qualityStatus: pick(["PENDING", "PASSED", "FAILED"]),
        },
      })
      stageCount++
    }
  }
  console.log(`  ${stageCount} production stages created`)

  // ─────────────────────────────
  // Labor Entries
  // ─────────────────────────────
  let laborCount = 0
  const stages = await prisma.productionStage.findMany({ take: 60 })
  for (const stage of stages) {
    const numEntries = rand(1, 3)
    for (let j = 0; j < numEntries; j++) {
      const worker = pick(allLabours)
      const hours = rand(2, 10)
      const otHours = Math.random() < 0.2 ? rand(1, 3) : 0
      await prisma.laborEntry.create({
        data: {
          workOrderId: stage.workOrderId, productionStageId: stage.id, workerId: worker.id,
          hoursWorked: hours, hourlyRate: worker.hourlyRate, dailyRate: worker.dailyRate,
          overtimeHours: otHours, overtimeRate: worker.overtimeRate,
          totalCost: hours * worker.hourlyRate + otHours * worker.overtimeRate,
          date: new Date(2024, rand(0, 11), rand(1, 28)), notes: Math.random() < 0.2 ? pick(["Overtime", "Double shift", ""]) : null,
        },
      })
      laborCount++
    }
  }
  console.log(`  ${laborCount} labor entries created`)

  // ─────────────────────────────
  // Job Cards
  // ─────────────────────────────
  let jcCount = 0
  for (const wo of workOrders.slice(0, 20)) {
    const jc = await prisma.jobCard.create({
      data: {
        workOrderId: wo.id, generatedById: prodManager.id,
        designCompleted: Math.random() < 0.7, designApproved: Math.random() < 0.6,
        materialSelectionDone: Math.random() < 0.5, measurementsVerified: Math.random() < 0.7,
        budgetApproved: Math.random() < 0.6, advancePaymentReceived: Math.random() < 0.4,
        carpenterName: pick(carpenterNames), productionStartDate: new Date(2024, rand(0, 11), rand(1, 28)),
        expectedFinishDate: new Date(2024, rand(0, 11), rand(1, 28) + 30),
        actualFinishDate: Math.random() < 0.5 ? new Date(2024, rand(0, 11), rand(1, 28) + 25) : null,
        productionNotes: Math.random() < 0.3 ? "Production went smoothly" : null,
        delayNotes: Math.random() < 0.2 ? "Material delay" : null,
        qualityApproved: Math.random() < 0.5, qualityApprovedById: Math.random() < 0.5 ? pick(allUsers).id : null,
        productionApproved: Math.random() < 0.5, productionApprovedById: Math.random() < 0.5 ? pick(allUsers).id : null,
        inventoryApproved: Math.random() < 0.4, inventoryApprovedById: Math.random() < 0.4 ? pick(allUsers).id : null,
        accountsApproved: Math.random() < 0.3, accountsApprovedById: Math.random() < 0.3 ? users[5].id : null,
        managerApproved: Math.random() < 0.2, managerApprovedById: Math.random() < 0.2 ? users[1].id : null,
      },
    })
    // Add checklist items
    const checklistLabels = ["Design reviewed", "Materials verified", "Measurements checked", "Budget approved", "Production ready"]
    for (let k = 0; k < rand(2, 4); k++) {
      await prisma.jobCardChecklistItem.create({
        data: { jobCardId: jc.id, itemLabel: checklistLabels[k], isCompleted: Math.random() < 0.6, sortOrder: k },
      })
    }
    jcCount++
  }
  console.log(`  ${jcCount} job cards created`)

  // ─────────────────────────────
  // Digital Signatures
  // ─────────────────────────────
  let sigCount = 0
  for (const wo of workOrders.slice(0, 15)) {
    const sigType = pick(["DRAWN", "TYPED", "PIN"])
    await prisma.digitalSignature.create({
      data: {
        workOrderId: wo.id, approvedById: users[0].id, signatureType: sigType,
        signatureData: sigType === "TYPED" ? "Ahmed Al Maktoum" : sigType === "PIN" ? "1234" : JSON.stringify({ points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] }),
        approvalPin: sigType === "PIN" ? "1234" : null, approvedAt: new Date(2024, rand(0, 11), rand(1, 28)),
      },
    })
    sigCount++
  }
  console.log(`  ${sigCount} digital signatures created`)

  // ─────────────────────────────
  // Delay Alerts
  // ─────────────────────────────
  let delayCount = 0
  for (const wo of workOrders.slice(0, 15)) {
    const numAlerts = rand(1, 2)
    for (let j = 0; j < numAlerts; j++) {
      await prisma.delayAlert.create({
        data: {
          workOrderId: wo.id, alertType: pick(["DELAYED_PRODUCTION", "MATERIAL_SHORTAGE", "WORKER_ABSENCE", "EQUIPMENT_FAILURE"]),
          message: pick(["Production delayed due to material shortage", "Worker absent", "Equipment maintenance required", "Design revision pending"]),
          createdById: pick(allUsers).id, isResolved: Math.random() < 0.5, resolvedAt: Math.random() < 0.5 ? new Date() : null,
        },
      })
      delayCount++
    }
  }
  console.log(`  ${delayCount} delay alerts created`)

  // ─────────────────────────────
  // Schedule Events
  // ─────────────────────────────
  let scheduleCount = 0
  const shifts = ["DAY", "AFTERNOON", "NIGHT"]
  for (let i = 0; i < 40; i++) {
    const wo = pick(workOrders)
    const worker = pick(allLabours)
    const shift = pick(shifts)
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() + rand(-3, 14))
    baseDate.setHours(shift === "DAY" ? 6 : shift === "AFTERNOON" ? 14 : 22, 0, 0, 0)
    const endDate = new Date(baseDate)
    endDate.setHours(endDate.getHours() + 8)

    await prisma.scheduleEvent.create({
      data: {
        workOrderId: wo.id, workerId: worker.id, stageName: Math.random() < 0.7 ? pick(stageNamesList) : null,
        shiftLabel: shift, startTime: baseDate, endTime: endDate,
        isOvertime: Math.random() < 0.15, notes: Math.random() < 0.3 ? pick(["Priority order", "Double shift", "New worker training", ""]) : null,
      },
    })
    scheduleCount++
  }
  console.log(`  ${scheduleCount} schedule events created`)

  // ─────────────────────────────
  // Purchase Orders
  // ─────────────────────────────
  for (let i = 0; i < 20; i++) {
    const wo = pick(workOrders)
    await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${String(i + 1).padStart(4, "0")}`, purchaseType: pick(["CASH", "LPO"] as PurchaseType[]),
        supplierId: pick(suppliers).id, amount: rand(1000, 50000), status: pick(["PENDING", "PAID", "PARTIALLY_PAID"] as PaymentStatus[]),
        createdById: pick(allUsers).id, workOrderId: wo.id,
        items: [{ name: pick(materialNames), qty: rand(1, 10), price: rand(50, 500) }],
      },
    })
  }
  console.log(`  20 purchase orders created`)

  // ─────────────────────────────
  // Attendance
  // ─────────────────────────────
  let attCount = 0
  for (const emp of employees) {
    const numDays = rand(15, 25)
    for (let d = 0; d < numDays; d++) {
      const date = new Date(2024, rand(0, 11), rand(1, 28))
      const status = pick(["PRESENT", "PRESENT", "PRESENT", "ABSENT", "LEAVE", "HALF_DAY"])
      const checkIn = status === "PRESENT" || status === "HALF_DAY" ? new Date(date.setHours(rand(6, 9), rand(0, 59), 0)) : null
      const checkOut = checkIn ? new Date(new Date(checkIn).setHours(checkIn.getHours() + rand(6, 10))) : null
      const hours = checkIn && checkOut ? (checkOut.getTime() - checkIn.getTime()) / 3600000 : (status === "HALF_DAY" ? 4 : 0)
      await prisma.attendance.create({
        data: { employeeId: emp.id, date, checkIn, checkOut, hoursWorked: Math.round(hours * 10) / 10, status, notes: status === "ABSENT" ? "Sick leave" : null },
      }).catch(() => {})
      attCount++
    }
  }
  console.log(`  ${attCount} attendance records created`)

  // ─────────────────────────────
  // Payroll
  // ─────────────────────────────
  let payrollCount = 0
  for (const emp of employees) {
    for (let month = 1; month <= 3; month++) {
      const basic = emp.salary || rand(2000, 6000)
      const overtime = rand(0, 500)
      const allowances = rand(200, 1000)
      const deductions = rand(0, 300)
      const net = basic + overtime + allowances - deductions
      await prisma.payroll.create({
        data: {
          employeeId: emp.id, month, year: 2024, basicSalary: basic, overtime, allowances, deductions, netSalary: net,
          status: pick(["PENDING", "PAID"] as PaymentStatus[]), paidAt: Math.random() < 0.7 ? new Date(2024, month - 1, rand(1, 28)) : null,
        },
      }).catch(() => {})
      payrollCount++
    }
  }
  console.log(`  ${payrollCount} payroll records created`)

  // ─────────────────────────────
  // Activity History
  // ─────────────────────────────
  let activityCount = 0
  const actions = ["CREATED", "STATUS_CHANGED", "DESIGN_UPLOADED", "PAYMENT_RECEIVED", "MATERIAL_ORDERED", "NOTE_ADDED", "ASSIGNED", "COMPLETED"]
  for (let i = 0; i < 200; i++) {
    const wo = i < 100 ? workOrders[i] : pick(workOrders)
    await prisma.activityHistory.create({
      data: { workOrderId: wo.id, userId: pick(allUsers).id, action: pick(actions), description: `${pick(actions).replace(/_/g, " ").toLowerCase()} for ${wo.workOrderId}`, createdAt: new Date(2024, rand(0, 11), rand(1, 28), rand(0, 23), rand(0, 59)) },
    })
    activityCount++
  }
  console.log(`  ${activityCount} activity history entries created`)

  // ─────────────────────────────
  // Notifications
  // ─────────────────────────────
  let notifCount = 0
  const notifTypes: NotificationType[] = ["DESIGN_COMPLETED", "APPROVAL_REQUIRED", "INVENTORY_LOW", "PAYMENT_OVERDUE", "WORK_ORDER_DELAYED", "WORK_ORDER_ASSIGNED"]
  for (const user of allUsers) {
    const numNotifs = rand(3, 8)
    for (let j = 0; j < numNotifs; j++) {
      await prisma.notification.create({
        data: { userId: user.id, type: pick(notifTypes), title: pick(["Design Ready for Review", "Approval Required", "Low Stock Alert", "Payment Overdue", "Work Order Delayed", "New Assignment"]), message: `Action needed for ${pick(workOrders).workOrderId}`, isRead: j < numNotifs - 2, createdAt: new Date(2024, rand(0, 11), rand(1, 28), rand(0, 23), rand(0, 59)) },
      })
      notifCount++
    }
  }
  console.log(`  ${notifCount} notifications created`)

  // ─────────────────────────────
  // Documents
  // ─────────────────────────────
  let docCount = 0
  const docTypes = ["invoice", "contract", "design_dwg", "photo", "report"]
  for (let i = 0; i < 50; i++) {
    const wo = pick(workOrders)
    await prisma.document.create({
      data: { workOrderId: wo.id, title: `${pick(docTypes)}_${wo.workOrderId}`, type: pick(docTypes), url: `/uploads/documents/${wo.id}_${i}.pdf`, size: rand(100, 5000), uploadedById: pick(allUsers).id, createdAt: new Date(2024, rand(0, 11), rand(1, 28)) },
    })
    docCount++
  }
  console.log(`  ${docCount} documents created`)

  // ─────────────────────────────
  // Work Order Team Members
  // ─────────────────────────────
  let teamCount = 0
  for (const wo of workOrders.slice(0, 30)) {
    const roles = ["MANAGER", "DESIGNER", "INVENTORY_MANAGER", "ACCOUNTANT"]
    for (const role of roles) {
      await prisma.workOrderTeamMember.create({
        data: { workOrderId: wo.id, userId: pick(allUsers).id, role },
      }).catch(() => {})
      teamCount++
    }
  }
  console.log(`  ${teamCount} team members assigned`)

  // ─────────────────────────────
  // Summary
  // ─────────────────────────────
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\nSeeding complete in ${elapsed}s!`)
  console.log("\nLogin credentials:")
  console.log("  Owner:              owner@samaaljazeera.com / password123")
  console.log("  Manager:            manager@samaaljazeera.com / password123")
  console.log("  Designer 1:         designer1@samaaljazeera.com / password123")
  console.log("  Designer 2:         designer2@samaaljazeera.com / password123")
  console.log("  Inventory:          inventory@samaaljazeera.com / password123")
  console.log("  Accountant:         accountant@samaaljazeera.com / password123")
  console.log("  Production Manager: production@samaaljazeera.com / password123")
  console.log("  HR:                 hr@samaaljazeera.com / password123")
  console.log("  Labour:             labour1-8@samaaljazeera.com / password123")
  console.log("  Carpenters:         carpenter1-10@samaaljazeera.com / password123")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
