// 피드백 랩 — 규칙 라이브러리 (초고 수정 프로토콜 v0.2 기준)
// 주의: R1~R24 중 아래에 없는 번호는 프로토콜 v0.1 원문 입수 후 추가한다 (개발 진행문서 §9).
//       정의가 입력된 규칙만 단계 4 프롬프트에 포함된다.

export const RULES_VERSION = 'rules-2026-10-05.4 (+R35 감정, R36 시제, R37 지시문, R38 답 반복)';

export interface LabRule {
  id: string;
  name: string;
  category: 'narration' | 'character' | 'info_design' | 'scene' | 'consistency';
  detect: string;   // 탐지 기준
  action: string;   // 처리 방향
  example?: string; // 실측 예시 (『요리는 잘 하는 사람』 1·2부)
}

export const LAB_RULES: LabRule[] = [
  {
    id: 'R3', name: '장면이 보여준 것 반복 금지', category: 'narration',
    detect: '장면이 이미 보여준 내용을 서술자가 해설·요약으로 반복하는 문장',
    action: '해당 해설 문장 삭제 방향 제안. 장점(한 줄 대사)의 부정형',
    example: '114쪽 "타협할 생각은 없는 듯" / 109쪽 "생략된 시간과 노고를 깨닫는다"',
  },
  {
    id: 'R8', name: '초점 인물 한 명', category: 'narration',
    detect: '한 장면 안에서 둘 이상 인물의 내면 심리가 교대로 서술됨 (장면 단위 초점 교체는 허용)',
    action: 'A급 후보. 장면의 초점 인물을 하나로 고정하는 방향',
    example: '105~122쪽 편의점: 윤현채·이정은 심리 교대 서술',
  },
  {
    id: 'R10', name: '같은 정보 한 자리', category: 'info_design',
    detect: '같은 정보가 서로 다른 자리에서 두 번 이상 전달됨',
    action: '한 자리만 남기는 방향',
    example: '94~99쪽 이사회 내용을 아버지 앞에서 재설명',
  },
  {
    id: 'R12', name: '캐릭터 일관성', category: 'character',
    detect: '확립된 성격·이해관계와 모순되는 말과 행동',
    action: '모순 지점과 확립 근거를 병치해 보고',
    example: '134쪽 이정은 "주방 일자리 알아봐 줄게요" (공급자를 그만두게 하는 제안)',
  },
  {
    id: 'R13', name: '직업 디테일', category: 'consistency',
    detect: '직업·업무 서술이 실제 관행·용어와 어긋남',
    action: '현실 근거(도메인 사전)와 함께 수정 방향 제안',
    example: '윤현채 직무 = PSP 코디네이터 / 냉장 배송 = 콜드체인',
  },
  {
    id: 'R16', name: '고유명사', category: 'consistency',
    detect: '고유명사 표기 불일치, 실명 사용 리스크',
    action: '불일치 목록화. 실명 리스크는 최우선 보고',
    example: '미성유통 → 미성식품 표기 불일치',
  },
  {
    id: 'R17', name: '작가 대입 탐지', category: 'narration',
    detect: '문장의 감각·판단이 인물의 것이 아니라 작가의 것인 서술 ("~가 아닐까 싶다"류 작가 목소리)',
    action: '핵심 가치 규칙. 인물의 감각으로 되돌리는 방향',
    example: '106쪽 "진상 짓이 아닐까 싶지만" / 79쪽 "~되는 일인가 싶다"',
  },
  {
    id: 'R18', name: '인물은 변명하지 않는다', category: 'character',
    detect: '인물이 자기 행동을 독자를 향해 해명·변명하는 대사·서술',
    action: '변명 서술 삭제 방향',
    example: '112쪽 "그때는 일자리가 걸려 있었으니까" / 113쪽 "지금 생각하면 미친 짓이었어요"',
  },
  {
    id: 'R25', name: '인물 지식 상태의 일관성', category: 'info_design',
    detect: 'knowledge_states 전이 검사: knows 집합이 줄어들거나, 이미 아는 것에 처음 안 듯 반응(reacts_as_if_unknown ∩ knows ≠ ∅)',
    action: 'A급. 놀람의 대상을 하나로 고정하는 방향 제안. knowledge_states 없이 실행하지 않는다',
    example: '82→103→111쪽 윤현채 (2부 A급 1위 편의점 장면)',
  },
  {
    id: 'R26', name: '시놉시스 대조', category: 'consistency',
    detect: '원고의 핵심 설정이 작가 제공 시놉시스와 다름 (시놉시스 없으면 비활성)',
    action: '분석 전에 갈라진 지점을 보고. 원고가 우선한다는 전제(P7)로 질문 생성',
  },
  {
    id: 'R27', name: '설정은 숫자와 물건으로 닫는다', category: 'info_design',
    detect: '플롯이 의존하는 설정 항목에 수치·단위·물리적 사물이 없음',
    action: '설정 공백으로 기록 → 작가 질문으로 변환',
    example: '복용량 250mg·총알 통·립스틱 케이스·스푼 vs 저울',
  },
  {
    id: 'R28', name: '설정 변경은 파생 문장 목록을 낳는다', category: 'info_design',
    detect: '설정 값 확정·변경 시 영향받는 원고 위치와 다른 설정 항목',
    action: 'derived_lines·affects 목록 출력, 앞부분 갱신 항목으로',
    example: '통 크기 확정 → 1부 반입 경로·56쪽 반응 강도',
  },
  {
    id: 'R28a', name: '현실 근거 필수', category: 'info_design',
    detect: '설정 후보 수치에 현실 근거(통계·관행·실물 규격)가 없음',
    action: '참고 수치에 현실 근거를 붙인다. 원고 문장을 웹 검색 질의에 넣지 않는다',
  },
  {
    id: 'R30', name: '역할 축 검증', category: 'scene',
    detect: '갈등 장면에서 절박한 쪽·규범을 쥔 쪽이 설정된 인물과 뒤바뀜',
    action: '역할 복원 방향. 뒤집히면 두 인물이 동시에 붕괴하므로 A급 후보',
    example: '편의점: 윤현채가 설교, 이정은이 변명 → 설정과 반대',
  },
  {
    id: 'R31', name: '라벨 단어 반복 상한', category: 'narration',
    detect: '한 인물을 규정하는 형용(미친·형편없는 등) 반복 ≥ 3회/부',
    action: '2회로 축소 방향',
    example: '2부 "미친" 7회',
  },
  {
    id: 'R32', name: '인접 장면 중복', category: 'scene',
    detect: '인접 장면의 정보 집합 교집합 > 60%',
    action: '관계·감정 보상이 있는 장면을 살리고 앞 장면은 반응만 남김 (R10의 장면판)',
    example: '이사회(94~98) vs 아버지(99~100)',
  },
  {
    id: 'R33', name: '제목 문장 보호', category: 'scene',
    detect: '제목·주제를 직접 담은 대사가 소비됨',
    action: '교체가 아니라 병치 대상. 뒤에 답하는 자리(회수 위치)를 요구',
    example: '154쪽 "무슨 요리를 그렇게 잘해요?"',
  },
  {
    id: 'R34', name: '서술자는 중심 질문을 닫지 않는다', category: 'narration',
    detect: '소설의 핵심 질문에 서술자가 결말 전에 답하는 단정 서술',
    action: '삭제, 질문으로 되돌림',
    example: '155쪽 "전부 약 덕일 것이다"',
  },
  {
    id: 'R35', name: '감정 전환의 묘사 공백', category: 'character',
    detect: '인물의 감정·태도·관계가 반전되는 전환점(emotion_arcs 기준)에서 그 인물의 생각·감정 묘사가 없거나, 전환의 계기가 구체물(음식·행동·대사)로 제시되지 않음',
    action: '전환점에 인물의 생각·감정 묘사를 더하는 방향 제안 (대체 문장 금지). 계기가 이미 구체물로 제시된 전환점은 장점으로 보호',
    example: '1고 전체 피드백: "세 번의 식사 장면 — 음식을 평하는 현채의 생각, 감정이 더 묘사되었으면"',
  },
  {
    id: 'R36', name: '시제 전환 규칙', category: 'narration',
    detect: '요리·배양 같은 실시간 공정 장면이 아닌 곳에서 현재형 서술이 기본형으로 쓰임, 또는 현재형↔과거형 전환에 일관된 규칙이 없음. 소설 전체가 현재형이면 가독성이 떨어진다',
    action: '공정 장면(인물의 손이 움직이는 실시간 진행)=현재형, 나머지=과거형(한국 소설 기본형)을 권장하고, 시제 전환 규칙을 정하도록 제안. 현재 시제 사용 구간을 유형별로 열거',
    example: '1고 전체 피드백 ▮표현: "공정에서는 현재형, 나머지는 기본형. 시제 전환은 규칙이 있어야 한다"',
  },
  {
    id: 'R37', name: '정보 없는 지시문', category: 'narration',
    detect: "'말한다', '대답이 없다', '고개를 든다', '눈을 뜬다', '잠깐 멈춘다'처럼 정보가 없는 발화·행동 지시문의 반복. 특히 늘어진 장면에서 빈도가 높아진다",
    action: '반복 카운트와 집중 구간을 제시하고 최소화 방향 제안. 현재형 서술이 이런 지시문을 남발하게 만드는 점도 함께 짚는다',
    example: '1고 전체 피드백 ▮표현: "정보가 없는 동작은 최소화. 늘어진 장면에서 반복이 엿보인다"',
  },
  {
    id: 'R38', name: '핵심 질문의 답 반복', category: 'narration',
    detect: '소설이 반복해서 제기하는 핵심 질문(인물의 동기 등)에 같은 답이 변주·심화 없이 2회 이상 반복됨. 질문이 다시 나올 때마다 답이 깊어지거나 다른 해석의 여지를 열어야 한다',
    action: '반복 위치를 열거하고, 답을 변주할 수 있는 축(더 현실적인 동기, 다른 인물의 해석)을 방향으로 제안. 대체 문장 금지',
    example: '1고 전체 피드백: "정은은 왜 약을 넣었나 — 네 번 나오는데 답이 같다. 지기 싫었다의 반복"',
  },
];

/** 모드별 활성 규칙 (설계문서 v0.2 §6-2) — 1차는 D 중심, R/F는 부분 집합 */
export function rulesForMode(mode: 'I' | 'D' | 'R' | 'F'): LabRule[] {
  switch (mode) {
    case 'I':
      return LAB_RULES.filter((r) => ['R26', 'R27', 'R30'].includes(r.id));
    case 'F':
      return LAB_RULES.filter((r) => ['consistency', 'info_design'].includes(r.category));
    default:
      return LAB_RULES;
  }
}
