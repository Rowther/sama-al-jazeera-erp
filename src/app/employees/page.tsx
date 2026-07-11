"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Modal } from "@/components/ui/modal"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Users, Plus, Edit, Trash2, Calendar, FileText, Download } from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { toast } from "sonner"

const ROLES_LIST = [
  { value: "OWNER", label: "Owner" }, { value: "MANAGER", label: "Manager" },
  { value: "DESIGNER", label: "Designer" }, { value: "INVENTORY_MANAGER", label: "Inventory Manager" },
  { value: "ACCOUNTANT", label: "Accountant" }, { value: "HR", label: "HR" },
  { value: "LABOUR", label: "Worker" }, { value: "DRIVER", label: "Driver" },
  { value: "PRODUCTION_MANAGER", label: "Production Manager" },
]

export default function EmployeesPage() {
  const { user } = useAuthStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<any>({})
  const [confirmDelete, setConfirmDelete] = useState<{ id: string } | null>(null)
  const [editEmployee, setEditEmployee] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => api.get<any>("/employees"),
  })

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post("/employees", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); setShowAddForm(false) },
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/employees/${editEmployee.id}`, data),
    onSuccess: () => {
      toast.success("Employee updated")
      setEditEmployee(null)
      setEditForm({})
      queryClient.invalidateQueries({ queryKey: ["employees"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      toast.success("Employee deleted")
      queryClient.invalidateQueries({ queryKey: ["employees"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const employees = data?.employees || []
  const usersWithoutEmployee = data?.usersWithoutEmployee || []

  const allPeople = [
    ...employees.map((e: any) => ({ ...e, isEmployee: true })),
    ...usersWithoutEmployee.map((u: any) => ({
      id: u.id,
      isEmployee: false,
      user: u,
      employeeId: "-",
      department: "",
      salary: null,
      visaExpiry: null,
      passportExpiry: null,
      attendance: [],
    })),
  ]

  const onLeave = employees.filter((e: any) => e.attendance?.some((a: any) => a.status === "LEAVE"))
  const upcomingVisa = employees.filter((e: any) => e.visaExpiry && new Date(e.visaExpiry) < new Date(Date.now() + 90 * 86400000))
  const upcomingPassport = employees.filter((e: any) => e.passportExpiry && new Date(e.passportExpiry) < new Date(Date.now() + 90 * 86400000))

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-lg bg-[#4F8EF7] animate-pulse" /></div>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">{allPeople.length} total employees</p>
        </div>
        {user?.role === "OWNER" && (
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-1" /> Add Employee
          </Button>
        )}
      </div>

      {/* HR KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 text-[#4F8EF7] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{allPeople.length}</p>
          <p className="text-xs text-gray-500">Total Employees</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Calendar className="h-5 w-5 text-[#FFB648] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{onLeave.length}</p>
          <p className="text-xs text-gray-500">On Leave</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <FileText className="h-5 w-5 text-[#F45D5D] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{upcomingVisa.length}</p>
          <p className="text-xs text-gray-500">Visa Expiring Soon</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Download className="h-5 w-5 text-[#8B5CF6] mx-auto mb-1" />
          <p className="text-2xl font-bold text-gray-900">{upcomingPassport.length}</p>
          <p className="text-xs text-gray-500">Passport Expiring</p>
        </CardContent></Card>
      </div>

      {/* Add Employee Form */}
      {showAddForm && (
        <Card>
          <CardHeader><CardTitle>Add New Employee</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(form) }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Full Name *</label>
                  <Input required onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter name" />
                </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email {form.role !== "LABOUR" && form.role !== "DRIVER" ? "*" : ""}</label>
                    <Input type="email" required={form.role !== "LABOUR" && form.role !== "DRIVER"} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={form.role === "LABOUR" || form.role === "DRIVER" ? "Auto-generated" : "Enter email"} />
                  </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Role *</label>
                  <Select options={ROLES_LIST} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Select role" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Trade / Job Role</label>
                  <Input onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g., Carpenter, Electrician, Painter" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Department</label>
                  <Input onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Department" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <Input onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Salary</label>
                  <Input type="number" onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="Monthly salary" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Joining Date</label>
                  <Input type="date" onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Passport Expiry</label>
                  <Input type="date" onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Visa Number</label>
                  <Input onChange={(e) => setForm({ ...form, visaNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Visa Expiry</label>
                  <Input type="date" onChange={(e) => setForm({ ...form, visaExpiry: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Emirates ID</label>
                  <Input onChange={(e) => setForm({ ...form, emiratesId: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit" disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Adding..." : "Add Employee"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-4 text-gray-500 font-medium text-xs uppercase">Employee</th>
                  <th className="text-left py-4 px-4 text-gray-500 font-medium text-xs uppercase">Trade / Dept</th>
                  <th className="text-left py-4 px-4 text-gray-500 font-medium text-xs uppercase">Role</th>
                  <th className="text-left py-4 px-4 text-gray-500 font-medium text-xs uppercase">Salary</th>
                  <th className="text-left py-4 px-4 text-gray-500 font-medium text-xs uppercase">Visa Expiry</th>
                  <th className="text-left py-4 px-4 text-gray-500 font-medium text-xs uppercase">Passport Expiry</th>
                  <th className="text-left py-4 px-4 text-gray-500 font-medium text-xs uppercase">Status</th>
                  <th className="text-left py-4 px-4 text-gray-500 font-medium text-xs uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allPeople.map((emp: any) => {
                  const onLeaveNow = emp.attendance?.some((a: any) => a.status === "LEAVE")
                  return (
                    <tr key={emp.isEmployee ? emp.id : `user-${emp.user?.id}`} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.user?.name} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900">{emp.user?.name}</p>
                            <p className="text-xs text-gray-400">{emp.employeeId || "No employee record"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{emp.designation || emp.department || "-"}</td>
                      <td className="py-3 px-4"><StatusBadge status={emp.user?.role} /></td>
                      <td className="py-3 px-4 text-gray-700">{emp.salary ? formatCurrency(emp.salary) : "-"}</td>
                      <td className="py-3 px-4">
                        {emp.visaExpiry ? (
                          <span className={new Date(emp.visaExpiry) < new Date(Date.now() + 90 * 86400000) ? "text-[#F45D5D] font-medium" : "text-gray-700"}>
                            {formatDate(emp.visaExpiry)}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-3 px-4">
                        {emp.passportExpiry ? (
                          <span className={new Date(emp.passportExpiry) < new Date(Date.now() + 90 * 86400000) ? "text-[#F45D5D] font-medium" : "text-gray-700"}>
                            {formatDate(emp.passportExpiry)}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-3 px-4">
                        {onLeaveNow ? <Badge variant="warning">On Leave</Badge> : <Badge variant="success">Active</Badge>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          {(user?.role === "OWNER" || user?.role === "MANAGER") && emp.isEmployee && (
                            <Button size="sm" variant="ghost" onClick={() => { setEditEmployee(emp); setEditForm({ name: emp.user?.name, role: emp.user?.role, ...emp }) }}>
                              <Edit className="h-3.5 w-3.5 text-[#4F8EF7]" />
                            </Button>
                          )}
                          {user?.role === "OWNER" && emp.isEmployee && (
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete({ id: emp.id })}>
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {allPeople.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-sm text-gray-400">No employees found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Employee Modal */}
      <Modal open={!!editEmployee} onClose={() => { setEditEmployee(null); setEditForm({}) }} title="Edit Employee" size="md">
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(editForm) }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Select options={ROLES_LIST} value={editForm.role || ""} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Trade / Job Role</label>
              <Input value={editForm.designation || ""} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} placeholder="e.g., Carpenter, Electrician" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Department</label>
              <Input value={editForm.department || ""} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Salary</label>
              <Input type="number" value={editForm.salary || ""} onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Joining Date</label>
              <Input type="date" value={editForm.joiningDate ? editForm.joiningDate.split("T")[0] : ""} onChange={(e) => setEditForm({ ...editForm, joiningDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Passport Expiry</label>
              <Input type="date" value={editForm.passportExpiry ? editForm.passportExpiry.split("T")[0] : ""} onChange={(e) => setEditForm({ ...editForm, passportExpiry: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Visa Number</label>
              <Input value={editForm.visaNumber || ""} onChange={(e) => setEditForm({ ...editForm, visaNumber: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Visa Expiry</label>
              <Input type="date" value={editForm.visaExpiry ? editForm.visaExpiry.split("T")[0] : ""} onChange={(e) => setEditForm({ ...editForm, visaExpiry: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => { setEditEmployee(null); setEditForm({}) }}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) deleteMutation.mutate(confirmDelete.id); setConfirmDelete(null) }}
        title="Delete Employee"
        description="Delete this employee? This will also delete their user account."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
