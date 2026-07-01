export type AttendanceStatus = "ATTENDED" | "LATE" | "NO_SHOW";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  status: AttendanceStatus;
  lateTime?: string | null;
}

export interface Warning {
  id: string;
  employeeId: string;
  description: string;
  createdAt: string;
}

export interface Note {
  id: string;
  employeeId: string;
  content: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  age: number;
  nationality: string;
  phone: string;
  createdAt: string;
  attendance: AttendanceRecord[];
  warnings: Warning[];
  notes: Note[];
}
