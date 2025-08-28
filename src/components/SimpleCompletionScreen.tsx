import React, { useEffect, useState } from 'react';
import { CheckCircle2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useDatabase } from '../hooks/useDatabase';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { useNavigate } from 'react-router-dom';

export function SimpleCompletionScreen() {
  const { state, reset } = useApp();
  const { addAttendanceRecord, getSetting } = useDatabase();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [isProcessing, setIsProcessing] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string>('');
  const [googleSheetsSettings, setGoogleSheetsSettings] = useState({ 
    serviceAccountKey: '', 
    spreadsheetId: '' 
  });

  // Google Sheets設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const serviceAccountKey = await getSetting('googleSheetsServiceAccountKey') || '';
        const spreadsheetId = await getSetting('googleSheetsSpreadsheetId') || '';
        setGoogleSheetsSettings({ serviceAccountKey, spreadsheetId });
      } catch (error) {
        console.error('Error loading Google Sheets settings:', error);
      }
    };
    loadSettings();
  }, [getSetting]);

  const { recordAttendance, isConfigured } = useGoogleSheets(
    googleSheetsSettings.serviceAccountKey && googleSheetsSettings.spreadsheetId 
      ? googleSheetsSettings 
      : undefined
  );

  useEffect(() => {
    // 打刻処理を実行
    const processAttendance = async () => {
      try {
        if (!state.selectedDepartment || !state.selectedEmployee || !state.selectedType) {
          navigate('/');
          return;
        }

        // ローカルDBに保存
        const record = await addAttendanceRecord({
          department_id: state.selectedDepartment.id,
          department_name: state.selectedDepartment.name,
          employee_id: state.selectedEmployee.id,
          employee_name: state.selectedEmployee.name,
          type: state.selectedType.id,
          type_name: state.selectedType.name,
          timestamp: new Date().toISOString(),
          date: new Date().toDateString()
        });

        if (record) {
          console.log('Attendance record saved:', record);
          
          // Google Sheets同期を試行
          if (isConfigured) {
            setSyncStatus('syncing');
            try {
              await recordAttendance(
                state.selectedDepartment?.name || '',
                state.selectedEmployee?.name || '',
                state.selectedType?.name || '',
                new Date(record.timestamp)
              );
              setSyncStatus('success');
              console.log('[Sync] Google Sheets同期成功:', record.id);
            } catch (err) {
              console.error('[Sync] Google Sheets同期失敗:', err);
              setSyncStatus('error');
              setSyncError(err instanceof Error ? err.message : '同期に失敗しました');
            }
          } else {
            console.log('Google Sheets not configured, skipping sync');
          }
        }

        setIsProcessing(false);
      } catch (error) {
        console.error('Error processing attendance:', error);
        setIsProcessing(false);
      }
    };

    processAttendance();
  }, [state, addAttendanceRecord, navigate]);

  // カウントダウン処理
  useEffect(() => {
    if (!isProcessing && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!isProcessing && countdown === 0) {
      reset();
      navigate('/');
    }
  }, [countdown, isProcessing, reset, navigate]);

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>;
      case 'success':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'error':
        return <WifiOff className="w-5 h-5 text-red-500" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
  };

  const getSyncStatusText = () => {
    if (!isConfigured) return 'ローカル保存完了（Google Sheets未設定）';
    switch (syncStatus) {
      case 'syncing':
        return 'スプレッドシートに同期中...';
      case 'success':
        return 'スプレッドシートに同期完了';
      case 'error':
        return '同期に失敗しました';
      default:
        return 'ローカル保存完了';
    }
  };

  const getSyncStatusColor = () => {
    if (!isConfigured) return 'bg-gray-100 text-gray-600';
    switch (syncStatus) {
      case 'syncing':
        return 'bg-blue-100 text-blue-700';
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-2xl w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">
            処理中...
          </h2>
          <p className="text-base md:text-lg text-gray-600">
            打刻データを保存しています
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 md:p-6 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-2xl w-full text-center">
        <CheckCircle2 className="w-16 h-16 md:w-20 md:h-20 text-green-500 mx-auto mb-4 md:mb-6" />
        
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-6">
          登録が完了しました
        </h2>

        <div className="bg-gray-50 rounded-lg p-4 md:p-6 mb-4 md:mb-6 text-left">
          <div className="space-y-2 md:space-y-3">
            <div>
              <span className="text-gray-600">部署：</span>
              <span className="font-semibold text-blue-600 ml-1 md:ml-2">
                {state.selectedDepartment?.name}
              </span>
            </div>
            <div>
              <span className="text-gray-600">職員：</span>
              <span className="font-semibold text-blue-600 ml-1 md:ml-2">
                {state.selectedEmployee?.name}
              </span>
            </div>
            <div>
              <span className="text-gray-600">種類：</span>
              <span className="font-semibold text-blue-600 ml-1 md:ml-2">
                {state.selectedType?.name}
              </span>
            </div>
            <div>
              <span className="text-gray-600">時刻：</span>
              <span className="font-semibold text-blue-600 ml-1 md:ml-2">
                {new Date().toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* 同期ステータス */}
        <div className={`rounded-lg p-3 md:p-4 mb-4 md:mb-6 ${getSyncStatusColor()}`}>
          <div className="flex items-center justify-center space-x-2">
            {getSyncStatusIcon()}
            <span className="text-sm font-medium">
              {getSyncStatusText()}
            </span>
          </div>
          {syncStatus === 'error' && (
            <p className="text-xs mt-2 opacity-75">
              {syncError}
            </p>
          )}
        </div>

        <p className="text-xl md:text-2xl font-semibold text-green-600 mb-3 md:mb-4">
          お疲れ様です。
        </p>

        <p className="text-base md:text-lg text-gray-600">
          {countdown}秒後にホームに戻ります
        </p>
      </div>
    </div>
  );
}
