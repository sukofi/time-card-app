import React, { useState } from 'react';
import { Building2, History } from 'lucide-react';
import { departments } from '../data/departments';
import { useApp } from '../context/AppContext';
import { TileButton } from './TileButton';
import { PageHeader } from './PageHeader';

export function HistoryDepartmentSelection() {
  const { selectDepartment, setViewMode } = useApp();

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
    setViewMode('attendance');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader 
          title="打刻履歴確認" 
          subtitle="確認したい部署を選択してください"
          onBack={handleBack}
        />

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <div className="flex items-center justify-center">
            <History className="w-10 h-10 text-purple-600 mr-4" />
            <h2 className="text-3xl font-bold text-gray-800">履歴確認モード</h2>
          </div>
          <p className="text-center text-gray-600 mt-4 text-lg">
            今月分の打刻履歴を確認できます
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 lg:gap-8">
          {departments.map((department) => (
            <TileButton
              key={department.id}
              title={department.name}
              icon={Building2}
              onClick={() => {
                playTapSound();
                selectDepartment(department);
              }}
              className="h-32 md:h-40 lg:h-48 border-purple-200 hover:border-purple-300 hover:bg-purple-50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}