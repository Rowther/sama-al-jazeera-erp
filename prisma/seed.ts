import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import ExcelJS from "exceljs"

const prisma = new PrismaClient()

function cellValue(val: any): any {
  if (val != null && typeof val === 'object' && 'result' in val) return val.result
  return val
}

function toFloat(val: any): number {
  const v = cellValue(val)
  if (v == null || v === "-" || v === "N/A" || v === "") return 0
  const n = parseFloat(String(v))
  return isNaN(n) ? 0 : n
}

function toStringVal(val: any): string | null {
  const v = cellValue(val)
  if (v == null || v === "-" || v === "N/A" || v === "") return null
  return String(v).trim()
}

async function loadWorkbook() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile("MDF SJF.xlsx")
  return wb
}

async function importMDFInventory(wb: ExcelJS.Workbook) {
  const sheet = wb.getWorksheet("MDF Inventory")
  if (!sheet) { console.warn("  Sheet 'MDF Inventory' not found"); return }

  const cat = await prisma.inventoryCategory.upsert({
    where: { name: "MDF" },
    update: {},
    create: { name: "MDF", description: "MDF boards and panels" },
  })

  const creates: any[] = []
  const seenNames = new Set<string>()

  sheet.eachRow((row, rowNum) => {
    if (rowNum < 11) return
    const sr = row.getCell(1).value
    if (sr == null || sr === "") return

    const name = String(row.getCell(2).value ?? "").trim()
    if (!name || name === "-" || name === "N/A" || name === "" || seenNames.has(name)) return
    seenNames.add(name)

    const stock = toFloat(row.getCell(7).value)
    const shelf = toStringVal(row.getCell(4).value)
    const location = toStringVal(row.getCell(9).value)

    creates.push(
      prisma.inventoryItem.create({
        data: {
          name,
          categoryId: cat.id,
          sku: `MDF-${String(creates.length + 1).padStart(4, "0")}`,
          unit: "sheet",
          price: 0,
          stockQuantity: stock,
          minStock: 1,
          maxStock: 999,
          location: location || shelf,
        },
      })
    )
  })

  const results = await Promise.allSettled(creates)
  const ok = results.filter(r => r.status === "fulfilled").length
  console.log(`  ${ok} MDF inventory items created`)
}

async function importStoreInventory(wb: ExcelJS.Workbook) {
  const sheet = wb.getWorksheet("STORE Inventory")
  if (!sheet) { console.warn("  Sheet 'STORE Inventory' not found"); return }

  const cat = await prisma.inventoryCategory.upsert({
    where: { name: "Store" },
    update: {},
    create: { name: "Store", description: "Store/hardware items" },
  })

  const creates: any[] = []
  const seenNames = new Set<string>()

  sheet.eachRow((row, rowNum) => {
    if (rowNum < 2) return
    const itemNo = row.getCell(1).value
    if (itemNo == null || itemNo === "") return

    const name = String(row.getCell(2).value ?? "").trim()
    if (!name || name === "-" || name === "N/A" || name === "" || seenNames.has(name)) return
    seenNames.add(name)

    const stock = toFloat(row.getCell(9).value)
    const unit = toStringVal(row.getCell(4).value) || "pcs"
    const brand = toStringVal(row.getCell(5).value)
    const price = toFloat(row.getCell(10).value)
    const minStock = toFloat(row.getCell(12).value)
    const location = toStringVal(row.getCell(15).value)

    creates.push(
      prisma.inventoryItem.create({
        data: {
          name,
          categoryId: cat.id,
          sku: `STORE-${String(creates.length + 1).padStart(4, "0")}`,
          unit,
          price,
          stockQuantity: stock,
          minStock,
          maxStock: 9999,
          location,
          description: brand ? `Brand: ${brand}` : null,
        },
      })
    )
  })

  const results = await Promise.allSettled(creates)
  const ok = results.filter(r => r.status === "fulfilled").length
  console.log(`  ${ok} Store inventory items created`)
}

