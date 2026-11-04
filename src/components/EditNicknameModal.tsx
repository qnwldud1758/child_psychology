import React, { useState } from 'react';
import { X, Check, Smile, Sparkles } from 'lucide-react';
import { updateUserProfileApi } from '../services/api';
import { UserProfile } from '../types';

interface EditNicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateSuccess: (updatedUser: UserProfile) => void;
  onShowToast: (msg: string) => void;
}

export const EditNicknameModal: React.FC<EditNicknameModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateSuccess,
  onShowToast,
}) => {
  const [nickname, setNickname] = useState(currentUser.name || '우노');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      onShowToast('새로운 닉네임을 입력해주세요!');
      return;
    }

    setSaving(true);
    try {
      const res = await updateUserProfileApi({ name: trimmed });
      if (res.success && res.user) {
        onUpdateSuccess(res.user);
        onShowToast(`닉네임이 '${trimmed}'(으)로 변경되었습니다! ✨`);
        onClose();
      } else {
        // Local fallback update
        const fallbackUser: UserProfile = { ...currentUser, name: trimmed };
        onUpdateSuccess(fallbackUser);
        onShowToast(`닉네임이 '${trimmed}'(으)로 변경되었습니다! ✨`);
        onClose();
      }
    } catch {
      onShowToast('닉네임 변경 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-4 border-amber-200 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-2.5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 border-2 border-amber-200">
            <Smile className="w-8 h-8" />
          </div>
          <h3 className="title-font text-2xl text-orange-600 mb-1">
            닉네임 수정
          </h3>
          <p className="text-xs text-gray-500">
            아틀리에에서 불릴 아이의 이름이나 별명을 적어주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              새로운 닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 우노, 서연이, 행복한화가"
              maxLength={15}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-amber-300 focus:outline-none focus:border-orange-500 text-sm font-bold bg-amber-50/30"
              autoFocus
              required
            />
            <p className="text-[11px] text-gray-400 mt-1">
              최대 15자까지 입력할 수 있어요.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving || !nickname.trim()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? '저장 중...' : '저장하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
