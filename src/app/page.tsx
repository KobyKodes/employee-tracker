"use client";

import { useEffect, useState, useRef } from "react";
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
  LogOut,
  Download,
  Calendar,
} from "lucide-react";
import { format, isSameDay, subDays, isAfter, isBefore } from "date-fns";
import { signOut } from "next-auth/react";

const TODAY = new Date();
const TODAY_STR = format(TODAY, "yyyy-MM-dd");
const CYCLE_DAYS = 40;
const CYCLE_START = subDays(TODAY, CYCLE_DAYS - 1);

function getCycleStats(emp: Employee) {
  const inCycle = emp.attendance.filter((a) => {
    const d = new Date(a.date);
    return (
      (isAfter(d, CYCLE_START) || isSameDay(d, CYCLE_START)) &&
      (isBefore(d, TODAY) || isSameDay(d, TODAY))
    );
  });
  const attended = inCycle.filter((a) => a.status === "ATTENDED").length;
  const noShows = inCycle.filter((a) => a.status === "NO_SHOW").length;
  return { attended, noShows };
}

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

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

  const [exportDialog, setExportDialog] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  useEffect(() => { fetchEmployees(); }, []);

  // Reset focus when search changes
  useEffect(() => { setFocusedIndex(null); }, [search]);

  // Scroll focused row into view
  useEffect(() => {
    if (focusedIndex !== null) {
      rowRefs.current[focusedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex]);

  // Register keyboard listener once; handler ref is updated every render with fresh state
  useEffect(() => {
    const handler = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  function downloadSummaryCSV(filterFn: (dateStr: string) => boolean, label: string) {
    const rows: string[][] = [["Name", "Role", "Age", "Nationality", "Phone", "Days Attended", "Days Late", "Days No Show", "Total Warnings"]];
    const sorted = [...employees].sort((a, b) => a.name.localeCompare(b.name));
    for (const emp of sorted) {
      const inRange = emp.attendance.filter(a => filterFn(a.date.slice(0, 10)));
      const attended = inRange.filter(a => a.status === "ATTENDED").length;
      const late = inRange.filter(a => a.status === "LATE").length;
      const noShow = inRange.filter(a => a.status === "NO_SHOW").length;
      rows.push([
        emp.name, emp.role, String(emp.age), emp.nationality, emp.phone,
        String(attended), String(late), String(noShow), String(emp.warnings.length),
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportToday() {
    downloadSummaryCSV((d) => d === TODAY_STR, `today-${TODAY_STR}`);
    setExportDialog(false);
  }

  function handleExportRange() {
    if (!exportFrom || !exportTo) return;
    downloadSummaryCSV((d) => d >= exportFrom && d <= exportTo, `${exportFrom}-to-${exportTo}`);
    setExportDialog(false);
  }

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      e.nationality.toLowerCase().includes(search.toLowerCase())
  );

  // Updated every render so the handler always closes over fresh state/filtered
  keyHandlerRef.current = (e: KeyboardEvent) => {
    const inInput = (e.target as HTMLElement).closest("input, textarea") !== null;

    if (attendanceTarget) {
      if (inInput) return;
      if (e.key === "1") { e.preventDefault(); setSelectedStatus("ATTENDED"); }
      else if (e.key === "2") { e.preventDefault(); setSelectedStatus("LATE"); }
      else if (e.key === "3") { e.preventDefault(); setSelectedStatus("NO_SHOW"); }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (!(selectedStatus === "LATE" && !lateTime)) handleSaveAttendance();
      }
      return;
    }

    if (inInput) return;

    if (e.key === "ArrowDown") {
      if (!filtered.length) return;
      e.preventDefault();
      setFocusedIndex(prev => Math.min((prev ?? -1) + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      if (!filtered.length) return;
      e.preventDefault();
      setFocusedIndex(prev => Math.max((prev ?? filtered.length) - 1, 0));
    } else if (e.key === "Enter" && focusedIndex !== null) {
      e.preventDefault();
      const emp = filtered[focusedIndex];
      if (emp) openAttendanceDialog({ stopPropagation: () => {} } as React.MouseEvent, emp);
    } else if (e.key === "Escape") {
      setFocusedIndex(null);
    }
  };

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
              <p className="text-xs text-white">Team management dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                    <Label className="text-white text-sm">{label}</Label>
                    <Input
                      type={type}
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white focus:border-indigo-500/50"
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
            <button
              onClick={() => setExportDialog(true)}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm px-3 py-2 rounded-lg hover:bg-white/[0.05] border border-white/10"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 text-white hover:text-white transition-colors text-sm px-3 py-2 rounded-lg hover:bg-white/[0.05]"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Employees", value: employees.length, color: "indigo" },
            { label: "Present Today", value: employees.filter((e) => getTodayRecord(e)?.status === "ATTENDED").length, color: "emerald" },
            { label: "Total Warnings", value: employees.reduce((s, e) => s + e.warnings.length, 0), color: "amber" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className={`rounded-2xl border bg-white/[0.03] p-5 ${
                color === "indigo" ? "border-indigo-500/20" : color === "amber" ? "border-amber-500/20" : "border-emerald-500/20"
              }`}
            >
              <p className="text-white text-xs uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-3xl font-bold ${color === "indigo" ? "text-indigo-400" : color === "amber" ? "text-amber-400" : "text-emerald-400"}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Today label */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
            <Input
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 bg-white/[0.04] border-white text-white placeholder:text-white h-10 rounded-xl focus:border-indigo-500/50"
            />
          </div>
          <div className="flex items-center gap-2 text-white text-sm">
            <CalendarCheck className="w-4 h-4" />
            {format(TODAY, "EEEE, MMMM d")}
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="flex items-center gap-3 text-white/25 text-xs mb-3 select-none">
          <span>↑↓ navigate</span>
          <span className="text-white/10">·</span>
          <span>Enter mark attendance</span>
          <span className="text-white/10">·</span>
          <span>Esc deselect</span>
        </div>

        {/* Employee list */}
        {loading ? (
          <div className="text-center py-20 text-white">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-7 h-7 text-white" />
            </div>
            <p className="text-white text-sm">
              {search ? "No employees match your search" : "No employees yet. Add one to get started."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Column headers */}
            <div className="flex items-center justify-between px-5 pb-1">
              <p className="text-white text-xs uppercase tracking-widest">Employee</p>
              <div className="flex items-center gap-8 pr-8">
                <p className="text-white text-xs uppercase tracking-widest">40-Day Cycle</p>
                <p className="text-white text-xs uppercase tracking-widest">Today</p>
              </div>
            </div>

            {filtered.map((emp, idx) => {
              const todayRecord = getTodayRecord(emp);
              const cfg = todayRecord ? STATUS_CONFIG[todayRecord.status] : null;
              const Icon = cfg?.icon;
              const { attended: cycleAttended, noShows } = getCycleStats(emp);
              const cyclePct = Math.round(((CYCLE_DAYS - noShows) / CYCLE_DAYS) * 100);
              const totalNoShows = emp.attendance.filter((a) => a.status === "NO_SHOW").length;
              const totalLate = emp.attendance.filter((a) => a.status === "LATE").length;
              const isFocused = focusedIndex === idx;

              return (
                <div
                  key={emp.id}
                  ref={el => { rowRefs.current[idx] = el; }}
                  onClick={() => router.push(`/employees/${emp.id}`)}
                  className={`group flex flex-col gap-3 p-4 sm:p-5 sm:flex-row sm:items-center sm:gap-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    isFocused
                      ? "border-indigo-500 bg-indigo-500/[0.08] ring-1 ring-indigo-500/40"
                      : "border-blue-900 bg-white/[0.03] hover:bg-white/[0.06] hover:border-green-500"
                  }`}
                >
                  {/* Top row: Avatar + Info + Chevron (mobile) */}
                  <div className="flex items-center gap-3 sm:gap-5 sm:flex-1 sm:min-w-0">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 text-indigo-300 font-semibold text-sm">
                      {emp.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{emp.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="flex items-center gap-1.5 text-white text-xs">
                          <Briefcase className="w-3 h-3" />{emp.role}
                        </span>
                        <span className="hidden sm:flex items-center gap-1.5 text-white text-xs">
                          <Globe className="w-3 h-3" />{emp.nationality}
                        </span>
                        <span className="hidden sm:flex items-center gap-1.5 text-white text-xs">
                          <Phone className="w-3 h-3" />{emp.phone}
                        </span>
                        {emp.warnings.length > 0 && (
                          <span className="flex items-center gap-1.5 text-amber-400 text-xs">
                            <AlertTriangle className="w-3 h-3" />
                            {emp.warnings.length} warning{emp.warnings.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {totalNoShows > 0 && (
                          <span className="hidden sm:flex items-center gap-1.5 text-red-400 text-xs">
                            <XCircle className="w-3 h-3" />
                            {totalNoShows} no show{totalNoShows > 1 ? "s" : ""}
                          </span>
                        )}
                        {totalLate > 0 && (
                          <span className="hidden sm:flex items-center gap-1.5 text-amber-300 text-xs">
                            <Clock className="w-3 h-3" />
                            {totalLate} late arrival{totalLate > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chevron — mobile only, sits at end of top row */}
                    <ChevronRight className="w-4 h-4 text-white group-hover:text-indigo-400 transition-colors flex-shrink-0 sm:hidden" />
                  </div>

                  {/* Bottom row on mobile / right section on desktop: Cycle + Attendance + Chevron */}
                  <div className="flex items-center gap-3 pl-14 sm:pl-0 sm:flex-shrink-0 sm:gap-5">
                    {/* 40-day cycle counter */}
                    <div className="flex-1 sm:flex-none sm:w-28">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-white">
                          {cycleAttended}
                          <span className="text-white font-normal"> / {CYCLE_DAYS}</span>
                        </span>
                        <span className={`text-xs font-medium ${cyclePct >= 80 ? "text-emerald-400" : cyclePct >= 50 ? "text-amber-400" : "text-red-400"}`}>
                          {cyclePct}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${cyclePct >= 80 ? "bg-emerald-400" : cyclePct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${cyclePct}%` }}
                        />
                      </div>
                    </div>

                    {/* Today's attendance */}
                    {todayRecord && cfg && Icon ? (
                      <button
                        onClick={(e) => openAttendanceDialog(e, emp)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cfg.bg} ${cfg.border} transition-all hover:opacity-80 flex-shrink-0`}
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
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-indigo-500/30 hover:bg-indigo-500/[0.07] transition-all flex-shrink-0"
                      >
                        <CalendarCheck className="w-3.5 h-3.5 text-white" />
                        <span className="text-xs text-white">Mark attendance</span>
                      </button>
                    )}

                    {/* Chevron — desktop only */}
                    <ChevronRight className="w-4 h-4 text-white group-hover:text-indigo-400 transition-colors flex-shrink-0 hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Export CSV Dialog */}
      <Dialog open={exportDialog} onOpenChange={setExportDialog}>
        <DialogContent className="bg-[#111118] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Export Attendance CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <button
              onClick={handleExportToday}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-all text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Download className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Today's data</p>
                <p className="text-xs text-white/40 mt-0.5">{format(TODAY, "MMMM d, yyyy")}</p>
              </div>
            </button>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Date range</p>
                  <p className="text-xs text-white/40">Select a start and end date</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">From</Label>
                  <Input
                    type="date"
                    value={exportFrom}
                    onChange={(e) => setExportFrom(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50 h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">To</Label>
                  <Input
                    type="date"
                    value={exportTo}
                    onChange={(e) => setExportTo(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50 h-9 text-sm"
                  />
                </div>
              </div>
              <Button
                onClick={handleExportRange}
                disabled={!exportFrom || !exportTo || exportFrom > exportTo}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-0 disabled:opacity-40"
              >
                Export Range
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                      : "border-white/10 text-white hover:border-white/20"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{cfg.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-white/25 select-none">
            1 Attended · 2 Late · 3 No Show · Enter save
          </p>

          {selectedStatus === "LATE" && (
            <div className="space-y-1.5 mt-1">
              <Label className="text-white text-xs">Arrival time</Label>
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
