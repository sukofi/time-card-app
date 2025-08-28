import { useState, useEffect, useCallback } from 'react';
import { GoogleSheetsService } from '../services/googleSheets';

interface GoogleSheetsConfig {
  serviceAccountKey: string;
  spreadsheetId: string;
}

interface AttendanceRecord {
  departmentName: string;
  employeeName: string;
  attendanceType: string;
  timestamp: Date;
}

export function useGoogleSheets() {
  const [sheetsService, setSheetsService] = useState<GoogleSheetsService | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 設定を更新
  const updateConfig = useCallback((config: GoogleSheetsConfig | null) => {
    if (!config || !config.serviceAccountKey || !config.spreadsheetId) {
      setSheetsService(null);
      setIsConfigured(false);
      setIsConnected(false);
      setError(null);
      return;
    }

    try {
      const service = new GoogleSheetsService(config);
      setSheetsService(service);
      setIsConfigured(true);
      setError(null);
      console.log('[GoogleSheets] Configuration updated successfully');
    } catch (err: any) {
      setError(err.message || 'Google Sheets設定エラー');
      setSheetsService(null);
      setIsConfigured(false);
      setIsConnected(false);
      console.error('[GoogleSheets] Configuration error:', err);
    }
  }, []);

  // 接続テスト
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!sheetsService) {
      setIsConnected(false);
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await sheetsService.testConnection();
      setIsConnected(result);
      
      if (result) {
        console.log('[GoogleSheets] Connection test successful');
      } else {
        console.log('[GoogleSheets] Connection test failed');
      }
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || '接続テストに失敗しました';
      setError(errorMessage);
      setIsConnected(false);
      console.error('[GoogleSheets] Connection test error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [sheetsService]);

  // 打刻記録を送信
  const recordAttendance = useCallback(async (record: AttendanceRecord): Promise<boolean> => {
    if (!sheetsService) {
      console.warn('[GoogleSheets] Service not configured');
      return false;
    }

    if (!isConnected) {
      console.warn('[GoogleSheets] Not connected to Google Sheets');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sheetsService.recordAttendance(record);
      console.log('[GoogleSheets] Attendance recorded successfully:', record);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || '打刻記録の送信に失敗しました';
      setError(errorMessage);
      console.error('[GoogleSheets] Record attendance error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [sheetsService, isConnected]);

  // 未同期レコードを一括転記
  const syncUnsyncedRecords = useCallback(async (): Promise<{
    success: boolean;
    syncedCount: number;
    errorCount: number;
    errors: string[];
  }> => {
    if (!sheetsService) {
      console.warn('[GoogleSheets] Service not configured');
      return { success: false, syncedCount: 0, errorCount: 0, errors: ['Service not configured'] };
    }

    if (!isConnected) {
      console.warn('[GoogleSheets] Not connected to Google Sheets');
      return { success: false, syncedCount: 0, errorCount: 0, errors: ['Not connected to Google Sheets'] };
    }

    setIsLoading(true);
    setError(null);

    try {
      // データベースサービスから未同期レコードを取得
      const { databaseService } = await import('../services/database');
      const unsyncedRecords = await databaseService.getUnsyncedAttendanceRecords();
      
      if (unsyncedRecords.length === 0) {
        console.log('[GoogleSheets] No unsynced records found');
        return { success: true, syncedCount: 0, errorCount: 0, errors: [] };
      }

      console.log(`[GoogleSheets] Found ${unsyncedRecords.length} unsynced records`);

      let syncedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // 各レコードを順次転記
      for (const record of unsyncedRecords) {
        try {
          const success = await recordAttendance({
            departmentName: record.department_name,
            employeeName: record.employee_name,
            attendanceType: record.type_name,
            timestamp: new Date(record.timestamp)
          });

          if (success) {
            // 同期フラグを更新
            await databaseService.markAttendanceRecordSynced(record.id);
            syncedCount++;
            console.log(`[GoogleSheets] Synced record: ${record.id}`);
          } else {
            errorCount++;
            errors.push(`Failed to sync record ${record.id}`);
            console.error(`[GoogleSheets] Failed to sync record: ${record.id}`);
          }

          // 連続リクエストを避けるため少し待機
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          errorCount++;
          const errorMsg = `Error syncing record ${record.id}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`[GoogleSheets] Error syncing record ${record.id}:`, error);
        }
      }

      const result = {
        success: errorCount === 0,
        syncedCount,
        errorCount,
        errors
      };

      console.log(`[GoogleSheets] Sync completed: ${syncedCount} synced, ${errorCount} errors`);
      return result;

    } catch (err: any) {
      const errorMessage = err.message || '未同期レコードの転記に失敗しました';
      setError(errorMessage);
      console.error('[GoogleSheets] Sync unsynced records error:', err);
      return { success: false, syncedCount: 0, errorCount: 0, errors: [errorMessage] };
    } finally {
      setIsLoading(false);
    }
  }, [sheetsService, isConnected, recordAttendance]);

  // 設定が変更されたら接続テストを実行
  useEffect(() => {
    if (isConfigured && sheetsService) {
      testConnection();
    }
  }, [isConfigured, sheetsService, testConnection]);

  return {
    // 状態
    isConfigured,
    isConnected,
    isLoading,
    error,
    
    // メソッド
    updateConfig,
    testConnection,
    recordAttendance,
    syncUnsyncedRecords,
    
    // 内部サービス（必要に応じて）
    sheetsService
  };
}
