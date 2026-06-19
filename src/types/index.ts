export type Role = 'OWNER' | 'MANAGER' | 'DESIGNER' | 'INVENTORY_MANAGER' | 'ACCOUNTANT' | 'HR' | 'LABOUR' | 'PRODUCTION_MANAGER'

export type WorkOrderStatus =
  | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'DESIGN_ASSIGNED'
  | 'DESIGN_IN_PROGRESS' | 'DESIGN_COMPLETED' | 'DESIGN_APPROVED'
  | 'READY_FOR_PRODUCTION' | 'PRODUCTION_STARTED' | 'PRODUCTION_COMPLETED'
  | 'DELIVERED' | 'CLOSED' | 'CANCELLED'
  | 'WORK_ORDER_CREATED' | 'DESIGN_SUBMITTED' | 'MATERIAL_REVIEW'
  | 'IN_PRODUCTION' | 'READY_FOR_DELIVERY'

export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED'
export type PurchaseType = 'CASH' | 'LPO'
export type MaterialStatus = 'PENDING' | 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'OUT_OF_STOCK' | 'ORDERED' | 'RECEIVED' | 'APPROVED' | 'REJECTED'
export type NotificationType =
  | 'DESIGN_COMPLETED' | 'APPROVAL_REQUIRED' | 'INVENTORY_LOW'
  | 'ADVANCE_RECEIVED' | 'PAYMENT_OVERDUE' | 'WORK_ORDER_DELAYED'
  | 'PURCHASE_REQUEST_PENDING' | 'DESIGN_REVISION_REQUESTED'
  | 'WORK_ORDER_ASSIGNED' | 'MATERIAL_ALLOCATED' | 'MATERIAL_PURCHASED'
  | 'MATERIAL_COST_APPROVAL' | 'PROCUREMENT_COMPLETED'
  | 'PURCHASE_APPROVAL_REQUIRED' | 'PURCHASE_APPROVED' | 'PURCHASE_REJECTED'
  | 'STAGE_DELAYED' | 'LABOR_COST_EXCEEDED' | 'BUDGET_OVERRUN' | 'PRODUCTION_BOTTLENECK'

export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'SKIPPED'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiError {
  message: string
  status: number
  errors?: Record<string, string[]>
}

export interface User {
  id: string
  email: string
  name: string
  role: Role
  phone?: string
  avatar?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
  employee?: Employee
}

export type WorkOrderItemStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'CANCELLED'

export interface WorkOrderItem {
  id: string
  workOrderId: string
  name: string
  description?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
  image?: string
  dimensions?: string
  notes?: string
  design?: any
  status: WorkOrderItemStatus
  progress: number
  isDelayed: boolean
  delayDays: number
  deliveryStatus?: string
  estimatedCost?: number
  actualCost: number
  productionStartedAt?: string
  productionCompletedAt?: string
  createdAt: string
  updatedAt: string
  workerAssignments?: WorkerAssignment[]
  productionStages?: ProductionStage[]
  materials?: WorkOrderMaterial[]
  laborEntries?: LaborEntry[]
  expenses?: Expense[]
}

export interface WorkOrder {
  id: string
  workOrderId: string
  customerId: string
  customer: { id: string; name: string; phone: string; location?: string }
  projectType?: string
  furnitureType?: string
  description?: string
  priority: string
  dueDate?: string
  dimensions?: string
  items?: { name: string; quantity: number; dimensions?: string; notes?: string }[]
  workOrderItems?: WorkOrderItem[]
  notes?: string
  estimatedBudget?: number
  estimatedMaterialCost?: number
  estimatedLaborCost?: number
  estimatedTransportCost?: number
  advanceReceived: number
  finalPrice?: number
  remainingAmount?: number
  paymentTerms?: string
  status: WorkOrderStatus
  assignedTo?: { id: string; name: string }
  createdBy: { id: string; name: string }
  totalCost: number
  actualLaborCost: number
  actualTransportCost: number
  profitMargin?: number
  costOverrun: number
  isBudgetOverrun: boolean
  isDelayed: boolean
  delayDays: number
  productionStartedAt?: string
  productionCompletedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  teamMembers?: WorkOrderTeamMember[]
  workerAssignments?: WorkerAssignment[]
  designs?: Design[]
  materials?: WorkOrderMaterial[]
  expenses?: Expense[]
  payments?: Payment[]
  documents?: Document[]
  installments?: Installment[]
  jobCard?: JobCard
  digitalSignature?: DigitalSignature
  delayAlerts?: DelayAlert[]
  productionStages?: ProductionStage[]
  laborEntries?: LaborEntry[]
  purchaseApprovals?: PurchaseApproval[]
}

export interface WorkerAssignment {
  id: string
  workOrderId: string
  workOrderItemId?: string
  userId: string
  user: { id: string; name: string; role: string }
  role: string
  assignedDate: string
  progress: number
  hourlyRate: number
  dailyRate: number
  overtimeRate: number
  totalHoursWorked: number
  totalCost: number
  notes?: string
}

export interface ProductionStage {
  id: string
  workOrderId: string
  workOrderItemId?: string
  stageName: string
  department?: string
  assignedTo?: { id: string; name: string; role: string }
  status: StageStatus
  startTime?: string
  endTime?: string
  duration?: number
  isDelayed: boolean
  delayMinutes: number
  completionPercentage: number
  notes?: string
  images: string[]
  videos: string[]
  qualityStatus?: string
  sortOrder: number
  laborEntries?: LaborEntry[]
}

export interface LaborEntry {
  id: string
  workOrderId: string
  workOrderItemId?: string
  productionStageId?: string
  productionStage?: { stageName: string }
  worker: { id: string; name: string; role: string }
  hoursWorked: number
  hourlyRate: number
  dailyRate: number
  overtimeHours: number
  overtimeRate: number
  totalCost: number
  date: string
  notes?: string
}

