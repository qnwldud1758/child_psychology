/**
 * 웹 앱의 메인 엔트리 포인트 (HTML 파일 서비스)
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Draw your happy')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 아이의 그림 데이터를 기반으로 Gemini API를 호출하여 아동 심리 분석 결론을 도출합니다.
 */
function analyzeChildPsychology(payload) {
  try {
    if (!payload) payload = {};

    const scriptProperties = PropertiesService.getScriptProperties();
    const apiKey = scriptProperties.getProperty('gemini_api_key');

    if (!apiKey) {
      throw new Error("스크립트 속성에 'gemini_api_key'가 설정되어 있지 않습니다.");
    }

    // 이미지를 처리하기 위해 비전(Vision)을 지원하는 가장 범용적인 모델인 1.5-flash를 사용합니다.
    const modelId = "gemini-3.5-flash-lite"; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const treeDataStr = JSON.stringify(payload.treeData || {}).slice(0, 300);
    const manDataStr = JSON.stringify(payload.manData || {}).slice(0, 300);
    const womanDataStr = JSON.stringify(payload.womanData || {}).slice(0, 300);
    const houseDataStr = JSON.stringify(payload.houseData || {}).slice(0, 300);
    
    const rules = payload.realtimeRules || {};
    const rulesSummary = rules.summary || "특이사항 없음";
    const appliedRules = (rules.appliedRules || []).join('\n - ');

    const htpLabels = `
    [HTP 클래스별 라벨 구성 (분석 기준)]
    - 집 : 집전체, 지붕, 집벽, 문, 창문, 굴뚝, 연기, 울타리, 길, 연못, 산, 나무꽃, 잔디, 태양
    - 나무 : 나무전체, 기둥, 수관, 가지, 뿌리, 나뭇잎, 꽃, 열매, 그네, 새, 다람쥐, 구름, 달, 별
    - 사람 : 사람전체, 머리, 얼굴, 눈, 코, 입, 귀, 머리카락, 목, 상체, 팔, 손, 다리, 발
    `;

    // System Instruction: 파이어베이스 데이터를 무시하고 첨부된 이미지를 최우선으로 하도록 강력히 지시
    const systemInstructionText = 
      "당신은 아동 미술 심리 치료 전문가입니다. 첨부된 '실제 캔버스 이미지'와 보조로 제공된 파이어베이스 텍스트 데이터를 분석합니다.\n" +
      "[매우 엄격한 분석 규칙 - 반드시 지킬 것]\n" +
      "1. 시각적 교차 검증: 파이어베이스 텍스트 데이터에 집, 나무, 사람이 있다고 적혀있더라도, **실제 첨부된 그림 이미지에 해당 형태가 없다면 텍스트 데이터를 100% 무시**하세요.\n" +
      "2. 없는 요소 지어내기 금지: 동그라미 하나, 단순한 선, 낙서 등 HTP와 무관한 그림일 경우, 억지로 의미를 부여하지 마세요. 이 경우 다른 분석은 모두 생략하고 **'캔버스에 집, 나무, 사람의 형태가 뚜렷하지 않아 심리 분석을 진행하기 어려워요. 다음에 다시 한번 예쁘게 그려주면 더 잘 분석해 줄게요!'** 라고만 대답하세요.\n" +
      "3. 아이가 그린 요소(집, 사람, 나무 중 이미지에 실제로 존재하는 것)에 대해서만 심층 해석을 진행하세요.\n" +
      "4. HTML 태그(<h3 style='color:#9333ea; font-weight:bold;'>, <p>, <strong>, <ul>, <li>, <br>)를 사용하여 보기 좋게 작성하세요.";

    const userPromptText = `[실시간 캔버스 드로잉 데이터 1차 진단 결과]\n` +
      `- 요약수치: ${rulesSummary}\n` +
      `- 룰(Rule) 적용 도출 결론:\n - ${appliedRules}\n\n` +
      `${htpLabels}\n` +
      `[참고용 파이어베이스 HTP 객체 인식 텍스트 데이터]\n` +
      `- 나무: ${treeDataStr}\n` +
      `- 남자: ${manDataStr}\n` +
      `- 여자: ${womanDataStr}\n` +
      `- 집: ${houseDataStr}\n\n` +
      `다음 항목을 짧고 명확하게 분석해 주세요:\n` +
      `1. 🎨 아이의 현재 심리 종합 진단\n` +
      `2. 🔍 HTP 주요 요소별 심층 해석 (실제 이미지에 존재하는 요소만)\n` +
      `3. 💡 부모님을 위한 맞춤형 조언`;

    // 이미지 데이터(Base64)가 있으면 첨부
    const parts = [{ text: userPromptText }];
    if (payload.imageData) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: payload.imageData
        }
      });
    }

    const requestBody = {
      contents: [{ role: "user", parts: parts }],
      systemInstruction: { parts: [{ text: systemInstructionText }] }
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    };

    let response;
    let responseCode;
    let responseText;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      response = UrlFetchApp.fetch(apiUrl, options);
      responseCode = response.getResponseCode();
      responseText = response.getContentText();

      if (responseCode === 200) break; 
      if (responseCode === 429 && attempt < maxRetries) {
        Utilities.sleep(5000); 
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
      return jsonResult.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Gemini API에서 올바른 답변 텍스트를 생성하지 못했습니다.");
    }

  } catch (error) {
    Logger.log("=== Error during Psychology Analysis ===");
    Logger.log(error.toString());
    throw new Error(error.message || "심리 분석 과정 중 오류가 발생했습니다.");
  }
}

/**
 * 사용자 일기 저장 API 스터브
 */
function saveDiaryEntry(payload) {
  Logger.log("일기 저장됨: " + JSON.stringify(payload));
  return { success: true, timestamp: new Date().getTime() };
}

/**
 * 분석 기록 저장 API 스터브
 */
function saveAnalysisRecord(payload) {
  Logger.log("분석 기록 저장됨: " + JSON.stringify(payload));
  return { success: true, timestamp: new Date().getTime() };
}