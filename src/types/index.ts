export interface Department {
  id: string;
  name: string;
  order: number;
}

export interface Employee {
  id: string;
  name: string;
  departmentId: string;
}

export interface AttendanceType {
  id: string;
  name: string;
  color: string;
}

export interface AttendanceRecord {
  id: string;
  departmentId: string;
  departmentName: string;
  employeeId: string;
  employeeName: string;
  type: string;
  typeName: string;
  timestamp: string;
  date: string;
}

export interface AppState {
  selectedDepartment: Department | null;
  selectedEmployee: Employee | null;
  selectedType: AttendanceType | null;
  isCompleted: boolean;
  viewMode: 'attendance' | 'history';
}