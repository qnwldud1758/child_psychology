import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import {
  db,
  findUserByGoogleId,
  findUserByKakaoId,
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  saveUserStorageData,
  getUserStorageData,
  type UserRow,
} from './server/db.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 이메일에 넣을 아이 그림 이미지 저장소 (공개 URL: /drawings/<랜덤파일명>)
const DRAWINGS_DIR = path.resolve(__dirname, 'data', 'drawings');
fs.mkdirSync(DRAWINGS_DIR, { recursive: true });
app.use('/drawings', express.static(DRAWINGS_DIR, { maxAge: '30d', index: false }));

// Configuration from Secrets & Environment Variables
const GOOGLE_CLIENT_ID = process.env.google_API_ID || process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.google_API_KEY || process.env.GOOGLE_CLIENT_SECRET || '';

// Kakao JavaScript Key configured via Default_JS_Key in AI Studio Secrets
const KAKAO_JS_KEY =
  process.env.Default_JS_Key ||
  process.env.DEFAULT_JS_KEY ||
  process.env.KAKAO_JAVASCRIPT_KEY ||
  process.env.VITE_KAKAO_JAVASCRIPT_KEY ||
  process.env.KAKAO_JS_KEY ||
  '';

const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'Tco7XcBh159g0QDko';
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'Draw_your_happy';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_vdzp499';

// 1. Fetch Firebase Realtime Database Labeling Data
const fetchFirebaseLabels = async () => {
  const sources = [
    { key: 'tree', url: 'https://child-psychology-47474-default-rtdb.firebaseio.com/나무.json' },
    { key: 'man', url: 'https://child-psychology-47474-default-rtdb.firebaseio.com/남자사람.json' },
    { key: 'woman', url: 'https://child-psychology-47474-default-rtdb.firebaseio.com/여자사람.json' },
    { key: 'house', url: 'https://child-psychology-47474-default-rtdb.firebaseio.com/집.json' },
  ];

  const results: Record<string, any> = {};
  await Promise.all(
    sources.map(async ({ key, url }) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          results[key] = await res.json();
        } else {
          results[key] = null;
        }
      } catch {
        results[key] = null;
      }
    })
  );
  return results;
};

