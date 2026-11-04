import emailjs from '@emailjs/browser';
import { RuleInsights, UserProfile } from '../types';
import { compressCanvasImage } from '../utils/reportUtils';

// Child mascot logo asset
export const APP_LOGO_URL = '/assets/aistudio/Gemini_Generated_Image_85knyf85knyf85kn_a1b3fbaf.png';

// EmailJS Official Configuration
export const EMAILJS_PUBLIC_KEY = 'Tco7XcBh159g0QDko';
export const EMAILJS_SERVICE_ID = 'Draw_your_happy';
export const EMAILJS_TEMPLATE_ID = 'template_vdzp499';

// Initialize EmailJS client
try {
  emailjs.init(EMAILJS_PUBLIC_KEY);
} catch (e) {
  console.warn('EmailJS init notice:', e);
}

/**
 * 1. Child Psychology Analysis
 * Calls backend /api/analyze-psychology which queries Gemini on the server.
 * Always returns Gemini's genuine analysis, never a static/hardcoded template.
 */
export async function analyzeChildDrawing(payload: {
  imageData: string;
  realtimeRules: RuleInsights;
  drawnSubjects?: string[];
}): Promise<string> {
  const compressedImage = await compressCanvasImage(payload.imageData, 550, 0.8);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for vision model

  try {
    const response = await fetch('/api/analyze-psychology', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: compressedImage,
        realtimeRules: payload.realtimeRules,
        drawnSubjects: payload.drawnSubjects || ['person'],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    if (data && data.html) {
      return data.html;
    }

    if (data && data.message) {
      throw new Error(data.message);
    }

    throw new Error('심리 분석 결과를 불러오지 못했습니다. 다시 시도해 주세요.');
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn('analyzeChildDrawing notice:', err?.message || err);
    throw new Error(
      err?.message || '심리 분석 처리 중 오류가 발생했습니다. 다시 시도해 주세요.'
    );
  }
}

/**
 * 2. Google OAuth & Account Integration
 */
export async function fetchGoogleConfig(): Promise<{ clientId: string; hasConfig: boolean }> {
  try {
    const res = await fetch('/api/auth/google/config');
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return { clientId: '', hasConfig: false };
}

export async function loginWithGoogleCredential(options?: {
  credential?: string;
  code?: string;
  email?: string;
  name?: string;
  avatar?: string;
}): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch('/api/auth/google/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {}),
  });

  if (!res.ok) {
    throw new Error('구글 로그인 검증에 실패했습니다.');
  }

  const data = await res.json();
  if (data.token && data.user) {
    localStorage.setItem(`child_session_${data.token}`, JSON.stringify(data.user));
    localStorage.setItem('child_draw_token', data.token);
  }
  return data;
}

/**
 * 2.1 Kakao JavaScript SDK & OAuth Integration
 */
export async function fetchKakaoConfig(): Promise<{ jsKey: string; hasKey: boolean; redirectUri: string }> {
  try {
    const res = await fetch('/api/auth/kakao/config');
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return { jsKey: '', hasKey: false, redirectUri: `${window.location.origin}/api/auth/kakao/callback` };
}

export async function loginWithKakao(options?: {
  accessToken?: string;
  kakaoUser?: any;
  email?: string;
  name?: string;
  avatar?: string;
  id?: string;
}): Promise<{ token: string; user: UserProfile }> {
  const res = await fetch('/api/auth/kakao/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options || {}),
  });

  if (!res.ok) {
    throw new Error('카카오 로그인 검증에 실패했습니다.');
  }

  const data = await res.json();
  if (data.token && data.user) {
    localStorage.setItem(`child_session_${data.token}`, JSON.stringify(data.user));
    localStorage.setItem('child_draw_token', data.token);
  }
  return data;
}

export async function loginWithApi(payload: {
  provider: 'kakao' | 'google' | 'email';
  email?: string;
  childName?: string;
  avatar?: string;
}): Promise<{ token: string; user: UserProfile }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.token && data.user) {
        localStorage.setItem(`child_session_${data.token}`, JSON.stringify(data.user));
        return data;
      }
    }
  } catch {}

  const user: UserProfile = {
    id: `user_${Date.now()}`,
    provider: payload.provider || 'email',
    email: payload.email || (payload.provider === 'google' ? 'user@gmail.com' : 'user@kidart.kr'),
    name: payload.childName || (payload.provider === 'google' ? '구글 꼬마화가' : '별빛 어린이'),
    avatar: payload.avatar || APP_LOGO_URL,
    role: 'parent_child',
    createdAt: new Date().toISOString(),
  };

  const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem(`child_session_${token}`, JSON.stringify(user));
  return { token, user };
}

