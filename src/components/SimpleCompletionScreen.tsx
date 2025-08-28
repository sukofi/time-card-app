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
  
  // Google Sheets連携
  const { recordAttendance, isConfigured, isConnected, updateConfig } = useGoogleSheets();

  // Google Sheets設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const serviceAccountKey = await getSetting('googleSheetsServiceAccountKey') || '';
        const spreadsheetId = await getSetting('googleSheetsSpreadsheetId') || '';
        
        if (serviceAccountKey && spreadsheetId) {
          updateConfig({ serviceAccountKey, spreadsheetId });
        }
      } catch (error) {
        console.error('Error loading Google Sheets settings:', error);
      }
    };
    
    loadSettings();
  }, [getSetting, updateConfig]);

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
          console.log('Local save completed');
          
          // Google Sheetsに送信（非同期・タイムアウト付き）
          if (isConfigured && isConnected) {
            setSyncStatus('syncing');
            
            // バックグラウンドで非同期実行（タイムアウト付き）
            setTimeout(async () => {
              try {
                const success = await recordAttendance({
                  departmentName: state.selectedDepartment.name,
                  employeeName: state.selectedEmployee.name,
                  attendanceType: state.selectedType.name,
                  timestamp: new Date()
                });
                
                if (success) {
                  setSyncStatus('success');
                  console.log('Google Sheets sync completed');
                } else {
                  setSyncStatus('error');
                  setSyncError('Google Sheets同期に失敗しました');
                  console.error('Google Sheets sync failed');
                }
              } catch (error) {
                setSyncStatus('error');
                setSyncError('Google Sheets同期エラー');
                console.error('Google Sheets sync error:', error);
              }
            }, 100); // 100ms後に実行
          } else {
            console.log('Google Sheets not configured or not connected');
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

  // 同期ステータス関連の関数
  const getSyncStatusIcon = () => {
    if (!isConfigured) return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    
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

        {/* 同期ステータス表示 */}
        <div className={`${getSyncStatusColor()} rounded-lg p-3 md:p-4 mb-4 md:mb-6`}>
          <div className="flex items-center justify-center space-x-2">
            {getSyncStatusIcon()}
            <span className="text-sm font-medium">
              {getSyncStatusText()}
            </span>
          </div>
          {syncStatus === 'error' && syncError && (
            <div className="mt-2 text-xs text-red-600">
              {syncError}
            </div>
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
