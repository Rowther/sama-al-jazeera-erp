import { cn } from "@/lib/utils"
import { Tooltip } from "@/components/tutorial/TooltipComponent"

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusColorMap: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-50 text-blue-600',
  APPROVED: 'bg-emerald-50 text-emerald-600',
  DESIGN_ASSIGNED: 'bg-purple-50 text-purple-600',
  DESIGN_IN_PROGRESS: 'bg-indigo-50 text-indigo-600',
  DESIGN_COMPLETED: 'bg-teal-50 text-teal-600',
  DESIGN_APPROVED: 'bg-green-50 text-green-600',
  READY_FOR_PRODUCTION: 'bg-cyan-50 text-cyan-600',
  PRODUCTION_STARTED: 'bg-orange-50 text-orange-600',
  PRODUCTION_COMPLETED: 'bg-lime-50 text-lime-600',
  DELIVERED: 'bg-green-50 text-green-600',
  CLOSED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-50 text-red-600',
  WORK_ORDER_CREATED: 'bg-blue-50 text-blue-600',
  DESIGN_SUBMITTED: 'bg-indigo-50 text-indigo-600',
  MATERIAL_REVIEW: 'bg-cyan-50 text-cyan-600',
  IN_PRODUCTION: 'bg-orange-50 text-orange-600',
  READY_FOR_DELIVERY: 'bg-emerald-50 text-emerald-600',
  PENDING: 'bg-yellow-50 text-yellow-600',
  PAID: 'bg-green-50 text-green-600',
  PARTIALLY_PAID: 'bg-blue-50 text-blue-600',
  OVERDUE: 'bg-red-50 text-red-600',
  LOW: 'bg-yellow-50 text-yellow-600',
  MEDIUM: 'bg-blue-50 text-blue-600',
  HIGH: 'bg-orange-50 text-orange-600',
  URGENT: 'bg-red-50 text-red-600',
  PRESENT: 'bg-green-50 text-green-600',
  ABSENT: 'bg-red-50 text-red-600',
  LEAVE: 'bg-yellow-50 text-yellow-600',
  PENDING_REVIEW: 'bg-yellow-50 text-yellow-600',
  APPROVED_REVIEW: 'bg-green-50 text-green-600',
  REVISION_REQUESTED: 'bg-orange-50 text-orange-600',
  REJECTED: 'bg-red-50 text-red-600',
}

const statusTooltips: Record<string, string> = {
  DRAFT: 'Work order is being created and not yet submitted.',
  SUBMITTED: 'Work order has been submitted for review.',
  APPROVED: 'Work order has been approved and ready for next steps.',
  DESIGN_ASSIGNED: 'A designer has been assigned to create the design.',
  DESIGN_IN_PROGRESS: 'Designer is currently working on the design.',
  DESIGN_COMPLETED: 'Design has been completed and submitted for review.',
  DESIGN_APPROVED: 'Design has been approved by management.',
  READY_FOR_PRODUCTION: 'All prerequisites met. Ready to start production.',
  PRODUCTION_STARTED: 'Item is currently being manufactured.',
  PRODUCTION_COMPLETED: 'Manufacturing is complete. Ready for delivery.',
  DELIVERED: 'Item has been delivered to the customer.',
  CLOSED: 'Work order is closed. All steps completed.',
  CANCELLED: 'Work order has been cancelled.',
  IN_PRODUCTION: 'Item is currently being produced on the factory floor.',
  READY_FOR_DELIVERY: 'Production done. Awaiting delivery to customer.',
  PENDING: 'Awaiting action or decision.',
  PAID: 'Payment has been received in full.',
  PARTIALLY_PAID: 'Partial payment received. Balance remains.',
  OVERDUE: 'Payment or action is past the due date.',
  LOW: 'Low priority — can be scheduled flexibly.',
  MEDIUM: 'Medium priority — standard handling.',
  HIGH: 'High priority — needs prompt attention.',
  URGENT: 'Urgent — requires immediate action.',
  PENDING_REVIEW: 'Awaiting review and approval.',
  APPROVED_REVIEW: 'Review completed and approved.',
  REVISION_REQUESTED: 'Changes have been requested. Needs resubmission.',
  REJECTED: 'Request was not approved.',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColorMap[status] || 'bg-gray-100 text-gray-600'
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const tooltip = statusTooltips[status]

  const badge = (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', colorClass, className)}>
      {label}
    </span>
  )

  if (tooltip) {
    return <Tooltip content={tooltip} side="top">{badge}</Tooltip>
  }

  return badge
}
