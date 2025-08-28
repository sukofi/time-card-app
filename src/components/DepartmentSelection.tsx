import React, { useState } from 'react';
import { Building2, History, Settings } from 'lucide-react';
import { departments } from '../data/departments';
import { useApp } from '../context/AppContext';
import { CurrentTime } from './CurrentTime';
import { TileButton } from './TileButton';
import { SettingsModal } from './SettingsModal';
import { AdminAuthModal } from './AdminAuthModal';
// import { useLocalStorage } from '../hooks/useLocalStorage'; // 削除済み
import { DepartmentManagementModal } from './DepartmentManagementModal';

export function DepartmentSelection() {
  const { selectDepartment, setViewMode } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [showDeptManage, setShowDeptManage] = useState(false);
  // const [departmentsLS, setDepartmentsLS] = useLocalStorage('departments', null); // 削除済み

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

  const handleHistoryView = () => {
    playTapSound();
    setViewMode('history');
  };

  const handleAdminSettings = () => {
    playTapSound();
    setShowAdminAuth(true);
  };

  const handleAuthSuccess = () => {
    setShowAdminAuth(false);
    setShowSettings(true);
  };

  // localStorageに部署がなければ初期値をセット（削除済み）
  // React.useEffect(() => {
  //   if (!departmentsLS) {
  //     import('../data/departments').then(mod => {
  //       setDepartmentsLS(mod.departments);
  //     });
  //   }
  // }, [departmentsLS, setDepartmentsLS]);

  const departmentsToShow = departments; // 直接使用

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6 lg:p-8 flex flex-col">
      <div className="max-w-none mx-auto flex-1 flex flex-col">
        {/* 時刻表示を最上部に */}
        <CurrentTime />

        {/* 部署選択エリア - Fire HD 10横向き最適化 */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4">部署を選択してください</h1>
          </div>

          {/* Fire HD 10横向きに最適化されたグリッド */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3 md:gap-4 lg:gap-6">
            {departmentsToShow.map((department) => (
              <TileButton
                key={department.id}
                title={department.name}
                icon={Building2}
                onClick={() => {
                  playTapSound();
                  selectDepartment(department);
                }}
                className="h-24 md:h-28 lg:h-32 xl:h-36"
              />
            ))}
          </div>
        </div>

        {/* 最下部のボタン - Fire HD 10横向き最適化 */}
        <div className="mt-6 md:mt-8 flex flex-row gap-3 md:gap-4 lg:gap-6 justify-center">
          <button
            onClick={handleHistoryView}
            className="flex items-center justify-center px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl md:rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <History className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 mr-2 md:mr-3" />
            <span className="text-base md:text-lg lg:text-xl font-semibold">打刻履歴</span>
          </button>
          <button
            onClick={handleAdminSettings}
            className="flex items-center justify-center px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl md:rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <Settings className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 mr-2 md:mr-3" />
            <span className="text-base md:text-lg lg:text-xl font-semibold">管理者設定</span>
          </button>
          <button
            onClick={() => setShowDeptManage(true)}
            className="flex items-center justify-center px-6 md:px-8 lg:px-10 py-3 md:py-4 lg:py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <Building2 className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 mr-2 md:mr-3" />
            <span className="text-base md:text-lg lg:text-xl font-semibold">部署管理</span>
          </button>
        </div>
      </div>

      <AdminAuthModal 
        isOpen={showAdminAuth}
        onClose={() => setShowAdminAuth(false)}
        onSuccess={handleAuthSuccess}
      />

      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <DepartmentManagementModal
        isOpen={showDeptManage}
        onClose={() => setShowDeptManage(false)}
      />
    </div>
  );
}