export interface PurchaseApproval {
  id: string
  purchaseEntryId: string
  purchaseEntry?: { id: string; supplierName?: string; totalCost: number; purchaseType: string }
  workOrderId: string
  requestedBy: { id: string; name: string }
  approvedBy?: { id: string; name: string }
  status: ApprovalStatus
  amount: number
  threshold: number
  notes?: string
  approvedAt?: string
  rejectedReason?: string
}

export interface Installment {
  id: string
  workOrderId: string
  amount: number
  date: string
  notes?: string
}

export interface JobCard {
  id: string
  workOrderId: string
  generatedAt: string
  generatedBy: { id: string; name: string }
  signatureId?: string
  signature?: DigitalSignature
}

export interface DigitalSignature {
  id: string
  workOrderId: string
  approvedBy: { id: string; name: string }
  signatureType: string
  signatureData?: string
  approvedAt: string
}

export interface DelayAlert {
  id: string
  workOrderId: string
  alertType: string
  message: string
  createdBy: { id: string; name: string }
  isResolved: boolean
  createdAt: string
  resolvedAt?: string
}

export interface WorkOrderTeamMember {
  id: string
  userId: string
  user: { id: string; name: string; role: string }
  role: string
}

export interface WorkOrderMaterial {
  id: string
  workOrderId: string
  workOrderItemId?: string
  materialName: string
  category?: string
  requiredQuantity: number
  unit: string
  estimatedCost: number
  actualCost: number
  supplierPreference?: string
  priority: string
  notes?: string
  availableQuantity: number
  reservedQuantity: number
  missingQuantity: number
  status: MaterialStatus
  createdAt: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  location?: string
  notes?: string
  createdAt: string
}

export interface Employee {
  id: string
  employeeId: string
  userId: string
  user: User
  photo?: string
  phone?: string
  address?: string
  joiningDate?: string
  department?: string
  designation?: string
  passportNumber?: string
  passportExpiry?: string
  visaNumber?: string
  visaExpiry?: string
  emiratesId?: string
  contractDoc?: string
  salary?: number
  overtimeRate?: number
  workingHours?: number
  leaveBalance: number
  performance?: string
  notes?: string
}

export interface Payroll {
  id: string
  employeeId: string
  employee: { id: string; employeeId: string; user: { name: string } }
  month: number
  year: number
  basicSalary: number
  overtime: number
  allowances: number
  deductions: number
  netSalary: number
  status: PaymentStatus
  paidAt?: string
  slipUrl?: string
}

export interface InventoryItem {
  id: string
  name: string
  categoryId: string
  category: { id: string; name: string }
  sku: string
  unit: string
  price: number
  stockQuantity: number
  minStock: number
  maxStock: number
  location?: string
  supplierId?: string
  description?: string
}

export interface Supplier {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  contactPerson?: string
  notes?: string
  createdAt: string
  _count?: { items: number; purchases: number; purchaseEntries: number }
}

export interface Design {
  id: string
  workOrderId: string
  title: string
  description?: string
  files: any[]
  status: string
  version: number
  createdBy: { id: string; name: string }
  createdAt: string
  revisions?: DesignRevision[]
  approvals?: DesignApproval[]
}

export interface DesignRevision {
  id: string
  designId: string
  files: any[]
  notes?: string
  version: number
  createdBy: { id: string; name: string }
  createdAt: string
}

export interface DesignApproval {
  id: string
  designId: string
  approvedBy: { id: string; name: string }
  status: string
  comments?: string
  createdAt: string
}

export interface PurchaseEntry {
  id: string
  workOrderId: string
  supplierId?: string
  supplier?: Supplier
  supplierName?: string
  supplierContact?: string
  purchaseType: PurchaseType
  invoiceNumber?: string
  billNumber?: string
  purchaseDate: string
  totalCost: number
  paymentStatus: PaymentStatus
  notes?: string
  createdBy: { id: string; name: string }
  items?: PurchaseEntryItem[]
  documents?: PurchaseDocument[]
  createdAt: string
}

export interface PurchaseEntryItem {
  id: string
  purchaseEntryId: string
  workOrderMaterialId?: string
  materialName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface PurchaseDocument {
  id: string
  fileUrl: string
  fileType: string
  createdAt: string
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  purchaseType: PurchaseType
  supplier?: Supplier
  amount: number
  billUrl?: string
  invoiceUrl?: string
  items: any[]
  status: PaymentStatus
  notes?: string
  createdBy: { id: string; name: string }
  workOrderId?: string
  createdAt: string
}

export interface Expense {
  id: string
  workOrderId?: string
  workOrderItemId?: string
  category: string
  amount: number
  description?: string
  billUrl?: string
  approvedBy?: { id: string; name: string }
  date: string
}

export interface Payment {
  id: string
  workOrderId?: string
  type: string
  amount: number
  status: PaymentStatus
  reference?: string
  notes?: string
  receivedBy?: { id: string; name: string }
  date: string
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message?: string
  link?: string
  isRead: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  userId: string
  user: { id: string; name: string; role: string }
  action: string
  entity: string
  entityId?: string
  oldValue?: any
  newValue?: any
  ip?: string
  createdAt: string
}

export interface DashboardKPIs {
  totalWorkOrders: number
  completed: number
  pending: number
  delayed: number
  inProduction: number
  cancelled: number
  profitMargin: number
  costOverrun: number
  totalRevenue: number
  totalCosts: number
  netProfit: number
  cashFlow: number
  expectedReceivables: number
  payables: number
}