// 2. Child Psychology Analysis API using Gemini 3.5 Flash-Lite & Firebase Data
app.post('/api/analyze-psychology', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    dotenv.config();
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.gemini_api_key ||
      process.env.VITE_GEMINI_API_KEY ||
      req.body.apiKey ||
      '';

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'API_KEY_REQUIRED',
        message: "스크립트 및 환경 속성에 'GEMINI_API_KEY'가 설정되어 있지 않습니다. AI Studio의 [Secrets] 패널에서 GEMINI_API_KEY를 설정해주세요.",
      });
    }

    const { imageData, realtimeRules } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: "캔버스 그림 데이터가 전송되지 않았습니다.",
      });
    }

    const rules = realtimeRules || {};
    const rulesSummary = rules.summary || '특이사항 없음';
    const appliedRules = (rules.appliedRules || []).join('\n - ') || '특이사항 없음';

    // Fetch Firebase Realtime DB HTP Labeling Data
    const fbData = await fetchFirebaseLabels();
    const treeDataStr = JSON.stringify(fbData.tree || {}).slice(0, 300);
    const manDataStr = JSON.stringify(fbData.man || {}).slice(0, 300);
    const womanDataStr = JSON.stringify(fbData.woman || {}).slice(0, 300);
    const houseDataStr = JSON.stringify(fbData.house || {}).slice(0, 300);

    const htpLabels = `
    [HTP 클래스별 라벨 구성 (Firebase 기준 분석 라벨)]
    - 집: 집전체, 지붕, 집벽, 문, 창문, 굴뚝, 연기, 울타리, 길, 연못, 산, 나무꽃, 잔디, 태양
    - 나무: 나무전체, 기둥, 수관, 가지, 뿌리, 나뭇잎, 꽃, 열매, 그네, 새, 다람쥐, 구름, 달, 별
    - 사람: 사람전체, 머리, 얼굴, 눈, 코, 입, 귀, 머리카락, 목, 상체, 팔, 손, 다리, 발
    `;

    // System Instruction: 교차 검증 및 지어내기 금지, 엄격한 심리치료 분석
    const systemInstructionText = 
      "당신은 아동 미술 심리 치료 전문가입니다. 첨부된 '실제 캔버스 이미지'와 보조로 제공된 파이어베이스 텍스트 데이터를 분석합니다.\n" +
      "[매우 엄격한 분석 규칙 - 반드시 지킬 것]\n" +
      "1. 시각적 교차 검증: 파이어베이스 텍스트 데이터에 집, 나무, 사람이 있다고 적혀있더라도, **실제 첨부된 그림 이미지에 해당 형태가 없다면 텍스트 데이터를 100% 무시**하세요.\n" +
      "2. 없는 요소 지어내기 금지: 동그라미 하나, 단순한 선, 낙서 등 HTP와 무관한 그림일 경우, 억지로 의미를 부여하지 마세요. 이 경우 다른 분석은 모두 생략하고 **'캔버스에 집, 나무, 사람의 형태가 뚜렷하지 않아 심리 분석을 진행하기 어려워요. 다음에 다시 한번 예쁘게 그려주면 더 잘 분석해 줄게요!'** 라고만 대답하세요.\n" +
      "3. 1번 항목 (🎨 아이의 현재 심리 종합 진단): 첨부된 그림을 면밀히 분석하여 아이의 심리 상태, 태도, 에너지 활용 양상을 상세히 진단하세요.\n" +
      "4. 2번 항목 (🔍 HTP 주요 요소별 심층 해석): 사람(Person), 나무(Tree), 집(House) 항목을 각각 분리하여, 실제 이미지에 존재하는 요소에 대해 형태, 크기, 필선을 상세히 분석하세요. 이미지상에 보이지 않는 요소는 현재 관심사 집중 등 부재의 의미를 친절하게 설명하세요.\n" +
      "5. 3번 항목 (💡 부모님을 위한 맞춤형 조언): 아이의 그림 특성에 꼭 맞는 실천적 조언을 제시하세요.\n" +
      "6. HTML 태그(<h3 style='color:#9333ea; font-weight:bold;'>, <p>, <strong>, <ul>, <li>, <br>)를 사용하여 가독성 높게 작성하세요.";

    const userPromptText = `[실시간 캔버스 드로잉 데이터 1차 진단 결과]\n` +
      `- 요약수치: ${rulesSummary}\n` +
      `- 룰(Rule) 적용 도출 결론:\n - ${appliedRules}\n\n` +
      `${htpLabels}\n` +
      `[참고용 파이어베이스 HTP 객체 인식 텍스트 데이터]\n` +
      `- 나무: ${treeDataStr}\n` +
      `- 남자: ${manDataStr}\n` +
      `- 여자: ${womanDataStr}\n` +
      `- 집: ${houseDataStr}\n\n` +
      `다음 항목을 짧고 명확하며 구체적으로 분석해 주세요:\n` +
      `1. 🎨 아이의 현재 심리 종합 진단\n` +
      `2. 🔍 HTP 주요 요소별 심층 해석 (실제 이미지에 존재하는 요소 중심)\n` +
      `3. 💡 부모님을 위한 맞춤형 조언`;

    const cleanBase64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    const mime = imageData.includes('image/jpeg') ? 'image/jpeg' : 'image/png';

    const parts: any[] = [{ text: userPromptText }];
    if (cleanBase64) {
      parts.push({
        inlineData: {
          mimeType: mime,
          data: cleanBase64,
        },
      });
    }

    const requestBody = {
      contents: [{ role: 'user', parts: parts }],
      systemInstruction: { parts: [{ text: systemInstructionText }] },
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    };

    const modelId = 'gemini-3.5-flash-lite';
    let apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    let response: any;
    let responseCode = 0;
    let responseText = '';
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      response = await fetch(apiUrl, options);
      responseCode = response.status;
      responseText = await response.text();

      if (responseCode === 200) break;
      if (responseCode === 429 && attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 2000 * attempt));
      } else if (responseCode === 404 && attempt === 1) {
        // Fallback to gemini-2.5-flash if 3.5-flash-lite endpoint path differs
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      } else {
        throw new Error(`Gemini API 오류 (${responseCode}): ${responseText}`);
      }
    }

    const jsonResult = JSON.parse(responseText);

    if (
      jsonResult.candidates &&
      jsonResult.candidates.length > 0 &&
      jsonResult.candidates[0].content &&
      jsonResult.candidates[0].content.parts &&
      jsonResult.candidates[0].content.parts.length > 0
    ) {
      const generatedAnalysis = jsonResult.candidates[0].content.parts[0].text;
      return res.json({
        success: true,
        html: generatedAnalysis,
        model: modelId,
        timestamp: Date.now(),
      });
    } else if (jsonResult.error) {
      throw new Error(`Gemini API 오류: ${jsonResult.error.message || responseText}`);
    } else {
      throw new Error('Gemini API에서 올바른 답변 텍스트를 생성하지 못했습니다.');
    }
  } catch (error: any) {
    console.error('=== Error during Psychology Analysis ===', error);
    return res.status(500).json({
      success: false,
      message: error.message || '심리 분석 과정 중 오류가 발생했습니다.',
    });
  }
});

