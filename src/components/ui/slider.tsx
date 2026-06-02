'use client';

import * as React from 'react';

interface SliderProps {
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value = [0],
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  className = '',
  disabled = false,
}: SliderProps) {
  const currentValue = value[0] ?? 0;
  const percentage = ((currentValue - min) / (max - min)) * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    // Round to step
    const steppedValue = Math.round(newValue / step) * step;
    onValueChange?.([steppedValue]);
  };

  return (
    <div className={`relative flex w-full touch-none select-none items-center ${className}`}>
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-[rgba(157,78,221,0.15)]">
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-[#7B2CBF] to-[#9d4edd]"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className="absolute w-full h-2 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        style={{ touchAction: 'none' }}
      />
      <div
        className="absolute h-4 w-4 rounded-full border-2 border-[#9d4edd] bg-[#0a0a1a] shadow-[0_0_8px_rgba(157,78,221,0.4)] pointer-events-none"
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  );
}
