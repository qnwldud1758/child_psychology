import React, { useState } from 'react';
import { X, Mail, CheckCircle, Send, Sparkles, AlertCircle, Info } from 'lucide-react';
import { PsychologyRecord } from '../types';
import { sendParentEmailApi } from '../services/api';

const APP_LOGO_URL = '/assets/aistudio/Gemini_Generated_Image_85knyf85knyf85kn_a1b3fbaf.png';

interface RecordDetailModalProps {
  record: PsychologyRecord | null;
  childName?: string;
  onClose: () => void;
  onEmailSentSuccess?: (recordId: string, email: string) => void;
  onShowToast: (msg: string) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  onClose,
  onEmailSentSuccess,
  onShowToast,
}) => {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!record) return null;

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('올바른 이메일 주소를 입력해 주세요.');
      return;
    }
    setErrorMsg('');
    setSending(true);
    try {
      const res = await sendParentEmailApi({
        email,
        date: record.date,
        analysisText: record.analysisHtml,
        artworkId: record.id,
        imgData: record.imgData,
      });
      setSentSuccess(true);
      onShowToast(res.message);
      if (onEmailSentSuccess) {
        onEmailSentSuccess(record.id, email);
      }
    } catch (e: any) {
      setErrorMsg(e.message || '이메일 발송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border-4 border-purple-200 flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-100 to-pink-50 border-b border-purple-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-purple-300 shadow-xs bg-white p-0.5 flex items-center justify-center">
              <img
                src={APP_LOGO_URL}
                alt="다 그렸어요 꼬마 화가"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="title-font text-2xl text-purple-700">심리 분석 기록 크게 보기</h3>
            <span className="text-xs bg-purple-200 text-purple-800 font-bold px-2.5 py-0.5 rounded-full">
              HTP 종합 진단
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 bg-white/80 hover:bg-white rounded-full p-2 transition-colors border border-purple-200 shadow-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-5/12 flex flex-col gap-3">
            <div className="bg-purple-50 rounded-2xl p-3 border-2 border-purple-200 flex items-center justify-center min-h-[220px] max-h-[300px]">
              <img
                src={record.imgData}
                alt="분석 대상 그림"
                className="max-h-[280px] max-w-full object-contain rounded-xl shadow-md bg-white"
              />
            </div>

            <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 text-xs text-gray-700 space-y-2">
              <div className="flex justify-between font-semibold border-b pb-1.5">
                <span className="text-gray-500">진단 일시</span>
                <span>{record.date}</span>
              </div>
            </div>

            <div className="bg-purple-50/70 border-2 border-purple-200 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 text-purple-700 font-bold text-xs mb-2">
                <Mail className="w-4 h-4 text-purple-600" />
                <span>부모님께 이 결과지 이메일로 보내기</span>
              </div>
              <form onSubmit={handleSendEmail} className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="부모님 이메일 주소 입력"
                  className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-purple-300 focus:outline-none focus:border-purple-500"
                />
                {errorMsg && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errorMsg}</span>
                  </p>
                )}
                {sentSuccess && (
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>이메일이 성공적으로 전송되었습니다!</span>
                  </p>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? '발송 중...' : '해석본 이메일 발송'}</span>
                </button>
              </form>
            </div>
          </div>

          <div className="w-full md:w-7/12 flex flex-col">
            <h4 className="title-font text-lg text-purple-800 mb-2 flex items-center gap-1.5">
              <span>심리 종합 진단 및 양육 가이드</span>
            </h4>
            <div
              className="flex-1 bg-white p-5 rounded-2xl border-2 border-purple-100 shadow-inner overflow-y-auto max-h-[500px] text-sm leading-relaxed text-gray-800"
              dangerouslySetInnerHTML={{ __html: record.analysisHtml }}
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 text-center sm:text-left">
            <Info className="w-3.5 h-3.5 text-purple-500 shrink-0 hidden sm:inline" />
            <span>※ 본 분석 결과는 양육 참고 자료이며, 의학적 진단이 아닙니다.</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm shadow transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