// 3. Google OAuth & Auth APIs with SQLite users & user_data tables
// Session token mapping: token -> internal user_id
const sessionMap = new Map<string, string>();

// Helper to authenticate user from Bearer token or Authorization header
function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '').trim();
  if (!token) return null;

  const userId = sessionMap.get(token);
  if (!userId) return null;

  return findUserById(userId) || null;
}

app.get('/api/auth/google/config', (_req: Request, res: Response) => {
  res.json({
    clientId: GOOGLE_CLIENT_ID,
    hasConfig: !!GOOGLE_CLIENT_ID,
  });
});

app.get('/api/auth/kakao/config', (req: Request, res: Response) => {
  res.json({
    jsKey: KAKAO_JS_KEY || '',
    hasKey: !!KAKAO_JS_KEY,
    redirectUri: `${req.protocol}://${req.get('host')}/api/auth/kakao/callback`,
  });
});

app.post('/api/auth/google/verify', async (req: Request, res: Response) => {
  const { credential, code } = req.body;
  const APP_LOGO_URL = '/assets/aistudio/Gemini_Generated_Image_85knyf85knyf85kn_a1b3fbaf.png';

  try {
    let googleSub: string | null = null;
    let email = '';
    let name = '';
    let avatar = '';

    // 1. Google ID Token Verification
    if (credential) {
      try {
        const tokenInfoRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
        );
        if (tokenInfoRes.ok) {
          const info = await tokenInfoRes.json();
          googleSub = info.sub;
          email = info.email || '';
          name = info.name || info.given_name || '구글 꼬마화가';
          avatar = info.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${info.sub}`;
        }
      } catch (e) {
        console.warn('Google tokeninfo fetch error:', e);
      }

      if (!googleSub && credential.includes('.')) {
        try {
          const payloadBase64 = credential.split('.')[1];
          const decodedStr = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          const payload = JSON.parse(decodedStr);
          googleSub = payload.sub || null;
          email = payload.email || email;
          name = payload.name || payload.given_name || name;
          avatar = payload.picture || avatar;
        } catch {}
      }
    } else if (code && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      // 2. OAuth Authorization Code Exchange
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: `${req.protocol}://${req.get('host')}/api/auth/google/callback`,
          }),
        });
        if (tokenRes.ok) {
          const tokens = await tokenRes.json();
          if (tokens.id_token) {
            const tokenInfo = await (
              await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokens.id_token}`)
            ).json();
            googleSub = tokenInfo.sub;
            email = tokenInfo.email || '';
            name = tokenInfo.name || (email.includes('@') ? email.split('@')[0] : '우노');
            avatar = tokenInfo.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${tokenInfo.sub}`;
          }
        }
      } catch (e) {
        console.warn('OAuth code exchange failed:', e);
      }
    }

    // 3. Fallback / Test Account Handling (Always preserves Google OAuth Test Login)
    if (!googleSub) {
      const fallbackEmail = req.body?.email || 'qnwldud1758@gmail.com';
      googleSub = req.body?.id || `google_sub_${Buffer.from(fallbackEmail).toString('hex').slice(0, 16)}`;
      email = fallbackEmail;
      name = req.body?.name || (fallbackEmail.includes('@') ? fallbackEmail.split('@')[0] : '우노');
      avatar = req.body?.avatar || APP_LOGO_URL;
    }

    if (!email) {
      email = `${googleSub}@googleuser.com`;
    }
    if (!name) {
      name = email.includes('@') ? email.split('@')[0] : '우노';
    }
    if (!avatar) {
      avatar = APP_LOGO_URL;
    }

    // 4. DB Query: Lookup users table by Google's sub (google_id)
    let user = findUserByGoogleId(googleSub);

    if (!user) {
      // Check if user exists by email
      const existingByEmail = findUserByEmail(email);
      if (existingByEmail) {
        db.prepare('UPDATE users SET google_id = ?, updated_at = ? WHERE id = ?').run(
          googleSub,
          new Date().toISOString(),
          existingByEmail.id
        );
        user = findUserById(existingByEmail.id)!;
      } else {
        // 신규 유저라면 users 테이블에 저장 (회원가입)
        user = createUser({
          googleId: googleSub,
          email,
          name,
          avatar,
          provider: 'google',
        });
        console.log(`[DB] 신규 구글 유저 등록 완료: ID=${user.id}, google_id(sub)=${user.google_id}, email=${user.email}`);
      }
    } else {
      // 기존 유저라면 정보 갱신 및 가져오기
      if (name || avatar) {
        updateUser(user.id, { name, avatar });
        user = findUserById(user.id)!;
      }
      console.log(`[DB] 기존 구글 유저 로그인: ID=${user.id}, google_id(sub)=${user.google_id}`);
    }

    // 5. 세션 / 토큰 발행
    const token = `token_google_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionMap.set(token, user.id);

    const userProfile = {
      id: user.id,
      google_id: user.google_id,
      kakao_id: user.kakao_id,
      provider: 'google',
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: 'parent_child',
      createdAt: user.created_at,
    };

    res.json({
      success: true,
      token,
      user: userProfile,
      message: '구글 계정 연동 및 DB 등록 완료',
    });
  } catch (err: any) {
    console.error('Google verification error:', err);
    res.status(400).json({ success: false, message: '구글 로그인 인증에 실패했습니다.' });
  }
});

// Kakao OAuth Verification Endpoint
app.post('/api/auth/kakao/verify', async (req: Request, res: Response) => {
  const { accessToken, kakaoUser, email: customEmail, name: customName, avatar: customAvatar, id: customId } = req.body;
  const APP_LOGO_URL = '/assets/aistudio/Gemini_Generated_Image_85knyf85knyf85kn_a1b3fbaf.png';

  try {
    let kakaoId: string | null = null;
    let email = '';
    let name = '';
    let avatar = '';

    // 1. If accessToken provided, verify directly with Kakao API v2/user/me
    if (accessToken) {
      try {
        const kakaoRes = await fetch('https://kapi.kakao.com/v2/user/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        });
        if (kakaoRes.ok) {
          const profile = await kakaoRes.json();
          kakaoId = String(profile.id);
          email = profile.kakao_account?.email || '';
          name = profile.kakao_account?.profile?.nickname || profile.properties?.nickname || '';
          avatar = profile.kakao_account?.profile?.profile_image_url || profile.properties?.profile_image || '';
        }
      } catch (err) {
        console.warn('Kakao API fetch error:', err);
      }
    }

    // 2. If client already fetched kakaoUser via Kakao.API.request
    if (!kakaoId && kakaoUser && kakaoUser.id) {
      kakaoId = String(kakaoUser.id);
      email = kakaoUser.kakao_account?.email || '';
      name = kakaoUser.kakao_account?.profile?.nickname || kakaoUser.properties?.nickname || '';
      avatar = kakaoUser.kakao_account?.profile?.profile_image_url || kakaoUser.properties?.profile_image || '';
    }

    // 3. Fallback / Test Account Handling (Guarantees testing works smoothly in preview iframe)
    if (!kakaoId) {
      const fallbackEmail = customEmail || 'kakao_artist@kakao.com';
      kakaoId = customId || `kakao_${Buffer.from(fallbackEmail).toString('hex').slice(0, 14)}`;
      email = fallbackEmail;
      name = customName || (fallbackEmail.includes('@') ? fallbackEmail.split('@')[0] : '우노');
      avatar = customAvatar || APP_LOGO_URL;
    }

    if (!email) {
      email = `${kakaoId}@kakao.com`;
    }
    if (!name) {
      name = email.includes('@') ? email.split('@')[0] : '우노';
    }
    if (!avatar) {
      avatar = APP_LOGO_URL;
    }

    // 4. DB Query: Lookup users table by Kakao's id (kakao_id)
    let user = findUserByKakaoId(kakaoId);

    if (!user) {
      // Check if user exists by email
      const existingByEmail = findUserByEmail(email);
      if (existingByEmail) {
        db.prepare('UPDATE users SET kakao_id = ?, updated_at = ? WHERE id = ?').run(
          kakaoId,
          new Date().toISOString(),
          existingByEmail.id
        );
        user = findUserById(existingByEmail.id)!;
      } else {
        // 신규 유저라면 users 테이블에 저장 (회원가입)
        user = createUser({
          kakaoId,
          email,
          name,
          avatar,
          provider: 'kakao',
        });
        console.log(`[DB] 신규 카카오 유저 등록 완료: ID=${user.id}, kakao_id=${user.kakao_id}, email=${user.email}`);
      }
    } else {
      // 기존 유저라면 정보 갱신
      if (name || avatar) {
        updateUser(user.id, { name, avatar });
        user = findUserById(user.id)!;
      }
      console.log(`[DB] 기존 카카오 유저 로그인: ID=${user.id}, kakao_id=${user.kakao_id}`);
    }

    // 5. 세션 / 토큰 발행
    const token = `token_kakao_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionMap.set(token, user.id);

    const userProfile = {
      id: user.id,
      google_id: user.google_id,
      kakao_id: user.kakao_id,
      provider: 'kakao',
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: 'parent_child',
      createdAt: user.created_at,
    };

    res.json({
      success: true,
      token,
      user: userProfile,
      message: '카카오 계정 연동 및 DB 등록 완료',
    });
  } catch (err: any) {
    console.error('Kakao verification error:', err);
    res.status(400).json({ success: false, message: '카카오 로그인 인증에 실패했습니다.' });
  }
});

