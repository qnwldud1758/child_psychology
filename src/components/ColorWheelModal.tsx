import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Check, Palette, RefreshCw } from 'lucide-react';

interface ColorWheelModalProps {
  isOpen: boolean;
  currentColor: string;
  onSelectColor: (color: string) => void;
  onClose: () => void;
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return [255, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else if (max === b) h = ((r - g) / d + 4) * 60;
  }
  return [Math.round(h), s, v];
}

const KOREAN_STANDARD_20_COLORS = [
  { name: '빨강', hex: '#FF0000' },
  { name: '다홍', hex: '#FF3300' },
  { name: '주황', hex: '#FF6600' },
  { name: '귤색', hex: '#FFA000' },
  { name: '노랑', hex: '#FFEB00' },
  { name: '노랑연두', hex: '#CCFF00' },
  { name: '연두', hex: '#88E000' },
  { name: '풀색', hex: '#44BB00' },
  { name: '녹색', hex: '#00AA33' },
  { name: '초록', hex: '#00B050' },
  { name: '청록', hex: '#009988' },
  { name: '바다색', hex: '#00B4D8' },
  { name: '파랑', hex: '#0070F3' },
  { name: '감청', hex: '#0033CC' },
  { name: '남색', hex: '#001A88' },
  { name: '남보라', hex: '#3B0086' },
  { name: '보라', hex: '#7700B8' },
  { name: '붉은보라', hex: '#A80088' },
  { name: '자주', hex: '#D6006E' },
  { name: '연지', hex: '#E6004C' },
];

const COLOR_THEMES = [
  {
    category: '🌸 동화 파스텔',
    colors: [
      { name: '베이비 핑크', hex: '#FFB7B2' },
      { name: '피치 살구', hex: '#FFDAC1' },
      { name: '크림 바닐라', hex: '#FFF2B2' },
      { name: '연두 새싹', hex: '#E2F0CB' },
      { name: '민트 캔디', hex: '#B5EAD7' },
      { name: '하늘 스카이', hex: '#C7CEEA' },
      { name: '라벤더', hex: '#E5D4EF' },
      { name: '연보라 꽃잎', hex: '#E8C5E5' },
    ],
  },
  {
    category: '✨ 비비드 & 네온',
    colors: [
      { name: '핫 핑크', hex: '#FF1493' },
      { name: '선셋 오렌지', hex: '#FF5722' },
      { name: '레몬 옐로', hex: '#FFEA00' },
      { name: '라임 네온', hex: '#76FF03' },
      { name: '에메랄드', hex: '#00E676' },
      { name: '일렉트릭 블루', hex: '#00E5FF' },
      { name: '코발트 블루', hex: '#2979FF' },
      { name: '울트라 바이올렛', hex: '#D500F9' },
    ],
  },
];

