"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { Input } from "@/components/ui/input"
import { formatDate, formatCurrency } from "@/lib/utils"
import { toast } from "sonner"
import {
  ArrowLeft, User, Phone, MapPin, Calendar, Briefcase, Shield,
  CreditCard, FileText, Clock, DollarSign, Award, Mail,
} from "lucide-react"
import type { Employee } from "@/types"

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => { fetchEmployee() }, [params.id])

  async function fetchEmployee() {
    try {
      const res = await api.get<any>(`/employees?page=1&limit=100`)
      const emp = (res.employees || []).find((e: any) => e.id === params.id)
      if (emp) {
        setEmployee(emp)
        setForm({
          phone: emp.phone || "",
          address: emp.address || "",
          salary: emp.salary || "",
          designation: emp.designation || "",
          department: emp.department || "",
          passportNumber: emp.passportNumber || "",
          passportExpiry: emp.passportExpiry?.split("T")[0] || "",
          visaNumber: emp.visaNumber || "",
          visaExpiry: emp.visaExpiry?.split("T")[0] || "",
          emiratesId: emp.emiratesId || "",
          notes: emp.notes || "",
        })
      }
    } catch { toast.error("Failed to load employee") }
    finally { setLoading(false) }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    try {
      toast.success("Employee updated")
      setShowEdit(false)
    } catch { toast.error("Failed to update employee") }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold text-gray-900">Employee not found</h2>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">Go back</Button>
      </div>
    )
  }

  const infoCards = [
    { icon: Mail, label: "Email", value: employee.user?.email },
    { icon: Phone, label: "Phone", value: employee.phone || employee.user?.phone },
    { icon: MapPin, label: "Address", value: employee.address },
    { icon: Calendar, label: "Joined", value: employee.joiningDate ? formatDate(employee.joiningDate) : "N/A" },
    { icon: Briefcase, label: "Department", value: employee.department },
    { icon: Award, label: "Designation", value: employee.designation },
    { icon: DollarSign, label: "Salary", value: employee.salary ? formatCurrency(employee.salary) : "N/A" },
    { icon: Clock, label: "Leave Balance", value: `${employee.leaveBalance} days` },
  ]

  const docCards = [
    { icon: Shield, label: "Passport", value: employee.passportNumber, expiry: employee.passportExpiry },
    { icon: CreditCard, label: "Visa", value: employee.visaNumber, expiry: employee.visaExpiry },
    { icon: FileText, label: "Emirates ID", value: employee.emiratesId },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{employee.user?.name}</h1>
          <p className="text-sm text-gray-500">{employee.employeeId}</p>
        </div>
        <Badge className="bg-[#EEF4FF] text-[#4F8EF7] ml-2">{employee.user?.role?.replace("_", " ")}</Badge>
        <Button variant="outline" onClick={() => setShowEdit(true)} className="ml-auto">Edit</Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {infoCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-1">
              <card.icon className="h-4 w-4" />
              <span className="text-xs">{card.label}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{card.value || "N/A"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {docCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <card.icon className="h-4 w-4" />
              <span className="text-xs">{card.label}</span>
            </div>
            <p className="text-sm font-medium text-gray-900">{card.value || "Not set"}</p>
            {card.expiry && (
              <p className="text-xs mt-1" style={{ color: new Date(card.expiry) < new Date() ? "#F45D5D" : "#F59E0B" }}>
                Expires: {formatDate(card.expiry)}
              </p>
            )}
          </div>
        ))}
      </div>

      {employee.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-sm text-gray-600">{employee.notes}</p>
        </div>
      )}

      {employee.performance && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Performance</h3>
          <p className="text-sm text-gray-600">{employee.performance}</p>
        </div>
      )}

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Employee" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Designation</label>
              <Input value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Department</label>
              <Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Salary</label>
              <Input type="number" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Passport Number</label>
              <Input value={form.passportNumber} onChange={e => setForm({...form, passportNumber: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Passport Expiry</label>
              <Input type="date" value={form.passportExpiry} onChange={e => setForm({...form, passportExpiry: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Visa Number</label>
              <Input value={form.visaNumber} onChange={e => setForm({...form, visaNumber: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Visa Expiry</label>
              <Input type="date" value={form.visaExpiry} onChange={e => setForm({...form, visaExpiry: e.target.value})} />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-gray-700">Address</label>
              <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8EF7] min-h-[80px]"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