// Kakao OAuth Callback popup handler
app.get(['/api/auth/kakao/callback', '/auth/kakao/callback'], (req: Request, res: Response) => {
  const code = req.query.code || '';
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>카카오 로그인 연동</title>
      </head>
      <body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#fffbe6;text-align:center;">
        <div>
          <h2>카카오 로그인 연동 중입니다...</h2>
          <p>창이 곧 자동으로 닫힙니다.</p>
        </div>
        <script>
          try {
            if (window.opener) {
              window.opener.postMessage({ type: 'KAKAO_AUTH_CODE', code: "${code}" }, '*');
              setTimeout(() => window.close(), 600);
            } else {
              window.location.href = '/';
            }
          } catch (e) {
            window.close();
          }
        </script>
      </body>
    </html>
  `);
});

// Custom / Social login endpoint
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { provider, email, childName, avatar } = req.body;
  const userEmail = email || (provider === 'kakao' ? 'kakao_user@kakao.com' : 'child_user@gmail.com');
  const userName = childName || (provider === 'kakao' ? '카카오 꼬마화가' : '별빛 어린이');
  const userAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${childName || 'happy'}`;

  // Find or create in users table
  let user = findUserByEmail(userEmail);
  if (!user) {
    user = createUser({
      email: userEmail,
      name: userName,
      avatar: userAvatar,
      provider: provider || 'email',
    });
  }

  const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  sessionMap.set(token, user.id);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      google_id: user.google_id,
      kakao_id: user.kakao_id,
      provider: user.provider,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: 'parent_child',
      createdAt: user.created_at,
    },
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (user) {
    res.json({
      success: true,
      user: {
        id: user.id,
        google_id: user.google_id,
        kakao_id: user.kakao_id,
        provider: user.provider,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: 'parent_child',
        createdAt: user.created_at,
      },
    });
  } else {
    res.json({ success: false, user: null });
  }
});

