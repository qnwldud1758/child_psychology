import React, { useRef } from 'react';
import { X, Printer, Download, Sparkles, CheckCircle2 } from 'lucide-react';
import { PsychologyRecord } from '../types';
import { printDiagnosisCertificate } from '../utils/reportUtils';

interface DiagnosisCertificateModalProps {
  record: PsychologyRecord | null;
  childName?: string;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const DiagnosisCertificateModal: React.FC<DiagnosisCertificateModalProps> = ({
  record,
  childName = '우리 아이',
  onClose,
  onShowToast,
}) => {
  const certificateRef = useRef<HTMLDivElement>(null);

  if (!record) return null;

  const certNumber = `HTP-${new Date(record.timestamp || Date.now()).getFullYear()}-${String(
    record.id || '001'
  ).slice(-6)}`;

  const areaRatio = record.ruleInsights
    ? ((record.ruleInsights.areaRatio || 0.4) * 100).toFixed(0)
    : '45';
  const centerY = record.ruleInsights
    ? ((record.ruleInsights.centerYRatio || 0.5) * 100).toFixed(0)
    : '50';
  const note = record.ruleInsights?.appliedRules?.[0] || '자유롭고 솔직한 감정 표현';

  const handlePrint = () => {
    const success = printDiagnosisCertificate(record, childName);
    if (success) {
      onShowToast('인쇄 화면을 준비했습니다! 🖨️');
    } else {
      window.print();
    }
  };

  const handleSaveAsImage = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1200, 1600);

      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, 1140, 1540);

      ctx.fillStyle = '#581c87';
      ctx.font = 'bold 38px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('아동 미술 심리 분석 소견서', 600, 115);

      ctx.fillStyle = '#6b7280';
      ctx.font = '18px sans-serif';
      ctx.fillText(`발급번호: ${certNumber}  |  검사 일시: ${record.date}`, 600, 155);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(80, 190, 480, 330);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(80, 190, 480, 330);
        ctx.drawImage(img, 90, 200, 460, 310);

        ctx.fillStyle = '#faf5ff';
        ctx.fillRect(600, 190, 520, 330);
        ctx.strokeStyle = '#d8b4fe';
        ctx.strokeRect(600, 190, 520, 330);

        ctx.fillStyle = '#6b21a8';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('HTP 주요 지표 분석치', 630, 235);

        ctx.fillStyle = '#374151';
        ctx.font = '19px sans-serif';
        ctx.fillText(`• 아동 성명: ${childName}`, 630, 280);
        ctx.fillText(`• 캔버스 활용도: ${areaRatio}%`, 630, 325);
        ctx.fillText(`• 드로잉 중심 높이: ${centerY}%`, 630, 370);
        ctx.fillText(`• 주요 특성: ${note.slice(0, 22)}`, 630, 415);

        ctx.fillStyle = '#fdf4ff';
        ctx.fillRect(80, 550, 1040, 830);
        ctx.strokeStyle = '#e9d5ff';
        ctx.strokeRect(80, 550, 1040, 830);

        ctx.fillStyle = '#7e22ce';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('미술 심리 종합 진단 및 양육 조언', 110, 605);

        const plainText = (record.analysisHtml || '')
          .replace(/<style[^>]*>.*?<\/style>/gi, '')
          .replace(/<h3[^>]*>/gi, '\n\n[ ')
          .replace(/<\/h3>/gi, ' ]\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        ctx.fillStyle = '#1f2937';
        ctx.font = '18px sans-serif';

        const words = plainText.split(' ');
        let line = '';
        let y = 660;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 980 && n > 0) {
            ctx.fillText(line, 110, y);
            line = words[n] + ' ';
            y += 32;
            if (y > 1330) break;
          } else {
            line = testLine;
          }
        }
        if (y <= 1330) {
          ctx.fillText(line, 110, y);
        }

        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(80, 1400, 1040, 130);
        ctx.strokeStyle = '#e2e8f0';
        ctx.strokeRect(80, 1400, 1040, 130);

        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('※ [안내 및 유의사항]', 105, 1435);

        ctx.fillStyle = '#475569';
        ctx.font = '14px sans-serif';
        ctx.fillText('• 본 심리 분석 리포트는 아동의 그림 표현을 관찰하여 제공하는 양육 참고 자료입니다.', 105, 1465);
        ctx.fillText('• 의료기관의 의학적·정신의학적 진단이나 절대적인 정신의학적 감정 수치가 아닙니다.', 105, 1490);

        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `심리분석소견서_${childName}_${Date.now()}.png`;
        a.click();
        onShowToast('심리 분석 소견서 이미지가 저장되었습니다! 💾');
      };
      img.src = record.imgData;
    } catch {
      onShowToast('소견서 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border-4 border-purple-300 flex flex-col max-h-[94vh]">
        <div className="px-6 py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_85knyf85knyf85kn_a1b3fbaf.png"
              alt="로고"
              className="w-7 h-7 rounded-full border border-white/50 object-cover shadow-xs"
            />
            <h3 className="title-font text-xl md:text-2xl font-bold tracking-tight">
              아동 심리 미술 분석 소견서
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-purple-700 hover:bg-purple-50 font-bold rounded-xl text-xs md:text-sm shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-purple-600" />
              <span>소견서 인쇄 🖨️</span>
            </button>

            <button
              onClick={handleSaveAsImage}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold rounded-xl text-xs md:text-sm shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-900" />
              <span>소견서 저장 💾</span>
            </button>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-1.5 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-gray-100 flex justify-center">
          <div
            ref={certificateRef}
            className="w-full max-w-3xl bg-white p-6 md:p-10 rounded-2xl shadow-xl border-4 border-purple-200 text-gray-800"
          >
            <div className="text-center border-b-2 border-purple-200 pb-4 mb-6 relative flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-purple-300 shadow-sm bg-white p-0.5 mb-2">
                <img
                  src="/assets/aistudio/Gemini_Generated_Image_85knyf85knyf85kn_a1b3fbaf.png"
                  alt="로고"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="inline-block bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full mb-1">
                HTP 아동 심리 미술 분석 소견서
              </span>
              <h2 className="title-font text-3xl md:text-4xl text-purple-900 font-extrabold tracking-tight mt-1 mb-1">
                아동 심리 미술 분석 소견서
              </h2>
              <div className="text-xs text-gray-500 font-medium">
                발급번호: {certNumber} &nbsp;|&nbsp; 다 그렸어요! 아동 심리 아틀리에
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-6 text-xs md:text-sm">
              <div className="flex flex-col">
                <span className="text-gray-500 font-semibold text-[11px]">검사 아동</span>
                <span className="font-bold text-gray-900">{childName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500 font-semibold text-[11px]">진단 일자</span>
                <span className="font-bold text-gray-900">{record.date}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500 font-semibold text-[11px]">평가 도구</span>
                <span className="font-bold text-purple-700">HTP 미술 심리 검사</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500 font-semibold text-[11px]">진단 결과</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" />
                  <span>분석 완료</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-200 flex flex-col items-center justify-center">
                <img
                  src={record.imgData}
                  alt="분석 대상 그림"
                  className="max-h-52 w-auto object-contain rounded-xl shadow-sm bg-white border border-purple-100"
                />
                <span className="text-[11px] text-purple-600 font-bold mt-2">
                  [실제 아동 드로잉 원본]
                </span>
              </div>

              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 p-4 rounded-2xl border border-purple-200 flex flex-col justify-around text-xs md:text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-purple-200/60">
                  <span className="text-purple-800 font-bold">캔버스 공간 활용도</span>
                  <span className="text-base font-extrabold text-purple-700">{areaRatio}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-purple-200/60">
                  <span className="text-purple-800 font-bold">드로잉 중심 수직 위치</span>
                  <span className="text-base font-extrabold text-sky-700">{centerY}%</span>
                </div>
                <div className="pt-2">
                  <span className="text-purple-800 font-bold block mb-1">표현 특징 및 룰 진단:</span>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100 text-[11px] text-gray-700 leading-relaxed font-medium">
                    {note}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="title-font text-xl text-purple-800 font-bold mb-3 flex items-center gap-1.5">
                <span>📋 심리 분석 및 양육 소견서</span>
              </h3>
              <div
                className="bg-[#faf5ff] p-5 rounded-2xl border-2 border-purple-200 leading-relaxed text-sm text-gray-800 space-y-3 shadow-inner"
                dangerouslySetInnerHTML={{ __html: record.analysisHtml }}
              />
            </div>

            <div className="border-t-2 border-gray-200 pt-4 flex flex-col gap-2.5 text-xs text-gray-600 bg-gray-50/80 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <span>⚠️ [심리 분석 결과 열람 시 유의사항]</span>
              </div>
              <p className="leading-relaxed">
                • 본 심리 분석 리포트는 아동의 그림 표현을 관찰하여 제공하는 <strong>양육 참고 자료</strong>이며, <strong>절대적인 정신의학적 감정 수치나 의료기관의 의학적 진단이 아닙니다.</strong>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                다 그렸어요! 아동 심리 아틀리에 &middot; HTP 심리 미술 분석 시스템
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
