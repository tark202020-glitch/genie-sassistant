// 피드백 랩 — 단계별 프롬프트 (설계문서 v0.2 §4, 프로토콜 v0.2 §4 프롬프트 체인)
// 품질 튜닝은 랩 완성 후 랩의 회귀 비교 위에서 반복한다 (개발 진행문서 §9-2).

import { LabRule } from './rules';

export const PROMPTS_VERSION = 'prompts-2026-10-07.5 (감정 흐름: 대상·관계·정도 추가)';

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
7. emotion_arcs: 주요 인물별 감정 흐름 — 장면 순서대로 그 인물의 감정 상태를 추적한다. 각 지점마다 세 가지를 함께 기록한다: ① target — 그 감정이 누구(무엇)를 향하는가. 인물 간 관계의 흐름이 여기서 드러난다 ② intensity — 감정의 정도(약/중/강). 쌓이는지 식는지가 보여야 한다 ③ 전환점(is_turning_point — 예: 냉소→호감, 불신→신뢰)에는 반드시 전환을 일으킨 계기(trigger — 음식·행동·대사 같은 구체물)를 원문 근거와 함께. 계기가 원문에 없으면 trigger를 "계기 미서술"로 쓴다

[원고]
${manuscript}

[출력 JSON]
{"scenes":[{"scene_id":"s-01","loc":"쪽 범위","characters":[],"summary":""}],
"characters":[{"name":"","role":""}],
"timeline":[{"note":"","evidence":[{"loc":"","quote":""}]}],
"devices":[{"name":"","first":{"loc":"","quote":""},"recurrences":[{"loc":"","quote":""}]}],
"settings":[{"setting_id":"S1","title":"","status":"충돌|공백|일관","values":[{"value":"","loc":"","quote":""}],"plot_depends":true}],
"knowledge_states":[{"character":"","scene_id":"","loc":"","knows":[],"believes":[],"does_not_know":[],"evidence":[{"loc":"","quote":""}]}],
"emotion_arcs":[{"character":"","points":[{"scene_id":"","loc":"","emotion":"","target":"감정이 향하는 인물·대상","intensity":"약|중|강","is_turning_point":false,"trigger":"","evidence":[{"loc":"","quote":""}]}]}]}`;

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
1. 후보 수집: 장면을 닫는 마지막 대사·행동 / 시간 표시가 붙은 공정 서술 / 서술자가 세계를 향해 말하는 문장 / 반복 장치의 첫 등장과 재등장 / **인물의 감정·태도가 전환되는 장면**(냉소→호감, 불신→신뢰 등 — 단계 1의 emotion_arcs 전환점 참조) / **인물 간 관계가 밀착되는 순간**(음식·행동 같은 구체물이 마음을 움직이는 장면)
2. 세 테스트: 삭제(뒤의 해설·감정 서술을 지워도 장면이 서는가) / 약속 이행(단계 2의 약속을 이행하는가 — 기제를 한 문장으로 쓰지 못하면 탈락. 감정 전환 장면은 전환의 계기가 구체물로 제시되어야 통과) / 개성(원고 안의 다른 후보와 같은 기제를 반복하는가. 반복되는 습관 = 개성, 한 번뿐인 튀는 문장 = 우연)
3. 유형화: 통과한 후보를 기제가 같은 것끼리 묶고 이름을 붙인다(한 줄 대사 / 실시간 공정 / 서술자 위트 / **감정 전환의 구체물** …). 유형마다 인용 2~4개와 보호 지시("손대지 않는다 / 뒤의 해설만 지운다 / 이 톤을 다른 장면에도")
4. planted: 뒤에서 격발될 수 있게 심어둔 것을 planted로 기록

[문체 프로파일(단계 2)]
${JSON.stringify(prior['2'] ?? {}, null, 0).slice(0, 10000)}

[인물별 감정 흐름(단계 1 emotion_arcs)]
${JSON.stringify((prior['1'] as any)?.emotion_arcs ?? [], null, 0).slice(0, 15000)}

[원고]
${manuscript}

[출력 JSON]
{"strengths":[{"type_name":"유형명","mechanism":"기제 한 문장","quotes":[{"loc":"","quote":""}],"protect":"보호 지시","tests":{"deletion":"pass|fail 근거","promise":"pass|fail 근거","personality":"pass|fail 근거"}}],
"planted":[{"name":"","loc":"","quote":"","expected_fire":"어떻게 격발될 수 있는지"}]}`;

    case '4': // 결함 탐지
      return `${COMMON}

[작업: 단계 4 — 결함 탐지]
아래 규칙 라이브러리로 결함을 탐지한다. 실행 순서: R26 → R25 → R35 → R17·R18 → R8 → R30 → R36·R37·R38 → 나머지.
- R25는 반드시 단계 1의 knowledge_states 전이 검사로 수행한다.
- R35는 반드시 단계 1의 emotion_arcs 전환점 각각에 대해 수행한다: 전환점 전후 원문을 확인해 "그 인물의 생각·감정을 담은 문장"이 있는지 판정한다. 음식·행동 묘사만 있고 그것을 받아들이는 인물의 내면 문장이 없으면 결함. trigger가 "계기 미서술"인 전환점은 자동 후보. 관계가 변하는 식사·대면 장면을 우선 검사하고, 결함이 하나도 없으면 issues에 넣지 않되 검사한 전환점 수를 진단에 남긴다.
- R36은 현재형 서술이 쓰인 구간을 "공정 장면(실시간 진행)"과 "그 외"로 나눠, 그 외 구간의 현재형 사용과 전환 규칙 부재를 검사한다.
- R37은 정보 없는 발화·행동 지시문('말한다', '고개를 든다' 류)의 반복을 세고, 집중 구간을 짚는다.
- R38은 원고 전체에서 반복 제기되는 핵심 질문(예: "왜 그랬나")을 찾아, 답이 변주·심화 없이 동일하게 반복되는지 검사한다.
- 등급: A(구조를 흔드는 것, 1~3건만) / B(장면 단위) / C(문장 단위).
- 결함은 반드시 연결된 장점(linked_strengths)을 확인하고, 장점을 훼손하는 수정 방향은 내지 않는다.
- 대체 문장 금지. direction은 "무엇을 어느 방향으로"까지만.

[규칙 라이브러리]
${rulesBlock(rules ?? [])}

[단계 1 산출물 (settings·knowledge_states·emotion_arcs 포함)]
${JSON.stringify(prior['1'] ?? {}, null, 0).slice(0, 60000)}

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

    case '6': // 업그레이드 방향 — 작품 단위 총평 + 인물 중심 구성
      return `${COMMON}