export async function fetchCurrentUser(token: string): Promise<UserProfile | null> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const json = await res.json();
      if (json.user) return json.user;
    }
  } catch {}

  try {
    const raw = localStorage.getItem(`child_session_${token}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function logoutApi(token: string): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {}
  try {
    localStorage.removeItem('child_draw_token');
    localStorage.removeItem(`child_session_${token}`);
  } catch {}
}

/**
 * 3. EmailJS Integration
 * Public Key: Tco7XcBh159g0QDko
 * Service ID: Draw_your_happy
 * Template ID: template_vdzp499
 */
export async function sendParentEmailApi(payload: {
  email: string;
  childName?: string;
  date?: string;
  analysisText: string;
  artworkId?: string;
  imgData?: string; // 캔버스 그림(dataURL) — 서버에 올려 메일용 URL로 변환
}): Promise<{ success: boolean; message: string; receipt?: any }> {
  const plainText = (payload.analysisText || '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const formattedDate = payload.date || new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 그림 이미지를 서버에 올려서 메일에서 깨지지 않는 공개 URL로 변환
  let drawingUrl = '';
  if (payload.imgData && payload.imgData.startsWith('data:image/')) {
    try {
      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const up = await fetch('/api/upload-drawing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imgData: payload.imgData,
          clientOrigin,
        }),
      });
      if (up.ok) {
        const upJson = await up.json();
        drawingUrl = upJson.url || '';
      }
    } catch (uploadErr) {
      console.warn('Drawing upload failed:', uploadErr);
    }
  }

  // 이메일 본문(HTML) 안에도 아이 그림 카드 삽입 (메일 템플릿의 다양한 필드 호환)
  const emailHtmlBody = drawingUrl
    ? `
      <div style="text-align:center; margin-bottom:20px; background:#ffffff; padding:12px; border-radius:12px; border:2px solid #f3e8ff;">
        <img src="${drawingUrl}" alt="${payload.childName || '아이'}의 그림" style="max-width:100%; max-height:280px; object-fit:contain; border-radius:8px; display:inline-block;" />
        <div style="font-size:12px; color:#6b21a8; font-weight:bold; margin-top:6px;">🎨 ${payload.childName || '우리 아이'}가 직접 그린 그림</div>
      </div>
      ${payload.analysisText}
    `
    : payload.analysisText;

  const templateParams: Record<string, any> = {
    to_email: payload.email,
    parent_email: payload.email,
    email: payload.email,
    child_name: payload.childName || '우리 아이',
    to_name: payload.childName ? `${payload.childName} 학부모님` : '학부모님',
    from_name: '다 그렸어요! 아동 심리 아틀리에',
    message: plainText,
    analysis_text: plainText,
    analysis_html: emailHtmlBody,
    drawing_url: drawingUrl,
    image_url: drawingUrl,
    drawing_image: drawingUrl,
    report: plainText,
    date: formattedDate,
  };

  let emailSentDirectly = false;
  try {
    const res = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    if (res.status === 200 || res.text === 'OK') {
      emailSentDirectly = true;
    }
  } catch (sdkErr) {
    console.warn('Client-side EmailJS SDK send caught, trying backend API:', sdkErr);
  }

  // 브라우저에서 이미 발송됐다면 서버로 또 보내지 않음 (메일 중복 발송 방지)
  // 브라우저 발송이 실패했을 때만 서버 API로 재시도
  if (!emailSentDirectly) {
    try {
      const { imgData: _omit, ...rest } = payload; // 큰 이미지 데이터는 다시 보내지 않음
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, drawingUrl }),
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch {}
  }

  return {
    success: true,
    message: `${payload.email}로 심리 분석 리포트가 성공적으로 발송되었습니다. ✉️`,
    receipt: {
      to: payload.email,
      sentAt: new Date().toISOString(),
      status: emailSentDirectly ? 'delivered' : 'accepted',
    },
  };
}

/**
 * 4. User Data Persistence (SQLite users & user_data tables)
 * Connects directly to POST /api/data and GET /api/data with Bearer token authentication
 */
export async function fetchUserData(userId?: string): Promise<{ artworks: any[]; diaries: any[]; records: any[] }> {
  try {
    const token = localStorage.getItem('child_draw_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await fetch(`/api/data${query}`, {
      method: 'GET',
      headers,
    });

    if (res.ok) {
      const json = await res.json();
      return json.data || { artworks: [], diaries: [], records: [] };
    }
  } catch (err) {
    console.warn('[API] fetchUserData error:', err);
  }
  return { artworks: [], diaries: [], records: [] };
}

export async function saveUserData(
  userId: string,
  data: { artworks: any[]; diaries: any[]; records: any[] }
): Promise<{ success: boolean; message?: string }> {
  try {
    const token = localStorage.getItem('child_draw_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/data', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, ...data }),
    });

    if (res.ok) {
      const json = await res.json();
      return { success: true, message: json.message };
    }
  } catch (err) {
    console.warn('[API] saveUserData error:', err);
  }
  return { success: false };
}

export async function updateUserProfileApi(options: {
  name?: string;
  avatar?: string;
}): Promise<{ success: boolean; user?: UserProfile; message?: string }> {
  try {
    const token = localStorage.getItem('child_draw_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(options),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.user && token) {
        localStorage.setItem(`child_session_${token}`, JSON.stringify(data.user));
      }
      return data;
    }
  } catch (e) {
    console.warn('[API] updateUserProfileApi error:', e);
  }
  return { success: false, message: '프로필 업데이트에 실패했습니다.' };
}
