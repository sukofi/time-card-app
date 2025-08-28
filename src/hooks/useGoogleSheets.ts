import { useState, useEffect } from 'react';
import { GoogleSheetsService } from '../services/googleSheets';

interface GoogleSheetsConfig {
  serviceAccountKey: string;
  spreadsheetId: string;
}

export function useGoogleSheets(config?: GoogleSheetsConfig) {
  const [sheetsService, setSheetsService] = useState<GoogleSheetsService | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config?.serviceAccountKey && config?.spreadsheetId && 
        config.serviceAccountKey.trim() !== '' && config.spreadsheetId.trim() !== '') {
      try {
        // サービスアカウントキーのJSONフォーマットをチェック
        const keyData = JSON.parse(config.serviceAccountKey);
        if (!keyData.private_key || !keyData.client_email) {
          throw new Error('Invalid service account key format');
        }
        
        const service = new GoogleSheetsService(config);
        setSheetsService(service);
        setIsConfigured(true);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Google Sheets設定エラー');
        setSheetsService(null);
        setIsConfigured(false);
      }
    } else {
      setSheetsService(null);
      setIsConfigured(false);
      setError(null);
    }
  }, [config]);

  const recordAttendance = async (
    departmentName: string,
    employeeName: string,
    attendanceType: string,
    timestamp: Date
  ) => {
    if (!sheetsService) {
      throw new Error('Google Sheets service not configured');
    }

    try {
      console.log('[GoogleSheets] recordAttendance start', { departmentName, employeeName, attendanceType, timestamp });
      // 連続リクエストの制御
      await new Promise(resolve => setTimeout(resolve, 300));
      await sheetsService.recordAttendance(departmentName, employeeName, attendanceType, timestamp);
      setError(null);
      console.log('[GoogleSheets] recordAttendance success', { departmentName, employeeName, attendanceType, timestamp });
    } catch (err: any) {
      const errorMessage = (err && err.message) ? err.message : JSON.stringify(err);
      setError(errorMessage);
      console.error('[GoogleSheets] recordAttendance error', errorMessage, err);
      throw new Error(errorMessage);
    }
  };

  const initializeDepartmentSheet = async (departmentName: string, employees: string[]) => {
    if (!sheetsService) {
      throw new Error('Google Sheets service not configured');
    }

    try {
      await sheetsService.initializeDepartmentSheet(departmentName, employees);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.message || '部署シートの初期化に失敗しました';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getDepartmentEmployees = async (departmentName: string): Promise<string[]> => {
    if (!sheetsService) {
      return [];
    }

    try {
      const employees = await sheetsService.getDepartmentEmployees(departmentName);
      setError(null);
      return employees;
    } catch (err: any) {
      const errorMessage = err.message || '職員データの取得に失敗しました';
      setError(errorMessage);
      return [];
    }
  };

  const testConnection = async (): Promise<boolean> => {
    if (!sheetsService) {
      return false;
    }

    try {
      const result = await sheetsService.testConnection();
      if (result) {
        setError(null);
      }
      return result;
    } catch (err: any) {
      const errorMessage = err.message || '接続テストに失敗しました';
      setError(errorMessage);
      return false;
    }
  };

  const addEmployeeToSheet = async (departmentName: string, employeeName: string): Promise<void> => {
    if (!sheetsService) {
      throw new Error('Google Sheets service not configured');
    }

    try {
      await sheetsService.addEmployeeToSheet(departmentName, employeeName);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.message || '職員の追加に失敗しました';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  return {
    sheetsService,
    isConfigured,
    error,
    recordAttendance,
    initializeDepartmentSheet,
    getDepartmentEmployees,
    testConnection,
    addEmployeeToSheet
  };
}