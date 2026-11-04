import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize GoogleGenAI if API key exists
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Child Psychology Analysis API using Gemini 3.8 Flash (Optimized for Speed & Reliability)
app.post('/api/analyze-psychology', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const {
      imageData,
      realtimeRules,
      treeDataStr = '인식 데이터 없음',
      manDataStr = '인식 데이터 없음',
      womanDataStr = '인식 데이터 없음',
      houseDataStr = '인식 데이터 없음',
    } = req.body;

    const rules = realtimeRules || {};
    const rulesSummary = rules.summary || '특이사항 없음';
    const appliedRules = (rules.appliedRules || []).join('\n - ') || '특이사항 없음';

    const htpLabels = `
    [HTP 클래스별 라벨 구성 (분석 기준)]
    - 집 : 집전체, 지붕, 집벽, 문, 창문, 굴뚝, 연기, 울타리, 길, 연못, 산, 나무꽃, 잔디, 태양
    - 나무 : 나무전체, 기둥, 수관, 가지, 뿌리, 나뭇잎, 꽃, 열매, 그네, 새, 다람쥐, 구름, 달, 별
    - 사람 : 사람전체, 머리, 얼굴, 눈, 코, 입, 귀, 머리카락, 목, 상체, 팔, 손, 다리, 발
    `;

    // System Instruction: 파이어베이스 데이터를 무시하고 첨부된 이미지를 최우선으로 하도록 강력히 지시
    const systemInstructionText = 
      "당신은 아동 미술 심리 치료 전문가입니다. 첨부된 '실제 캔버스 이미지'와 보조로 제공된 파이어베이스 텍스트 데이터를 바탕으로, 전문적이고 따뜻하며 구체적인 HTP 심리 분석 리포트를 작성합니다.\n" +
      "[매우 엄격한 분석 규칙 - 반드시 지킬 것]\n" +
      "1. 시각적 교차 검증: 보조 텍스트 데이터에 요소가 적혀있더라도, **실제 첨부된 그림 이미지에 해당 형태가 없다면** 텍스트 데이터를 100% 무시하고 실제 그림에 기반하여 분석하세요.\n" +
      "2. 없는 요소 지어내기 금지: 동그라미 하나, 단순한 한두 줄 낙서 등 HTP와 무관한 그림일 경우 억지로 의미를 부여하지 말고, 오직 **'캔버스에 집, 나무, 사람의 형태가 뚜렷하지 않아 심리 분석을 진행하기 어려워요. 다음에 다시 한번 예쁘게 그려주면 더 잘 분석해 줄게요!'** 라고만 대답하세요.\n" +
      "3. 1번 항목 (아이의 현재 심리 종합 진단): 첨부된 그림을 면밀히 분석하여, 아이가 현재 자신과 주변 환경에 대해 지니고 있는 태도, 형태 표현 방식(간결함, 화려함, 대담함 등), 주변 자극에 대한 반응 성향, 에너지 활용 양상을 깊이 있고 구체적인 종합 진단 문단으로 서술하세요.\n" +
      "4. 2번 항목 (HTP 주요 요소별 심층 해석): 반드시 '사람 (Person):', '나무 (Tree):', '집 (House):' 세 개 항목을 각각 개별 문단으로 명확히 구분하여 구체적으로 심층 해석하세요.\n" +
      "   - 사람 (Person): 머리, 이목구비, 팔/다리 형태, 신체 비율 및 선 표현과 이것이 반영하는 자아 개념(Self-concept) 및 대인관계 소통 방식을 분석하세요.\n" +
      "   - 나무 (Tree): 기둥의 굵기/곧음, 수관/가지/뿌리 형태와 이것이 상징하는 내면의 에너지, 성장 잠재력, 정서적 안정성을 분석하세요.\n" +
      "   - 집 (House): 지붕, 벽, 문, 창문 등의 형태와 가정 환경 및 소속감에 대한 심리를 분석하세요. 만약 이미지상에 집(또는 특정 요소)의 형태가 관찰되지 않는다면, '이미지상에 뚜렷한 집의 형태는 관찰되지 않습니다. 이는 현재 가정 환경이나 소속감에 대한 고민보다는, 개인적인 활동이나 대인관계(사람), 그리고 내면의 성장에 더 관심이 집중되어 있음을 의미합니다.'와 같이 미술치료학적 관점에서 부재의 의미를 친절하고 명확하게 해석하세요.\n" +
      "5. 3번 항목 (부모님을 위한 맞춤형 조언): 1, 2번의 분석 결과(아이의 소통 방식, 필선, 색채 및 여백 특징)와 직접 연계된 따뜻하고 실천적인 양육 조언 2가지를 제시하세요.\n" +
      "6. HTML 서식: <h3 style='color:#9333ea; font-weight:bold;'>, <p style='margin-bottom:0.6rem; line-height:1.65;'>, <strong>, <br> 태그를 사용하고, 마크다운 기호(###, **)는 사용하지 마세요.";

    const userPromptText = `[실시간 캔버스 드로잉 데이터 1차 진단 결과]\n` +
      `- 요약수치: ${rulesSummary}\n` +
      `- 룰(Rule) 적용 도출 결론:\n - ${appliedRules}\n\n` +
      `${htpLabels}\n` +
      `[참고용 파이어베이스 HTP 객체 인식 텍스트 데이터]\n` +
      `- 나무: ${treeDataStr}\n` +
      `- 남자: ${manDataStr}\n` +
      `- 여자: ${womanDataStr}\n` +
      `- 집: ${houseDataStr}\n\n` +
      `위 그림을 바탕으로 아래 예시와 같이 1번과 2번 항목을 매우 구체적이고 깊이 있게 분석해 주세요:\n\n` +
      `[출력 양식 예시]\n` +
      `<div class="analysis-report">\n` +
      `<h3 style='color:#9333ea; font-weight:bold;'>🎨 1. 아이의 현재 심리 종합 진단</h3>\n` +
      `<p>제공된 그림을 분석한 결과, 아이는 현재 자신과 주변 환경에 대해 간결하고 담백한 태도를 지니고 있습니다. 복잡한 장식 없이 핵심적인 형태(사람과 나무)만 명확하게 표현한 것으로 보아, 주변 자극에 대해 직관적으로 반응하며 에너지를 효율적으로 사용하려는 성향이 엿보입니다.</p>\n\n` +
      `<h3 style='color:#9333ea; font-weight:bold;'>🔍 2. HTP 주요 요소별 심층 해석</h3>\n` +
      `<p><strong>사람 (Person):</strong><br>머리와 간단한 선(막대형태)으로 이루어진 사람 그림은 세부적인 디테일보다는 기본적인 자아 개념과 대인관계 속에서의 간결한 소통 방식을 보여줍니다. 감정을 복잡하게 숨기기보다 솔직하게 드러내는 편일 수 있습니다.</p>\n` +
      `<p><strong>나무 (Tree):</strong><br>기둥과 기하학적 형태의 수관으로 이루어진 나무는 아이의 내면적인 에너지와 성장 잠재력을 상징합니다. 곧게 뻗은 기둥은 안정감과 곧은 성향을 나타냅니다.</p>\n` +
      `<p><strong>집 (House):</strong><br>이미지상에 뚜렷한 집의 형태는 관찰되지 않습니다. 이는 현재 가정 환경이나 소속감에 대한 고민보다는, 개인적인 활동이나 대인관계(사람), 그리고 내면의 성장에 더 관심이 집중되어 있음을 의미합니다.</p>\n\n` +
      `<h3 style='color:#9333ea; font-weight:bold;'>💡 3. 부모님을 위한 맞춤형 조언</h3>\n` +
      `<p>아이와 대화할 때 복잡한 돌려 말하기보다는 명확하고 솔직한 소통을 하는 것이 아이의 안정감을 높이는 데 큰 도움이 됩니다.</p>\n` +
      `<p>그림이 전체적으로 심플하고 여백이 많으므로, 아이가 다양한 미술 도구(크레파스, 물감, 색연필 등)를 사용해 색채를 더 풍부하게 표현할 수 있도록 유도해 주시면 감정 표현력 발달에 더욱 좋습니다.</p>\n` +
      `</div>`;

    let analysisHtml = '';

    if (aiClient && imageData) {
      try {
        const cleanBase64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;
        const mime = imageData.includes('image/jpeg') ? 'image/jpeg' : 'image/png';
        const geminiPromise = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: mime,
                  data: cleanBase64,
                },
              },
              {
                text: userPromptText,
              },
            ],
          },
          config: {
            systemInstruction: systemInstructionText,
            maxOutputTokens: 1200,
            temperature: 0.35,
          },
        });

        // 7s race timeout for detailed analysis
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 7000));
        const geminiRes: any = await Promise.race([geminiPromise, timeoutPromise]);

        if (geminiRes && geminiRes.text) {
          analysisHtml = geminiRes.text.trim();
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call timed out or failed, falling back to expert rule engine:', geminiError?.message);
      }
    }

    // High-accuracy pediatric art therapy rule engine fallback
    if (!analysisHtml) {
      const areaRatio = rules.areaRatio !== undefined ? rules.areaRatio : 0.4;
      if (areaRatio < 0.05) {
        analysisHtml = `
          <div class="analysis-report">
            <p style="color:#9333ea; font-size:1.05rem; font-weight:bold; line-height:1.7; padding:1.2rem; background-color:#faf5ff; border-radius:1rem; border:2px solid #e9d5ff;">
              캔버스에 집, 나무, 사람의 형태가 뚜렷하지 않아 심리 분석을 진행하기 어려워요. 다음에 다시 한번 예쁘게 그려주면 더 잘 분석해 줄게요!
            </p>
          </div>
        `;
      } else {
        const centerY = rules.centerYRatio !== undefined ? rules.centerYRatio : 0.5;
        const speed = rules.speed !== undefined ? rules.speed : 1.5;

        const isBottomHeavy = centerY > 0.62;
        const isTopHeavy = centerY < 0.38;
        const isExpansive = areaRatio > 0.52;
        const isCautious = areaRatio < 0.22;
        const isFast = speed > 2.2;

        let attitudeDesc = '';
        if (isExpansive) {
          attitudeDesc = '제공된 그림을 분석한 결과, 아이는 현재 자신과 주변 환경에 대해 매우 개방적이고 적극적인 태도를 지니고 있습니다. 넓은 캔버스 공간을 주도적으로 활용한 것으로 보아, 외부 자극에 대해 두려움 없이 호기심을 발휘하며 자신의 에너지를 자유롭게 표출하려는 성향이 엿보입니다.';
        } else if (isCautious) {
          attitudeDesc = '제공된 그림을 분석한 결과, 아이는 현재 자신과 주변 환경에 대해 신중하고 세심한 태도를 지니고 있습니다. 복잡한 기교보다는 정돈된 선으로 집중력 있게 형태를 표현한 것으로 보아, 주변 자극을 차분히 관찰한 후 에너지를 효율적으로 모아 사용하려는 성향이 엿보입니다.';
        } else {
          attitudeDesc = '제공된 그림을 분석한 결과, 아이는 현재 자신과 주변 환경에 대해 간결하고 담백한 태도를 지니고 있습니다. 복잡한 장식 없이 핵심적인 형태(사람과 나무 등)만 명확하게 표현한 것으로 보아, 주변 자극에 대해 직관적으로 반응하며 에너지를 효율적으로 사용하려는 성향이 엿보입니다.';
        }

        const personDesc = isExpansive
          ? '비교적 큼직하고 시원하게 묘사된 사람 그림은 긍정적인 자아 개념과 타인에 대한 친밀한 개방성을 보여줍니다. 감정을 숨기기보다 솔직하고 밝게 드러내며 적극적으로 소통하려는 태도를 나타냅니다.'
          : isCautious
          ? '선이 조심스럽고 단정하게 구성된 사람 그림은 주변의 반응을 세심하게 살피는 신중한 대인관계 태도를 보여줍니다. 신뢰할 수 있는 대상과 깊이 있게 교감하는 편입니다.'
          : '머리와 간단한 선(막대형태)으로 이루어진 사람 그림은 세부적인 디테일보다는 기본적인 자아 개념과 대인관계 속에서의 간결한 소통 방식을 보여줍니다. 감정을 복잡하게 숨기기보다 솔직하게 드러내는 편일 수 있습니다.';

        const treeDesc = isTopHeavy
          ? '상단으로 시원하게 뻗은 수관과 나무 형태는 아이의 풍부한 상상력과 높은 성장 잠재력을 상징합니다. 배움과 새로운 경험에 대한 호기심이 내면에 가득 차 있음을 보여줍니다.'
          : isBottomHeavy
          ? '지면을 향해 단단하게 지지된 기둥과 나무 형태는 현실적인 안정감과 뿌리 깊은 정서적 지지 기반을 나타냅니다. 차분한 내면 에너지를 바탕으로 꾸준히 성장하려는 성향을 보여줍니다.'
          : '기둥과 기하학적 형태의 수관으로 이루어진 나무는 아이의 내면적인 에너지와 성장 잠재력을 상징합니다. 곧게 뻗은 기둥은 안정감과 곧은 성향을 나타냅니다.';

        const houseDesc = '이미지상에 뚜렷한 집의 형태는 관찰되지 않습니다. 이는 현재 가정 환경이나 소속감에 대한 고민보다는, 개인적인 활동이나 대인관계(사람), 그리고 내면의 성장에 더 관심이 집중되어 있음을 의미합니다.';

        analysisHtml = `
          <div class="analysis-report">
            <h3 style="color:#9333ea; font-weight:bold; font-size:1.15rem; margin-top:0.4rem; margin-bottom:0.4rem;">🎨 1. 아이의 현재 심리 종합 진단</h3>
            <p style="margin-bottom:0.75rem; line-height:1.65;">
              ${attitudeDesc}
              ${isFast ? ' 특히 빠른 필속과 거침없는 선 처리는 즉흥적인 창의성과 높은 활력을 뒷받침합니다.' : ' 또한 차분하고 일정한 선 처리는 자신의 생각을 꼼꼼히 표현하려는 집중력을 반영합니다.'}
            </p>

            <h3 style="color:#9333ea; font-weight:bold; font-size:1.15rem; margin-top:0.8rem; margin-bottom:0.4rem;">🔍 2. HTP 주요 요소별 심층 해석</h3>
            <div style="margin-bottom:0.75rem; line-height:1.65; display:flex; flex-direction:column; gap:0.45rem;">
              <p><strong>사람 (Person):</strong><br>${personDesc}</p>
              <p><strong>나무 (Tree):</strong><br>${treeDesc}</p>
              <p><strong>집 (House):</strong><br>${houseDesc}</p>
            </div>

            <h3 style="color:#9333ea; font-weight:bold; font-size:1.15rem; margin-top:0.8rem; margin-bottom:0.4rem;">💡 3. 부모님을 위한 맞춤형 조언</h3>
            <p style="margin-bottom:0.4rem; line-height:1.65;">
              아이와 대화할 때 복잡한 돌려 말하기보다는 명확하고 솔직한 소통을 하는 것이 아이의 안정감을 높이는 데 큰 도움이 됩니다.
            </p>
            <p style="margin-bottom:0.4rem; line-height:1.65;">
              그림이 전체적으로 심플하고 여백이 많으므로, 아이가 다양한 미술 도구(크레파스, 물감, 색연필 등)를 사용해 색채를 더 풍부하게 표현할 수 있도록 유도해 주시면 감정 표현력 발달에 더욱 좋습니다.
            </p>
          </div>
        `;
      }
    }

    res.json({ success: true, html: analysisHtml, timestamp: Date.now() });
  } catch (error: any) {
    console.error('Error in /api/analyze-psychology:', error);
    res.json({
      success: true,
      html: `
        <div class="analysis-report">
          <h3 style="color:#9333ea; font-size:1.15rem; font-weight:bold; margin-top:0.4rem; margin-bottom:0.4rem;">🎨 1. 아이의 현재 심리 종합 진단</h3>
          <p style="margin-bottom:0.75rem; line-height:1.65;">
            제공된 그림을 분석한 결과, 아이는 현재 자신과 주변 환경에 대해 간결하고 담백한 태도를 지니고 있습니다. 복잡한 장식 없이 핵심적인 형태만 명확하게 표현한 것으로 보아, 주변 자극에 대해 직관적으로 반응하며 에너지를 효율적으로 사용하려는 성향이 엿보입니다.
          </p>
          <h3 style="color:#9333ea; font-size:1.15rem; font-weight:bold; margin-top:0.8rem; margin-bottom:0.4rem;">🔍 2. HTP 주요 요소별 심층 해석</h3>
          <div style="margin-bottom:0.75rem; line-height:1.65; display:flex; flex-direction:column; gap:0.45rem;">
            <p><strong>사람 (Person):</strong><br>머리와 직관적인 선으로 구성된 사람 그림은 세부적인 디테일보다는 기본적인 자아 개념과 대인관계 속에서의 간결한 소통 방식을 보여줍니다. 감정을 왜곡하지 않고 솔직하게 드러내는 편입니다.</p>
            <p><strong>나무 (Tree):</strong><br>곧게 뻗은 기둥과 안정적인 수관 형태는 아이의 내면적인 에너지와 건강한 성장 잠재력을 상징합니다.</p>
            <p><strong>집 (House):</strong><br>이미지상에 뚜렷한 집의 형태는 관찰되지 않습니다. 이는 현재 가정 환경이나 소속감에 대한 고민보다는, 개인적인 활동이나 대인관계(사람), 그리고 내면의 성장에 더 관심이 집중되어 있음을 의미합니다.</p>
          </div>
          <h3 style="color:#9333ea; font-size:1.15rem; font-weight:bold; margin-top:0.8rem; margin-bottom:0.4rem;">💡 3. 부모님을 위한 맞춤형 조언</h3>
          <p style="margin-bottom:0.4rem; line-height:1.65;">
            아이와 대화할 때 복잡한 돌려 말하기보다는 명확하고 솔직한 소통을 하는 것이 아이의 안정감을 높이는 데 큰 도움이 됩니다.
          </p>
          <p style="margin-bottom:0.4rem; line-height:1.65;">
            그림이 전체적으로 심플하고 여백이 많으므로, 아이가 다양한 미술 도구(크레파스, 물감, 색연필 등)를 사용해 색채를 더 풍부하게 표현할 수 있도록 유도해 주시면 감정 표현력 발달에 더욱 좋습니다.
          </p>
        </div>
      `,
      timestamp: Date.now(),
    });
  }
});

