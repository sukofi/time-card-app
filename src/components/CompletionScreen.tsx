import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Wifi, WifiOff, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useDatabase } from '../hooks/useDatabase';
import { useGoogleSheets } from '../hooks/useGoogleSheets';
import { useNavigate } from 'react-router-dom'; // Added for navigation

export function CompletionScreen() {
  const { state, reset } = useApp();
  const { 
    addAttendanceRecord, 
    updateAttendanceRecord, 
    findDuplicateRecord,
    getSetting,
    markAttendanceRecordSynced // Added for background sync
  } = useDatabase();
  
  const [googleSheetsSettings, setGoogleSheetsSettings] = useState({ 
    serviceAccountKey: '', 
    spreadsheetId: '' 
  });
  const [countdown, setCountdown] = useState(5);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateRecord, setDuplicateRecord] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'auth-error'>('idle');
  const [syncError, setSyncError] = useState<string>('');
  const [showCompletion, setShowCompletion] = useState(false); // Added for completion message
  const navigate = useNavigate(); // Added for navigation

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
  }, []);

  const { recordAttendance, isConfigured, testConnection } = useGoogleSheets(
    googleSheetsSettings.serviceAccountKey && googleSheetsSettings.spreadsheetId 
      ? googleSheetsSettings 
      : undefined
  );

  // stateがnullの場合は即トップへ
  useEffect(() => {
    if (!state.selectedDepartment || !state.selectedEmployee || !state.selectedType) {
      navigate('/');
      return;
    }
    checkForDuplicateAndSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedDepartment, state.selectedEmployee, state.selectedType]);

  const checkForDuplicateAndSave = async () => {
    if (!state.selectedDepartment || !state.selectedEmployee || !state.selectedType) return;

    const now = new Date();
    const today = now.toDateString();
    
    try {
      // 同日同内容の記録をチェック
      const existingRecord = await findDuplicateRecord(
        state.selectedDepartment.id,
        state.selectedEmployee.id,
        state.selectedType.id,
        today
      );

      if (existingRecord) {
        setDuplicateRecord(existingRecord);
        setShowDuplicateModal(true);
        return;
      }

      // 新しい記録を保存
      await saveRecord();
    } catch (error) {
      console.error('Error checking for duplicate record:', error);
      // エラーが発生しても新しい記録を保存
      await saveRecord();
    }
  };

  // カウントダウンと画面遷移の制御
  useEffect(() => {
    // 同期成功時のみカウントダウン開始
    if (!showDuplicateModal && syncStatus === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!showDuplicateModal && syncStatus === 'success' && countdown === 0) {
      reset();
    }
    // それ以外（同期中・エラー時）はカウントダウンしない
  }, [countdown, showDuplicateModal, syncStatus, reset]);

  // 同期中タイムアウト監視（10秒）
  React.useEffect(() => {
    if (syncStatus === 'syncing') {
      const timeout = setTimeout(() => {
        setSyncStatus('error');
        setSyncError('タイムアウトしました。ネットワークや設定を確認してください。');
      }, 10000); // 10秒
      return () => clearTimeout(timeout);
    }
  }, [syncStatus]);

  // リトライ機能付きのGoogle Sheets記録関数
  const recordAttendanceWithRetry = async (
    departmentName: string,
    employeeName: string,
    attendanceType: string,
    timestamp: Date,
    maxRetries: number = 5
  ): Promise<void> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // 連続リクエストを避けるため、2回目以降は待機時間を延長
        if (attempt > 1) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000); // 指数バックオフ: 2, 4, 8...秒、最大10秒
          console.log(`Retry attempt ${attempt}/${maxRetries}, waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        console.log(`Attempting to record attendance (attempt ${attempt}/${maxRetries})`);
        await recordAttendance(departmentName, employeeName, attendanceType, timestamp);
        console.log(`Successfully recorded attendance on attempt ${attempt}`);
        return; // 成功したら終了
      } catch (error: any) {
        lastError = error;
        console.warn(`Google Sheets sync attempt ${attempt}/${maxRetries} failed:`, error.message);
        
        // 認証エラーや404エラーの場合はリトライしない
        if (error.message.includes('401') || 
            error.message.includes('403') || 
            error.message.includes('404')) {
          console.error('Authentication or permission error, not retrying:', error.message);
          throw error;
        }
        
        // 最後の試行でも失敗した場合
        if (attempt === maxRetries) {
          console.error(`All ${maxRetries} attempts failed. Last error:`, lastError);
          throw lastError;
        }
      }
    }
    
    // ここに到達することはないが、TypeScriptの型チェックのため
    if (lastError) {
      throw lastError;
    }
  };

  // Google Sheetsサービスの初期化待ち（最大1秒、50msごとにチェック＋API通信、初回のみ）
  let sheetsReadyCache = false;
  const waitForSheetsServiceReady = async (timeoutMs = 1000) => {
    if (sheetsReadyCache) return true;
    const interval = 50;
    let waited = 0;
    while (!isConfigured && waited < timeoutMs) {
      await new Promise(res => setTimeout(res, interval));
      waited += interval;
    }
    if (isConfigured) {
      try {
        const ok = await testConnection();
        if (ok) {
          sheetsReadyCache = true;
        } else {
          console.error('[waitForSheetsServiceReady] testConnection() returned false');
        }
        return ok;
      } catch (err) {
        console.error('[waitForSheetsServiceReady] testConnection() error:', err);
        return false;
      }
    }
    return false;
  };

  // 打刻処理
  const saveRecord = async (isUpdate = false) => {
    console.log('saveRecord start');
    if (!state.selectedDepartment || !state.selectedEmployee || !state.selectedType) return;

    // ローカルDBに即保存
    const record = await addAttendanceRecord({
      department_id: state.selectedDepartment.id,
      department_name: state.selectedDepartment.name,
      employee_id: state.selectedEmployee.id,
      employee_name: state.selectedEmployee.name,
      type: state.selectedType.id, // idをtypeに
      type_name: state.selectedType.name, // nameをtype_nameに
      timestamp: new Date().toISOString(),
      date: new Date().toDateString()
    });
    if (!record) {
      setSyncStatus('error');
      setSyncError('ローカル保存に失敗しました');
      console.error('addAttendanceRecord failed: state=', state);
      return;
    }
    console.log('after addAttendanceRecord', record);

    // 即座にトップ画面へ遷移＆完了メッセージ
    setShowCompletion(true);
    setTimeout(() => {
      navigate('/');
    }, 1000); // 1秒後にトップへ

    // Google Sheets同期はバックグラウンドで自動リトライ
    const trySync = async (retry = 0) => {
      if (!isConfigured || !record) return;
      try {
        await recordAttendance(
          state.selectedDepartment?.name || '',
          state.selectedEmployee?.name || '',
          state.selectedType?.name || '',
          new Date(record.timestamp)
        );
        if (typeof markAttendanceRecordSynced === 'function') {
          await markAttendanceRecordSynced(record.id);
        }
        console.log('[BG Sync] Google Sheets同期成功:', record.id);
      } catch (err) {
        console.error('[BG Sync] Google Sheets同期失敗:', err);
        if (retry < 5) {
          setTimeout(() => trySync(retry + 1), 10000); // 10秒ごとに最大5回リトライ
        }
      }
    };
    setTimeout(() => trySync(), 0); // バックグラウンドで即実行
  };

  const handleUpdateRecord = () => {
    // タップ音を再生
    playTapSound();
    saveRecord(true);
    setShowDuplicateModal(false);
  };

  const handleKeepExisting = () => {
    // タップ音を再生
    playTapSound();
    setShowDuplicateModal(false);
  };

  // タップ音を再生する関数
  const playTapSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  // 完了音を再生する関数
  const playCompletionSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 3つの音を順番に再生（ド・ミ・ソ）
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime + index * 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.15 + 0.3);
      
      oscillator.start(audioContext.currentTime + index * 0.15);
      oscillator.stop(audioContext.currentTime + index * 0.15 + 0.3);
    });
  };

  // 完了画面が表示されたときに完了音を再生
  useEffect(() => {
    if (!showDuplicateModal) {
      playCompletionSound();
    }
  }, [showDuplicateModal]);

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>;
      case 'success':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'auth-error':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'error':
        return <WifiOff className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getSyncStatusText = () => {
    if (!isConfigured) return 'ローカル保存のみ（Google Sheets未設定）';
    switch (syncStatus) {
      case 'syncing':
        return 'スプレッドシートに同期中...';
      case 'success':
        return 'スプレッドシートに同期完了';
      case 'auth-error':
        return syncError;
      case 'error':
        return syncError;
      default:
        return '';
    }
  };

  const getSyncStatusColor = () => {
    if (!isConfigured) return 'bg-gray-100 text-gray-600';
    switch (syncStatus) {
      case 'syncing':
        return 'bg-blue-100 text-blue-700';
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'auth-error':
        return 'bg-orange-100 text-orange-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (showDuplicateModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center mb-6">
            <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">重複登録の確認</h2>
            <p className="text-gray-600">
              本日、同じ打刻内容で既に登録されています。<br />
              時刻を更新しますか？
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">既存の記録</p>
                <div className="bg-white rounded-lg p-4 border">
                  <p className="font-semibold text-lg text-gray-800">
                    {duplicateRecord?.typeName}
                  </p>
                  <p className="text-gray-600">
                    {new Date(duplicateRecord?.timestamp || '').toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">新しい時刻</p>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="font-semibold text-lg text-blue-800">
                    {state.selectedType?.name}
                  </p>
                  <p className="text-blue-600">
                    {new Date().toLocaleTimeString('ja-JP', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-6">
            <button
              onClick={handleUpdateRecord}
              className="flex-1 py-4 text-xl bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center"
            >
              <Clock className="w-6 h-6 mr-2" />
              時刻を更新
            </button>
            <button
              onClick={handleKeepExisting}
              className="flex-1 py-4 text-xl bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold flex items-center justify-center"
            >
              <X className="w-6 h-6 mr-2" />
              そのまま
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            時刻のみが更新され、その他の情報は変更されません。
          </p>
        </div>
      </div>
    );
  }

  // エラー時の再試行UI（詳細エラー表示）
  if (!showDuplicateModal && (syncStatus === 'error' || syncStatus === 'auth-error')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xl w-full text-center">
          <div className="flex flex-col items-center mb-6">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-red-700 mb-2">同期に失敗しました</h2>
            <p className="text-gray-700 mb-4">{syncError || 'Googleスプレッドシートへの送信に失敗しました。'}</p>
            <p className="text-xs text-gray-500 break-all">{syncError}</p>
          </div>
          <button
            onClick={() => saveRecord()}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  // 完了画面
  if (showCompletion) {
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
            {syncStatus === 'auth-error' && (
              <p className="text-xs mt-2 opacity-75">
                設定画面でサービスアカウントキーを確認してください
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
          {syncStatus === 'auth-error' && (
            <p className="text-xs mt-2 opacity-75">
              設定画面でサービスアカウントキーを確認してください
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