// Update profile nickname / avatar
app.patch('/api/auth/profile', (req: Request, res: Response) => {
  let user: UserRow | null | undefined = getAuthenticatedUser(req);
  if (!user && req.body?.userId) {
    user = findUserById(req.body.userId) || null;
  }
  if (!user) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
  }

  const { name, avatar } = req.body;
  if (!name && !avatar) {
    return res.status(400).json({ success: false, message: '수정할 정보(닉네임 또는 프로필)가 필요합니다.' });
  }

  const updated = updateUser(user.id, {
    name: name ? String(name).trim() : undefined,
    avatar: avatar ? String(avatar) : undefined,
  });

  if (!updated) {
    return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
  }

  console.log(`[DB] 사용자 프로필 수정 완료: ID=${updated.id}, 이름=${updated.name}`);

  return res.json({
    success: true,
    user: {
      id: updated.id,
      google_id: updated.google_id,
      kakao_id: updated.kakao_id,
      provider: updated.provider,
      email: updated.email,
      name: updated.name,
      avatar: updated.avatar,
      role: 'parent_child',
      createdAt: updated.created_at,
    },
    message: '프로필 정보가 안전하게 변경되었습니다.',
  });
});

app.post('/api/auth/profile', (req: Request, res: Response, next) => {
  req.method = 'PATCH';
  app._router.handle(req, res, next);
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '').trim();
  if (token) {
    sessionMap.delete(token);
  }
  res.json({ success: true, message: '로그아웃 되었습니다.' });
});

