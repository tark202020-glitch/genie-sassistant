// 피드백 랩 — 단계별 프롬프트 (설계문서 v0.2 §4, 프로토콜 v0.2 §4 프롬프트 체인)
// 품질 튜닝은 랩 완성 후 랩의 회귀 비교 위에서 반복한다 (개발 진행문서 §9-2).

import { LabRule } from './rules';

export const PROMPTS_VERSION = 'prompts-2026-10-02.1';

/** 모든 단계 공통 제약 (설계문서 §12) */
const COMMON = `당신은 소설 편집 보조 에이전트 '지작'이다. 반드시 지켜야 할 제약:
- 모든 판정에는 evidence(원고의 쪽 번호와 원문 인용)를 붙인다. 원고에 없는 문장을 인용하면 안 된다(생성 인용 금지).
- 대체 문장·대체 장면을 쓰지 않는다. 방향(direction)만 제시한다.
- 단정하지 말아야 할 것은 질문으로 남긴다.
- 출력은 지정된 JSON 스키마만. 설명 문장을 JSON 밖에 쓰지 않는다.
- 쪽 번호는 원고에 표기된 것을 그대로 쓴다. 쪽 표기가 없으면 "쪽 미상"으로 두고 장면 순번을 쓴다.`;

export interface StepPromptInput {
  manuscript: string;
  synopsis?: string | null;
  prior: Record<string, unknown>; // 이전 단계 output 모음 (키: step)
  rules?: LabRule[];
}

function rulesBlock(rules: LabRule[]): string {
  return rules
    .map((r) => `${r.id} ${r.name} [${r.category}]\n  탐지: ${r.detect}\n  처리: ${r.action}${r.example ? `\n  예: ${r.example}` : ''}`)
    .join('\n');
}

