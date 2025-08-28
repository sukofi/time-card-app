import React from 'react';
import { ArrowLeft, Settings } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onSettings?: () => void;
}

export function PageHeader({ title, subtitle, onBack, onSettings }: PageHeaderProps) {
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

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 md:mb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {onBack && (
            <button
              onClick={() => {
                playTapSound();
                onBack();
              }}
              className="mr-4 md:mr-6 p-2 md:p-3 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
            >
              <ArrowLeft className="w-6 h-6 md:w-8 md:h-8 text-gray-600" />
            </button>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-lg md:text-xl text-gray-600 mt-1 md:mt-2">{subtitle}</p>
            )}
          </div>
        </div>
        {onSettings && (
          <button
            onClick={() => {
              playTapSound();
              onSettings();
            }}
            className="p-3 md:p-4 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
          >
            <Settings className="w-6 h-6 md:w-8 md:h-8 text-gray-600" />
          </button>
        )}
      </div>
    </div>
  );
}