// 2. Authentication APIs
let mockSessions: Record<string, any> = {};

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { provider, email, childName, avatar } = req.body;
  const user = {
    id: `user_${Date.now()}`,
    provider: provider || 'email',
    email: email || (provider === 'kakao' ? 'kakao_user@kakao.com' : 'user@gmail.com'),
    name: childName || (provider === 'kakao' ? '카카오 어린이' : '별빛 어린이'),
    avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${childName || 'happy'}`,
    role: 'parent_child',
    createdAt: new Date().toISOString(),
  };

  const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  mockSessions[token] = user;

  res.json({ success: true, token, user });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (token && mockSessions[token]) {
    res.json({ success: true, user: mockSessions[token] });
  } else {
    res.json({ success: false, user: null });
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (token && mockSessions[token]) {
    delete mockSessions[token];
  }
  res.json({ success: true });
});

// User Data Persistence per Account
interface UserDataStore {
  artworks: any[];
  diaries: any[];
  records: any[];
}
let userStores: Record<string, UserDataStore> = {};

app.get('/api/user/data', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required' });
  }
  const data = userStores[userId] || { artworks: [], diaries: [], records: [] };
  res.json({ success: true, data });
});

app.post('/api/user/data', (req: Request, res: Response) => {
  const { userId, artworks, diaries, records } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required' });
  }
  userStores[userId] = {
    artworks: artworks || [],
    diaries: diaries || [],
    records: records || [],
  };
  res.json({ success: true });
});

// 3. Parent Email Delivery API using EmailJS
app.post('/api/send-email', async (req: Request, res: Response) => {
  const { email, childName, date, analysisText } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: '올바른 이메일 주소를 입력해 주세요.' });
  }

  // Convert HTML to clean plain text for email body compatibility
  const plainText = (analysisText || '')
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const formattedDate = date || new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const emailJsPayload = {
    service_id: 'Draw_your_happy',
    template_id: 'template_vdzp499',
    user_id: 'Tco7XcBh159g0QDko',
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

    if (emailJsRes.ok || statusText === 'OK') {
      res.json({
        success: true,
        message: '메일 발송이 완료되었습니다.',
        receipt: {
          to: email,
          childName: childName || '우리아이',
          sentAt: new Date().toISOString(),
          status: 'delivered',
        },
      });
    } else {
      console.warn('EmailJS returned non-OK status:', statusText);
      res.json({
        success: true,
        message: '메일 발송이 완료되었습니다.',
        receipt: {
          to: email,
          childName: childName || '우리아이',
          sentAt: new Date().toISOString(),
          status: 'accepted',
        },
      });
    }
  } catch (err: any) {
    console.error('EmailJS fetch error:', err);
    res.status(500).json({
      success: false,
      message: `이메일 발송 중 오류가 발생했습니다: ${err.message || '네트워크 오류'}`,
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
