import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface TileButtonProps {
  title: string;
  icon?: LucideIcon;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export function TileButton({ 
  title, 
  icon: Icon, 
  onClick, 
  className = '', 
  disabled = false 
}: TileButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full p-3 md:p-4 lg:p-5 rounded-xl md:rounded-2xl shadow-lg
        bg-white hover:bg-gray-50 active:bg-gray-100
        border border-gray-200 hover:border-blue-300
        transition-all duration-200 transform hover:scale-105 active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        touch-manipulation
        ${className}
      `}
    >
      <div className="flex flex-col items-center justify-center h-full">
        {Icon && <Icon className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 xl:w-9 xl:h-9 mb-1 md:mb-2 lg:mb-3 text-blue-600" />}
        <span className="text-sm md:text-base lg:text-lg xl:text-xl font-semibold text-gray-800 text-center leading-tight">
          {title}
        </span>
      </div>
    </button>
  );
}