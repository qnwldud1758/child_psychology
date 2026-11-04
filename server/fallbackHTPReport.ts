type HTPInsights = {
  areaRatio?: number;
  centerYRatio?: number;
  speed?: number;
};

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });

/**
 * Builds a cautious, non-diagnostic fallback report from drawing metrics.
 * Only subjects supplied by the caller are included in the HTP section.
 */
export function generateFallbackHTPReport(
  insights: HTPInsights = {},
  noticeMsg = '',
  drawnSubjects: string[] = []
): string {
  const area = Number.isFinite(insights.areaRatio) ? insights.areaRatio! : 0.35;
  const centerY = Number.isFinite(insights.centerYRatio) ? insights.centerYRatio! : 0.5;
  const speed = Number.isFinite(insights.speed) ? insights.speed! : 1.2;

  const subjects = [...new Set(drawnSubjects)].filter((subject) =>
    ['person', 'tree', 'house'].includes(subject)
  );
  const displayNames: Record<string, string> = {
    person: '사람 (Person)',
    tree: '나무 (Tree)',
    house: '집 (House)',
  };

  const attitudeDesc = area > 0.55
    ? '그림 공간을 비교적 넓게 사용했습니다. 이것만으로 성격이나 정서 상태를 단정할 수는 없으며, 아이가 그림에 담고 싶었던 이야기를 직접 물어보는 것이 좋습니다.'
    : area < 0.25
      ? '그림 공간을 비교적 작게 사용했습니다. 크기만으로 위축이나 신중함을 판단하기보다는, 아이가 편안하게 느끼는 방식으로 표현하도록 격려해 주세요.'
      : '그림 공간을 적절히 사용했습니다. 그림의 배치만으로 심리 상태를 판단할 수는 없으므로, 아이가 선택한 표현과 설명을 함께 살펴보세요.';

  const placementDesc = centerY < 0.45
    ? '그림의 중심이 종이의 위쪽에 놓여 있습니다.'
    : centerY > 0.65
      ? '그림의 중심이 종이의 아래쪽에 놓여 있습니다.'
      : '그림의 중심이 종이 가운데에 놓여 있습니다.';

  const lineDesc = speed > 1.8
    ? '그리는 속도가 비교적 빠르게 기록되었습니다.'
    : speed < 0.8
      ? '그리는 속도가 비교적 천천히 기록되었습니다.'
      : '그리는 속도가 중간 범위로 기록되었습니다.';

  const subjectItems = subjects.map((subject) => {
    const name = displayNames[subject];
    const description = subject === 'person'
      ? '그림에서 보이는 모양과 아이가 붙인 이야기나 설명을 중심으로 함께 살펴보세요. 표현만으로 자아개념이나 대인관계를 진단할 수는 없습니다.'
      : subject === 'tree'
        ? '그림에서 보이는 나무의 형태와 아이가 붙인 이야기나 설명을 중심으로 함께 살펴보세요. 나무의 모양만으로 성장 가능성이나 정서 상태를 단정할 수는 없습니다.'
        : '그림에서 보이는 집의 형태와 아이가 붙인 이야기나 설명을 중심으로 함께 살펴보세요. 집의 표현만으로 가정환경이나 소속감을 판단할 수는 없습니다.';
    return `<li style="margin-bottom:0.6rem;"><strong>${name}:</strong> ${description}</li>`;
  }).join('');

  const subjectsSection = subjects.length > 0
    ? `<ul style="padding-left:1.25rem;">${subjectItems}</ul>`
    : '<p>분석 대상으로 전달된 사람·나무·집 정보가 없습니다. 그림에 실제로 보이는 내용을 아이와 함께 이야기해 보세요.</p>';

  return `
    <div class="analysis-report-content" style="line-height:1.75;color:#374151;">
      ${noticeMsg ? `<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:10px 14px;margin-bottom:14px;color:#6d28d9;">${escapeHtml(noticeMsg)}</div>` : ''}
      <h3 style="color:#7c3aed;font-size:1.15rem;font-weight:bold;">🎨 1. 그림에서 관찰된 점</h3>
      <p>${attitudeDesc}</p>
      <p>${placementDesc} ${lineDesc} 이러한 지표는 그림을 그린 방식에 대한 관찰이며, 심리 진단 결과가 아닙니다.</p>

      <h3 style="color:#7c3aed;font-size:1.15rem;font-weight:bold;">🔍 2. 실제로 그린 요소</h3>
      ${subjectsSection}

      <h3 style="color:#7c3aed;font-size:1.15rem;font-weight:bold;">💡 3. 부모님을 위한 대화 제안</h3>
      <ul style="padding-left:1.25rem;">
        <li>“이 그림에 어떤 이야기가 있어?”처럼 정답을 유도하지 않는 질문으로 아이의 설명을 들어주세요.</li>
        <li>해석을 서두르기보다 아이가 표현한 과정과 노력을 구체적으로 칭찬해 주세요.</li>
        <li>이 결과는 양육 참고용 관찰 자료이며, 임상적 평가나 진단을 대신하지 않습니다.</li>
      </ul>
    </div>
  `;
}
