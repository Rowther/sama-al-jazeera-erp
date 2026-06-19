"use client"

import { useState, useEffect } from "react"
import { useAuthStore } from "@/stores/authStore"
import { useTutorialStore } from "@/stores/tutorialStore"
import { getTutorialById } from "@/components/tutorial/tutorialConfig"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Settings, User, Shield, Bell, Palette, LogOut, HelpCircle, RotateCcw, Play, EyeOff, Loader2, Check, X } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuthStore()
  const { tutorialsEnabled, setTutorialsEnabled, resetTutorials, startTutorial } = useTutorialStore()

  const [editing, setEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
      setPhone(user.phone || "")
    }
  }, [user])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      await updateUser({ name, email, phone })
      toast.success("Profile updated successfully")
      setEditing(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleCancelEdit = () => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
      setPhone(user.phone || "")
    }
    setEditing(false)
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in both password fields")
      return
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters")
      return
    }
    setSavingPassword(true)
    try {
      await api.put("/auth/password", { currentPassword, newPassword })
      toast.success("Password updated successfully")
      setCurrentPassword("")
      setNewPassword("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name} size="lg" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{user?.name}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <Badge variant="primary" className="mt-1">{user?.role?.replace("_", " ")}</Badge>
            </div>
            <Button variant="outline" onClick={() => setEditing(!editing)}>
              {editing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={!editing}
                className={!editing ? "opacity-60" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!editing}
                className={!editing ? "opacity-60" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                readOnly={!editing}
                placeholder="Add phone number"
                className={!editing ? "opacity-60" : ""}
              />
            </div>
            {editing && (
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="flex items-center gap-1.5">
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancelEdit} className="flex items-center gap-1.5">
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Security</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Current Password</label>
              <Input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button
              onClick={handleUpdatePassword}
              disabled={savingPassword}
              className="flex items-center gap-1.5"
            >
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Update Password
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4" /> Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Theme</p>
              <p className="text-xs text-gray-400">Light mode is currently active</p>
            </div>
            <Badge variant="primary">Light</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Tutorial & Onboarding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#EEF4FF]">
                <HelpCircle className="h-5 w-5 text-[#4F8EF7]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Interactive Tutorials</p>
                <p className="text-xs text-gray-400">Show guided walkthroughs when visiting pages</p>
              </div>
            </div>
            <button
              onClick={() => setTutorialsEnabled(!tutorialsEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                tutorialsEnabled ? "bg-[#4F8EF7]" : "bg-gray-200"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  tutorialsEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetTutorials()}
              className="flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restart All Tutorials
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTutorialsEnabled(false)}
              className="flex items-center gap-1.5"
            >
              <EyeOff className="h-3.5 w-3.5" /> Disable Tutorials
            </Button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Available Tutorials</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { id: "owner-dashboard", label: "Owner Dashboard" },
                { id: "manager-dashboard", label: "Manager Dashboard" },
                { id: "designer-dashboard", label: "Designer Dashboard" },
                { id: "inventory-dashboard", label: "Inventory Dashboard" },
                { id: "accountant-dashboard", label: "Accountant Dashboard" },
                { id: "production-dashboard", label: "Production Dashboard" },
                { id: "factory-dashboard", label: "Factory Operations" },
                { id: "work-orders-page", label: "Work Orders Page" },
                { id: "inventory-page", label: "Inventory Page" },
                { id: "schedule-page", label: "Schedule Page" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    const tutorial = getTutorialById(t.id)
                    if (tutorial) startTutorial(tutorial)
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-[#4F8EF7] hover:bg-[#EEF4FF] rounded-lg transition-colors text-left"
                >
                  <Play className="h-3 w-3" /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <LogOut className="h-5 w-5 text-[#F45D5D]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Sign Out</p>
                <p className="text-xs text-gray-400">Sign out of your account</p>
              </div>
            </div>
            <Button variant="destructive" onClick={logout}>Sign Out</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
