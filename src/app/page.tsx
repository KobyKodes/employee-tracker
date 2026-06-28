"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Employee, AttendanceStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  Search,
  ChevronRight,
  AlertTriangle,
  Phone,
  Globe,
  Briefcase,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarCheck,
} from "lucide-react";
import { format, isSameDay } from "date-fns";

const TODAY = new Date();
const TODAY_STR = format(TODAY, "yyyy-MM-dd");

const STATUS_CONFIG = {
  ATTENDED: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    label: "Attended",
  },
  LATE: {
    icon: Clock,
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

function getTodayRecord(emp: Employee) {
  return emp.attendance.find((a) => isSameDay(new Date(a.date), TODAY)) ?? null;
}

export default function HomePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Add employee dialog
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", age: "", nationality: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  // Attendance dialog
  const [attendanceTarget, setAttendanceTarget] = useState<Employee | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>("ATTENDED");
  const [lateTime, setLateTime] = useState("");
  const [savingAttendance, setSavingAttendance] = useState(false);

  useEffect(() => { fetchEmployees(); }, []);

  async function fetchEmployees() {
    const res = await fetch("/api/employees");
    const data = await res.json();
    setEmployees(data);
    setLoading(false);
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, age: Number(form.age) }),
    });
    if (res.ok) {
      setAddOpen(false);
      setForm({ name: "", role: "", age: "", nationality: "", phone: "" });
      fetchEmployees();
    }
    setSubmitting(false);
  }

  function openAttendanceDialog(e: React.MouseEvent, emp: Employee) {
    e.stopPropagation();
    const today = getTodayRecord(emp);
    setSelectedStatus(today?.status ?? "ATTENDED");
    setLateTime(today?.lateTime ?? "");
    setAttendanceTarget(emp);
  }

  async function handleSaveAttendance() {
    if (!attendanceTarget) return;
    setSavingAttendance(true);
    await fetch(`/api/employees/${attendanceTarget.id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: TODAY_STR,
        status: selectedStatus,
        lateTime: selectedStatus === "LATE" ? lateTime : null,
      }),
    });
    setAttendanceTarget(null);
    setSavingAttendance(false);
    fetchEmployees();
  }

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      e.nationality.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Employee Tracker</h1>
              <p className="text-xs text-white/40">Team management dashboard</p>
            </div>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger
              render={
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 gap-2" />
              }
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </DialogTrigger>
            <DialogContent className="bg-[#111118] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">New Employee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddEmployee} className="space-y-4 mt-2">
                {[
                  { label: "Full Name", key: "name", type: "text", placeholder: "John Smith" },
                  { label: "Role", key: "role", type: "text", placeholder: "Software Engineer" },
                  { label: "Age", key: "age", type: "number", placeholder: "28" },
                  { label: "Nationality", key: "nationality", type: "text", placeholder: "American" },
                  { label: "Phone Number", key: "phone", type: "tel", placeholder: "+1 555 000 0000" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-white/70 text-sm">{label}</Label>
                    <Input
                      type={type}
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-indigo-500/50"
                    />
                  </div>
                ))}
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                >
                  {submitting ? "Adding..." : "Add Employee"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Employees", value: employees.length, color: "indigo" },
            { label: "Total Warnings", value: employees.reduce((s, e) => s + e.warnings.length, 0), color: "amber" },
            { label: "Present Today", value: employees.filter((e) => getTodayRecord(e)?.status === "ATTENDED").length, color: "emerald" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className={`rounded-2xl border bg-white/[0.03] p-5 ${
                color === "indigo" ? "border-indigo-500/20" : color === "amber" ? "border-amber-500/20" : "border-emerald-500/20"
              }`}
            >
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color === "indigo" ? "text-indigo-400" : color === "amber" ? "text-amber-400" : "text-emerald-400"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Today label */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 h-10 rounded-xl focus:border-indigo-500/50"
            />
          </div>
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <CalendarCheck className="w-4 h-4" />
            {format(TODAY, "EEEE, MMMM d")}
          </div>
        </div>

        {/* Employee list */}
        {loading ? (
          <div className="text-center py-20 text-white/30">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-white/30 text-sm">
              {search ? "No employees match your search" : "No employees yet. Add one to get started."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto] gap-4 px-5 pb-1">
              <p className="text-white/25 text-xs uppercase tracking-widest">Employee</p>
              <p className="text-white/25 text-xs uppercase tracking-widest text-right pr-8">Today's Attendance</p>
            </div>

            {filtered.map((emp) => {
              const todayRecord = getTodayRecord(emp);
              const cfg = todayRecord ? STATUS_CONFIG[todayRecord.status] : null;
              const Icon = cfg?.icon;

              return (
                <div
                  key={emp.id}
                  onClick={() => router.push(`/employees/${emp.id}`)}
                  className="group flex items-center gap-5 p-5 rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-indigo-500/30 cursor-pointer transition-all duration-200"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-300 font-semibold text-sm">
                    {emp.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{emp.name}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1.5 text-white/40 text-xs">
                        <Briefcase className="w-3 h-3" />{emp.role}
                      </span>
                      <span className="flex items-center gap-1.5 text-white/40 text-xs">
                        <Globe className="w-3 h-3" />{emp.nationality}
                      </span>
                      <span className="flex items-center gap-1.5 text-white/40 text-xs">
                        <Phone className="w-3 h-3" />{emp.phone}
                      </span>
                      {emp.warnings.length > 0 && (
                        <span className="flex items-center gap-1.5 text-amber-400 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          {emp.warnings.length} warning{emp.warnings.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Today's attendance */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {todayRecord && cfg && Icon ? (
                      <button
                        onClick={(e) => openAttendanceDialog(e, emp)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cfg.bg} ${cfg.border} transition-all hover:opacity-80`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span className={`text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                          {todayRecord.status === "LATE" && todayRecord.lateTime
                            ? ` · ${todayRecord.lateTime}`
                            : ""}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => openAttendanceDialog(e, emp)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-indigo-500/30 hover:bg-indigo-500/[0.07] transition-all"
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-white/30" />
                        <span className="text-xs text-white/30">Mark attendance</span>
                      </button>
                    )}
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Attendance Dialog */}
      <Dialog
        open={!!attendanceTarget}
        onOpenChange={(open) => { if (!open) setAttendanceTarget(null); }}
      >
        <DialogContent className="bg-[#111118] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              {attendanceTarget?.name} — {format(TODAY, "MMM d, yyyy")}
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
                      : "border-white/10 text-white/40 hover:border-white/20"
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
            onClick={handleSaveAttendance}
            disabled={savingAttendance || (selectedStatus === "LATE" && !lateTime)}
            className="w-full mt-1 bg-indigo-600 hover:bg-indigo-500 text-white border-0 disabled:opacity-40"
          >
            {savingAttendance ? "Saving..." : "Save"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
