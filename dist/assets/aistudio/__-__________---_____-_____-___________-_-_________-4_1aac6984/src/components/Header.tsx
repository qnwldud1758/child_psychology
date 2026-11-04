import React from 'react';
import { Home, User, LogOut, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  currentPage: number;
  onGoHome: () => void;
  user: UserProfile | null;
  onOpenLoginModal: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onGoHome,
  user,
  onOpenLoginModal,
  onLogout,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between pointer-events-none">
      {/* Home button: visible on all screens except page 1 */}
      <div>
        {currentPage > 1 ? (
          <button
            onClick={onGoHome}
            className="pointer-events-auto flex items-center gap-2 bg-white/90 backdrop-blur-md border-2 border-orange-200 text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-4 py-2 rounded-full font-bold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 text-sm md:text-base title-font"
            title="처음 화면으로 돌아가기"
          >
            <Home className="w-5 h-5 text-orange-500" />
            <span>홈으로</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 pointer-events-auto bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold text-orange-600 shadow-sm border border-orange-100">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>다 그렸어요! 아틀리에</span>
          </div>
        )}
      </div>

      {/* User login / profile section */}
      <div className="flex items-center gap-2">
        {user ? (
          <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md border border-pink-200 px-3 py-1.5 rounded-full shadow-md">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-7 h-7 rounded-full bg-pink-100 border border-pink-300 object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-xs md:text-sm font-bold text-gray-800 max-w-[120px] truncate">
              {user.name}
            </span>
            <span className="text-[10px] bg-pink-100 text-pink-600 font-bold px-2 py-0.5 rounded-full uppercase">
              {user.provider}
            </span>
            <button
              onClick={onLogout}
              className="ml-1 text-gray-400 hover:text-red-500 transition-colors p-1"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLoginModal}
            className="pointer-events-auto flex items-center gap-2 bg-white/90 backdrop-blur-md border border-pink-200 text-gray-700 hover:text-pink-600 px-4 py-2 rounded-full text-sm font-bold shadow-md hover:bg-pink-50 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <User className="w-4 h-4 text-pink-500" />
            <span>로그인 하러가기</span>
          </button>
        )}
      </div>
    </header>
  );
};
