"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Employee, AttendanceStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isFuture,
} from "date-fns";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Phone,
  Globe,
  Briefcase,
  Calendar,
  User,
  Save,
  X,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";

const CALENDAR_CELL_CONFIG = {
  ATTENDED: { bg: "bg-emerald-500/70", border: "border-emerald-400", color: "text-emerald-100" },
  LATE: { bg: "bg-yellow-400/60", border: "border-yellow-400", color: "text-yellow-100" },
  NO_SHOW: { bg: "bg-red-500/70", border: "border-red-400", color: "text-red-100" },
};

const STATUS_CONFIG = {
  ATTENDED: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    label: "Attended",
  },
  LATE: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    label: "Late",
  },
  NO_SHOW: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    label: "No Show",
  },
};

export default function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "",
    age: "",
    nationality: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [attendanceDialog, setAttendanceDialog] = useState<{
    open: boolean;
    date: Date | null;
  }>({ open: false, date: null });
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>("ATTENDED");
  const [lateTime, setLateTime] = useState("");

  const [warningDialog, setWarningDialog] = useState(false);
  const [warningText, setWarningText] = useState("");
  const [deleteDialog, setDeleteDialog] = useState(false);

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  async function fetchEmployee() {
    const res = await fetch(`/api/employees/${id}`);
    if (!res.ok) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setEmployee(data);
    setEditForm({
      name: data.name,
      role: data.role,
      age: String(data.age),
      nationality: data.nationality,
      phone: data.phone,
    });
    setLoading(false);
  }

  async function handleSaveEdit() {
    setSaving(true);
    await fetch(`/api/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, age: Number(editForm.age) }),
    });
    await fetchEmployee();
    setEditing(false);
    setSaving(false);
  }

  async function handleDelete() {
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    router.push("/");
  }

  async function handleAttendance() {
    if (!attendanceDialog.date) return;
    await fetch(`/api/employees/${id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: format(attendanceDialog.date, "yyyy-MM-dd"),
        status: selectedStatus,
        lateTime: selectedStatus === "LATE" ? lateTime : null,
      }),
    });
    setAttendanceDialog({ open: false, date: null });
    fetchEmployee();
  }

  async function handleAddWarning() {
    if (!warningText.trim()) return;
    await fetch(`/api/employees/${id}/warnings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: warningText.trim() }),
    });
    setWarningText("");
    setWarningDialog(false);
    fetchEmployee();
  }

  async function handleDeleteWarning(warningId: string) {
    await fetch(`/api/employees/${id}/warnings`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warningId }),
    });
    fetchEmployee();
  }

  function getAttendanceForDate(date: Date) {
    if (!employee) return null;
    return employee.attendance.find((a) =>
      isSameDay(new Date(a.date), date)
    ) ?? null;
  }

  function openAttendanceDialog(date: Date) {
    if (isFuture(date) && !isToday(date)) return;
    const existing = getAttendanceForDate(date);
    setSelectedStatus(existing ? existing.status : "ATTENDED");
    setLateTime(existing?.lateTime ?? "");
    setAttendanceDialog({ open: true, date });
  }

  // Build calendar days
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart); // 0=Sun

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/30">
        Loading...
      </div>
    );
  }

  if (!employee) return null;

  const attendanceCounts = {
    ATTENDED: employee.attendance.filter((a) => a.status === "ATTENDED").length,
    LATE: employee.attendance.filter((a) => a.status === "LATE").length,
    NO_SHOW: employee.attendance.filter((a) => a.status === "NO_SHOW").length,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            All Employees
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-white hover:text-white/70 transition-colors text-sm px-3 py-2 rounded-lg hover:bg-white/[0.05]"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
            {editing ? (
              <>
                <Button
                  onClick={() => setEditing(false)}
                  variant="ghost"
                  size="sm"
                  className="text-white/50 hover:text-white gap-1.5"
                >
                  <X className="w-4 h-4" /> Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="text-white/50 hover:text-white gap-1.5 border border-white/10"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </Button>
                <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
                  <DialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400/70 hover:text-red-400 gap-1.5 border border-white/10"
                      />
                    }
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </DialogTrigger>
                  <DialogContent className="bg-[#111118] border-white/10 text-white">
                    <DialogHeader>
                      <DialogTitle className="text-white">Delete Employee</DialogTitle>
                    </DialogHeader>
                    <p className="text-white/50 text-sm mt-2">
                      Are you sure you want to delete <strong className="text-white">{employee.name}</strong>? This action cannot be undone.
                    </p>
                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={() => setDeleteDialog(false)}
                        variant="ghost"
                        className="flex-1 border border-white/10 text-white/50 hover:text-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDelete}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white border-0"
                      >
                        Delete
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Profile card */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xl flex-shrink-0">
              {employee.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", key: "name", type: "text" },
                    { label: "Role", key: "role", type: "text" },
                    { label: "Age", key: "age", type: "number" },
                    { label: "Nationality", key: "nationality", type: "text" },
                    { label: "Phone", key: "phone", type: "tel" },
                  ].map(({ label, key, type }) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-white/50 text-xs">{label}</Label>
                      <Input
                        type={type}
                        value={editForm[key as keyof typeof editForm]}
                        onChange={(e) =>
                          setEditForm({ ...editForm, [key]: e.target.value })
                        }
                        className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50 h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight">{employee.name}</h2>
                  <div className="flex flex-wrap items-center gap-5 mt-3">
                    {[
                      { icon: Briefcase, value: employee.role },
                      { icon: User, value: `${employee.age} years old` },
                      { icon: Globe, value: employee.nationality },
                      { icon: Phone, value: employee.phone },
                      {
                        icon: Calendar,
                        value: `Joined ${format(new Date(employee.createdAt), "MMM d, yyyy")}`,
                      },
                    ].map(({ icon: Icon, value }) => (
                      <span key={value} className="flex items-center gap-2 text-yellow-300/80 text-sm">
                        <Icon className="w-3.5 h-3.5" />
                        {value}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Attendance stats */}
        <div className="grid grid-cols-3 gap-4">
          {(["ATTENDED", "LATE", "NO_SHOW"] as AttendanceStatus[]).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const Icon = cfg.icon;
            return (
              <div
                key={status}
                className={`rounded-2xl border ${cfg.border} bg-white/[0.03] p-4 flex items-center gap-3`}
              >
                <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div>
                  <p className="text-white text-xs">{cfg.label}</p>
                  <p className={`text-2xl font-bold ${cfg.color}`}>
                    {attendanceCounts[status]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Attendance Calendar */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold">Attendance Calendar</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium w-32 text-center">
                {format(calendarMonth, "MMMM yyyy")}
              </span>
              <button
                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-white text-xs py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map((day) => {
              const record = getAttendanceForDate(day);
              const future = isFuture(day) && !isToday(day);
              const today = isToday(day);

              let cellClass =
                "relative aspect-square rounded-xl flex items-center justify-center transition-all duration-150 ";

              if (future) {
                cellClass += "cursor-default opacity-30";
              } else if (record) {
                const calCfg = CALENDAR_CELL_CONFIG[record.status];
                cellClass += `cursor-pointer ${calCfg.bg} border ${calCfg.border} hover:opacity-80`;
              } else {
                cellClass +=
                  "cursor-pointer border border-blue-900 hover:border-green-500 hover:bg-white/[0.04]";
              }

              if (today) cellClass += " ring-1 ring-indigo-500/50";

              const cfg = record ? STATUS_CONFIG[record.status] : null;
              const calCfg = record ? CALENDAR_CELL_CONFIG[record.status] : null;
              const Icon = cfg ? cfg.icon : null;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => !future && openAttendanceDialog(day)}
                  className={cellClass}
                  title={record ? cfg!.label : "Click to log attendance"}
                >
                  <span
                    className={`text-xs font-medium ${
                      record ? calCfg!.color : today ? "text-indigo-400" : "text-white"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  {Icon && (
                    <Icon
                      className={`absolute bottom-0.5 right-0.5 w-2.5 h-2.5 ${calCfg!.color}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/[0.07]">
            {(["ATTENDED", "LATE", "NO_SHOW"] as AttendanceStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <span key={s} className={`flex items-center gap-1.5 text-xs ${cfg.color}`}>
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </span>
              );
            })}
            <span className="text-xs text-white ml-auto">Click a day to log attendance</span>
          </div>
        </div>

        {/* Warnings */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold">
              Warnings
              {employee.warnings.length > 0 && (
                <span className="ml-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5 text-xs font-medium">
                  {employee.warnings.length}
                </span>
              )}
            </h3>
            <Dialog open={warningDialog} onOpenChange={setWarningDialog}>
              <DialogTrigger
                render={
                  <Button
                    size="sm"
                    className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/20 gap-1.5"
                  />
                }
              >
                <Plus className="w-3.5 h-3.5" />
                Add Warning
              </DialogTrigger>
              <DialogContent className="bg-[#111118] border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Warning</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <Label className="text-white/70 text-sm">Description</Label>
                  <Textarea
                    placeholder="Describe the reason for this warning..."
                    value={warningText}
                    onChange={(e) => setWarningText(e.target.value)}
                    rows={4}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-amber-500/50 resize-none"
                  />
                  <Button
                    onClick={handleAddWarning}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white border-0"
                  >
                    Add Warning
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {employee.warnings.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-6">No warnings issued.</p>
          ) : (
            <div className="space-y-3">
              {employee.warnings.map((w) => (
                <div
                  key={w.id}
                  className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.05]"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 leading-relaxed">{w.description}</p>
                    <p className="text-xs text-yellow-300/80 mt-1">
                      {format(new Date(w.createdAt), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteWarning(w.id)}
                    className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Attendance Dialog */}
      <Dialog
        open={attendanceDialog.open}
        onOpenChange={(open) => setAttendanceDialog({ open, date: attendanceDialog.date })}
      >
        <DialogContent className="bg-[#111118] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              {attendanceDialog.date
                ? format(attendanceDialog.date, "EEEE, MMMM d, yyyy")
                : "Log Attendance"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {(["ATTENDED", "LATE", "NO_SHOW"] as AttendanceStatus[]).map((status) => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const active = selectedStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                    active
                      ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                      : "border-white/10 text-white hover:border-white/20"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{cfg.label}</span>
                </button>
              );
            })}
          </div>
          {selectedStatus === "LATE" && (
            <div className="space-y-1.5 mt-1">
              <Label className="text-white/50 text-xs">Arrival time</Label>
              <Input
                type="time"
                value={lateTime}
                onChange={(e) => setLateTime(e.target.value)}
                className="bg-white/5 border-white/10 text-white focus:border-amber-500/50 h-9"
              />
            </div>
          )}
          <Button
            onClick={handleAttendance}
            disabled={selectedStatus === "LATE" && !lateTime}
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white border-0 disabled:opacity-40"
          >
            Save
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