[작업: 단계 6 — 업그레이드 방향]
전체 산출물을 종합해 작가에게 갈 최종 구성을 만든다. 구성 원칙: 전문 편집자의 작품 피드백처럼 ①확실히 좋아서 더 살리고 싶은 것(인물 중심) ②비어있는 설정 ③풀리지 않는 전체 질문 순서로, 장점이 결함보다 먼저다.

1. overall: 작품 단위 총평 —
   - logline: 이 소설을 한 문장으로 (누가, 무엇을 하다가, 어떻게 되는 이야기)
   - protagonist_arc: 주인공의 궤적 평가 (예: 추락→재기→승부수). 궤적이 모든 주요 장면에서 작동하는지, 끊기는 구간이 있으면 어디인지
   - structure: 이야기의 구조가 말하려는 바(주제·장르 기제)를 지지하는가. **호의적 요약이 아니라 편집자의 구조 비평이다.** 반드시 세 가지를 검사하고 결과를 쓴다: ① 결말의 구조가 장르 기제를 완성하는가 — 풍자·블랙코미디라면 "누가 알고 누가 모르는가 / 누가 얻고 누가 잃는가"의 최종 배치가 메시지를 지지하는지 검사 (예: 권력자는 회복되고 약자만 대가를 치르면 풍자 구조가 뒤집힌 것) ② 이야기의 실질 주인공(결정을 내리고 대가를 치르는 인물)이 중간에 바뀌는 구간이 있는가 — 바뀌면 그 시작 지점을 쪽으로 명시 ③ 전반부가 던진 추진 질문이 결말에서 답해지는가, 아니면 다른 질문으로 대체되는가. "문제가 없다"고 쓰려면 세 검사 각각의 통과 근거를 적어야 한다
   - readability_pattern: 잘 읽히는 장면들의 공통점과 느려지는 장면들의 공통점 (각각 예시 쪽)
2. character_reviews: 주요 인물별 리뷰 (2~4명) —
   - label: 인물을 한 줄로 정의하는 별칭 (예: "요리가 전부인 사람 OOO")
   - core_mechanism: 이 인물을 움직이는 핵심 기제 한 문장
   - shining: 이 인물이 가장 빛나는 장면 1~3곳과 왜 빛나는지
   - wobbles: 캐릭터 일관성이 흔들리는 지점 — 문제와 방향(대체 문장 금지)
   - emotion_note: 감정 흐름(emotion_arcs)에서 살릴 것 — 전환점의 계기가 구체물로 제시된 곳은 보호, 전환인데 감정 묘사가 빈 곳은 지적
3. a_grade: A급 1~3건 — 문제·근거·방향. (있으면) 후보안은 방향 제시이지 대체 문장이 아니다
4. setting_diff: 설정집 초안 — 원고에서 뽑은 값·충돌·공백 정리
5. author_questions: 확인(confirm) / 고를 것(choose) / 참고(reference)로 분류한 작가 질문 목록. 설정 공백·충돌은 값을 정해주지 말고 질문으로. 후보 수치는 현실 근거와 함께 참고로만
6. summary: 장점 먼저, 크게 하나의 메시지 (overall을 2~3문장으로 압축)

[전체 산출물]
${JSON.stringify(prior, null, 0).slice(0, 90000)}

[출력 JSON]
{"overall":{"logline":"","protagonist_arc":"","structure":"","readability_pattern":""},
"character_reviews":[{"character":"","label":"","core_mechanism":"","shining":[{"loc":"","why":""}],"wobbles":[{"loc":"","problem":"","direction":""}],"emotion_note":""}],
"summary":"장점을 먼저 말하는 총평 2~3문장",
"a_grade":[{"title":"","from_issue":"issue_id","problem":"","evidence":[{"loc":"","quote":""}],"direction":"","alternatives":[]}],
"setting_diff":[{"setting_id":"","title":"","status":"충돌|공백|일관","values":[{"value":"","loc":""}],"question":"충돌·공백이면 작가 질문"}],
"author_questions":[{"kind":"confirm|choose|reference","question":"","options":[]}]}`;

    default:
      throw new Error(`알 수 없는 단계: ${step}`);
  }
}
