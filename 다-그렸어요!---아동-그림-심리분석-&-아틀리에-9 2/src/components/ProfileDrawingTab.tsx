import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, RotateCcw, Check, RefreshCw, Play, Trophy, Volume2, ArrowLeft, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfileApi } from '../services/api';
import { MascotCircle } from './MascotCircle';

const APP_LOGO_URL = '/assets/aistudio/Gemini_Generated_Image_85knyf85knyf85kn_a1b3fbaf.png';

interface ProfileDrawingTabProps {
  user: UserProfile | null;
  customProfileImage: string;
  onUpdateProfileImage: (imageUri: string) => void;
  onShowToast: (msg: string) => void;
}

const PALETTE = [
  '#000000', '#EF4444', '#F97316', '#F59E0B', 
  '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', 
  '#EC4899', '#78350F', '#FFFFFF'
];

const STICKERS = ['👑', '🎨', '✨', '⭐', '💖', '🌈', '👓', '🐱', '🌸', '🎀', '🐻'];

export const ProfileDrawingTab: React.FC<ProfileDrawingTabProps> = ({
  user,
  customProfileImage,
  onUpdateProfileImage,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<'draw' | 'game'>('draw');

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(6);
  const [isEraser, setIsEraser] = useState(false);
  const [activeSticker, setActiveSticker] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string>(customProfileImage || APP_LOGO_URL);
  const historyRef = useRef<ImageData[]>([]);

  // Mini-game state
  const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('child_minigame_highscore') || '0');
    } catch {
      return 0;
    }
  });
  const [gameMessage, setGameMessage] = useState('시작 버튼을 눌러 별과 물감을 모아봐요!');

  // Game internal refs
  const gameAnimIdRef = useRef<number | null>(null);
  const playerPosRef = useRef({ x: 150, targetX: 150, width: 50, height: 50 });
  const itemsRef = useRef<Array<{ x: number; y: number; speed: number; type: 'star' | 'paint' | 'heart'; symbol: string; points: number }>>([]);
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  // Initialize Drawing Canvas
  useEffect(() => {
    if (subTab !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background if first render
    if (historyRef.current.length === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // If user already has custom profile image, draw it as starting point
      if (customProfileImage) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          saveHistoryState();
          updateLivePreview();
        };
        img.src = customProfileImage;
      } else {
        saveHistoryState();
      }
    }
  }, [subTab, customProfileImage]);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current.push(snap);
      if (historyRef.current.length > 25) historyRef.current.shift();
    } catch {}
  };

  const updateLivePreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPreviewImage(canvas.toDataURL('image/png'));
  };

  // Drawing event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeSticker) {
      // Stamp sticker onto canvas
      ctx.font = '36px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(activeSticker, x, y);
      saveHistoryState();
      updateLivePreview();
      setActiveSticker(null);
      return;
    }

    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#FFFFFF' : color;
    ctx.lineWidth = brushSize;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      saveHistoryState();
      updateLivePreview();
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    if (prev) {
      ctx.putImageData(prev, 0, 0);
      updateLivePreview();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistoryState();
    updateLivePreview();
  };

  // Register drawn canvas as profile character
  const handleApplyProfile = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a circular crop on an offscreen canvas
    const size = 300;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Draw circular mask
    offCtx.beginPath();
    offCtx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    offCtx.clip();
    offCtx.drawImage(canvas, 0, 0, size, size);

    const dataUrl = offscreen.toDataURL('image/png');

    // Update state and localStorage
    onUpdateProfileImage(dataUrl);
    try {
      if (user) localStorage.setItem(`child_custom_profile_image_${user.id}`, dataUrl);
    } catch {}

    // Sync with backend if user is logged in
    if (user) {
      try {
        await updateUserProfileApi({ avatar: dataUrl });
      } catch (err) {
        console.warn('Profile avatar sync error:', err);
      }
    }

    try {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    } catch {}

    onShowToast('첫 화면과 로그인 창의 동그라미 캐릭터가 내가 그린 그림으로 바뀌었습니다! 🎉');
  };

  // Revert back to original cute mascot
  const handleResetProfile = async () => {
    onUpdateProfileImage('');
    setPreviewImage(APP_LOGO_URL);
    try {
      if (user) localStorage.removeItem(`child_custom_profile_image_${user.id}`);
      localStorage.removeItem('child_custom_profile_image');
    } catch {}

    if (user) {
      try {
        await updateUserProfileApi({ avatar: APP_LOGO_URL });
      } catch {}
    }

    onShowToast('기본 꼬마 화가 캐릭터로 복원되었습니다! 🎨');
  };

  // =========================================================================
  // MINI GAME LOGIC ("별빛과 물감 방울 모으기")
  // =========================================================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startMiniGame = () => {
    setIsPlaying(true);
    setScore(0);
    setGameMessage('화이팅! 하늘에서 떨어지는 별과 물감을 모아보세요 ✨');
    itemsRef.current = [];
    playerPosRef.current = { x: 150, targetX: 150, width: 60, height: 60 };

    const heroImg = new Image();
    heroImg.src = customProfileImage || APP_LOGO_URL;

    let currentScore = 0;
    let spawnTimer = 0;

    const loop = () => {
      const gCanvas = gameCanvasRef.current;
      if (!gCanvas) return;
      const ctx = gCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Clear background
      ctx.fillStyle = '#1E1B4B'; // Deep space night
      ctx.fillRect(0, 0, gCanvas.width, gCanvas.height);

      // Background stars sparkle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 20; i++) {
        const sx = (i * 37) % gCanvas.width;
        const sy = (i * 61 + (spawnTimer * 0.5)) % gCanvas.height;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // 2. Move Player
      const speed = 6;
      if (keysRef.current.left) playerPosRef.current.x -= speed;
      if (keysRef.current.right) playerPosRef.current.x += speed;

      // Bound player inside canvas
      const halfW = playerPosRef.current.width / 2;
      if (playerPosRef.current.x < halfW) playerPosRef.current.x = halfW;
      if (playerPosRef.current.x > gCanvas.width - halfW) playerPosRef.current.x = gCanvas.width - halfW;

      // 3. Spawn falling items
      spawnTimer++;
      if (spawnTimer % 35 === 0) {
        const r = Math.random();
        let type: 'star' | 'paint' | 'heart' = 'star';
        let symbol = '⭐';
        let points = 10;
        let itemSpeed = 2.5 + Math.random() * 2;

        if (r < 0.45) {
          type = 'star';
          symbol = '⭐';
          points = 10;
        } else if (r < 0.8) {
          type = 'paint';
          symbol = '🎨';
          points = 15;
          itemSpeed += 0.5;
        } else {
          type = 'heart';
          symbol = '💖';
          points = 25;
          itemSpeed += 1.0;
        }

        itemsRef.current.push({
          x: 20 + Math.random() * (gCanvas.width - 40),
          y: -20,
          speed: itemSpeed,
          type,
          symbol,
          points,
        });
      }

      // 4. Update and Draw items
      ctx.font = '24px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const py = gCanvas.height - 45;
      const px = playerPosRef.current.x;

      for (let i = itemsRef.current.length - 1; i >= 0; i--) {
        const item = itemsRef.current[i];
        item.y += item.speed;

        ctx.fillText(item.symbol, item.x, item.y);

        // Collision check
        const dist = Math.hypot(item.x - px, item.y - py);
        if (dist < 40) {
          currentScore += item.points;
          setScore(currentScore);
          itemsRef.current.splice(i, 1);

          // Cheerful encouragement message
          if (currentScore % 100 === 0 && currentScore > 0) {
            try {
              confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
            } catch {}
            setGameMessage(`대단해요! ${currentScore}점 달성! 🌟`);
          } else if (item.type === 'heart') {
            setGameMessage('하트 획득! +25점 💖');
          }

          continue;
        }

        // Remove if off bottom
        if (item.y > gCanvas.height + 30) {
          itemsRef.current.splice(i, 1);
        }
      }

      // 5. Draw Player Character inside glowing circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, 26, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#F59E0B'; // Gold border
      ctx.stroke();
      ctx.clip();

      if (heroImg.complete && heroImg.naturalWidth > 0) {
        ctx.drawImage(heroImg, px - 26, py - 26, 52, 52);
      } else {
        ctx.font = '28px sans-serif';
        ctx.fillText('🎨', px, py);
      }
      ctx.restore();

      gameAnimIdRef.current = requestAnimationFrame(loop);
    };

    gameAnimIdRef.current = requestAnimationFrame(loop);
  };

  const stopMiniGame = () => {
    if (gameAnimIdRef.current) {
      cancelAnimationFrame(gameAnimIdRef.current);
      gameAnimIdRef.current = null;
    }
    setIsPlaying(false);
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem('child_minigame_highscore', String(score));
      } catch {}
      setGameMessage(`와우! 새로운 최고 기록 ${score}점을 세웠어요! 🏆`);
    } else {
      setGameMessage(`게임 종료! 최종 점수: ${score}점 🌟`);
    }
  };

  useEffect(() => {
    return () => {
      if (gameAnimIdRef.current) {
        cancelAnimationFrame(gameAnimIdRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full max-w-4xl flex flex-col items-center">
      {/* Sub Tabs: Drawing vs Game */}
      <div className="flex bg-pink-100/80 p-1.5 rounded-2xl mb-6 shadow-inner gap-1">
        <button
          type="button"
          onClick={() => {
            if (isPlaying) stopMiniGame();
            setSubTab('draw');
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm md:text-base font-extrabold transition-all cursor-pointer title-font ${
            subTab === 'draw'
              ? 'bg-white text-pink-600 shadow-md scale-102'
              : 'text-gray-600 hover:text-pink-600'
          }`}
        >
          <span>🎨 나만의 캐릭터 그리기</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('game')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm md:text-base font-extrabold transition-all cursor-pointer title-font ${
            subTab === 'game'
              ? 'bg-white text-purple-600 shadow-md scale-102'
              : 'text-gray-600 hover:text-purple-600'
          }`}
        >
          <span>🎮 내가 그린 캐릭터로 미니게임!</span>
        </button>
      </div>

      {/* MODE 1: DRAW MY PROFILE */}
      {subTab === 'draw' && (
        <div className="w-full bg-white rounded-3xl p-5 md:p-8 shadow-xl border-2 border-pink-100 flex flex-col lg:flex-row gap-8 items-center lg:items-start">
          {/* Left Canvas Section */}
          <div className="flex flex-col items-center">
            <div className="relative p-2 bg-gradient-to-tr from-amber-100 via-pink-100 to-yellow-100 rounded-3xl shadow-md border-4 border-white mb-4">
              <canvas
                ref={canvasRef}
                width={300}
                height={300}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] bg-white rounded-2xl touch-none cursor-crosshair shadow-inner"
              />

              {/* Circular guide indicator overlay */}
              <div className="absolute inset-2 border-2 border-dashed border-amber-400/50 rounded-full pointer-events-none" />
            </div>

            {/* Canvas Actions */}
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={handleUndo}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer"
                title="한 획 취소"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>되돌리기</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-all cursor-pointer"
                title="도화지 전체 지우기"
              >
                <span>전체 지우기 🧹</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEraser(!isEraser)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isEraser
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span>지우개</span>
              </button>
            </div>

            {/* Color Palette */}
            <div className="w-full max-w-xs flex flex-wrap gap-2 justify-center mb-4">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setIsEraser(false);
                    setActiveSticker(null);
                  }}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer border-2 shadow-xs ${
                    color === c && !isEraser
                      ? 'scale-125 border-orange-500 ring-2 ring-orange-200'
                      : 'border-white hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* Brush Size */}
            <div className="w-full max-w-xs flex items-center justify-between gap-2 px-3 py-2 bg-amber-50/70 rounded-xl mb-4 text-xs font-bold text-gray-700">
              <span>선 굵기:</span>
              <div className="flex gap-2">
                {[3, 6, 12].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setBrushSize(s)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      brushSize === s ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border'
                    }`}
                  >
                    {s === 3 ? '얇게' : s === 6 ? '보통' : '두껍게'}
                  </button>
                ))}
              </div>
            </div>

            {/* Fun Stickers */}
            <div className="w-full max-w-xs bg-pink-50/60 p-2.5 rounded-2xl border border-pink-100">
              <span className="block text-[11px] font-bold text-pink-700 mb-1.5 text-center">
                ✨ 스티커 도장 찍기 (선택 후 도화지 클릭)
              </span>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {STICKERS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setActiveSticker(activeSticker === st ? null : st);
                      setIsEraser(false);
                    }}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer ${
                      activeSticker === st
                        ? 'bg-pink-500 text-white scale-120 shadow-md ring-2 ring-pink-200'
                        : 'bg-white hover:bg-pink-100 text-gray-700 shadow-xs'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Live Preview & Registration Section */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left justify-between h-full space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-extrabold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>첫 화면 &amp; 로그인창 원형 캐릭터 변경</span>
              </div>
              <h2 className="title-font text-2xl md:text-3xl text-gray-800 mb-2">
                내가 그린 캐릭터로 변신!
              </h2>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed max-w-md">
                도화지에 얼굴, 동물, 상상 속 캐릭터를 자유롭게 그려보세요.
                등록 버튼을 누르면 <strong>첫 화면</strong>과 <strong>로그인 화면</strong>의 둥근 원 속 대표 캐릭터가 이 그림으로 즉시 바뀝니다!
              </p>
            </div>

            {/* Live Preview Card */}
            <div className="w-full max-w-sm bg-gradient-to-b from-orange-50 to-amber-50 p-5 rounded-3xl border-2 border-amber-200 shadow-md flex flex-col items-center">
              <span className="text-xs font-extrabold text-amber-800 mb-3">
                👀 실시간 적용 미리보기 (첫 화면 / 로그인 창)
              </span>

              {/* The Exact Circular Frame */}
              <MascotCircle
                customImage={previewImage}
                alt="캐릭터 미리보기"
                className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-amber-300 shadow-xl transition-transform hover:scale-105"
              />

              <span className="text-[11px] font-bold text-gray-500 mt-3">
                {customProfileImage ? '✨ 현재 내가 그린 캐릭터가 적용되어 있습니다' : '🎨 기본 꼬마 화가 캐릭터'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-sm space-y-2.5">
              <button
                type="button"
                onClick={handleApplyProfile}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-orange-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer title-font text-base md:text-lg"
              >
                <Check className="w-5 h-5" />
                <span>이 그림을 내 대표 캐릭터로 등록하기! ✨</span>
              </button>

              <button
                type="button"
                onClick={handleResetProfile}
                className="w-full bg-white hover:bg-gray-50 text-gray-600 font-bold py-2.5 px-4 rounded-xl border border-gray-200 text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>기본 캐릭터로 복원 🔄</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: MINI GAME WITH MY CHARACTER */}
      {subTab === 'game' && (
        <div className="w-full bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-900 rounded-3xl p-6 shadow-2xl border-4 border-indigo-400 text-white flex flex-col items-center">
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-1.5 bg-yellow-400 text-indigo-950 px-3.5 py-1 rounded-full text-xs font-black mb-2 shadow">
              <Trophy className="w-3.5 h-3.5" />
              <span>최고 기록: {highScore}점</span>
            </div>
            <h2 className="title-font text-3xl md:text-4xl text-amber-300 drop-shadow-sm mb-1">
              반짝별 &amp; 물감 방울 모으기! 🌟
            </h2>
            <p className="text-xs md:text-sm text-indigo-200">
              내가 그린 캐릭터가 우주로 날아갔어요! 키보드 화살표(←, →)나 화면 터치로 별을 모아봐요.
            </p>
          </div>

          {/* Game Canvas */}
          <div className="relative border-4 border-indigo-300 rounded-3xl overflow-hidden shadow-2xl bg-indigo-950 mb-4">
            <canvas
              ref={gameCanvasRef}
              width={340}
              height={400}
              className="w-[300px] h-[360px] sm:w-[340px] sm:h-[400px] block"
              onPointerMove={(e) => {
                if (!isPlaying) return;
                const canvas = gameCanvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                playerPosRef.current.x = x;
              }}
            />

            {/* Overlay if not playing */}
            {!isPlaying && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <MascotCircle
                  customImage={customProfileImage}
                  alt="주인공 캐릭터"
                  className="w-20 h-20 border-4 border-amber-300 mb-3 shadow-xl"
                />
                <h3 className="title-font text-2xl text-amber-300 mb-2">
                  준비되셨나요?
                </h3>
                <p className="text-xs text-indigo-200 mb-5 leading-relaxed">
                  하늘에서 떨어지는 황금별(⭐ +10), 물감(🎨 +15), 하트(💖 +25)를 바구니에 담아보세요!
                </p>
                <button
                  type="button"
                  onClick={startMiniGame}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-indigo-950 font-black text-lg px-8 py-3.5 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer title-font"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>게임 시작!</span>
                </button>
              </div>
            )}
          </div>

          {/* Current Score & Encouragement Message */}
          <div className="w-full max-w-sm flex items-center justify-between bg-indigo-900/80 border border-indigo-400 px-5 py-3 rounded-2xl mb-4">
            <div>
              <span className="text-xs text-indigo-300 block">현재 점수</span>
              <span className="text-2xl font-black text-amber-300 title-font">{score}점</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-amber-200 font-bold">{gameMessage}</span>
            </div>
          </div>

          {/* Touch Controls for Mobile/Tablet */}
          {isPlaying && (
            <div className="flex gap-4 w-full max-w-xs justify-center mb-3">
              <button
                type="button"
                onPointerDown={() => { keysRef.current.left = true; }}
                onPointerUp={() => { keysRef.current.left = false; }}
                onPointerLeave={() => { keysRef.current.left = false; }}
                className="flex-1 bg-indigo-800 hover:bg-indigo-700 active:bg-indigo-600 py-3 rounded-2xl font-black flex items-center justify-center gap-1 shadow cursor-pointer text-sm"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>왼쪽</span>
              </button>
              <button
                type="button"
                onPointerDown={() => { keysRef.current.right = true; }}
                onPointerUp={() => { keysRef.current.right = false; }}
                onPointerLeave={() => { keysRef.current.right = false; }}
                className="flex-1 bg-indigo-800 hover:bg-indigo-700 active:bg-indigo-600 py-3 rounded-2xl font-black flex items-center justify-center gap-1 shadow cursor-pointer text-sm"
              >
                <span>오른쪽</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {isPlaying && (
            <button
              type="button"
              onClick={stopMiniGame}
              className="text-xs text-indigo-300 hover:text-white underline cursor-pointer"
            >
              게임 종료하기
            </button>
          )}
        </div>
      )}
    </div>
  );
};
