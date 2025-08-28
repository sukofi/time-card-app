import React from 'react';
import { Clock, LogIn, LogOut, MoveRight, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { attendanceTypes } from '../data/departments';
import { PageHeader } from './PageHeader';

const typeIcons = {
  checkin: LogIn,
  checkout: LogOut,
  out: MoveRight,
  return: RotateCcw
};

export function AttendanceTypeSelection() {
  const { state, selectType, reset } = useApp();

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

  const handleBack = () => {
    playTapSound();
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="打刻種類選択"
          subtitle="打刻の種類を選択してください"
          onBack={handleBack}
        />

        {/* 選択内容表示 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <div className="flex items-center mb-4">
            <Clock className="w-8 h-8 text-blue-600 mr-4" />
            <h3 className="text-2xl font-bold text-gray-800">選択中の情報</h3>
          </div>
          <div className="text-xl space-y-3">
            <div>
              <span className="text-gray-600">部署：</span>
              <span className="font-semibold text-blue-600">
                {state.selectedDepartment?.name}
              </span>
            </div>
            <div>
              <span className="text-gray-600">職員：</span>
              <span className="font-semibold text-blue-600">
                {state.selectedEmployee?.name}
              </span>
            </div>
          </div>
        </div>

        {/* 打刻種類選択 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 lg:gap-10 max-w-6xl mx-auto">
          {attendanceTypes.map((type) => {
            const IconComponent = typeIcons[type.id as keyof typeof typeIcons];
            return (
              <button
                key={type.id}
                onClick={() => {
                  playTapSound();
                  selectType(type);
                }}
                className={`
                  w-full h-40 md:h-48 lg:h-52 p-6 md:p-8 rounded-2xl shadow-lg
                  text-white font-bold text-xl md:text-2xl
                  transition-all duration-200 transform hover:scale-105 active:scale-95
                  touch-manipulation
                  ${type.color}
                `}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <IconComponent className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 mb-4 md:mb-6" />
                  <span>{type.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}