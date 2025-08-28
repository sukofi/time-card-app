import { useState, useEffect } from 'react';
import { databaseService } from '../services/database';
import { useGoogleSheets } from './useGoogleSheets';

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  department_id: string;
}

interface AttendanceRecord {
  id: string;
  department_id: string;
  department_name: string;
  employee_id: string;
  employee_name: string;
  type: string;
  type_name: string;
  timestamp: string;
  date: string;
}

export function useDatabase() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const { isConfigured } = useGoogleSheets(); // 一時的に無効化

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log('Initializing database...');
        await databaseService.initialize();
        setIsInitialized(true);
        setError(null);
        console.log('Database initialized successfully');
      } catch (err: any) {
        console.error('Database initialization error:', err);
        setError(err.message || 'Database initialization failed');
        // エラーが発生しても初期化完了として扱う
        setIsInitialized(true);
      }
    };

    initializeDatabase();
  }, []);

  // DB初期化後に未同期レコードを自動再送信（初回）- 無効化
  // useEffect(() => {
  //   const resendUnsyncedRecords = async () => {
  //     if (!isInitialized || !isConfigured) return;
  //     try {
  //       const unsynced = await databaseService.getUnsyncedAttendanceRecords();
  //       for (const rec of unsynced) {
  //         try {
  //           await recordAttendance(
  //             rec.department_name,
  //             rec.employee_name,
  //             rec.type_name,
  //             new Date(rec.timestamp)
  //           );
  //           await databaseService.markAttendanceRecordSynced(rec.id);
  //           console.log('[Resend] Synced attendance record:', rec.id);
  //         } catch (err) {
  //           console.error('[Resend] Failed to sync attendance record:', rec.id, err);
  //         }
  //       }
  //     } catch (err) {
  //       console.error('[Resend] Error during unsynced resend:', err);
  //     }
  //   };
  //   resendUnsyncedRecords();
  // }, [isInitialized, isConfigured]);

  // バックグラウンドで定期的に未同期レコードを自動再送信（無効化）
  // useEffect(() => {
  //   if (!isInitialized || !isConfigured) return;
  //   const interval = setInterval(() => {
  //     (async () => {
  //       try {
  //         const unsynced = await databaseService.getUnsyncedAttendanceRecords();
  //         for (const rec of unsynced) {
  //           try {
  //             await recordAttendance(
  //               rec.department_name,
  //               rec.employee_name,
  //               rec.type_name,
  //               new Date(rec.timestamp)
  //             );
  //             await databaseService.markAttendanceRecordSynced(rec.id);
  //             console.log('[BG-Resend] Synced attendance record:', rec.id);
  //           } catch (err) {
  //             console.error('[BG-Resend] Failed to sync attendance record:', rec.id, err);
  //           }
  //         }
  //       } catch (err) {
  //         console.error('[BG-Resend] Error during unsynced resend:', err);
  //       }
  //     })();
  //   }, 30000); // 30秒ごと
  //   return () => clearInterval(interval);
  // }, [isInitialized, isConfigured]);

  const getDepartments = async (): Promise<Department[]> => {
    try {
      return await databaseService.getDepartments();
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  };

  const addEmployee = async (name: string, departmentId: string): Promise<Employee | null> => {
    try {
      const employee = await databaseService.addEmployee(name, departmentId);
      setError(null);
      return employee;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const getEmployeesByDepartment = async (departmentId: string): Promise<Employee[]> => {
    try {
      return await databaseService.getEmployeesByDepartment(departmentId);
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  };

  const deleteEmployee = async (employeeId: string): Promise<boolean> => {
    try {
      await databaseService.deleteEmployee(employeeId);
      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const addAttendanceRecord = async (record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord | null> => {
    try {
      const newRecord = await databaseService.addAttendanceRecord(record);
      setError(null);
      return newRecord;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const updateAttendanceRecord = async (recordId: string, timestamp: string): Promise<boolean> => {
    try {
      await databaseService.updateAttendanceRecord(recordId, timestamp);
      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const findDuplicateRecord = async (
    departmentId: string, 
    employeeId: string, 
    type: string, 
    date: string
  ): Promise<AttendanceRecord | null> => {
    try {
      return await databaseService.findDuplicateRecord(departmentId, employeeId, type, date);
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const getMonthlyAttendanceRecords = async (
    departmentId: string, 
    employeeId: string, 
    year: number, 
    month: number
  ): Promise<AttendanceRecord[]> => {
    try {
      return await databaseService.getMonthlyAttendanceRecords(departmentId, employeeId, year, month);
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  };

  const saveSetting = async (key: string, value: string): Promise<boolean> => {
    try {
      await databaseService.saveSetting(key, value);
      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const getSetting = async (key: string): Promise<string | null> => {
    try {
      return await databaseService.getSetting(key);
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  };

  const manualCleanup = async (): Promise<boolean> => {
    try {
      await databaseService.manualCleanup();
      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  };

  const getDatabaseStats = async () => {
    try {
      return await databaseService.getDatabaseStats();
    } catch (err: any) {
      setError(err.message);
      return {
        totalEmployees: 0,
        totalAttendanceRecords: 0,
        oldestRecord: null,
        newestRecord: null
      };
    }
  };

  // 打刻記録の同期フラグを更新
  const markAttendanceRecordSynced = async (recordId: string): Promise<void> => {
    try {
      await databaseService.markAttendanceRecordSynced(recordId);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return {
    isInitialized,
    error,
    getDepartments,
    addEmployee,
    getEmployeesByDepartment,
    deleteEmployee,
    addAttendanceRecord,
    updateAttendanceRecord,
    findDuplicateRecord,
    getMonthlyAttendanceRecords,
    saveSetting,
    getSetting,
    markAttendanceRecordSynced, // 追加
    getDatabaseStats
  };
}