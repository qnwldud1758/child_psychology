import React, { useState } from 'react';
import { X, Sparkles, Heart } from 'lucide-react';
import { loginWithApi } from '../services/api';
import { UserProfile } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, token: string) => void;
  onShowToast: (msg: string) => void;
  promptMessage?: string;
}

const AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=LuckyBear',
  'https://api.dicebear.com/7.x/bottts/svg?seed=StarChild',
  'https://api.dicebear.com/7.x/bottts/svg?seed=JoyArtist',
  'https://api.dicebear.com/7.x/bottts/svg?seed=RainbowPainter',
  'https://api.dicebear.com/7.x/bottts/svg?seed=HappyPencil',
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onShowToast,
  promptMessage,
}) => {
  const [tab, setTab] = useState<'quick' | 'custom'>('quick');
  const [childName, setChildName] = useState('민우');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSocialLogin = async (provider: 'kakao' | 'google') => {
    setLoading(true);
    try {
      const res = await loginWithApi({
        provider,
        childName: provider === 'kakao' ? '카카오 꼬마화가' : '구글 꼬마화가',
        avatar: selectedAvatar,
        email: provider === 'kakao' ? 'kakao_art@kid.kr' : 'google_art@kid.kr',
      });
      onLoginSuccess(res.user, res.token);
      onShowToast(`환영합니다! ${res.user.name} 님으로 로그인되었습니다 🎉`);
      onClose();
    } catch (e: any) {
      onShowToast(e.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

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
        avatar: selectedAvatar,
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 md:p-8 relative border-4 border-pink-100 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-pink-100 rounded-2xl text-pink-500 mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="title-font text-3xl text-pink-500 mb-1">나만의 아틀리에 로그인</h3>
          <p className="text-gray-600 text-sm font-medium leading-relaxed">
            {promptMessage ||
              '로그인하면 아이의 소중한 그림 일기와 심리 분석 기록을 내 계정에 안전하게 보관할 수 있어요!'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-pink-50 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab('quick')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              tab === 'quick' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-pink-500'
            }`}
          >
            간편 소셜 로그인
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              tab === 'custom' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-pink-500'
            }`}
          >
            아이 닉네임으로 시작
          </button>
        </div>

        {/* Avatar selection */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-600 mb-2">화가 프로필 캐릭터 선택</label>
          <div className="flex justify-between items-center gap-2">
            {AVATARS.map((av, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedAvatar(av)}
                className={`w-12 h-12 rounded-full p-1 border-2 transition-all ${
                  selectedAvatar === av
                    ? 'border-pink-500 scale-110 shadow-md bg-pink-50'
                    : 'border-gray-200 hover:border-pink-300'
                }`}
              >
                <img src={av} alt="avatar" className="w-full h-full rounded-full" />
              </button>
            ))}
          </div>
        </div>

        {tab === 'quick' ? (
          <div className="space-y-3">
            <button
              onClick={() => handleSocialLogin('kakao')}
              disabled={loading}
              className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold py-3.5 px-4 rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 text-base"
            >
              <span className="w-5 h-5 flex items-center justify-center font-black bg-[#191919] text-[#FEE500] rounded-sm text-[11px]">
                TALK
              </span>
              <span>카카오로 3초만에 시작</span>
            </button>

            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-3.5 px-4 rounded-2xl border-2 border-gray-200 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 text-base"
            >
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
              <span>구글 계정으로 로그인</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                아이의 이름이나 별명 <span className="text-pink-500">*</span>
              </label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="예: 민우, 서연이"
                className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-500 text-sm font-medium"
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
                className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-500 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-base"
            >
              <Heart className="w-5 h-5 fill-white" />
              <span>{loading ? '로그인 중...' : '아틀리에 시작하기'}</span>
            </button>
          </form>
        )}

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            로그인 없이 둘러보기 (게스트 모드)
          </button>
        </div>
      </div>
    </div>
  );
};
