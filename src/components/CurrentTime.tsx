import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function CurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 lg:p-8 mb-4 md:mb-6 lg:mb-8">
      <div className="flex items-center justify-center mb-2 md:mb-3 lg:mb-4">
        <Clock className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-blue-600 mr-2 md:mr-3" />
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">現在の日時</h2>
      </div>
      <div className="text-center">
        <div className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-blue-600 mb-1 md:mb-2 lg:mb-3">
          {formatTime(currentTime)}
        </div>
        <div className="text-base md:text-lg lg:text-xl xl:text-2xl text-gray-600">
          {formatDate(currentTime)}
        </div>
      </div>
    </div>
  );
}