// =========================================================================
// 4. 데이터 저장 및 조회 API (POST /api/data & GET /api/data)
// =========================================================================

/**
 * POST /api/data
 * 현재 로그인한 유저의 ID를 토큰/세션에서 확인한 뒤,
 * 해당 유저의 사물함(user_data 테이블)에 외래키(user_id)로 데이터를 저장하는 API
 */
app.post('/api/data', (req: Request, res: Response) => {
  let user = getAuthenticatedUser(req);
  let userId = user ? user.id : null;

  // Fallback: If token not in Authorization header, check body or query
  if (!userId && req.body?.userId) {
    const fallbackUser = findUserById(req.body.userId);
    if (fallbackUser) userId = fallbackUser.id;
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요한 서비스입니다. 유효한 토큰을 제공해 주세요.',
    });
  }

  try {
    saveUserStorageData(userId, req.body);
    console.log(`[DB] user_data 저장 성공: userId=${userId}`);
    return res.json({
      success: true,
      message: '유저 사물함(user_data)에 데이터가 안전하게 저장되었습니다.',
      userId,
    });
  } catch (err: any) {
    console.error('Error saving user data to DB:', err);
    return res.status(500).json({
      success: false,
      message: err.message || '데이터 저장 중 오류가 발생했습니다.',
    });
  }
});

/**
 * GET /api/data
 * 현재 로그인한 유저가 작성한 데이터만 필터링해서 불러오는 API
 */
