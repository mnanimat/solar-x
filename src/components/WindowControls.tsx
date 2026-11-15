import React from 'react';
import { Maximize2, Minus, X } from 'lucide-react';

interface WindowControlsProps {
  title: string;
  minimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
  variant?: 'default' | 'amber' | 'rose';
}

export const WindowControls: React.FC<WindowControlsProps> = ({
  title,
  minimized,
  onToggleMinimize,
  onClose,
  variant = 'default',
}) => {
  const btnBorder =
    variant === 'rose'
      ? 'border-rose-500/50 hover:border-rose-400 text-rose-200 hover:text-white'
      : variant === 'amber'
        ? 'border-amber-500/50 hover:border-amber-400 text-amber-200 hover:text-white'
        : 'border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white';

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={onToggleMinimize}
        className={`p-1 rounded bg-slate-900/95 border ${btnBorder} cursor-pointer transition-colors`}
        aria-label={minimized ? `Restore ${title}` : `Minimize ${title}`}
        title={minimized ? `Restore ${title}` : `Minimize ${title}`}
      >
        {minimized ? <Maximize2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      </button>
      <button
        type="button"
        onClick={onClose}
        className={`p-1 rounded bg-slate-900/95 border ${btnBorder} cursor-pointer transition-colors`}
        aria-label={`Close ${title}`}
        title={`Close ${title}`}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