export const ColorWheelModal: React.FC<ColorWheelModalProps> = ({
  isOpen,
  currentColor,
  onSelectColor,
  onClose,
}) => {
  const [hue, setHue] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(1);
  const [value, setValue] = useState<number>(1);
  const [selectedHex, setSelectedHex] = useState<string>('#FF0000');
  const [viewTab, setViewTab] = useState<'wheel' | 'standard' | 'themes'>('wheel');

  const wheelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const valid = currentColor === '#FFFFFF' ? '#FF0000' : currentColor;
      const [r, g, b] = hexToRgb(valid);
      const [h, s, v] = rgbToHsv(r, g, b);
      setHue(h);
      setSaturation(s === 0 ? 1 : s);
      setValue(v === 0 ? 1 : v);
      setSelectedHex(valid.toUpperCase());
    }
  }, [isOpen, currentColor]);

  const updateColorFromHsv = useCallback((h: number, s: number, v: number) => {
    setHue(h);
    setSaturation(s);
    setValue(v);
    const [r, g, b] = hsvToRgb(h, s, v);
    setSelectedHex(rgbToHex(r, g, b));
  }, []);

  const updateColorFromHex = (hex: string) => {
    const clean = hex.toUpperCase();
    setSelectedHex(clean);
    const [r, g, b] = hexToRgb(clean);
    const [h, s, v] = rgbToHsv(r, g, b);
    setHue(h);
    setSaturation(s);
    setValue(v);
  };

  const drawWheel = useCallback(() => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = ((angle - 0.5) * Math.PI) / 180;
      const endAngle = ((angle + 1.5) * Math.PI) / 180;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
      const [r, g, b] = hsvToRgb(angle, 1, value);
      grad.addColorStop(0, `rgb(${Math.round(255 * value)}, ${Math.round(255 * value)}, ${Math.round(255 * value)})`);
      grad.addColorStop(1, `rgb(${r}, ${g}, ${b})`);

      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 3;
    ctx.stroke();

    const markerAngle = (hue * Math.PI) / 180;
    const markerDist = saturation * radius;
    const markerX = center + markerDist * Math.cos(markerAngle);
    const markerY = center + markerDist * Math.sin(markerAngle);

    ctx.beginPath();
    ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [hue, saturation, value]);

  useEffect(() => {
    if (isOpen && viewTab === 'wheel') {
      const timer = setTimeout(drawWheel, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen, viewTab, drawWheel]);

  const handleWheelInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const center = rect.width / 2;
    const radius = center - 8;

    const dx = x - center;
    const dy = y - center;

    let angleRad = Math.atan2(dy, dx);
    let angleDeg = Math.round((angleRad * 180) / Math.PI);
    if (angleDeg < 0) angleDeg += 360;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const newSat = Math.max(0, Math.min(1, dist / radius));

    updateColorFromHsv(angleDeg, newSat, value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-5 md:p-6 relative border-4 border-amber-100 flex flex-col max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-amber-400 to-sky-400 p-0.5 flex items-center justify-center shadow">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div>
              <h3 className="title-font text-2xl text-purple-700">정확한 무지개 색상환 🎨</h3>
              <p className="text-[11px] text-gray-500">표준 미술 색상환에서 원하는 색을 골라보세요.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex bg-purple-50 p-1 rounded-2xl mb-4 gap-1">
          <button
            type="button"
            onClick={() => setViewTab('wheel')}
            className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              viewTab === 'wheel' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            🎡 원형 색상환
          </button>
          <button
            type="button"
            onClick={() => setViewTab('standard')}
            className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              viewTab === 'standard' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            🌈 교육용 20색상환
          </button>
          <button
            type="button"
            onClick={() => setViewTab('themes')}
            className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              viewTab === 'themes' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            🎨 감성 테마 팔레트
          </button>
        </div>

        {viewTab === 'wheel' && (
          <div className="flex flex-col items-center mb-3">
            <div className="relative w-64 h-64 flex items-center justify-center mb-3">
              <canvas
                ref={wheelCanvasRef}
                width={256}
                height={256}
                onMouseDown={(e) => {
                  isDraggingRef.current = true;
                  handleWheelInteraction(e);
                }}
                onMouseMove={(e) => {
                  if (isDraggingRef.current) handleWheelInteraction(e);
                }}
                onMouseUp={() => { isDraggingRef.current = false; }}
                onTouchStart={(e) => {
                  isDraggingRef.current = true;
                  handleWheelInteraction(e);
                }}
                onTouchMove={(e) => {
                  if (isDraggingRef.current) handleWheelInteraction(e);
                }}
                onTouchEnd={() => { isDraggingRef.current = false; }}
                className="w-full h-full cursor-crosshair touch-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 text-center">원형에서 색상을 터치하여 자유롭게 조절하세요</p>
          </div>
        )}

        {viewTab === 'standard' && (
          <div className="mb-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 p-3 bg-purple-50/50 rounded-2xl border border-purple-100">
              {KOREAN_STANDARD_20_COLORS.map((item) => {
                const isSelected = selectedHex.toLowerCase() === item.hex.toLowerCase();
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => updateColorFromHex(item.hex)}
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-600 bg-white ring-2 ring-purple-500 shadow-md scale-105'
                        : 'border-gray-200 bg-white/90 hover:border-purple-300'
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-full border border-black/10 shadow-sm mb-1 flex items-center justify-center"
                      style={{ backgroundColor: item.hex }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow stroke-[3]" />}
                    </div>
                    <span className="text-[11px] font-bold text-gray-700">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {viewTab === 'themes' && (
          <div className="space-y-3 mb-4">
            {COLOR_THEMES.map((theme) => (
              <div key={theme.category} className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
                <span className="text-xs font-bold text-gray-700 block mb-1.5">{theme.category}</span>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {theme.colors.map((c) => {
                    const isSelected = selectedHex.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => updateColorFromHex(c.hex)}
                        title={c.name}
                        style={{ backgroundColor: c.hex }}
                        className={`h-8 rounded-lg border border-gray-300/80 transition-all transform hover:scale-110 flex items-center justify-center cursor-pointer ${
                          isSelected ? 'ring-2 ring-purple-600 scale-105 shadow-md' : ''
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-2xl border">
          <div>
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
              <span>색조 (Hue: 0° ~ 360°)</span>
              <span className="font-mono text-purple-700">{hue}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={(e) => updateColorFromHsv(parseInt(e.target.value, 10), saturation, value)}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer"
              style={{
                background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
              }}
            />
          </div>
        </div>

        <div className="pt-2 border-t flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl border-2 border-white shadow-md shrink-0"
              style={{ backgroundColor: selectedHex }}
            />
            <input
              type="text"
              value={selectedHex}
              onChange={(e) => updateColorFromHex(e.target.value)}
              maxLength={7}
              className="font-mono font-bold text-xs w-24 px-2 py-1 rounded border uppercase bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 text-xs font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectColor(selectedHex);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-all flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>이 색상 선택</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