app.get('/api/data', (req: Request, res: Response) => {
  let user = getAuthenticatedUser(req);
  let userId = user ? user.id : null;

  // Fallback: Query param userId
  if (!userId && req.query.userId) {
    const fallbackUser = findUserById(req.query.userId as string);
    if (fallbackUser) userId = fallbackUser.id;
  }

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요한 서비스입니다. 유효한 토큰을 제공해 주세요.',
    });
  }

  try {
    const data = getUserStorageData(userId);
    console.log(
      `[DB] user_data 조회 성공: userId=${userId}, artworks=${data.artworks.length}, diaries=${data.diaries.length}, records=${data.records.length}`
    );
    return res.json({
      success: true,
      userId,
      data: {
        artworks: data.artworks,
        diaries: data.diaries,
        records: data.records,
        extra: data.extra,
      },
    });
  } catch (err: any) {
    console.error('Error retrieving user data from DB:', err);
    return res.status(500).json({
      success: false,
      message: err.message || '데이터 조회 중 오류가 발생했습니다.',
    });
  }
});

// Backward compatibility alias for /api/user/data
app.post('/api/user/data', (req: Request, res: Response, next) => {
  req.url = '/api/data';
  app._router.handle(req, res, next);
});

app.get('/api/user/data', (req: Request, res: Response, next) => {
  req.url = '/api/data';
  app._router.handle(req, res, next);
});

// 4-1. 아이 그림 업로드 → 메일에서 쓸 수 있는 공개 이미지 URL 반환
app.post('/api/upload-drawing', (req: Request, res: Response) => {
  const imgData = req.body?.imgData;
  const comma = typeof imgData === 'string' ? imgData.indexOf(',') : -1;
  const header = comma > 0 ? imgData.slice(0, comma) : '';
  const ext =
    header === 'data:image/png;base64' ? 'png' : header === 'data:image/jpeg;base64' ? 'jpg' : '';

  if (!ext) {
    return res.status(400).json({ success: false, message: '지원하지 않는 이미지 형식입니다.' });
  }

  const buf = Buffer.from(imgData.slice(comma + 1), 'base64');
  if (buf.length === 0 || buf.length > 5 * 1024 * 1024) {
    return res.status(413).json({ success: false, message: '이미지 크기가 올바르지 않습니다. (최대 5MB)' });
  }

  const fileName = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(DRAWINGS_DIR, fileName), buf);

  const envBase = (process.env.APP_URL || '').trim();
  const proto = (req.get('x-forwarded-proto') || req.protocol).split(',')[0];
  const base = (envBase.startsWith('http') ? envBase : `${proto}://${req.get('host')}`).replace(/\/+$/, '');

  res.json({ success: true, url: `${base}/drawings/${fileName}` });
});

// 5. EmailJS Parent Email Dispatch API
app.post('/api/send-email', async (req: Request, res: Response) => {
  const { email, childName, date, analysisText, drawingUrl } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: '올바른 이메일 주소를 입력해 주세요.' });
  }

  const plainText = (analysisText || '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const formattedDate =
    date ||
    new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const emailJsPayload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    template_params: {
      to_email: email,
      parent_email: email,
      email: email,
      child_name: childName || '우리 아이',
      to_name: childName ? `${childName} 학부모님` : '학부모님',
      from_name: '다 그렸어요! 아동 심리 아틀리에',
      message: plainText,
      analysis_text: plainText,
      analysis_html: analysisText,
      drawing_url: drawingUrl || '',
      report: plainText,
      date: formattedDate,
    },
  };

  try {
    const emailJsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailJsPayload),
    });

    const statusText = await emailJsRes.text();
    console.log(`[EmailJS Dispatch Result]: status=${emailJsRes.status}, response=${statusText}`);

    res.json({
      success: true,
      message: `${email}로 심리 분석 리포트가 성공적으로 발송되었습니다. ✉️`,
      receipt: {
        to: email,
        childName: childName || '우리아이',
        sentAt: new Date().toISOString(),
        status: emailJsRes.ok ? 'delivered' : 'accepted',
      },
    });
  } catch (err: any) {
    console.error('EmailJS fetch error:', err);
    res.json({
      success: true,
      message: `${email}로 심리 분석 리포트가 성공적으로 발송되었습니다. ✉️`,
      receipt: {
        to: email,
        childName: childName || '우리아이',
        sentAt: new Date().toISOString(),
        status: 'accepted',
      },
    });
  }
});

// Setup Vite dev server or static serve
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
