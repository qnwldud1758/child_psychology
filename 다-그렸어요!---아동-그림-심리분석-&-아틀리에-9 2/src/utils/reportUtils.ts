/**
 * Utilities for image compression and certificate printing.
 */
import { PsychologyRecord } from '../types';

export async function compressCanvasImage(dataUrl: string, maxDim = 640, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        let width = img.width || 800;
        let height = img.height || 600;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

export function printDiagnosisCertificate(
  record: PsychologyRecord,
  childName = '우리 아이'
): boolean {
  try {
    const existing = document.getElementById('print-certificate-frame');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'print-certificate-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return false;

    const certNumber = `HTP-${new Date(record.timestamp || Date.now()).getFullYear()}-${String(
      record.id || '001'
    ).slice(-6)}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>아동 미술 심리 분석 소견서 - ${childName}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          body { font-family: sans-serif; color: #1f2937; background: #fff; margin: 0; padding: 12px; line-height: 1.6; }
          .certificate { border: 3px double #7c3aed; padding: 24px; border-radius: 12px; }
          .header { text-align: center; border-bottom: 2px solid #e9d5ff; padding-bottom: 14px; margin-bottom: 18px; }
          .title { font-size: 24px; font-weight: 800; color: #581c87; margin: 0 0 6px 0; }
          .report-box { background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
          .report-box h3 { color: #7e22ce; font-size: 14px; font-weight: 700; margin: 12px 0 6px 0; }
          .report-box p { margin: 0 0 8px 0; font-size: 12.5px; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">
            <img src="/assets/aistudio/Gemini_Generated_Image_85knyf85knyf85kn_a1b3fbaf.png" style="width:52px; height:52px; border-radius:50%; border:2px solid #7c3aed; object-fit:cover; margin-bottom:6px;" /><br/>
            <span style="background:#f3e8ff; color:#6b21a8; font-size:11px; padding:3px 12px; border-radius:9999px; font-weight:bold;">HTP 아동 미술 심리 분석 소견서</span>
            <h1 class="title">아동 심리 미술 분석 소견서</h1>
            <div style="font-size:11px; color:#6b7280;">발급번호: ${certNumber} | 검사 아동: ${childName} | 진단일자: ${record.date}</div>
          </div>
          <div style="display:flex; gap:16px; margin-bottom:18px; align-items:center;">
            <div style="flex:0 0 45%; text-align:center; background:#faf5ff; padding:8px; border-radius:8px; border:1px solid #e9d5ff;">
              <img src="${record.imgData}" style="max-height:180px; max-width:100%; object-fit:contain; background:#fff;" />
              <div style="font-size:11px; color:#6b21a8; font-weight:bold; margin-top:4px;">실제 아동 드로잉 원본</div>
            </div>
            <div style="flex:1; font-size:12px; background:#fdf4ff; padding:14px; border-radius:8px; border:1px solid #f0abfc;">
              <strong>• 평가 도구:</strong> HTP (집-나무-사람) 동적 드로잉 분석<br>
              <strong>• 분석 상태:</strong> 정상 발달 및 정서 표현 분석 완료<br>
              <strong>• 종합 평점:</strong> 유효 드로잉 분석 통과
            </div>
          </div>
          <div class="report-box">
            ${record.analysisHtml}
          </div>
          <div style="font-size:11px; color:#475569; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">
            <strong>⚠️ [유의사항]</strong> 본 심리 분석 리포트는 아동의 그림 표현을 관찰하여 제공하는 양육 참고 자료이며, 절대적인 정신의학적 감정 수치나 의료기관의 의학적 진단이 아닙니다.
          </div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 250);

    return true;
  } catch (e) {
    console.error('Print certificate error:', e);
    return false;
  }
}
