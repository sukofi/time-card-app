import { Department, AttendanceType } from '../types';

export const departments: Department[] = [
  { id: 'doctor', name: '医師', order: 0 },
  { id: 'rehabilitation', name: 'リハビリ', order: 1 },
  { id: 'daycare', name: '通所介護', order: 2 },
  { id: 'care1f', name: '１階介護', order: 3 },
  { id: 'care2f', name: '２階介護', order: 4 },
  { id: 'nursing', name: '看護', order: 5 },
  { id: 'office', name: '事務', order: 6 },
  { id: 'operations', name: '業務職員', order: 7 },
  { id: 'kitchen', name: '厨房', order: 8 }
];

export const attendanceTypes: AttendanceType[] = [
  { id: 'checkin', name: '出勤', color: 'bg-green-500 hover:bg-green-600' },
  { id: 'checkout', name: '退勤', color: 'bg-red-500 hover:bg-red-600' },
  { id: 'out', name: '外出', color: 'bg-yellow-500 hover:bg-yellow-600' },
  { id: 'return', name: '戻り', color: 'bg-blue-500 hover:bg-blue-600' }
];