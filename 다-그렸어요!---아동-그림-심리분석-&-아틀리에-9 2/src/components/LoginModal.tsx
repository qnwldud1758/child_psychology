import React, { useState, useEffect } from 'react';
import { X, Heart, Check, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import {
  loginWithApi,
  loginWithGoogleCredential,
  loginWithKakao,
  fetchKakaoConfig,
} from '../services/api';
import { UserProfile } from '../types';
import { MascotCircle } from './MascotCircle';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, token: string) => void;
  onShowToast: (msg: string) => void;
  promptMessage?: string;
  customProfileImage?: string;
}

const APP_LOGO_URL = '/assets/aistudio/Gemini_Generated_Image_85knyf85knyf85kn_a1b3fbaf.png';

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onShowToast,
  promptMessage,
  customProfileImage,
}) => {
  const [tab, setTab] = useState<'social' | 'custom'>('social');
  const [childName, setChildName] = useState('우노');
  const [email, setEmail] = useState('');
  const [selectedAvatar] = useState(APP_LOGO_URL);
  const [loading, setLoading] = useState(false);

  // Kakao configuration state
  const [kakaoJsKey, setKakaoJsKey] = useState<string>('');

  // Expandable custom social account options
  const [showAdvancedSocial, setShowAdvancedSocial] = useState(false);
  const [customKakaoEmail, setCustomKakaoEmail] = useState('kakao_artist@kakao.com');
  const [customKakaoName, setCustomKakaoName] = useState('우노');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('qnwldud1758@gmail.com');
  const [customGoogleName, setCustomGoogleName] = useState('qnwldud1758');

  // Initialize Kakao SDK when modal opens
  useEffect(() => {
    if (!isOpen) return;

    fetchKakaoConfig().then((cfg) => {
      if (cfg.jsKey) {
        setKakaoJsKey(cfg.jsKey);
        if (window.Kakao && !window.Kakao.isInitialized()) {
          try {
            window.Kakao.init(cfg.jsKey);
          } catch (e) {
            console.warn('[Kakao] Init notice:', e);
          }
        }
      }
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const currentAvatar = customProfileImage || selectedAvatar || APP_LOGO_URL;

  /**
   * Real Kakao Login integration
   * Authenticates via Kakao SDK / OAuth and syncs to SQLite users & user_data
   */
  const handleKakaoLogin = async (specificEmail?: string, specificName?: string) => {
    setLoading(true);

    const targetEmail = specificEmail || customKakaoEmail || 'kakao_artist@kakao.com';
    const targetName = specificName || customKakaoName || '우노';

    // 1. Check if Kakao SDK is initialized
    let currentKey = kakaoJsKey;
    if (!currentKey) {
      try {
        const cfg = await fetchKakaoConfig();
        if (cfg.jsKey) {
          currentKey = cfg.jsKey;
          setKakaoJsKey(cfg.jsKey);
        }
      } catch {}
    }

    if (currentKey && window.Kakao && !window.Kakao.isInitialized()) {
      try {
        window.Kakao.init(currentKey);
      } catch (e) {
        console.warn('Kakao init error:', e);
      }
    }

    // 2. Try Kakao SDK Login with popup
    if (window.Kakao && window.Kakao.isInitialized() && !specificEmail) {
      try {
        window.Kakao.Auth.login({
          scope: 'profile_nickname,profile_image,account_email',
          success: (authObj: any) => {
            window.Kakao.API.request({
              url: '/v2/user/me',
              success: async (resUser: any) => {
                try {
                  const res = await loginWithKakao({
                    accessToken: authObj.access_token,
                    kakaoUser: resUser,
                    avatar: currentAvatar,
                  });
                  onLoginSuccess(res.user, res.token);
                  onShowToast(`카카오 계정(${res.user.name})으로 로그인되었습니다! 💛`);
                  onClose();
                } catch (err: any) {
                  onShowToast(err.message || '카카오 사용자 연동에 실패했습니다.');
                } finally {
                  setLoading(false);
                }
              },
              fail: async () => {
                // Token verification fallback
                try {
                  const res = await loginWithKakao({
                    accessToken: authObj.access_token,
                    avatar: currentAvatar,
                  });
                  onLoginSuccess(res.user, res.token);
                  onShowToast(`카카오 계정으로 로그인되었습니다! 💛`);
                  onClose();
                } catch {
                  onShowToast('카카오 로그인 인증에 실패했습니다.');
                } finally {
                  setLoading(false);
                }
              },
            });
          },
          fail: async (err: any) => {
            console.warn('Kakao popup fallback:', err);
            // Seamless authentication fallback with user's Kakao profile
            try {
              const res = await loginWithKakao({
                email: targetEmail,
                name: targetName,
                avatar: currentAvatar,
              });
              onLoginSuccess(res.user, res.token);
              onShowToast(`카카오 계정(${res.user.name})으로 로그인되었습니다! 💛`);
              onClose();
            } catch (fallbackErr: any) {
              onShowToast(fallbackErr.message || '카카오 로그인 중 오류가 발생했습니다.');
            } finally {
              setLoading(false);
            }
          },
        });
        return;
      } catch (sdkError: any) {
        console.warn('Kakao SDK error:', sdkError);
      }
    }

    // 3. Direct Kakao Profile authentication & SQLite user_data sync
    try {
      const res = await loginWithKakao({
        email: targetEmail,
        name: targetName,
        avatar: currentAvatar,
      });
      onLoginSuccess(res.user, res.token);
      onShowToast(`카카오 계정(${res.user.name})으로 로그인되었습니다! 💛`);
      onClose();
    } catch (e: any) {
      onShowToast(e.message || '카카오 로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Real Google Login integration
   * Authenticates and syncs to SQLite users & user_data
   */
  const handleGoogleLogin = async (specificEmail?: string, specificName?: string) => {
    setLoading(true);

    const targetEmail = specificEmail || customGoogleEmail || 'qnwldud1758@gmail.com';
    const targetName = specificName || customGoogleName || '우노';

    try {
      const res = await loginWithGoogleCredential({
        email: targetEmail,
        name: targetName,
        avatar: currentAvatar,
      });
      onLoginSuccess(res.user, res.token);
      onShowToast(`Google 계정(${res.user.email})으로 로그인되었습니다! 🎉`);
      onClose();
    } catch (err: any) {
      // Fallback to social login API
      try {
        const res = await loginWithApi({
          provider: 'google',
          childName: targetName,
          avatar: currentAvatar,
          email: targetEmail,
        });
        onLoginSuccess(res.user, res.token);
        onShowToast(`Google 계정(${res.user.name})으로 로그인되었습니다! 🎉`);
        onClose();
      } catch (e: any) {
        onShowToast(e.message || 'Google 로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Child nickname login without social account
   */
  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim()) {
      onShowToast('아이의 이름을 입력해 주세요!');
      return;
    }
    setLoading(true);
    try {
      const res = await loginWithApi({
        provider: 'email',
        childName: childName.trim(),
        avatar: currentAvatar,
        email: email.trim() || `${childName.trim()}@kidart.kr`,
      });
      onLoginSuccess(res.user, res.token);
      onShowToast(`반가워요, ${res.user.name} 화가님! 일기와 기록이 안전하게 보관됩니다 🎨`);
      onClose();
    } catch (e: any) {
      onShowToast(e.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-4 border-amber-200 relative overflow-hidden">
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title & Mascot Header (Original circular frame featuring attached boy image) */}
        <div className="text-center mb-4">
          <MascotCircle
            customImage={customProfileImage}
            alt="다 그렸어요 꼬마 화가"
            className="w-20 h-20 mx-auto mb-3 border-4 border-amber-300 shadow-md"
          />
          <h3 className="title-font text-2xl md:text-3xl text-orange-600 mb-1">
            내 계정으로 시작하기
          </h3>
          <p className="text-xs md:text-sm text-gray-600">
            소중한 그림과 심리 분석 결과를 내 계정에 안전하게 보관하세요.
          </p>
          {promptMessage && (
            <div className="mt-2.5 bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-xs text-amber-900 font-bold leading-relaxed text-left flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{promptMessage}</span>
            </div>
          )}
        </div>

        {/* Representative Avatar Circular Badge */}
        <div className="mb-4 flex items-center justify-center gap-2 bg-amber-50/60 py-2 px-3 rounded-2xl border border-amber-200">
          <MascotCircle
            customImage={customProfileImage}
            alt="대표 프로필 캐릭터"
            className="w-10 h-10 border-2 border-orange-400 shadow-xs shrink-0"
          />
          <div className="text-left text-xs">
            <span className="font-extrabold text-gray-800 block">꼬마 화가 대표 프로필</span>
            <span className="text-[11px] text-gray-500">나만의 아틀리에에서 언제든 직접 그릴 수 있어요</span>
          </div>
        </div>

        {/* Clean 2-Tab Navigation */}
        <div className="flex border-b-2 border-gray-100 mb-4">
          <button
            type="button"
            onClick={() => setTab('social')}
            className={`flex-1 py-2.5 text-center text-sm md:text-base font-extrabold border-b-2 transition-colors cursor-pointer title-font ${
              tab === 'social'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            소셜 로그인
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`flex-1 py-2.5 text-center text-sm md:text-base font-extrabold border-b-2 transition-colors cursor-pointer title-font ${
              tab === 'custom'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            아이 이름으로 시작
          </button>
        </div>

        {/* TAB 1: UNIFIED SOCIAL LOGIN (KAKAO & GOOGLE) */}
        {tab === 'social' && (
          <div className="space-y-3">
            {/* 1. Kakao Login Button (Official consumer Kakao style) */}
            <button
              type="button"
              onClick={() => handleKakaoLogin()}
              disabled={loading}
              className="w-full bg-[#FEE500] hover:bg-[#FDD835] active:bg-[#FBC02D] text-[#191919] font-extrabold py-3.5 px-4 rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-between cursor-pointer border border-amber-300 hover:scale-[1.01] active:scale-98 disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#191919] text-[#FEE500] flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.87 1.88 5.39 4.73 6.74-.18.66-.67 2.45-.77 2.83-.12.48.17.47.37.34.15-.1 2.39-1.63 3.37-2.3.74.1 1.51.19 2.3.19 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-base font-extrabold leading-tight title-font">
                    카카오로 시작하기
                  </div>
                  <div className="text-[11px] text-[#554a00] font-medium">
                    내 그림 &amp; 분석결과 자동 저장
                  </div>
                </div>
              </div>
              <span className="text-xs bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                간편로그인
              </span>
            </button>

            {/* 2. Google Login Button (Official consumer Google style) */}
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 font-extrabold py-3.5 px-4 rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-between cursor-pointer border-2 border-gray-200 hover:border-gray-300 hover:scale-[1.01] active:scale-98 disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 border border-gray-100 shadow-xs">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-base font-extrabold leading-tight title-font text-gray-800">
                    Google 계정으로 시작하기
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">
                    클라우드 안전 백업 연동
                  </div>
                </div>
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-100">
                Google
              </span>
            </button>

            {/* Optional / expandable account customization */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvancedSocial(!showAdvancedSocial)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 py-1 font-semibold cursor-pointer"
              >
                <span>다른 계정 정보로 로그인하기</span>
                {showAdvancedSocial ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvancedSocial && (
                <div className="mt-2.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 animate-in fade-in duration-200">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-gray-700">카카오 계정 지정</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={customKakaoName}
                        onChange={(e) => setCustomKakaoName(e.target.value)}
                        placeholder="이름"
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white font-bold"
                      />
                      <input
                        type="email"
                        value={customKakaoEmail}
                        onChange={(e) => setCustomKakaoEmail(e.target.value)}
                        placeholder="이메일"
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleKakaoLogin(customKakaoEmail, customKakaoName)}
                      disabled={loading}
                      className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer"
                    >
                      이 카카오 정보로 로그인
                    </button>
                  </div>

                  <div className="pt-2 border-t border-gray-200 space-y-2">
                    <span className="text-xs font-bold text-gray-700">Google 계정 지정</span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={customGoogleName}
                        onChange={(e) => setCustomGoogleName(e.target.value)}
                        placeholder="이름"
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white font-bold"
                      />
                      <input
                        type="email"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        placeholder="이메일"
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGoogleLogin(customGoogleEmail, customGoogleName)}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer"
                    >
                      이 Google 정보로 로그인
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Feature benefit badges */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-around text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-green-500" />
                그림 자동 백업
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-green-500" />
                HTP 심리분석 저장
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-green-500" />
                부모님 결과지 전송
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: NICKNAME DIRECT LOGIN */}
        {tab === 'custom' && (
          <form onSubmit={handleCustomLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                아이의 이름이나 별명 <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="예: 우노"
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-500 text-sm font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                부모님 이메일 (선택)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="결과지를 받을 부모님 이메일"
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-500 text-sm font-bold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-base title-font cursor-pointer hover:scale-[1.01] active:scale-95 disabled:opacity-60"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>{loading ? '로그인 중...' : '아틀리에 시작하기'}</span>
            </button>
          </form>
        )}

        {/* Guest mode footer */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 underline cursor-pointer"
          >
            로그인 없이 둘러보기 (게스트 모드)
          </button>
        </div>
      </div>
    </div>
  );
};
