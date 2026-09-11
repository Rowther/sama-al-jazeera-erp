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
  const records: any[] = (wo?.payments || [])
    .filter((p: any) => p.type === "ADVANCE" || p.type === "INSTALLMENT")
    .sort(
      (a: any, b: any) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime()
    )
  const recordedSum = records.reduce((s: number, p: any) => s + (p.amount || 0), 0)
  const paidTotal = wo?.advanceReceived || recordedSum || 0
  const advancePortion = Math.max(0, paidTotal - recordedSum)
  if (paidTotal > 0 && advancePortion > 0) {
    return [
      {
        id: "initial-advance",
        type: "ADVANCE",
        amount: advancePortion,
        status: "PAID",
        notes: "Advance payment",
        date: wo?.createdAt,
        createdAt: wo?.createdAt,
      },
      ...records,
    ]
  }
  return records
}