async function main() {
  console.log("Seeding database...\n")
  const start = Date.now()

  // Clean all data in dependency order
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.activityHistory.deleteMany()
  await prisma.jobCardChecklistItem.deleteMany()
  await prisma.jobCard.deleteMany()
  await prisma.digitalSignature.deleteMany()
  await prisma.delayAlert.deleteMany()
  await prisma.workerAssignment.deleteMany()
  await prisma.laborEntry.deleteMany()
  await prisma.scheduleEvent.deleteMany()
  await prisma.productionStage.deleteMany()
  await prisma.purchaseApproval.deleteMany()
  await prisma.materialRequest.deleteMany()
  await prisma.designApproval.deleteMany()
  await prisma.designRevision.deleteMany()
  await prisma.design.deleteMany()
  await prisma.document.deleteMany()
  await prisma.purchaseEntryItem.deleteMany()
  await prisma.purchaseDocument.deleteMany()
  await prisma.purchaseEntry.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.installment.deleteMany()
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
  await prisma.workOrderItem.deleteMany()
  await prisma.workOrder.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()

  const password = await bcrypt.hash("password123", 12)

  // ─────────────────────────────
  // Users (8 roles)
  // ─────────────────────────────
  await Promise.all([
    prisma.user.create({ data: { email: "owner@samaaljazeera.com", password, name: "Ahmed Al Maktoum", role: "OWNER" as Role, phone: "+971501234567", isActive: true } }),
    prisma.user.create({ data: { email: "manager@samaaljazeera.com", password, name: "Khalid Hassan", role: "MANAGER" as Role, phone: "+971507654321", isActive: true } }),
    prisma.user.create({ data: { email: "designer1@samaaljazeera.com", password, name: "Fatima Ali", role: "DESIGNER" as Role, phone: "+971505555111", isActive: true } }),
    prisma.user.create({ data: { email: "designer2@samaaljazeera.com", password, name: "Omar Rashid", role: "DESIGNER" as Role, phone: "+971505555222", isActive: true } }),
    prisma.user.create({ data: { email: "inventory@samaaljazeera.com", password, name: "Saeed Mohammed", role: "INVENTORY_MANAGER" as Role, phone: "+971505555333", isActive: true } }),
    prisma.user.create({ data: { email: "accountant@samaaljazeera.com", password, name: "Noora Ahmed", role: "ACCOUNTANT" as Role, phone: "+971505555444", isActive: true } }),
    prisma.user.create({ data: { email: "production@samaaljazeera.com", password, name: "Mansoor Saeed", role: "PRODUCTION_MANAGER" as Role, phone: "+971505555555", isActive: true } }),
    prisma.user.create({ data: { email: "hr@samaaljazeera.com", password, name: "Layla Salim", role: "HR" as Role, phone: "+971505555666", isActive: true } }),
    prisma.user.create({ data: { email: "labour1@samaaljazeera.com", password, name: "Rashid Ali", role: "LABOUR" as Role, phone: "+971507770000", isActive: true } }),
    prisma.user.create({ data: { email: "labour2@samaaljazeera.com", password, name: "Faisal Omar", role: "LABOUR" as Role, phone: "+971507770001", isActive: true } }),
    prisma.user.create({ data: { email: "carpenter1@samaaljazeera.com", password, name: "Hassan Ibrahim", role: "LABOUR" as Role, phone: "+971506660000", isActive: true } }),
    prisma.user.create({ data: { email: "carpenter2@samaaljazeera.com", password, name: "Yusuf Karim", role: "LABOUR" as Role, phone: "+971506660001", isActive: true } }),
  ])

  console.log("  12 users created (owner, manager, 2 designers, inventory, accountant, production mgr, hr, 2 labour, 2 carpenters)")

  // ─────────────────────────────
  // Inventory from MDF SJF.xlsx
  // ─────────────────────────────
  console.log("\n  Importing inventory from MDF SJF.xlsx...")
  const wb = await loadWorkbook()
  await importMDFInventory(wb)
  await importStoreInventory(wb)

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
  console.log("  Labour:             labour1-2@samaaljazeera.com / password123")
  console.log("  Carpenters:         carpenter1-2@samaaljazeera.com / password123")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
