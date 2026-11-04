import React from 'react';
import { Home, LogOut, Pencil } from 'lucide-react';
import { UserProfile } from '../types';
import { MascotCircle } from './MascotCircle';

interface HeaderProps {
  currentPage: number;
  onGoHome: () => void;
  user: UserProfile | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onOpenEditNickname?: () => void;
  customProfileImage?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onGoHome,
  user,
  onOpenLoginModal,
  onLogout,
  onOpenEditNickname,
  customProfileImage,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-3 md:px-5 py-2.5 flex items-center justify-between pointer-events-none">
      <div>
        {currentPage > 1 ? (
          <button
            onClick={onGoHome}
            className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md border-2 border-orange-200 text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-4 py-1.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 text-base md:text-lg title-font cursor-pointer"
            title="처음 화면으로 돌아가기"
          >
            <Home className="w-4 h-4 text-orange-500" />
            <span>홈으로</span>
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {user ? (
          <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md border-2 border-pink-200 px-3.5 py-1.5 rounded-full shadow-md">
            <MascotCircle
              customImage={user.avatar && !user.avatar.includes('dicebear') ? user.avatar : customProfileImage}
              alt={user.name}
              className="w-7 h-7 border border-pink-300"
            />
            <div className="flex items-center gap-1">
              <span className="text-sm md:text-base font-bold text-gray-800 max-w-[120px] truncate title-font">
                {user.name}
              </span>
              {onOpenEditNickname && (
                <button
                  type="button"
                  onClick={onOpenEditNickname}
                  className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors cursor-pointer"
                  title="닉네임 수정하기"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
              user.provider === 'google'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : user.provider === 'kakao'
                ? 'bg-[#FEE500] text-[#191919] border border-amber-300'
                : 'bg-pink-100 text-pink-700'
            }`}>
              {user.provider === 'google' ? 'Google' : user.provider === 'kakao' ? 'Kakao' : user.provider}
            </span>
            <button
              onClick={onLogout}
              className="ml-1 text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLoginModal}
            className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md border-2 border-pink-200 text-gray-700 hover:text-pink-600 px-4 py-1.5 rounded-full text-base font-bold shadow-md hover:bg-pink-50 transition-all duration-200 hover:scale-105 active:scale-95 title-font cursor-pointer"
          >
            <MascotCircle
              customImage={customProfileImage}
              alt="로그인"
              className="w-6 h-6 border border-pink-300"
            />
            <span>로그인 하러가기</span>
          </button>
        )}
      </div>
    </header>
  );
};
