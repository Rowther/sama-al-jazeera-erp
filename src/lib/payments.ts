export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", icon: "Banknote" },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: "Landmark" },
  { value: "CHEQUE", label: "Cheque", icon: "FileCheck2" },
]

export const paymentMethodLabel = (method?: string) =>
  PAYMENT_METHODS.find((m) => m.value === method)?.label || "Cash"

export const methodFromPayment = (p: any) => {
  const match = p?.notes?.match(/Paid via (CASH|BANK_TRANSFER|CHEQUE)/)
  return match ? match[1] : p?.reference ? "BANK_TRANSFER" : "CASH"
}

export const paymentRecordsFromWorkOrder = (wo: any) => {
  const records = (wo?.payments || []).filter((p: any) => p.type === "INSTALLMENT")
  return [...records].sort(
    (a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime()
  )
}