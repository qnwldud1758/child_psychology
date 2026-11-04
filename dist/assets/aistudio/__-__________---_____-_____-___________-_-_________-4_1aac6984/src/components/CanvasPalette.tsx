import React from 'react';
import { Eraser, Trash2, Palette, Undo2, Redo2, Save, RotateCcw, Cloud } from 'lucide-react';

interface CanvasPaletteProps {
  currentColor: string;
  onSelectColor: (color: string) => void;
  currentBrushSize: number;
  onSelectBrushSize: (size: number) => void;
  onClearCanvas: () => void;
  onOpenColorWheel: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  lastBackupTime?: string | null;
  hasBackup?: boolean;
  onRestoreBackup?: () => void;
  onManualBackup?: () => void;
}

const DEFAULT_PALETTE = [
  '#000000', '#4B5563', '#9CA3AF', '#78350F', '#B45309', '#FCD9B6',
  '#EF4444', '#F43F5E', '#EC4899', '#FB7185', '#F97316', '#FBBF24',
  '#FACC15', '#84CC16', '#22C55E', '#10B981', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF'
];

export const CanvasPalette: React.FC<CanvasPaletteProps> = ({
  currentColor,
  onSelectColor,
  currentBrushSize,
  onSelectBrushSize,
  onClearCanvas,
  onOpenColorWheel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  lastBackupTime,
  hasBackup = false,
  onRestoreBackup,
  onManualBackup,
}) => {
  const isEraser = currentColor === '#FFFFFF';
  const isCustomColor = !DEFAULT_PALETTE.includes(currentColor) && !isEraser;

  return (
    <div className="bg-white/95 backdrop-blur-md p-3 md:p-3.5 rounded-3xl shadow-lg border-2 border-orange-100 flex flex-col gap-3 h-full overflow-y-auto max-h-[70vh] md:max-h-full">
      {/* Title & Active Color Indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-orange-100/80">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-extrabold text-orange-950">🎨 물감 도구함</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <span>선택:</span>
          {isEraser ? (
            <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-bold text-[11px] border border-pink-200">
              지우개
            </span>
          ) : (
            <div
              className="w-5 h-5 rounded-full border-2 border-white shadow-xs ring-2 ring-orange-200"
              style={{ backgroundColor: currentColor }}
              title={`현재 색상: ${currentColor}`}
            />
          )}
        </div>
      </div>

      {/* Undo & Redo (한단계 뒤로 / 앞으로) */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs border-2 transition-all duration-150 ${
            canUndo
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 hover:border-amber-400 shadow-xs hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-gray-100 text-gray-400 border-gray-200 opacity-40 cursor-not-allowed'
          }`}
          title="작업 한단계 뒤로 가기 (Ctrl+Z)"
          aria-label="한단계 뒤로 가기"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>뒤로</span>
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs border-2 transition-all duration-150 ${
            canRedo
              ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 hover:border-amber-400 shadow-xs hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-gray-100 text-gray-400 border-gray-200 opacity-40 cursor-not-allowed'
          }`}
          title="작업 한단계 앞으로 가기 (Ctrl+Y)"
          aria-label="한단계 앞으로 가기"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span>앞으로</span>
        </button>
      </div>

      {/* Palette Colors Grid */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500">
          <span>색상 선택</span>
          <span className="text-[11px] text-gray-400 font-normal">22가지 색상</span>
        </div>

        {/* Responsive grid: 4 cols on side panel (md:), 8 cols on mobile (< md) */}
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-4 gap-1.5 md:gap-2 justify-items-center bg-orange-50/50 p-2 rounded-2xl border border-orange-100/60">
          {DEFAULT_PALETTE.map((color) => {
            const isSelected = currentColor === color;
            return (
              <button
                key={color}
                type="button"
                onClick={() => onSelectColor(color)}
                style={{ backgroundColor: color }}
                title={color}
                className={`w-7 h-7 md:w-8 md:h-8 rounded-full border border-gray-300/80 transition-all duration-150 transform hover:scale-115 active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'scale-125 ring-3 ring-pink-500 ring-offset-2 z-10 shadow-md'
                    : 'hover:shadow'
                }`}
              />
            );
          })}

          {/* Custom Selected Color (from Color Wheel) */}
          {isCustomColor && (
            <button
              type="button"
              onClick={onOpenColorWheel}
              style={{ backgroundColor: currentColor }}
              title={`내가 고른 특별 색상: ${currentColor} (클릭하여 다시 변경)`}
              className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white scale-125 ring-3 ring-pink-500 ring-offset-2 z-10 shadow-md relative group cursor-pointer"
            >
              <span className="sr-only">선택된 커스텀 색상</span>
            </button>
          )}
        </div>
      </div>

      {/* Special Tools: Color Wheel, Eraser, Clear All */}
      <div className="flex flex-col gap-1.5">
        {/* Color Wheel (색상환 🎨) Button */}
        <button
          type="button"
          onClick={onOpenColorWheel}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-2xl font-bold text-xs md:text-sm bg-gradient-to-r from-rose-400 via-amber-400 via-emerald-400 to-sky-400 text-white shadow-sm hover:shadow-md transition-all duration-200 hover:scale-102 active:scale-98 border border-white cursor-pointer"
          title="더 다양한 색상을 고를 수 있는 표준 색상환 열기"
        >
          <div className="w-4 h-4 rounded-full bg-white/95 p-0.5 flex items-center justify-center shadow-xs">
            <Palette className="w-3 h-3 text-purple-600" />
          </div>
          <span className="font-extrabold text-white drop-shadow-sm">더 많은 색상환 🎨</span>
        </button>

        {/* Eraser and Clear All Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Eraser Button */}
          <button
            type="button"
            onClick={() => onSelectColor('#FFFFFF')}
            className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs border-2 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
              isEraser
                ? 'bg-pink-100 text-pink-600 border-pink-400 shadow-sm scale-105'
                : 'bg-white text-gray-700 border-gray-300 hover:border-pink-300'
            }`}
            title="지우개 (선을 쓱쓱 지워요)"
          >
            <Eraser className="w-3.5 h-3.5 text-pink-500" />
            <span>지우개</span>
          </button>

          {/* Clear All (모두 지우기) Button */}
          <button
            type="button"
            onClick={onClearCanvas}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 shadow-xs transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            title="스케치북의 그림을 모두 깨끗하게 지웁니다"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>모두 지우기</span>
          </button>
        </div>
      </div>

      {/* Brush Size Selector */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-orange-100/80">
        <span className="text-xs font-bold text-gray-500">붓 굵기 선택</span>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onSelectBrushSize(3)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentBrushSize === 3
                ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-300'
                : 'bg-orange-50/70 text-gray-700 hover:bg-orange-100 border border-orange-100'
            }`}
            title="가는 선 (3px)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current mb-0.5" />
            <span className="text-[11px]">가는 선</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectBrushSize(6)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentBrushSize === 6
                ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-300'
                : 'bg-orange-50/70 text-gray-700 hover:bg-orange-100 border border-orange-100'
            }`}
            title="보통 선 (6px)"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-current mb-0.5" />
            <span className="text-[11px]">보통</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectBrushSize(14)}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentBrushSize === 14
                ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-300'
                : 'bg-orange-50/70 text-gray-700 hover:bg-orange-100 border border-orange-100'
            }`}
            title="굵은 선 (14px)"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-current mb-0.5" />
            <span className="text-[11px]">굵은 선</span>
          </button>
        </div>
      </div>

      {/* Real-time Drawing Auto-Backup Status & Controls */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-orange-100/80 bg-orange-50/40 p-2 rounded-2xl">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-[11px]">
            <Cloud className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>실시간 자동 백업</span>
          </div>
          <span className="text-[10px] text-gray-500 font-medium">
            {lastBackupTime ? `${lastBackupTime}` : '대기 중'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mt-0.5">
          <button
            type="button"
            onClick={onManualBackup}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="현재 그린 그림을 즉시 백업 저장합니다"
          >
            <Save className="w-3.5 h-3.5" />
            <span>지금 백업</span>
          </button>

          <button
            type="button"
            onClick={onRestoreBackup}
            disabled={!hasBackup}
            className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all ${
              hasBackup
                ? 'bg-sky-500 hover:bg-sky-600 text-white border-sky-600 shadow-xs hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed'
            }`}
            title="이전에 백업된 임시저장 그림 불러오기"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>백업 복원</span>
          </button>
        </div>
      </div>
    </div>
  );
};
