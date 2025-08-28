import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
// import { useLocalStorage } from '../hooks/useLocalStorage'; // 削除済み

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminAuthModal({ isOpen, onClose, onSuccess }: AdminAuthModalProps) {
  // const [adminPassword, setAdminPassword] = useLocalStorage('adminPassword', '0000'); // 削除済み
  const [adminPassword, setAdminPassword] = useState('0000'); // 一時的にuseStateを使用
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 少し遅延を追加してセキュリティ感を演出
    await new Promise(resolve => setTimeout(resolve, 500));

    if (inputPassword === adminPassword) {
      setInputPassword('');
      setIsLoading(false);
      onSuccess();
    } else {
      setError('パスワードが正しくありません');
      setInputPassword('');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setInputPassword('');
    setError('');
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Lock className="w-6 h-6 text-red-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-800">管理者認証</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-gray-600">
              管理者設定にアクセスするには<br />
              パスワードを入力してください
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                管理者パスワード
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-2xl tracking-widest"
                  placeholder="••••"
                  maxLength={20}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm text-center">{error}</p>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!inputPassword || isLoading}
              className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  認証中...
                </>
              ) : (
                '認証'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}