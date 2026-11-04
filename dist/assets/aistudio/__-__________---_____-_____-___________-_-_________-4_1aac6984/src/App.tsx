import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Plus, 
  RotateCcw, 
  Sparkles, 
  Heart, 
  Send, 
  Download, 
  BookOpen, 
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Lock,
  LogIn,
  Maximize2,
  Minimize2,
  Printer,
  Cloud,
  Save
} from 'lucide-react';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { CanvasPalette } from './components/CanvasPalette';
import { ColorWheelModal } from './components/ColorWheelModal';
import { ArtworkDetailModal } from './components/ArtworkDetailModal';
import { DiaryDetailModal } from './components/DiaryDetailModal';
import { RecordDetailModal } from './components/RecordDetailModal';
import { DiagnosisCertificateModal } from './components/DiagnosisCertificateModal';
import { 
  analyzeChildDrawing, 
  fetchCurrentUser, 
  logoutApi, 
  sendParentEmailApi,
  fetchUserData,
  saveUserData
} from './services/api';
import { 
  Artwork, 
  DiaryEntry, 
  PsychologyRecord, 
  UserProfile, 
  DrawingStroke, 
  RuleInsights 
} from './types';

export default function App() {
  // Navigation: 1 = Start, 2 = Mode Select, 3 = Canvas, 4 = Analysis, 5 = Atelier
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentMode, setCurrentMode] = useState<'simple' | 'analysis'>('simple');

  // User Authentication State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginPromptMessage, setLoginPromptMessage] = useState<string>('');

  // Per-User Account Scoped Data
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [records, setRecords] = useState<PsychologyRecord[]>([]);

  // Pending Drawing when unauthenticated user completes drawing
  const pendingDrawingRef = useRef<{
    dataUrl: string;
    insights: RuleInsights;
    mode: 'simple' | 'analysis';
  } | null>(null);

  // Active Atelier Tab
  const [atelierTab, setAtelierTab] = useState<'artworks' | 'diary' | 'records'>('artworks');

  // Current Drawing / Session State
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentRuleInsights, setCurrentRuleInsights] = useState<RuleInsights | null>(null);
  const [currentAnalysisHtml, setCurrentAnalysisHtml] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [parentEmail, setParentEmail] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // Diary Input State
  const [newDiaryText, setNewDiaryText] = useState<string>('');
  const [selectedArtworkForDiary, setSelectedArtworkForDiary] = useState<Artwork | null>(null);

  // Modals for detail preview
  const [selectedArtworkDetail, setSelectedArtworkDetail] = useState<Artwork | null>(null);
  const [selectedDiaryDetail, setSelectedDiaryDetail] = useState<DiaryEntry | null>(null);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<PsychologyRecord | null>(null);
  const [selectedRecordForCertificate, setSelectedRecordForCertificate] = useState<PsychologyRecord | null>(null);

  // Real-time Drawing Auto-Backup State
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(false);
  const [savedDraftStrokeCount, setSavedDraftStrokeCount] = useState<number>(0);
  const [showDraftBanner, setShowDraftBanner] = useState<boolean>(false);

  // Color Wheel Modal State
  const [isColorWheelOpen, setIsColorWheelOpen] = useState(false);

  // Fullscreen Canvas Mode State (ㄴㄱ 모양)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Clear Canvas and Home navigation confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Canvas Drawing Tools State
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [currentBrushSize, setCurrentBrushSize] = useState<number>(6);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const strokesRef = useRef<DrawingStroke[]>([]);
  const undoneStrokesRef = useRef<DrawingStroke[]>([]);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Load account-specific data whenever user changes
  const loadUserAccountData = useCallback(async (loggedInUser: UserProfile | null) => {
    if (!loggedInUser) {
      setArtworks([]);
      setDiaries([]);
      setRecords([]);
      return;
    }

    try {
      const localArt = localStorage.getItem(`child_artworks_${loggedInUser.id}`);
      const localDia = localStorage.getItem(`child_diaries_${loggedInUser.id}`);
      const localRec = localStorage.getItem(`child_records_${loggedInUser.id}`);

      let loadedArtworks = localArt ? JSON.parse(localArt) : [];
      let loadedDiaries = localDia ? JSON.parse(localDia) : [];
      let loadedRecords = localRec ? JSON.parse(localRec) : [];

      // Also try fetching from server store for persistence
      const serverData = await fetchUserData(loggedInUser.id);
      if (serverData.artworks && serverData.artworks.length > loadedArtworks.length) {
        loadedArtworks = serverData.artworks;
      }
      if (serverData.diaries && serverData.diaries.length > loadedDiaries.length) {
        loadedDiaries = serverData.diaries;
      }
      if (serverData.records && serverData.records.length > loadedRecords.length) {
        loadedRecords = serverData.records;
      }

      setArtworks(loadedArtworks);
      setDiaries(loadedDiaries);
      setRecords(loadedRecords);
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }, []);

  // Check existing session token on mount
  useEffect(() => {
    const token = localStorage.getItem('child_draw_token');
    if (token) {
      fetchCurrentUser(token).then((existingUser) => {
        if (existingUser) {
          setUser(existingUser);
          loadUserAccountData(existingUser);
        }
      });
    }
  }, [loadUserAccountData]);

  // Sync to account-scoped localStorage & server whenever user data changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(`child_artworks_${user.id}`, JSON.stringify(artworks));
        localStorage.setItem(`child_diaries_${user.id}`, JSON.stringify(diaries));
        localStorage.setItem(`child_records_${user.id}`, JSON.stringify(records));
        saveUserData(user.id, { artworks, diaries, records });
      } catch (e) {
        console.error('Error saving user data:', e);
      }
    }
  }, [user, artworks, diaries, records]);

  // Handle Login Success
  const handleLoginSuccess = (loggedInUser: UserProfile, token: string) => {
    setUser(loggedInUser);
    localStorage.setItem('child_draw_token', token);
    loadUserAccountData(loggedInUser);

    // If there was a pending drawing waiting to be saved to this account
    if (pendingDrawingRef.current) {
      const { dataUrl, insights, mode } = pendingDrawingRef.current;
      pendingDrawingRef.current = null;
      commitDrawingToAccount(loggedInUser, dataUrl, insights, mode);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    const token = localStorage.getItem('child_draw_token');
    if (token) await logoutApi(token);
    localStorage.removeItem('child_draw_token');
    setUser(null);
    setArtworks([]);
    setDiaries([]);
    setRecords([]);
    showToast('로그아웃 되었습니다. 저장된 내용은 로그인 후 다시 확인할 수 있습니다.');
  };

  // --- Canvas Logic ---
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    strokesRef.current = [];
    undoneStrokesRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  };

  useEffect(() => {
    if (currentPage === 3) {
      const timer = setTimeout(() => {
        initCanvas();
        // Check for previously saved draft
        try {
          const raw = localStorage.getItem('atelier_drawing_draft');
          if (raw) {
            const backup = JSON.parse(raw);
            if (backup && backup.strokes && backup.strokes.length > 0) {
              setHasSavedDraft(true);
              setSavedDraftStrokeCount(backup.strokes.length);
              setShowDraftBanner(true);
              if (backup.timestamp) {
                setLastBackupTime(
                  new Date(backup.timestamp).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                );
              }
            }
          }
        } catch {}
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // Fullscreen Canvas Toggle with drawing preservation
  const toggleFullscreen = () => {
    const canvas = canvasRef.current;
    const prevData = canvas ? canvas.toDataURL() : null;

    setIsFullscreen((prev) => {
      const next = !prev;
      setTimeout(() => {
        const c = canvasRef.current;
        if (!c || !c.parentElement) return;
        const rect = c.parentElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        c.width = rect.width;
        c.height = rect.height;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          if (prevData) {
            const img = new Image();
            img.src = prevData;
            img.onload = () => {
              ctx.drawImage(img, 0, 0);
            };
          }
        }
      }, 70);
      return next;
    });
  };

  // Exit fullscreen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const pos = getCanvasPos(e);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentColor === '#FFFFFF' ? 24 : currentBrushSize;

    currentStrokeRef.current = {
      color: currentColor,
      thickness: currentColor === '#FFFFFF' ? 24 : currentBrushSize,
      startTime: Date.now(),
      points: [{ x: pos.x, y: pos.y, time: Date.now() }],
    };
    strokesRef.current.push(currentStrokeRef.current);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push({
        x: pos.x,
        y: pos.y,
        time: Date.now(),
      });
    }
  };

  const saveDrawingDraft = useCallback((isManual = false) => {
    if (strokesRef.current.length === 0) return;
    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas ? canvas.toDataURL('image/png') : '';
      const backupData = {
        strokes: strokesRef.current,
        timestamp: Date.now(),
        mode: currentMode,
        dataUrl,
        strokeCount: strokesRef.current.length,
      };
      localStorage.setItem('atelier_drawing_draft', JSON.stringify(backupData));
      const timeStr = new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setLastBackupTime(timeStr);
      setHasSavedDraft(true);
      setSavedDraftStrokeCount(strokesRef.current.length);
      if (isManual) {
        showToast('현재 그림이 안전하게 실시간 백업되었습니다! 💾');
      }
    } catch (e) {
      console.warn('Draft backup error:', e);
    }
  }, [currentMode]);

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
    currentStrokeRef.current = null;
    undoneStrokesRef.current = [];
    setCanUndo(strokesRef.current.length > 0);
    setCanRedo(false);

    // Real-time automatic background backup
    saveDrawingDraft(false);
  };

  const redrawCanvasFromStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokesRef.current.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  }, []);

  const handleRestoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem('atelier_drawing_draft');
      if (!raw) {
        showToast('보관된 백업 그림이 없습니다.');
        return;
      }
      const backup = JSON.parse(raw);
      if (backup && backup.strokes && backup.strokes.length > 0) {
        strokesRef.current = backup.strokes;
        undoneStrokesRef.current = [];
        redrawCanvasFromStrokes();
        setCanUndo(true);
        setCanRedo(false);
        setShowDraftBanner(false);
        showToast(`이전에 그리던 소중한 그림(${backup.strokes.length}개 선)을 복원했습니다! 🎨`);
      }
    } catch {
      showToast('백업 복원 중 오류가 발생했습니다.');
    }
  }, [redrawCanvasFromStrokes]);

  // Undo: 한단계 뒤로 가기
  const handleUndo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    const popped = strokesRef.current.pop();
    if (popped) {
      undoneStrokesRef.current.push(popped);
    }
    redrawCanvasFromStrokes();
    setCanUndo(strokesRef.current.length > 0);
    setCanRedo(undoneStrokesRef.current.length > 0);
    saveDrawingDraft(false);
    showToast('한 단계 뒤로 이동했어요 ↩️');
  }, [redrawCanvasFromStrokes, saveDrawingDraft]);

  // Redo: 한단계 앞으로 가기
  const handleRedo = useCallback(() => {
    if (undoneStrokesRef.current.length === 0) return;
    const restored = undoneStrokesRef.current.pop();
    if (restored) {
      strokesRef.current.push(restored);
    }
    redrawCanvasFromStrokes();
    setCanUndo(strokesRef.current.length > 0);
    setCanRedo(undoneStrokesRef.current.length > 0);
    saveDrawingDraft(false);
    showToast('한 단계 앞으로 이동했어요 ↪️');
  }, [redrawCanvasFromStrokes, saveDrawingDraft]);

  // Keyboard shortcuts (Ctrl+Z: Undo, Ctrl+Y or Ctrl+Shift+Z: Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentPage !== 3) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, handleUndo, handleRedo]);

  const handleClearCanvas = () => {
    initCanvas();
    setShowClearConfirm(false);
    showToast('스케치북을 깨끗이 지웠어요! 🧼');
  };

  // Rule-based diagnostic calculation
  const calculateDrawingRules = (): RuleInsights => {
    const canvas = canvasRef.current;
    const strokes = strokesRef.current;
    if (!canvas || strokes.length === 0) {
      return {
        summary: '그림 정보 없음',
        appliedRules: ['자유 드로잉'],
        areaRatio: 0.3,
        centerYRatio: 0.5,
        speed: 1.0,
      };
    }

    let minX = canvas.width;
    let maxX = 0;
    let minY = canvas.height;
    let maxY = 0;
    let totalDist = 0;
    let totalTime = 0;

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      for (let i = 0; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (i > 0) {
          const prev = stroke.points[i - 1];
          totalDist += Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2));
          totalTime += p.time - prev.time;
        }
      }
    });

    const drawWidth = Math.max(0, maxX - minX);
    const drawHeight = Math.max(0, maxY - minY);
    const areaRatio = Math.min(1, Math.max(0.05, (drawWidth * drawHeight) / (canvas.width * canvas.height)));
    const centerYRatio = drawHeight === 0 ? 0.5 : (minY + maxY) / 2 / canvas.height;
    const speed = totalTime > 0 ? totalDist / totalTime : 1.0;

    const rules: string[] = [];
    if (areaRatio <= 0.15 && centerYRatio >= 0.75) {
      rules.push('화면 하단 집중 및 소극적 공간 사용 ➔ [정서적 지지 및 관심이 필요한 상태]');
    } else if (areaRatio >= 0.7) {
      rules.push('캔버스 전체를 적극적으로 활용 ➔ [풍부한 에너지와 높은 표현 욕구]');
    } else {
      rules.push('안정적인 중심 구도 ➔ [편안하고 균형 잡힌 정서]');
    }

    if (speed > 2.8) {
      rules.push('빠르고 즉흥적인 필속 ➔ [생동감 있는 창의성과 높은 활력]');
    }

    return {
      summary: `화면 활용: ${(areaRatio * 100).toFixed(0)}%, 중심 Y: ${(centerYRatio * 100).toFixed(0)}%`,
      appliedRules: rules,
      areaRatio,
      centerYRatio,
      speed,
    };
  };

  const handleSaveDrawingPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `내그림-${Date.now()}.png`;
    a.click();
    showToast('스케치북 그림이 기기에 저장되었습니다! 💾');
  };

  // Commit Drawing to Logged-in Account
  const commitDrawingToAccount = (
    accountUser: UserProfile,
    dataUrl: string,
    insights: RuleInsights,
    mode: 'simple' | 'analysis'
  ) => {
    setCurrentImage(dataUrl);
    setCurrentRuleInsights(insights);

    const now = new Date();
    const dateStr = now.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newArtwork: Artwork = {
      id: `art_${Date.now()}`,
      imgData: dataUrl,
      date: dateStr,
      timestamp: Date.now(),
      mode,
      ruleInsights: insights,
    };

    setArtworks((prev) => [newArtwork, ...prev]);

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    if (mode === 'simple') {
      showToast(`${accountUser.name} 님의 계정에 작품이 안전하게 저장되었습니다! ✨`);
      setCurrentPage(5);
      setAtelierTab('artworks');
    } else {
      setCurrentPage(4);
      triggerPsychologyAnalysis(dataUrl, insights, newArtwork.id, dateStr, accountUser);
    }

    // Clear active draft since drawing is now officially saved
    try {
      localStorage.removeItem('atelier_drawing_draft');
      setHasSavedDraft(false);
      setShowDraftBanner(false);
    } catch {}
  };

  // Finish Drawing Button Handler
  const handleFinishDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coloredStrokes = strokesRef.current.filter((s) => s.color !== '#FFFFFF');
    if (coloredStrokes.length === 0) {
      showToast('아직 아무것도 그리지 않았어요! 캔버스에 먼저 그림을 그려주세요 🎨');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const insights = calculateDrawingRules();

    // If user is not logged in, prompt login so it gets saved to their account!
    if (!user) {
      pendingDrawingRef.current = { dataUrl, insights, mode: currentMode };
      setLoginPromptMessage(
        '아이의 소중한 작품과 심리 분석 기록을 내 계정에 안전하게 저장하기 위해 로그인이 필요해요! 3초만에 로그인해 보세요 🎨'
      );
      setIsLoginModalOpen(true);
      return;
    }

    commitDrawingToAccount(user, dataUrl, insights, currentMode);
  };

  // Psychology Analysis Trigger
  const triggerPsychologyAnalysis = async (
    dataUrl: string,
    insights: RuleInsights,
    artworkId: string,
    dateStr: string,
    accountUser: UserProfile
  ) => {
    setIsAnalyzing(true);
    setCurrentAnalysisHtml('');

    try {
      const htmlResult = await analyzeChildDrawing({
        imageData: dataUrl,
        realtimeRules: insights,
      });

      setCurrentAnalysisHtml(htmlResult);

      const newRecord: PsychologyRecord = {
        id: `rec_${Date.now()}`,
        artworkId,
        imgData: dataUrl,
        analysisHtml: htmlResult,
        date: dateStr,
        timestamp: Date.now(),
        ruleInsights: insights,
        parentEmailSent: false,
      };

      setRecords((prev) => [newRecord, ...prev]);
      showToast(`${accountUser.name} 님의 계정에 심리 분석 기록이 저장되었습니다! 🔮`);
    } catch (err: any) {
      console.error('Analysis error:', err);
      const fallbackHtml = `
        <div class="analysis-report">
          <h3 style="color:#9333ea; font-size:1.15rem; font-weight:bold; margin-top:0.5rem; margin-bottom:0.5rem;">🎨 1. 아이의 현재 심리 종합 진단</h3>
          <p style="margin-bottom:0.75rem; line-height:1.6;">
            아이는 그림을 통해 자신만의 솔직한 감정과 풍부한 상상력을 자유롭게 발휘하고 있습니다.
            캔버스 중심부에 구성된 균형 있는 선 표현은 정서적인 편안함과 안정감을 나타냅니다.
          </p>
          <h3 style="color:#9333ea; font-size:1.15rem; font-weight:bold; margin-top:1rem; margin-bottom:0.5rem;">🔍 2. 형태 및 공간 심층 해석</h3>
          <p style="margin-bottom:0.75rem; line-height:1.6;">
            공간을 ${(insights.areaRatio * 100).toFixed(0)}% 가량 활용하며 주도적으로 자신의 세계를 표현하였습니다.
            ${insights.appliedRules[0] || '자유로운 선의 흐름에서 활발한 에너지가 돋보입니다.'}
          </p>
          <h3 style="color:#9333ea; font-size:1.15rem; font-weight:bold; margin-top:1rem; margin-bottom:0.5rem;">💡 3. 부모님을 위한 맞춤형 조언</h3>
          <p style="margin-bottom:0.75rem; line-height:1.6;">
            "오늘 그린 그림에서 가장 마음에 드는 부분은 어디야?"라고 물어보며 아이의 생각에 귀 기울여 주세요. 아이의 창의성을 높이는 데 큰 힘이 됩니다.
          </p>
        </div>
      `;
      setCurrentAnalysisHtml(fallbackHtml);

      const newRecord: PsychologyRecord = {
        id: `rec_${Date.now()}`,
        artworkId,
        imgData: dataUrl,
        analysisHtml: fallbackHtml,
        date: dateStr,
        timestamp: Date.now(),
        ruleInsights: insights,
        parentEmailSent: false,
      };

      setRecords((prev) => [newRecord, ...prev]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Send Parent Email Handler
  const handleSendParentEmail = async () => {
    if (!parentEmail || !parentEmail.includes('@')) {
      showToast('올바른 부모님 이메일 주소를 입력해 주세요! ✉️');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await sendParentEmailApi({
        email: parentEmail,
        childName: user?.name || '우리아이',
        analysisText: currentAnalysisHtml,
      });

      setRecords((prev) =>
        prev.map((rec, idx) =>
          idx === 0 ? { ...rec, parentEmailSent: true, sentEmailAddress: parentEmail } : rec
        )
      );

      showToast(res?.message || '메일 발송이 완료되었습니다.');
      setParentEmail('');
    } catch (err: any) {
      showToast(err.message || '이메일 발송 중 오류가 발생했습니다.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Save Diary Handler
  const handleSaveDiary = () => {
    if (!user) {
      setLoginPromptMessage('일기를 저장하려면 로그인이 필요해요! 3초만에 로그인해 보세요 📝');
      setIsLoginModalOpen(true);
      return;
    }

    if (!newDiaryText.trim()) {
      showToast('일기 내용을 적어주세요! 📝');
      return;
    }

    const targetArtwork = selectedArtworkForDiary || artworks[0];
    if (!targetArtwork) {
      showToast('일기에 첨부할 그림이 없어요. 먼저 그림을 그려보세요!');
      return;
    }

    const newDiary: DiaryEntry = {
      id: `diary_${Date.now()}`,
      artworkId: targetArtwork.id,
      imgData: targetArtwork.imgData,
      text: newDiaryText.trim(),
      weather: '맑음 ☀️',
      date: new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      timestamp: Date.now(),
    };

    setDiaries((prev) => [newDiary, ...prev]);
    setNewDiaryText('');
    showToast(`${user.name} 님의 계정에 그림 일기가 저장되었습니다! 📖✨`);
  };

  // Home Navigation
  const handleGoHome = () => {
    if (currentPage === 3 && strokesRef.current.length > 0) {
      setShowHomeConfirm(true);
    } else {
      setCurrentPage(1);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-gray-800 font-sans relative flex flex-col select-none">
      {/* Top Header with Home button & User Login */}
      <Header
        currentPage={currentPage}
        onGoHome={handleGoHome}
        user={user}
        onOpenLoginModal={() => {
          setLoginPromptMessage('로그인하여 내 계정에 그림과 심리 분석 기록을 안전하게 보관하세요!');
          setIsLoginModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Main Pages */}
      <main className="flex-1 flex flex-col">
        {/* ================= PAGE 1: START SCREEN ================= */}
        {currentPage === 1 && (
          <section className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-orange-50 via-amber-50 to-yellow-100 text-center animate-in fade-in duration-300">
            <div className="max-w-xl w-full flex flex-col items-center">
              <div className="inline-flex items-center gap-2 bg-orange-100 border border-orange-200 text-orange-600 px-4 py-1.5 rounded-full text-sm font-bold mb-4 shadow-sm">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>아동 마음 표현 &amp; HTP 미술 심리 스케치북</span>
              </div>

              <h1 className="title-font text-6xl md:text-8xl text-orange-500 mb-6 drop-shadow-sm tracking-tight">
                다 그렸어요!
              </h1>

              <p className="text-xl md:text-2xl text-gray-700 mb-10 leading-relaxed font-medium">
                안녕! 오늘 하루는 어땠어?<br />
                너의 마음속 소중한 이야기를<br />
                <span className="text-orange-500 font-bold">그림</span>으로 자유롭게 표현해볼까?
              </p>

              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <button
                  onClick={() => setCurrentPage(2)}
                  className="title-font bg-gradient-to-r from-orange-400 to-amber-500 text-white px-10 py-5 rounded-full text-2xl md:text-3xl shadow-xl hover:shadow-orange-200 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <span>그림 그리기 시작 🎨</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentPage(5);
                    setAtelierTab('artworks');
                  }}
                  className="title-font bg-white border-2 border-pink-300 text-pink-600 hover:bg-pink-50 px-8 py-5 rounded-full text-xl md:text-2xl shadow-md hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <span>내 아틀리에 구경 🖼️</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE 2: MODE SELECTION ================= */}
        {currentPage === 2 && (
          <section className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-orange-50 animate-in fade-in duration-300">
            <div className="text-center max-w-lg w-full mt-10">
              <span className="text-4xl md:text-5xl mb-3 block">🎨</span>
              <h2 className="title-font text-4xl md:text-5xl text-amber-600 mb-4">
                어떻게 그리고 싶나요?
              </h2>
              <p className="text-base md:text-lg text-gray-600 mb-10">
                원하는 그림 그리기 방법을 선택해주세요! 상단 홈 버튼으로 언제든 돌아올 수 있어요.
              </p>

              <div className="flex flex-col gap-6 w-full">
                {/* Mode 1: Simple Free Drawing */}
                <button
                  onClick={() => {
                    setCurrentMode('simple');
                    setCurrentPage(3);
                  }}
                  className="group relative overflow-hidden title-font bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white p-7 rounded-3xl text-2xl md:text-3xl shadow-xl hover:shadow-sky-200 hover:scale-[1.03] active:scale-95 transition-all duration-300 flex flex-col items-center text-center gap-2 border-4 border-white"
                >
                  <div className="flex items-center gap-3">
                    <span>🎨 그림만 그릴거에요!</span>
                  </div>
                  <span className="text-sm font-sans font-normal text-sky-100 opacity-90">
                    심리 분석 없이 자유롭게 마음껏 스케치하고 갤러리에 저장해요
                  </span>
                </button>

                {/* Mode 2: Analysis (HTP Psychology) */}
                <button
                  onClick={() => {
                    setCurrentMode('analysis');
                    setCurrentPage(3);
                  }}
                  className="group relative overflow-hidden title-font bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white p-7 rounded-3xl text-2xl md:text-3xl shadow-xl hover:shadow-purple-200 hover:scale-[1.03] active:scale-95 transition-all duration-300 flex flex-col items-center text-center gap-2 border-4 border-white"
                >
                  <div className="flex items-center gap-3">
                    <span>✨ 다 그리면 보여줄거에요!</span>
                  </div>
                  <span className="text-sm font-sans font-normal text-purple-100 opacity-90">
                    &lt;집, 나무, 사람&gt;을 그리면 AI 심리 전문가가 아이의 마음을 해석해줘요
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ================= PAGE 3: CANVAS DRAWING ================= */}
        {currentPage === 3 && (
          <section
            className={`min-h-screen flex flex-col items-center justify-start p-3 md:p-6 bg-gradient-to-b from-blue-50 via-sky-50 to-indigo-50 animate-in fade-in duration-300 ${
              isFullscreen ? 'fixed inset-0 z-50 !p-2 md:!p-3 bg-[#EEF5FF] h-screen w-screen overflow-hidden' : ''
            }`}
          >
            <div
              className={`w-full flex flex-col h-full ${
                isFullscreen ? 'h-full max-w-none' : 'max-w-6xl mt-14 md:mt-16'
              }`}
            >
              {/* Title & Mode Notice (Compact bar in Fullscreen mode) */}
              <div
                className={`text-center ${
                  isFullscreen
                    ? 'mb-1.5 flex flex-wrap items-center justify-between bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-sm border border-blue-100 gap-2'
                    : 'mb-3'
                }`}
              >
                {isFullscreen ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="title-font text-lg md:text-xl text-blue-600">
                        {currentMode === 'analysis' ? '마음을 담아 그려봐요 ✨' : '자유 스케치북 🎨'}
                      </span>
                      {currentMode === 'analysis' && (
                        <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2.5 py-0.5 rounded-full border border-purple-200 hidden sm:inline">
                          집, 나무, 사람 🏠 🌳 👧
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveDrawingPNG}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">그림 저장</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleFinishDrawing}
                        className={`flex items-center gap-1 px-3.5 py-1.5 text-white rounded-xl text-xs font-bold shadow-sm transition-all ${
                          currentMode === 'analysis' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{currentMode === 'analysis' ? '다 그렸어요!' : '완성!'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-200 transition-colors"
                        title="기본 크기로 축소 (ESC)"
                      >
                        <Minimize2 className="w-4 h-4 text-blue-600" />
                        <span>화면 축소 (ESC)</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="title-font text-3xl md:text-4xl text-blue-600">
                      {currentMode === 'analysis' ? '마음을 담아 그려봐요 ✨' : '마음껏 자유롭게 그려봐! 🎨'}
                    </h2>
                    {currentMode === 'analysis' && (
                      <p className="text-purple-700 font-bold text-sm md:text-base mt-1.5 bg-purple-100/90 inline-block px-5 py-1.5 rounded-full border-2 border-purple-300 shadow-sm animate-pulse">
                        &lt;집, 나무, 사람을 그려주세요 🏠 🌳 👧&gt;
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Real-time Draft Restoration Banner */}
              {showDraftBanner && hasSavedDraft && !isFullscreen && (
                <div className="mb-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-3 shadow-md flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-900 font-bold text-center sm:text-left">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                    <span>
                      이전에 그리던 소중한 그림(선 {savedDraftStrokeCount}개{lastBackupTime ? `, ${lastBackupTime} 백업` : ''})이 안전하게 보관되어 있어요! 이어서 그리시겠어요?
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleRestoreDraft}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-xs shadow-xs hover:scale-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>이어 그리기 🖌️</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDraftBanner(false);
                        localStorage.removeItem('atelier_drawing_draft');
                        setHasSavedDraft(false);
                        showToast('새 도화지에서 시작합니다! 🎨');
                      }}
                      className="bg-white hover:bg-gray-100 text-gray-600 font-bold px-3 py-1.5 rounded-xl text-xs border border-gray-300 transition-all cursor-pointer"
                    >
                      <span>새로 그리기 🎨</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Side-by-Side Drawing Workspace: Side Palette + Canvas Area */}
              <div
                className={`flex flex-col md:flex-row gap-3.5 items-stretch ${
                  isFullscreen ? 'flex-1 min-h-0' : ''
                }`}
              >
                {/* 물감 도구들 (옆에 배치하여 캔버스 작업 공간 극대화) */}
                <div className="w-full md:w-56 lg:w-60 shrink-0 flex flex-col justify-start">
                  <CanvasPalette
                    currentColor={currentColor}
                    onSelectColor={setCurrentColor}
                    currentBrushSize={currentBrushSize}
                    onSelectBrushSize={setCurrentBrushSize}
                    onClearCanvas={() => setShowClearConfirm(true)}
                    onOpenColorWheel={() => setIsColorWheelOpen(true)}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    lastBackupTime={lastBackupTime}
                    hasBackup={hasSavedDraft}
                    onRestoreBackup={handleRestoreDraft}
                    onManualBackup={() => saveDrawingDraft(true)}
                  />
                </div>

                {/* Responsive Drawing Canvas Area with Fullscreen ㄴㄱ Icon Button */}
                <div
                  className={`flex-1 min-w-0 bg-white rounded-3xl shadow-xl border-4 border-white overflow-hidden relative cursor-crosshair touch-none ${
                    isFullscreen ? 'h-full flex-1 min-h-0' : ''
                  }`}
                  style={isFullscreen ? { height: '100%' } : { height: '64vh', minHeight: '440px' }}
                >
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full block bg-white"
                  />

                  {/* ㄴㄱ 모양 전체화면 버튼 (Full Screen Toggle Button) */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className={`absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 md:px-3.5 md:py-2 rounded-2xl shadow-lg font-bold text-xs md:text-sm hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                      isFullscreen
                        ? 'bg-black/70 hover:bg-black/85 text-white border-2 border-white/40'
                        : 'bg-white/95 backdrop-blur-md text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400'
                    }`}
                    title={isFullscreen ? '원래 크기로 돌아가기 (ESC)' : '전체화면으로 그리기 (ㄴㄱ)'}
                    aria-label={isFullscreen ? '전체화면 종료' : '전체화면으로 그리기'}
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        <span>화면 축소</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                        <span>전체화면</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Bottom Actions (Only in normal view) */}
              {!isFullscreen && (
                <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-3 pb-6">
                  <button
                    type="button"
                    onClick={handleSaveDrawingPNG}
                    className="title-font bg-blue-500 hover:bg-blue-600 text-white px-8 py-3.5 rounded-full text-xl shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    <span>그림 저장하기 💾</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinishDrawing}
                    className={`title-font text-white px-10 py-3.5 rounded-full text-xl md:text-2xl shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 w-full sm:w-auto flex items-center justify-center gap-2 ${
                      currentMode === 'analysis'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
                    }`}
                  >
                    <Sparkles className="w-6 h-6" />
                    <span>{currentMode === 'analysis' ? '다 그렸어요! (분석받기) ✨' : '완성! (갤러리로) ✨'}</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= PAGE 4: PSYCHOLOGY ANALYSIS ================= */}
        {currentPage === 4 && (
          <section className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-b from-purple-50 via-pink-50 to-orange-50 animate-in fade-in duration-300">
            <div className="max-w-2xl w-full bg-white p-6 md:p-8 rounded-3xl shadow-2xl border-2 border-purple-100 mt-14 flex flex-col items-center">
              {isAnalyzing ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-6" />
                  <h2 className="title-font text-3xl text-purple-700 mb-3">
                    그림을 찬찬히 살펴보는 중이야... 🔍
                  </h2>
                  <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                    실시간 드로잉 데이터와 <span className="font-bold text-purple-600">HTP 아동 미술 심리 치료 모델</span>을 연동하여<br />
                    아이의 소중한 마음 상태를 분석하고 있습니다.
                  </p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                    <Sparkles className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="title-font text-3xl text-purple-700 mb-2">분석 완료!</h2>
                  <p className="text-xs text-gray-500 mb-4">
                    💡 이 분석 결과는 <strong>{user ? `${user.name} 님의 계정` : '로그인된 계정'}</strong>의 [나만의 아틀리에 &gt; 기록]에 안전하게 보관되었습니다.
                  </p>

                  {/* Thumbnail of current drawing */}
                  {currentImage && (
                    <div className="w-full max-h-44 bg-purple-50 rounded-2xl p-2 border border-purple-200 mb-4 flex items-center justify-center">
                      <img
                        src={currentImage}
                        alt="그린 그림"
                        className="max-h-40 object-contain rounded-lg shadow-sm"
                      />
                    </div>
                  )}

                  {/* HTML Report View */}
                  <div
                    className="w-full bg-[#FAF5FF] p-5 rounded-2xl text-left text-sm text-gray-800 mb-6 max-h-72 overflow-y-auto border-2 border-purple-200 shadow-inner leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{ __html: currentAnalysisHtml }}
                  />

                  {/* Re-analyze Button */}
                  <button
                    onClick={() => {
                      if (currentImage && currentRuleInsights && user) {
                        const now = new Date();
                        triggerPsychologyAnalysis(
                          currentImage,
                          currentRuleInsights,
                          `art_${Date.now()}`,
                          now.toLocaleString('ko-KR'),
                          user
                        );
                      }
                    }}
                    className="w-full -mt-2 mb-6 border-2 border-purple-300 text-purple-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>다시 분석하기</span>
                  </button>

                  {/* Diagnosis Certificate Print & Save Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const activeRecord: PsychologyRecord = records[0] || {
                        id: `rec_${Date.now()}`,
                        artworkId: `art_${Date.now()}`,
                        imgData: currentImage || '',
                        analysisHtml: currentAnalysisHtml,
                        date: new Date().toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }),
                        timestamp: Date.now(),
                        ruleInsights: currentRuleInsights || undefined,
                        parentEmailSent: false,
                      };
                      setSelectedRecordForCertificate(activeRecord);
                    }}
                    className="w-full -mt-3 mb-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold py-3.5 px-5 rounded-2xl shadow-lg hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/20"
                  >
                    <Printer className="w-5 h-5 text-amber-300" />
                    <span className="text-sm md:text-base tracking-tight">심리 분석 소견서 인쇄 및 저장 📄🖨️</span>
                  </button>

                  {/* Psychiatric Reference Disclaimer */}
                  <div className="w-full mb-5 bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-left">
                    <p className="text-[11px] md:text-xs text-amber-900 leading-relaxed font-medium">
                      ⚠️ <strong>[유의사항]</strong> 본 분석 결과는 아이의 그림 표현을 관찰하여 제공하는 <strong>양육 참고 자료</strong>이며, <strong>절대적인 정신의학적 감정 수치나 의료기관의 의학적 진단이 아닙니다.</strong>
                    </p>
                  </div>

                  {/* Parent Email Dispatch */}
                  <div className="w-full bg-pink-50/70 border border-pink-200 rounded-2xl p-4 mb-4">
                    <p className="text-gray-700 text-xs md:text-sm font-bold mb-3 flex items-center justify-center gap-1.5 text-center">
                      <span>📩 부모님께 심리 분석 리포트 발송하기</span>
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="부모님 이메일 주소를 입력해주세요"
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-purple-200 focus:outline-none focus:border-purple-500 text-sm bg-white"
                      />
                      <button
                        onClick={handleSendParentEmail}
                        disabled={isSendingEmail}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl text-sm shadow transition-colors flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSendingEmail ? '발송 중...' : '해석본 발송'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Navigation to Atelier */}
                  <button
                    onClick={() => {
                      setCurrentPage(5);
                      setAtelierTab('records');
                    }}
                    className="w-full bg-gradient-to-r from-pink-400 to-rose-400 hover:from-pink-500 hover:to-rose-500 text-white px-6 py-4 rounded-2xl text-xl font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-6 h-6" />
                    <span>내 아틀리에로 이동하기 🖼️</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ================= PAGE 5: ATELIER DASHBOARD ================= */}
        {currentPage === 5 && (
          <section className="min-h-screen flex flex-col items-center justify-start p-4 md:p-8 bg-gradient-to-b from-pink-50 via-rose-50 to-amber-50">
            {/* Atelier Title */}
            <div className="w-full max-w-4xl mt-14 mb-4 text-center">
              <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-700 px-4 py-1 rounded-full text-xs font-bold mb-2 border border-pink-200">
                <Heart className="w-3.5 h-3.5 fill-pink-500" />
                <span>{user ? `${user.name}의 소중한 공간` : '로그인이 필요한 나만의 공간'}</span>
              </div>
              <h1 className="title-font text-4xl md:text-5xl text-pink-600 mb-2">
                나만의 아틀리에
              </h1>
              <p className="text-gray-600 text-sm md:text-base">
                소중한 마음이 담긴 그림과 일기, 그리고 심리 분석 기록을 확인해보세요.
              </p>
            </div>

            {/* REQUIREMENT 2: IF NOT LOGGED IN -> Show secure login lock state, don't show any saved content! */}
            {!user ? (
              <div className="w-full max-w-md my-10 bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border-4 border-pink-200 text-center flex flex-col items-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-3xl mb-4 text-pink-600 shadow-inner">
                  <Lock className="w-8 h-8 text-pink-500" />
                </div>
                <h3 className="title-font text-2xl md:text-3xl text-gray-800 mb-2">
                  로그인이 필요한 공간이에요
                </h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                  아이의 소중한 그림과 그림일기, 심리 분석 기록은 <strong>로그인한 계정으로 안전하게 저장되고 보관</strong>됩니다.<br />
                  카카오나 구글로 3초 만에 로그인하고 나만의 아틀리에를 열어보세요!
                </p>
                <button
                  onClick={() => {
                    setLoginPromptMessage('나만의 아틀리에를 이용하려면 로그인이 필요해요! 3초만에 로그인해 보세요 🎨');
                    setIsLoginModalOpen(true);
                  }}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-pink-200 hover:scale-[1.03] active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  <span>로그인하고 내 아틀리에 열기 🎨</span>
                </button>
              </div>
            ) : (
              /* LOGGED-IN: User-specific Atelier tabs and content */
              <>
                {/* Tab Navigation */}
                <div className="flex w-full max-w-4xl border-b-2 border-pink-200 mb-6 justify-center gap-2">
                  <button
                    onClick={() => setAtelierTab('artworks')}
                    className={`px-5 py-3 text-base md:text-lg font-bold transition-all relative ${
                      atelierTab === 'artworks'
                        ? 'text-pink-600 border-b-4 border-pink-500 -mb-[2px]'
                        : 'text-gray-500 hover:text-pink-500'
                    }`}
                  >
                    내 그림 ({artworks.length})
                  </button>

                  <button
                    onClick={() => {
                      setAtelierTab('diary');
                    }}
                    className={`px-5 py-3 text-base md:text-lg font-bold transition-all relative ${
                      atelierTab === 'diary'
                        ? 'text-pink-600 border-b-4 border-pink-500 -mb-[2px]'
                        : 'text-gray-500 hover:text-pink-500'
                    }`}
                  >
                    일기장 ({diaries.length})
                  </button>

                  <button
                    onClick={() => {
                      setAtelierTab('records');
                    }}
                    className={`px-5 py-3 text-base md:text-lg font-bold transition-all relative ${
                      atelierTab === 'records'
                        ? 'text-pink-600 border-b-4 border-pink-500 -mb-[2px]'
                        : 'text-gray-500 hover:text-pink-500'
                    }`}
                  >
                    심리 기록 ({records.length})
                  </button>
                </div>

                {/* TAB 1: ARTWORKS GALLERY */}
                {atelierTab === 'artworks' && (
                  <div className="w-full max-w-4xl flex flex-col items-center">
                    {artworks.length === 0 ? (
                      <div className="bg-white/80 rounded-3xl p-10 text-center border-2 border-dashed border-pink-200 w-full max-w-lg my-8">
                        <span className="text-5xl mb-3 block">🎨</span>
                        <h3 className="title-font text-2xl text-gray-700 mb-2">아직 저장된 그림이 없어요!</h3>
                        <p className="text-gray-500 text-sm mb-6">
                          하단의 동그란 플러스(+) 버튼을 눌러 첫 번째 그림을 시작해보세요.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 w-full mb-8">
                        {artworks.map((art) => (
                          <div
                            key={art.id}
                            onClick={() => setSelectedArtworkDetail(art)}
                            className="group bg-white p-4 rounded-2xl shadow-md hover:shadow-xl border-4 border-amber-50 hover:border-pink-200 cursor-pointer transition-all duration-200 hover:-translate-y-1 flex flex-col"
                          >
                            <div className="w-full h-44 bg-amber-50/40 rounded-xl overflow-hidden flex items-center justify-center p-2 mb-3 relative">
                              <img
                                src={art.imgData}
                                alt="작품 썸네일"
                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <span className="bg-white/95 text-pink-600 font-bold px-3 py-1 rounded-full text-xs shadow-md">
                                  🔍 크게 보기
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="font-bold text-gray-700 truncate">{art.date}</span>
                              <span className="bg-pink-100 text-pink-600 font-bold px-2 py-0.5 rounded-full text-[11px]">
                                {art.mode === 'analysis' ? 'HTP 분석' : '자유'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: DIARY SECTION */}
                {atelierTab === 'diary' && (
                  <div className="w-full max-w-4xl flex flex-col items-center">
                    {/* Diary Writer Box */}
                    <div className="bg-white p-6 rounded-3xl shadow-lg w-full mb-8 border-2 border-pink-100">
                      <h3 className="title-font text-2xl text-pink-500 mb-4 flex items-center gap-2">
                        <BookOpen className="w-6 h-6" />
                        <span>오늘의 그림 일기 쓰기</span>
                      </h3>

                      <div className="flex flex-col md:flex-row gap-6">
                        {/* Artwork thumbnail selection */}
                        <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-4 border border-dashed border-pink-200">
                          {artworks.length > 0 ? (
                            <>
                              <img
                                src={selectedArtworkForDiary ? selectedArtworkForDiary.imgData : artworks[0].imgData}
                                alt="일기에 첨부될 그림"
                                className="max-h-44 object-contain rounded-xl mb-2 bg-white p-1 border shadow-sm"
                              />
                              <p className="text-xs text-gray-500 font-semibold">
                                첨부 그림: {selectedArtworkForDiary ? selectedArtworkForDiary.date : artworks[0].date}
                              </p>
                              {artworks.length > 1 && (
                                <button
                                  onClick={() => {
                                    const currentIndex = artworks.findIndex(
                                      (a) => a.id === (selectedArtworkForDiary?.id || artworks[0].id)
                                    );
                                    const nextIndex = (currentIndex + 1) % artworks.length;
                                    setSelectedArtworkForDiary(artworks[nextIndex]);
                                  }}
                                  className="mt-2 text-xs text-pink-500 underline font-bold"
                                >
                                  다른 그림으로 바꾸기 🔄
                                </button>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-400 text-xs text-center py-8">
                              저장된 그림이 없습니다.<br />먼저 그림을 그려보세요!
                            </p>
                          )}
                        </div>

                        {/* Text input */}
                        <div className="w-full md:w-1/2 flex flex-col">
                          <label className="text-gray-700 mb-2 font-bold text-sm">
                            오늘 하루는 어땠나요? 기분과 생각을 적어보세요.
                          </label>
                          <textarea
                            value={newDiaryText}
                            onChange={(e) => setNewDiaryText(e.target.value)}
                            className="w-full flex-grow p-4 rounded-2xl border-2 border-pink-200 focus:outline-none focus:border-pink-500 resize-none text-sm leading-relaxed"
                            rows={5}
                            placeholder="오늘 유치원에서 친구랑 재미있게 놀았다. 내일도 또 만나고 싶다!"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSaveDiary}
                        className="mt-4 w-full bg-gradient-to-r from-pink-400 to-rose-400 text-white py-3.5 rounded-2xl font-bold hover:from-pink-500 hover:to-rose-500 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <BookOpen className="w-5 h-5" />
                        <span>일기 저장하기 📝</span>
                      </button>
                    </div>

                    {/* Diary Entries List */}
                    <div className="w-full space-y-4">
                      {diaries.length === 0 ? (
                        <p className="text-gray-400 text-center py-6">아직 작성된 일기가 없어요!</p>
                      ) : (
                        diaries.map((entry) => (
                          <div
                            key={entry.id}
                            onClick={() => setSelectedDiaryDetail(entry)}
                            className="group bg-white p-5 rounded-2xl shadow hover:shadow-lg border-2 border-pink-50 hover:border-pink-300 transition-all cursor-pointer flex flex-col sm:flex-row gap-4 items-center"
                          >
                            <img
                              src={entry.imgData}
                              alt="일기 그림"
                              className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-xl bg-amber-50 p-1 border shadow-sm group-hover:scale-105 transition-transform"
                            />
                            <div className="flex-1 w-full text-left">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="font-bold text-pink-600 text-sm">{entry.date}</span>
                                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
                                  {entry.weather || '맑음 ☀️'}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm line-clamp-2 leading-relaxed">
                                {entry.text}
                              </p>
                              <span className="text-xs text-pink-500 font-bold mt-2 inline-block group-hover:underline">
                                🔍 일기장 크게 펼쳐보기
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: PSYCHOLOGY RECORDS */}
                {atelierTab === 'records' && (
                  <div className="w-full max-w-4xl flex flex-col items-center">
                    <div className="w-full text-left mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="title-font text-2xl text-purple-600">아동 심리 분석 기록</h3>
                        <p className="text-xs md:text-sm text-gray-500">
                          HTP 진단을 통해 자동 저장된 과거 심리 분석 내역입니다. 클릭하면 크게 볼 수 있어요.
                        </p>
                      </div>
                      <span className="text-xs bg-purple-100 text-purple-700 font-bold px-3 py-1.5 rounded-full border border-purple-200">
                        총 {records.length}건 보관 중
                      </span>
                    </div>

                    <div className="w-full space-y-4">
                      {records.length === 0 ? (
                        <div className="bg-white/80 rounded-3xl p-10 text-center border-2 border-dashed border-purple-200 w-full my-6">
                          <span className="text-5xl mb-3 block">🔮</span>
                          <h4 className="title-font text-xl text-gray-700 mb-2">저장된 심리 분석 기록이 없습니다</h4>
                          <p className="text-gray-500 text-xs mb-4">
                            그림 그리기에서 <strong>[다 그리면 보여줄거에요!]</strong> 모드로 집, 나무, 사람을 그려보세요.
                          </p>
                        </div>
                      ) : (
                        records.map((rec) => (
                          <div
                            key={rec.id}
                            onClick={() => setSelectedRecordDetail(rec)}
                            className="group bg-white p-5 rounded-2xl shadow hover:shadow-xl border-l-8 border-purple-400 hover:border-purple-600 transition-all cursor-pointer flex flex-col md:flex-row gap-5 items-center"
                          >
                            <img
                              src={rec.imgData}
                              alt="심리분석 그림"
                              className="w-28 h-28 object-contain rounded-xl bg-purple-50 p-1 border shadow-sm group-hover:scale-105 transition-transform"
                            />
                            <div className="flex-1 w-full text-left">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-purple-700 text-sm md:text-base">
                                  {rec.date}
                                </span>
                                {rec.parentEmailSent && (
                                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>이메일 발송됨</span>
                                  </span>
                                )}
                              </div>

                              {rec.ruleInsights && (
                                <div className="flex flex-wrap gap-1.5 mb-2 text-xs">
                                  <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-bold">
                                    화면사용 {(rec.ruleInsights.areaRatio * 100).toFixed(0)}%
                                  </span>
                                  {rec.ruleInsights.appliedRules && rec.ruleInsights.appliedRules[0] && (
                                    <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-medium">
                                      {rec.ruleInsights.appliedRules[0].replace(/규칙적용\(.*?\):\s*/, '')}
                                    </span>
                                  )}
                                </div>
                              )}

                              <div
                                className="text-xs text-gray-600 line-clamp-2 leading-relaxed opacity-90"
                                dangerouslySetInnerHTML={{
                                  __html: rec.analysisHtml.replace(/<[^>]+>/g, ' ').slice(0, 150) + '...',
                                }}
                              />

                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-xs text-purple-600 font-bold group-hover:underline">
                                  🔍 상세 진단서 및 부모님 조언 크게 보기 &gt;
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Medium-sized Circular Plus Button */}
                <div className="mt-10 mb-8 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(2)}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white shadow-xl hover:shadow-pink-300 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center font-bold text-3xl group border-4 border-white"
                    title="새 그림 그리기"
                    aria-label="새 그림 그리기"
                  >
                    <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
                  </button>
                  <span className="text-xs font-bold text-pink-600 tracking-tight">
                    새 그림 그리기
                  </span>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {/* ================= MODALS & DIALOGS ================= */}

      {/* 1. Color Wheel Modal (Interactive 2D Spectrum, Hue/Brightness sliders, 50 themes, native color picker) */}
      <ColorWheelModal
        isOpen={isColorWheelOpen}
        currentColor={currentColor}
        onSelectColor={(color) => {
          setCurrentColor(color);
          showToast(`선택한 색상(${color})이 붓에 설정되었습니다! 🎨`);
        }}
        onClose={() => setIsColorWheelOpen(false)}
      />

      {/* 2. Artwork Detail Modal */}
      <ArtworkDetailModal
        artwork={selectedArtworkDetail}
        onClose={() => setSelectedArtworkDetail(null)}
        onWriteDiaryWithArtwork={(art) => {
          setSelectedArtworkForDiary(art);
          setAtelierTab('diary');
        }}
      />

      {/* 3. Diary Detail Modal */}
      <DiaryDetailModal
        diary={selectedDiaryDetail}
        onClose={() => setSelectedDiaryDetail(null)}
        onDeleteDiary={(id) => {
          setDiaries((prev) => prev.filter((d) => d.id !== id));
          showToast('일기가 삭제되었습니다.');
        }}
      />

      {/* 4. Record Detail Modal */}
      <RecordDetailModal
        record={selectedRecordDetail}
        childName={user?.name || '우리 아이'}
        onClose={() => setSelectedRecordDetail(null)}
        onEmailSentSuccess={(recId, sentEmail) => {
          setRecords((prev) =>
            prev.map((r) =>
              r.id === recId ? { ...r, parentEmailSent: true, sentEmailAddress: sentEmail } : r
            )
          );
        }}
        onShowToast={showToast}
      />

      {/* Official Diagnosis Certificate Modal */}
      {selectedRecordForCertificate && (
        <DiagnosisCertificateModal
          record={selectedRecordForCertificate}
          childName={user?.name || '우리 아이'}
          onClose={() => setSelectedRecordForCertificate(null)}
          onShowToast={showToast}
        />
      )}

      {/* 5. Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onShowToast={showToast}
        promptMessage={loginPromptMessage}
      />

      {/* Clear Canvas Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border-4 border-red-100">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="title-font text-2xl text-gray-800 mb-2">스케치북을 모두 지울까요?</h3>
            <p className="text-gray-500 text-sm mb-6">
              지금까지 그린 모든 선과 그림이 깨끗하게 지워집니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-100 text-sm"
              >
                취소
              </button>
              <button
                onClick={handleClearCanvas}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow"
              >
                모두 지우기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Home Navigation Confirmation Modal for unsaved drawing */}
      {showHomeConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border-4 border-orange-100">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="title-font text-2xl text-gray-800 mb-2">처음 화면으로 갈까요?</h3>
            <p className="text-gray-500 text-sm mb-6">
              아직 완성하지 않은 그림은 저장되지 않습니다. 그래도 홈으로 이동할까요?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowHomeConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 font-bold text-gray-600 hover:bg-gray-100 text-sm"
              >
                계속 그리기
              </button>
              <button
                onClick={() => {
                  setShowHomeConfirm(false);
                  setCurrentPage(1);
                }}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow"
              >
                홈으로 이동
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/95 text-white px-6 py-3.5 rounded-full text-sm font-bold z-50 shadow-2xl flex items-center gap-2 border border-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
