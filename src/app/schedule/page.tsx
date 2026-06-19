"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { formatDate, formatDateTime } from "@/lib/utils"
import { useAuthStore } from "@/stores/authStore"
import { useRouter } from "next/navigation"
import {
  Calendar, Clock, Users, AlertTriangle, ChevronLeft, ChevronRight,
  UserPlus, Trash2, Sun, Moon, Sunset, Plus, LayoutGrid, List,
  BarChart3, ArrowRight, Play
} from "lucide-react"

const SHIFTS = [
  { value: "DAY", label: "Day Shift (6:00-14:00)", icon: Sun },
  { value: "AFTERNOON", label: "Afternoon (14:00-22:00)", icon: Sunset },
  { value: "NIGHT", label: "Night Shift (22:00-6:00)", icon: Moon },
]

const VIEW_TABS = [
  { value: "day", label: "Daily", icon: Calendar },
  { value: "week", label: "Weekly", icon: List },
  { value: "timeline", label: "Timeline", icon: BarChart3 },
  { value: "utilization", label: "Utilization", icon: Users },
]

export default function SchedulePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [view, setView] = useState("day")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState("")

  const [newEvent, setNewEvent] = useState({
    workOrderId: "", workerId: "", stageName: "", shiftLabel: "DAY",
    startTime: "", endTime: "", isOvertime: false, notes: "",
  })

  const dateStr = currentDate.toISOString().split("T")[0]

  const { data, isLoading } = useQuery({
    queryKey: ["schedule", view, dateStr, selectedWorker],
    queryFn: () => api.get<any>(`/schedule?view=${view}&date=${dateStr}${selectedWorker ? `&workerId=${selectedWorker}` : ""}`),
    refetchInterval: 30000,
  })

  const { data: workOrdersData } = useQuery({
    queryKey: ["work-orders-schedule"],
    queryFn: () => api.get<any>("/work-orders?limit=100"),
  })

  const { data: stagesData } = useQuery({
    queryKey: ["production-stages-schedule"],
    queryFn: () => api.get<any>(`/work-orders/${newEvent.workOrderId}/stages`),
    enabled: !!newEvent.workOrderId,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/schedule", data),
    onSuccess: () => {
      toast.success("Event scheduled")
      setShowCreateModal(false)
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/schedule?id=${id}`),
    onSuccess: () => {
      toast.success("Event removed")
      queryClient.invalidateQueries({ queryKey: ["schedule"] })
    },
    onError: (err: any) => toast.error(err.message),
  })

  const events = data?.events || []
  const workers = data?.workers || []
  const conflicts = data?.conflicts || []
  const workOrders = workOrdersData?.workOrders || []
  const availableStages = stagesData?.stages || []

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate)
    if (view === "day") newDate.setDate(newDate.getDate() + direction)
    else if (view === "week") newDate.setDate(newDate.getDate() + direction * 7)
    setCurrentDate(newDate)
  }

  const todayStr = formatDate(currentDate)
  const weekStr = view === "week" ? `Week of ${formatDate(currentDate)}` : ""

  const sortedEvents = useMemo(() => {
    return [...events].sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [events])

  const workerUtilization = useMemo(() => {
    const map: Record<string, number> = {}
    for (const evt of events) {
      if (!map[evt.workerId]) map[evt.workerId] = 0
      const start = new Date(evt.startTime)
      const end = evt.endTime ? new Date(evt.endTime) : new Date(start.getTime() + 8 * 3600000)
      map[evt.workerId] += (end.getTime() - start.getTime()) / 3600000
    }
    return map
  }, [events])

  const canManage = user?.role === "OWNER" || user?.role === "MANAGER" || user?.role === "PRODUCTION_MANAGER"

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>You do not have access to the Schedule page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-[#4F8EF7]" /> Schedule
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {todayStr}{weekStr ? ` • ${weekStr}` : ""}
            {conflicts.length > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                ⚠ {conflicts.length} scheduling conflict{conflicts.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" /> Schedule Worker
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {VIEW_TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.value}
              onClick={() => setView(tab.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === tab.value ? "bg-white shadow-sm text-[#4F8EF7]" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Worker Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Filter by worker:</span>
        <Select
          options={[{ value: "", label: "All Workers" }, ...workers.map((w: any) => ({ value: w.id, label: `${w.name} (${w.role})` }))]}
          value={selectedWorker}
          onChange={(e) => setSelectedWorker(e.target.value)}
          placeholder="All Workers"
          className="w-56"
        />
      </div>

      {/* Conflict Alerts */}
      {conflicts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-red-700">Scheduling Conflicts Detected</span>
            </div>
            <div className="space-y-1">
              {conflicts.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-red-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  <span className="font-medium">{c.workerName}</span>
                  <span>overlaps between</span>
                  <span className="font-medium">{c.eventA?.workOrderId}</span>
                  <span>and</span>
                  <span className="font-medium">{c.eventB?.workOrderId}</span>
                  <span className="text-red-400">({formatDateTime(c.eventA?.time)})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Cards by View */}
      {view === "day" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-[#4F8EF7]" /> {todayStr}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedEvents.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No scheduled events for today</p>
                </div>
              )}
              {sortedEvents.map((evt: any) => (
                <div key={evt.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all group">
                  <div className={`p-2 rounded-lg ${
                    evt.shiftLabel === "NIGHT" ? "bg-indigo-100 text-indigo-600" :
                    evt.shiftLabel === "AFTERNOON" ? "bg-amber-100 text-amber-600" :
                    "bg-[#EEF4FF] text-[#4F8EF7]"
                  }`}>
                    {evt.shiftLabel === "NIGHT" ? <Moon className="h-4 w-4" /> :
                     evt.shiftLabel === "AFTERNOON" ? <Sunset className="h-4 w-4" /> :
                     <Sun className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{evt.worker?.name}</span>
                      <Badge variant={evt.isOvertime ? "warning" : "default"}>{evt.worker?.role || "Worker"}</Badge>
                      {evt.isOvertime && <Badge variant="warning">Overtime</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {evt.workOrder?.workOrderId} • {evt.stageName}
                      {evt.shiftLabel && ` • ${evt.shiftLabel} Shift`}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                      <span>{formatDateTime(evt.startTime)}</span>
                      {evt.endTime && <><ArrowRight className="h-3 w-3" /><span>{formatDateTime(evt.endTime)}</span></>}
                    </div>
                    {evt.notes && <p className="text-[10px] text-gray-400 mt-1 italic">{evt.notes}</p>}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="ghost" className="h-7 text-red-400" onClick={() => deleteMutation.mutate(evt.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "week" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-[10px] text-gray-500 uppercase">Worker</th>
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                      const d = new Date(currentDate)
                      const dayOfWeek = d.getDay()
                      const monday = new Date(d)
                      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
                      const dayDate = new Date(monday)
                      dayDate.setDate(monday.getDate() + i)
                      const isToday = dayDate.toDateString() === new Date().toDateString()
                      return (
                        <th key={day} className={`py-2 px-2 text-[10px] text-center ${isToday ? "text-[#4F8EF7]" : "text-gray-500"}`}>
                          {day}<br />
                          <span className={`text-[9px] ${isToday ? "font-bold" : ""}`}>{dayDate.getDate()}</span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {workers.map((w: any) => {
                    const workerEvents = events.filter((e: any) => e.workerId === w.id)
                    return (
                      <tr key={w.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium text-xs text-gray-900">{w.name}</td>
                        {[0,1,2,3,4,5,6].map((dayIdx) => {
                          const d = new Date(currentDate)
                          const dayOfWeek = d.getDay()
                          const monday = new Date(d)
                          monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
                          const dayDate = new Date(monday)
                          dayDate.setDate(monday.getDate() + dayIdx)
                          const dayStr = dayDate.toDateString()
                          const dayEvents = workerEvents.filter((e: any) =>
                            new Date(e.startTime).toDateString() === dayStr
                          )
                          return (
                            <td key={dayIdx} className="py-2 px-1 text-center align-top">
                              {dayEvents.length > 0 ? (
                                <div className="space-y-1">
                                  {dayEvents.map((evt: any) => (
                                    <div
                                      key={evt.id}
                                      className={`text-[8px] px-1 py-0.5 rounded cursor-pointer ${
                                        evt.shiftLabel === "NIGHT" ? "bg-indigo-100 text-indigo-700" :
                                        evt.isOvertime ? "bg-amber-100 text-amber-700" :
                                        "bg-[#EEF4FF] text-[#4F8EF7]"
                                      }`}
                                      onClick={() => router.push(`/work-orders/${evt.workOrder?.id}`)}
                                    >
                                      {evt.workOrder?.workOrderId}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[8px] text-gray-300">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {view === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Timeline View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workers.map((w: any) => {
                const workerEvents = sortedEvents.filter((e: any) => e.workerId === w.id)
                if (workerEvents.length === 0) return null
                return (
                  <div key={w.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-[#4F8EF7]/10 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-[#4F8EF7]">
                          {w.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">{w.name}</span>
                      <Badge variant="default">{w.role}</Badge>
                      <span className="text-[10px] text-gray-400">{workerEvents.length} event(s)</span>
                    </div>
                    <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                      {workerEvents.map((evt: any) => {
                        const startH = new Date(evt.startTime).getHours() + new Date(evt.startTime).getMinutes() / 60
                        const endH = evt.endTime
                          ? new Date(evt.endTime).getHours() + new Date(evt.endTime).getMinutes() / 60
                          : startH + 8
                        const left = (startH / 24) * 100
                        const width = ((endH - startH) / 24) * 100
                        return (
                          <div
                            key={evt.id}
                            className="absolute top-0.5 bottom-0.5 rounded-md text-[8px] font-medium flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80"
                            style={{
                              left: `${left}%`,
                              width: `${Math.max(width, 3)}%`,
                              background: evt.shiftLabel === "NIGHT" ? "#818cf8" :
                                evt.isOvertime ? "#fbbf24" : "#4F8EF7",
                              color: "white",
                            }}
                            onClick={() => router.push(`/work-orders/${evt.workOrder?.id}`)}
                            title={`${evt.workOrder?.workOrderId} - ${evt.stageName}`}
                          >
                            {width > 8 && `${evt.workOrder?.workOrderId?.slice(-4)}`}
                          </div>
                        )
                      })}
                    </div>
                    {/* Hour markers */}
                    <div className="flex text-[8px] text-gray-300 mt-0.5">
                      {[0,6,12,18,24].map(h => (
                        <span key={h} className="flex-1">{h}:00</span>
                      ))}
                    </div>
                  </div>
                )
              })}
              {workers.length === 0 && (
                <div className="text-center py-8 text-gray-400">No workers available</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "utilization" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Worker Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workers.map((w: any) => {
                const hours = workerUtilization[w.id] || 0
                const pct = Math.min((hours / 8) * 100, 100)
                const isOverloaded = hours > 8
                return (
                  <div key={w.id} className="flex items-center gap-3">
                    <div className="w-32 shrink-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{w.name}</p>
                      <p className="text-[10px] text-gray-400">{w.role}</p>
                    </div>
                    <div className="flex-1">
                      <div className={`h-4 rounded-full ${isOverloaded ? "bg-red-100" : "bg-gray-100"}`}>
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOverloaded ? "bg-red-500" :
                            pct > 80 ? "bg-amber-500" :
                            pct > 50 ? "bg-[#4F8EF7]" :
                            "bg-green-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-right">
                      <span className={`text-xs font-semibold ${isOverloaded ? "text-red-600" : "text-gray-600"}`}>
                        {hours.toFixed(1)}h
                      </span>
                      {isOverloaded && (
                        <span className="text-[9px] text-red-500 ml-1">Overloaded!</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Event Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Schedule Worker" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Work Order *</label>
              <Select
                options={workOrders.map((wo: any) => ({ value: wo.id, label: `${wo.workOrderId} - ${wo.customer?.name}` }))}
                value={newEvent.workOrderId}
                onChange={(e) => setNewEvent({ ...newEvent, workOrderId: e.target.value })}
                placeholder="Select work order"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Worker *</label>
              <Select
                options={workers.map((w: any) => ({ value: w.id, label: `${w.name} (${w.role})` }))}
                value={newEvent.workerId}
                onChange={(e) => setNewEvent({ ...newEvent, workerId: e.target.value })}
                placeholder="Select worker"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Production Stage <span className="text-gray-400">(optional)</span></label>
              {availableStages.length === 0 && newEvent.workOrderId ? (
                <p className="text-xs text-amber-500 italic">No stages initialized for this work order. Add one in the work order detail.</p>
              ) : null}
              <Select
                options={availableStages.map((s: any) => ({ value: s.stageName, label: s.stageName }))}
                value={newEvent.stageName}
                onChange={(e) => setNewEvent({ ...newEvent, stageName: e.target.value })}
                placeholder={newEvent.workOrderId ? "Select stage" : "Select a work order first"}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Shift</label>
              <Select
                options={SHIFTS.map((s) => ({ value: s.value, label: s.label }))}
                value={newEvent.shiftLabel}
                onChange={(e) => setNewEvent({ ...newEvent, shiftLabel: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">Start Time *</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">End Time</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="overtime"
              checked={newEvent.isOvertime}
              onChange={(e) => setNewEvent({ ...newEvent, isOvertime: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="overtime" className="text-xs text-gray-600">Overtime</label>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Notes</label>
            <input
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={newEvent.notes}
              onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
              placeholder="Any notes..."
            />
          </div>
          <Button
            className="w-full"
            onClick={() => {
              if (!newEvent.workOrderId || !newEvent.workerId || !newEvent.startTime) {
                toast.error("Please fill in required fields")
                return
              }
              createMutation.mutate(newEvent)
              setNewEvent({ workOrderId: "", workerId: "", stageName: "", shiftLabel: "DAY", startTime: "", endTime: "", isOvertime: false, notes: "" })
            }}
            disabled={createMutation.isPending}
          >
            <UserPlus className="h-4 w-4 mr-1" /> Schedule Worker
          </Button>
        </div>
      </Modal>
    </div>
  )
}
