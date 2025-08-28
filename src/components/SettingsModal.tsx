import React, { useState } from 'react';
import { X, Save, Settings, ExternalLink, Users, AlertTriangle, CheckCircle, Lock, Eye, EyeOff, Database, Trash2 } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { EmployeeManagementModal } from './EmployeeManagementModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDepartment?: { id: string; name: string };
}

interface GoogleSheetsSettings {
  serviceAccountKey: string;
  spreadsheetId: string;
}

export function SettingsModal({ isOpen, onClose, currentDepartment }: SettingsModalProps) {
  const { 
    saveSetting, 
    getSetting, 
    manualCleanup, 
    getDatabaseStats 
  } = useDatabase();
  
  const [settings, setSettings] = useState<GoogleSheetsSettings>({
    serviceAccountKey: '',
    spreadsheetId: ''
  });
  const [adminPassword, setAdminPassword] = useState('0000');
  const [formData, setFormData] = useState(settings);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmployeeManagement, setShowEmployeeManagement] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [dbStats, setDbStats] = useState({
    totalEmployees: 0,
    totalAttendanceRecords: 0,
    oldestRecord: null as string | null,
    newestRecord: null as string | null
  });
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupSuccess, setCleanupSuccess] = useState(false);

  // 設定とデータベース統計を読み込む
  React.useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadDatabaseStats();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const serviceAccountKey = await getSetting('googleSheetsServiceAccountKey') || '';
      const spreadsheetId = await getSetting('googleSheetsSpreadsheetId') || '';
      const password = await getSetting('adminPassword') || '0000';
      
      const loadedSettings = { serviceAccountKey, spreadsheetId };
      setSettings(loadedSettings);
      setFormData(loadedSettings);
      setAdminPassword(password);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      const stats = await getDatabaseStats();
      setDbStats(stats);
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSetting('googleSheetsServiceAccountKey', formData.serviceAccountKey);
      await saveSetting('googleSheetsSpreadsheetId', formData.spreadsheetId);
      setSettings(formData);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (error) {
      console.error('Settings save error:', error);
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!newPassword) {
      setPasswordError('新しいパスワードを入力してください');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('パスワードは4文字以上で入力してください');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('パスワードが一致しません');
      return;
    }

    await saveSetting('adminPassword', newPassword);
    setAdminPassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess(true);
    
    setTimeout(() => {
      setPasswordSuccess(false);
    }, 3000);
  };

  const extractSpreadsheetId = (url: string): string => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const handleSpreadsheetUrlChange = (value: string) => {
    const id = extractSpreadsheetId(value);
    setFormData({ ...formData, spreadsheetId: id });
  };

  const testConnection = async () => {
    if (!formData.serviceAccountKey || !formData.spreadsheetId) {
      setTestError('サービスアカウントキーとスプレッドシートIDの両方を入力してください');
      setTestStatus('error');
      return;
    }

    setTestStatus('testing');
    setTestError('');

    try {
      // 一時的にサービスを作成してテスト
      const tempService = new (await import('../services/googleSheets')).GoogleSheetsService(formData);
      const result = await tempService.testConnection();
      
      if (result) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
        setTestError('接続に失敗しました。設定を確認してください。');
      }
    } catch (error) {
      setTestStatus('error');
      setTestError(`接続エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  };

  const getTestStatusIcon = () => {
    switch (testStatus) {
      case 'testing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleManualCleanup = async () => {
    if (!confirm('過去の打刻ログを削除しますか？（部署・職員情報は保持されます）')) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const success = await manualCleanup();
      if (success) {
        setCleanupSuccess(true);
        await loadDatabaseStats(); // 統計を再読み込み
        setTimeout(() => setCleanupSuccess(false), 3000);
      } else {
        alert('クリーンアップに失敗しました。');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('クリーンアップ中にエラーが発生しました。');
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-800">管理者設定</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* パスワード変更セクション */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-red-600" />
            管理者パスワード変更
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新しいパスワード
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="新しいパスワードを入力"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード確認
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="パスワードを再入力"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-700 text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  パスワードを変更しました
                </p>
              </div>
            )}

            <button
              onClick={handlePasswordChange}
              disabled={!newPassword || !confirmPassword}
              className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              パスワードを変更
            </button>
          </div>
        </div>

        {/* データベース管理セクション */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2 text-green-600" />
            データベース管理
          </h3>
          
          <div className="space-y-4">
            {/* データベース統計 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">データベース統計</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">職員数：</span>
                  <span className="font-semibold">{dbStats.totalEmployees}人</span>
                </div>
                <div>
                  <span className="text-gray-600">打刻記録数：</span>
                  <span className="font-semibold">{dbStats.totalAttendanceRecords}件</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">記録期間：</span>
                  <span className="font-semibold">
                    {dbStats.oldestRecord && dbStats.newestRecord ? (
                      `${new Date(dbStats.oldestRecord).toLocaleDateString('ja-JP')} ～ ${new Date(dbStats.newestRecord).toLocaleDateString('ja-JP')}`
                    ) : (
                      '記録なし'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* クリーンアップ */}
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                <Trash2 className="w-4 h-4 mr-2" />
                データクリーンアップ
              </h4>
              <p className="text-sm text-yellow-700 mb-3">
                3ヶ月より古い打刻記録を削除します。部署・職員情報は保持されます。
              </p>
              <button
                onClick={handleManualCleanup}
                disabled={isCleaningUp}
                className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCleaningUp ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    クリーンアップ中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    手動クリーンアップ実行
                  </>
                )}
              </button>
              
              {cleanupSuccess && (
                <p className="text-sm text-green-600 mt-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  クリーンアップが完了しました
                </p>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">自動クリーンアップ</h4>
              <p className="text-sm text-blue-700">
                毎月10日に自動的に3ヶ月より古い打刻記録が削除されます。
              </p>
            </div>
          </div>
        </div>

        {/* 職員管理セクション */}
        {currentDepartment && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              職員管理
            </h3>
            <p className="text-gray-600 mb-4">
              {currentDepartment.name}の職員を管理できます
            </p>
            <button
              onClick={() => setShowEmployeeManagement(true)}
              className="flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Users className="w-5 h-5 mr-2" />
              職員管理を開く
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          <h3 className="text-lg font-semibold">Google Sheets連携設定</h3>

          {/* 重要な注意事項 */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h4 className="font-semibold text-red-800 mb-2 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              重要：サービスアカウント認証
            </h4>
            <p className="text-sm text-red-700">
              Google Sheets連携を使用するには、サービスアカウントキーを設定する必要があります。
              以下の手順に従って設定してください。
            </p>
          </div>

          {/* 設定手順の説明 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">設定手順</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Google Cloud Consoleでプロジェクトを作成</li>
              <li>Google Sheets APIを有効化</li>
              <li>サービスアカウントを作成</li>
              <li>サービスアカウントキー（JSON）をダウンロード</li>
              <li>Google Sheetsでスプレッドシートを作成</li>
              <li>スプレッドシートをサービスアカウントのメールアドレスと共有</li>
            </ol>
            <a
              href="https://cloud.google.com/iam/docs/creating-managing-service-accounts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800"
            >
              詳細な設定手順 <ExternalLink className="w-4 h-4 ml-1" />
            </a>
          </div>

          {/* サービスアカウントキー設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              サービスアカウントキー（JSON） *
            </label>
            <textarea
              value={formData.serviceAccountKey}
              onChange={(e) => setFormData({ ...formData, serviceAccountKey: e.target.value })}
              placeholder='{"type": "service_account", "project_id": "...", ...}'
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              rows={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Google Cloud Consoleでダウンロードしたサービスアカウントキー（JSON形式）の内容を貼り付けてください
            </p>
          </div>

          {/* スプレッドシートID設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スプレッドシートURL または ID *
            </label>
            <input
              type="text"
              value={formData.spreadsheetId}
              onChange={(e) => handleSpreadsheetUrlChange(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/... または スプレッドシートID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              スプレッドシートのURLまたはIDを入力してください（URLから自動でIDを抽出します）
            </p>
          </div>

          {/* 接続テスト */}
          <div>
            <button
              onClick={testConnection}
              disabled={testStatus === 'testing' || !formData.serviceAccountKey || !formData.spreadsheetId}
              className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {getTestStatusIcon()}
              <span className="ml-2">
                {testStatus === 'testing' ? '接続テスト中...' : '接続テスト'}
              </span>
            </button>
            
            {testStatus === 'success' && (
              <p className="text-sm text-green-600 mt-2 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                接続に成功しました！
              </p>
            )}
            
            {testStatus === 'error' && testError && (
              <p className="text-sm text-red-600 mt-2 flex items-start">
                <AlertTriangle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                {testError}
              </p>
            )}
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ 重要な注意事項</h4>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>スプレッドシートはサービスアカウントのメールアドレスと共有してください</li>
              <li>サービスアカウントには編集権限を付与してください</li>
              <li>本番環境では環境変数での管理を検討してください</li>
              <li>サービスアカウントキーは他人に共有しないでください</li>
            </ul>
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {currentDepartment && (
        <EmployeeManagementModal
          isOpen={showEmployeeManagement}
          onClose={() => setShowEmployeeManagement(false)}
          departmentId={currentDepartment.id}
          departmentName={currentDepartment.name}
        />
      )}
    </div>
  );
}