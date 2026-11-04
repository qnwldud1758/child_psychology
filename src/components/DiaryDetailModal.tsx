import React, { useState } from 'react';
import { X, Calendar, Sun, Trash2, Printer } from 'lucide-react';
import { DiaryEntry } from '../types';

interface DiaryDetailModalProps {
  diary: DiaryEntry | null;
  onClose: () => void;
  onDeleteDiary?: (id: string) => void;
}

export const DiaryDetailModal: React.FC<DiaryDetailModalProps> = ({
  diary,
  onClose,
  onDeleteDiary,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!diary) return null;

  const handlePrint = () => {
    try { window.print(); } catch {}
  };

  const handleDelete = () => {
    if (onDeleteDiary) {
      onDeleteDiary(diary.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border-4 border-pink-200 flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 bg-gradient-to-r from-pink-100 to-rose-50 border-b border-pink-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h3 className="title-font text-2xl text-pink-600">그림 일기장 크게 보기</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 bg-white/80 hover:bg-white rounded-full p-2 transition-colors border border-pink-200 shadow-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-[#FFF9F5]">
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-md border-2 border-pink-100 flex flex-col">
            <div className="flex flex-wrap items-center justify-between border-b-2 border-dashed border-pink-200 pb-3 mb-4 text-sm font-bold text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-pink-500" />
                <span>{diary.date}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full text-amber-700 text-xs border border-amber-200">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>날씨: {diary.weather || '화창하고 맑음 ☀️'}</span>
              </div>
            </div>

            <div className="w-full bg-amber-50/50 rounded-xl p-2 border border-amber-200 mb-5 flex items-center justify-center min-h-[220px] max-h-[360px]">
              <img
                src={diary.imgData}
                alt="일기 그림"
                className="max-h-[340px] max-w-full object-contain rounded-lg shadow-sm bg-white"
              />
            </div>

            <div className="relative py-2">
              <div className="text-base md:text-lg text-gray-800 leading-relaxed font-medium whitespace-pre-wrap pl-2 border-l-4 border-pink-400">
                {diary.text}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div>
            {onDeleteDiary && (
              showDeleteConfirm ? (
                <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-200">
                  <span className="text-xs font-bold text-red-600">정말 삭제할까요?</span>
                  <button
                    onClick={handleDelete}
                    className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer"
                  >
                    삭제
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300 cursor-pointer"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>일기 삭제</span>
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>일기 인쇄</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-sm transition-colors shadow cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
