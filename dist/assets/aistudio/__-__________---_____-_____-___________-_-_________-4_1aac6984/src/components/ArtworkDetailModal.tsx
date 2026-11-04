import React from 'react';
import { X, Download, Printer, BookOpen, Calendar, Sparkles } from 'lucide-react';
import { Artwork } from '../types';

interface ArtworkDetailModalProps {
  artwork: Artwork | null;
  onClose: () => void;
  onWriteDiaryWithArtwork?: (artwork: Artwork) => void;
}

export const ArtworkDetailModal: React.FC<ArtworkDetailModalProps> = ({
  artwork,
  onClose,
  onWriteDiaryWithArtwork,
}) => {
  if (!artwork) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = artwork.imgData;
    a.download = `내그림-${artwork.date.replace(/[^0-9]/g, '') || Date.now()}.png`;
    a.click();
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Print is not supported in iframe', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border-4 border-amber-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h3 className="title-font text-2xl text-amber-600">작품 크게 보기</h3>
            <span className="text-xs bg-amber-200 text-amber-800 font-bold px-2.5 py-0.5 rounded-full">
              {artwork.mode === 'analysis' ? '심리분석 연동작품' : '자유 드로잉'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 bg-white/80 hover:bg-white rounded-full p-2 transition-colors border border-amber-200 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 flex flex-col items-center">
          <div className="w-full bg-[#FFFBF0] rounded-2xl p-3 border-2 border-amber-200 shadow-inner flex items-center justify-center min-h-[300px] max-h-[55vh]">
            <img
              src={artwork.imgData}
              alt="아이의 그림 상세"
              className="max-h-full max-w-full object-contain rounded-xl shadow-md bg-white"
            />
          </div>

          {/* Details & Metadata */}
          <div className="w-full mt-4 bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-gray-500">완성 일시:</span>
              <span className="font-semibold text-gray-800">{artwork.date}</span>
            </div>

            {artwork.ruleInsights && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full font-bold">
                  화면 사용률: {((artwork.ruleInsights.areaRatio || 0) * 100).toFixed(0)}%
                </span>
                <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
                  중심 위치: {((artwork.ruleInsights.centerYRatio || 0.5) * 100).toFixed(0)}%
                </span>
                {artwork.ruleInsights.appliedRules && artwork.ruleInsights.appliedRules[0] && (
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-medium">
                    {artwork.ruleInsights.appliedRules[0].replace(/규칙적용\(.*?\):\s*/, '')}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-sm shadow transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>그림 저장</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>인쇄</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onWriteDiaryWithArtwork && (
              <button
                onClick={() => {
                  onWriteDiaryWithArtwork(artwork);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-sm shadow transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>이 그림으로 일기 쓰기</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-sm transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