export function buildStepPrompt(step: string, input: StepPromptInput): string {
  const { manuscript, synopsis, prior, rules } = input;

  switch (step) {
    case '0.5': // 시놉시스 대조 (시놉시스 있을 때만)
      return `${COMMON}

[작업: 단계 0.5 — 시놉시스 대조]
작가가 제공한 시놉시스와 원고가 갈라진 지점을 찾는다. 원고가 우선한다는 전제로, 갈라짐은 결함이 아니라 확인 대상이다.

[시놉시스]
${synopsis}

[원고]
${manuscript}

[출력 JSON]
{"divergences":[{"item":"항목명","synopsis_state":"시놉시스의 서술","manuscript_state":"원고의 서술","evidence":[{"loc":"쪽","quote":"원문 인용"}]}]}`;

    case '1': // 구조화
      return `${COMMON}

[작업: 단계 1 — 구조화]
원고를 다음으로 구조화한다:
1. scenes: 장면 분할. 장면마다 id(s-01…), 범위(쪽), 등장 인물, 한 줄 요약
2. characters: 주요 인물과 역할
3. timeline: 시간 순서와 원고 제시 순서가 다르면 기록
4. devices: 반복 장치(반복되는 사물·대사·행동)의 첫 등장과 재등장 위치
5. settings: 설정 추출 — 원고에서 숫자·규칙·물건·직업 서술을 모은다. 같은 항목에 값이 둘 이상이면 status "충돌", 값이 없는데 플롯이 의존하면 "공백", 하나로 일관되면 "일관". 각 값마다 위치 기록
6. knowledge_states: 주요 인물 3~5명에 대해 장면마다 "이 장면 끝에서 X가 아는 것(knows) / 믿는 것(believes) / 모르는 것(does_not_know)"을 원문 근거와 함께 기록. 이전 장면에서 변한 것(전이) 위주로 쓴다

[원고]
${manuscript}

[출력 JSON]
{"scenes":[{"scene_id":"s-01","loc":"쪽 범위","characters":[],"summary":""}],
"characters":[{"name":"","role":""}],
"timeline":[{"note":"","evidence":[{"loc":"","quote":""}]}],
"devices":[{"name":"","first":{"loc":"","quote":""},"recurrences":[{"loc":"","quote":""}]}],
"settings":[{"setting_id":"S1","title":"","status":"충돌|공백|일관","values":[{"value":"","loc":"","quote":""}],"plot_depends":true}],
"knowledge_states":[{"character":"","scene_id":"","loc":"","knows":[],"believes":[],"does_not_know":[],"evidence":[{"loc":"","quote":""}]}]}`;

    case '2': // 문체 프로파일
      return `${COMMON}

[작업: 단계 2 — 문체 프로파일]
원고가 스스로 세운 약속을 파악한다. 이것이 이후 장점·결함 판정의 유일한 기준이 된다.
- 시점·시제 / 장면·대화·요약 비율 / 서술자가 논평하는 대상이 인물인가 세계인가 / 장르 신호(웃음·긴장의 기제) / 초점 인물 목록(장면 단위)

[장면 목록(단계 1)]
${JSON.stringify(prior['1'] ?? {}, null, 0).slice(0, 20000)}

[원고]
${manuscript}

[출력 JSON]
{"style_profile":{"pov":"","tense":"","scene_dialogue_summary_ratio":"","narrator_target":"인물|세계","genre_signals":[{"signal":"","mechanism":"","evidence":[{"loc":"","quote":""}]}],"focal_characters":[{"scene_id":"","character":""}],"promises":["원고가 세운 약속을 한 문장씩"]}}`;

    case '3': // 장점 추출
      return `${COMMON}

[작업: 단계 3 — 장점 추출]
원고 자기 기준(단계 2의 약속)으로 장점을 추출한다. 장점이 결함보다 먼저다.
1. 후보 수집: 장면을 닫는 마지막 대사·행동 / 시간 표시가 붙은 공정 서술 / 서술자가 세계를 향해 말하는 문장 / 반복 장치의 첫 등장과 재등장
2. 세 테스트: 삭제(뒤의 해설·감정 서술을 지워도 장면이 서는가) / 약속 이행(단계 2의 약속을 이행하는가 — 기제를 한 문장으로 쓰지 못하면 탈락) / 개성(원고 안의 다른 후보와 같은 기제를 반복하는가. 반복되는 습관 = 개성, 한 번뿐인 튀는 문장 = 우연)
3. 유형화: 통과한 후보를 기제가 같은 것끼리 묶고 이름을 붙인다. 유형마다 인용 2~4개와 보호 지시("손대지 않는다 / 뒤의 해설만 지운다 / 이 톤을 다른 장면에도")
4. planted: 뒤에서 격발될 수 있게 심어둔 것을 planted로 기록

[문체 프로파일(단계 2)]
${JSON.stringify(prior['2'] ?? {}, null, 0).slice(0, 10000)}

[원고]
${manuscript}

[출력 JSON]
{"strengths":[{"type_name":"유형명","mechanism":"기제 한 문장","quotes":[{"loc":"","quote":""}],"protect":"보호 지시","tests":{"deletion":"pass|fail 근거","promise":"pass|fail 근거","personality":"pass|fail 근거"}}],
"planted":[{"name":"","loc":"","quote":"","expected_fire":"어떻게 격발될 수 있는지"}]}`;

    case '4': // 결함 탐지
      return `${COMMON}

[작업: 단계 4 — 결함 탐지]
아래 규칙 라이브러리로 결함을 탐지한다. 실행 순서: R26 → R25 → R17·R18 → R8 → R30 → 나머지.
- R25는 반드시 단계 1의 knowledge_states 전이 검사로 수행한다.
- 등급: A(구조를 흔드는 것, 1~3건만) / B(장면 단위) / C(문장 단위).
- 결함은 반드시 연결된 장점(linked_strengths)을 확인하고, 장점을 훼손하는 수정 방향은 내지 않는다.
- 대체 문장 금지. direction은 "무엇을 어느 방향으로"까지만.

[규칙 라이브러리]
${rulesBlock(rules ?? [])}

[단계 1 산출물 (settings·knowledge_states 포함)]
${JSON.stringify(prior['1'] ?? {}, null, 0).slice(0, 30000)}

[문체 프로파일]
${JSON.stringify(prior['2'] ?? {}, null, 0).slice(0, 8000)}

[장점(단계 3)]
${JSON.stringify(prior['3'] ?? {}, null, 0).slice(0, 10000)}

[원고]
${manuscript}

[출력 JSON]
{"issues":[{"issue_id":"I-01","rule_id":"R25","category":"","grade":"A|B|C","scope":"scene|part|cross_part|design","loc":"쪽","evidence":[{"loc":"","quote":""}],"knowledge_conflict":null,"diagnosis":"무엇이 문제인가","direction":"방향","linked_strengths":[]}]}`;

    case '5': // 물음표 분류
      return `${COMMON}

[작업: 단계 5 — 물음표 분류]
단계 4까지 해결되지 않은 의문을 분류한다. 분류 전에 반드시 "원고 안에 답이 있는가"를 검사하고, 있으면 resolved로 표시한다.
type: info(정보 부족) | setting(설정 공백·충돌 — 작가에게 물을 것) | ask_author(의도 확인 질문) | propose(제안) | design(부 단위 수정이 아닌 작품 설계 질문)
- design은 작가에게 제안이 아니라 질문 형태로 쓴다.
- 질문은 단정하지 않는다. "~가 정해져 있습니까?" 형식.

[단계 1 settings / 단계 4 issues]
${JSON.stringify({ s1: prior['1'] ?? {}, s4: prior['4'] ?? {} }, null, 0).slice(0, 30000)}

[원고]
${manuscript}

[출력 JSON]
{"questions":[{"q_id":"Q-01","type":"info|setting|ask_author|propose|design","resolved_in_manuscript":false,"resolution_loc":null,"question":"작가에게 보낼 질문 문장","context":"왜 묻는가","evidence":[{"loc":"","quote":""}]}]}`;

    case '6': // 업그레이드 방향
      return `${COMMON}

[작업: 단계 6 — 업그레이드 방향]
전체 산출물을 종합해 작가에게 갈 최종 구성을 만든다:
1. a_grade: A급 1~3건 — 문제·근거·방향. (있으면) 후보안은 방향 제시이지 대체 문장이 아니다
2. setting_diff: 설정집 초안 — 원고에서 뽑은 값·충돌·공백 정리
3. author_questions: 확인(confirm) / 고를 것(choose) / 참고(reference)로 분류한 작가 질문 목록. 설정 공백·충돌은 값을 정해주지 말고 질문으로. 후보 수치는 참고로만
4. summary: 장점 먼저, 크게 하나의 메시지

[전체 산출물]
${JSON.stringify(prior, null, 0).slice(0, 60000)}

[출력 JSON]
{"summary":"장점을 먼저 말하는 총평 2~3문장",
"a_grade":[{"title":"","from_issue":"issue_id","problem":"","evidence":[{"loc":"","quote":""}],"direction":"","alternatives":[]}],
"setting_diff":[{"setting_id":"","title":"","status":"충돌|공백|일관","values":[{"value":"","loc":""}],"question":"충돌·공백이면 작가 질문"}],
"author_questions":[{"kind":"confirm|choose|reference","question":"","options":[]}]}`;

    default:
      throw new Error(`알 수 없는 단계: ${step}`);
  }
}
