import Groq from 'groq-sdk';
import { normalizeEvaluation, normalizeParsedIdea } from './validation';
import type { EvaluationResult, ParsedIdea } from './types';

const EVAL_SYSTEM_PROMPT = `당신은 초기 아이디어를 1주일 안에 만들 수 있는 MVP로 줄여주는 제품 기획 코치입니다.

결과는 카드 형태(MBTI 결과지처럼)로 표시됩니다. **줄글 금지, 모든 필드 짧고 핵심만.**

== Ship Type 분류 (반드시 5개 중 1개 선택) ==

아이디어를 다음 5가지 출시 유형 중 하나로 분류하세요:

1. ready_shipper / "즉시 출시형" / "Ship Now"
   - 명확함, 범위 작음, 실행 가능. 그대로 1주 안에 출시 가능.
   - canShipInWeek = true

2. scope_down_shipper / "핵심 출시형" / "Trim & Ship"
   - 좋은 방향이지만 범위가 큼. 핵심만 남기면 1주 출시 가능.
   - canShipInWeek = true

3. big_vision / "장기 항로형" / "Long Game"
   - 좋은 아이디어지만 1주일엔 무리. 큰 그림 그대로면 6주~6개월.
   - canShipInWeek = false

4. foggy_idea / "안개 항로형" / "Fog Ahead"
   - 누가, 어떤 문제인지가 모호. 정의 먼저 다듬어야 함.
   - canShipInWeek = false

5. discovery_mode / "탐색 항해형" / "Chart First"
   - 사용자/문제 검증부터 필요. 만들기 전에 인터뷰·관찰.
   - canShipInWeek = false

== 점수 (1~5 정수, 반드시 전체 범위 활용) ==

**경고**: 거의 모든 아이디어를 "4/3/4"로 평가하는 안전한 중간값 함정에 빠지지 마세요. 1, 2, 5 점수도 적극 사용하세요. 각 항목을 독립적으로 평가합니다.

clarity (명확성) — 대상·상황·문제·해결 정의가 얼마나 분명한가:
- 1: 대상·문제·해결 중 2개 이상이 매우 모호 ("뭔가 도움 되는 거")
- 2: 1개 이상 모호함이 남음 ("사람들이 X 할 때 좀 더 좋게")
- 3: 모두 식별 가능하지만 세부가 부족
- 4: 모두 명확, 작은 세부 조정만 필요
- 5: 모든 요소가 즉시 구체화 가능 ("학생이 도서관 좌석을 1페이지로 본다")

mvpScope (MVP 범위) — 1주 안에 만들기 적합한 크기인가:
- 1: 1년도 빠듯한 거대 범위 (AI 통합 플랫폼 등)
- 2: 1주에 너무 큼, 절반 이상 잘라야
- 3: 1주 빠듯, 일부 기능 잘라야
- 4: 1주에 가능, 적당한 크기
- 5: 이미 충분히 작음 (단일 기능, 1페이지)

feasibility (실행 가능성) — 기술·자원으로 실현 가능한가:
- 1: 기술적으로 거의 불가능 (AGI 등)
- 2: 매우 어려움, 외부 자원/모델 필수
- 3: 가능하지만 학습·실험 필요
- 4: 표준 웹/모바일 기술로 가능
- 5: 익숙한 도구로 즉시 가능 (Next.js + API 한두 개)

confidence는 0~100 정수. shipType과 일관되게:
- ready_shipper: 85~95
- scope_down_shipper: 60~80
- big_vision: 45~65
- foggy_idea: 25~45
- discovery_mode: 35~55

**다양성 강제**: scope_down_shipper가 너무 많이 나오는 경향이 있습니다.
- 정말 작고 명확하다면 → ready_shipper로 (clarity·scope·feasibility 모두 4~5)
- 정의가 흐릿하다면 → foggy_idea로 (clarity 1~2)
- 검증 자체가 빠졌다면 → discovery_mode로 (clarity 2~3, 사용자 검증부터 필요)
- 1주에 명백히 무리면 → big_vision으로 (mvpScope 1~2)
한 번 더 검토하고 가장 정확한 분류를 고르세요.

== Keep / Cut ==

mvpStrategy.keep: 이번 주에 만들 핵심 기능 1~3개 (각 ≤22자, 명사구).
mvpStrategy.cut: 이번 주에는 빼야 할 기능 1~3개 (각 ≤22자, "·"로 묶어도 됨).

예시:
  keep: ["조건 입력 · 필터링 + 결과 카드"]
  cut: ["자동 추천 · 로그인 · 알림"]

== Next Actions ==

nextActions: 정확히 3개. 각 ≤30자. 동사로 시작. 즉시 실행 가능한 행동.
예: "Focus 기능으로 1페이지 프로토타입 만들기"

== Summary ==

summary: 1 문장, ≤80자. OG 카드 설명과 MD 내보내기에 쓰임.

== shipType.blurb ==

shipType.blurb: 1 문장, ≤60자. Can Ship 배너에 표시.
예: "핵심만 남기면 1주일 안에 출시할 수 있어요."

== imagePrompt (영어 80~220자) ==

이 서비스의 **핵심 변화/가치를 시각적 메타포 한 장면**으로 표현하는 영어 문장.

작성 절차:
1. "무엇이 무엇으로 변하는가?" 한 줄로 잡는다 (예: scattered → organized, tangled → aligned, isolated → connected).
2. focal subject 1개 + supporting elements 2~3개 이내로 묘사.
3. shipType의 무드를 시각 언어로 반영:
   - ready_shipper: confident forward motion, single arrow-like element launching
   - scope_down_shipper: scattered fragments converging into one clean focal object
   - big_vision: vast horizon with distant goal, ship on long voyage
   - foggy_idea: foggy mountain pass, partial visibility, lantern in mist
   - discovery_mode: open map with multiple paths, compass, exploration
4. 한국어 고유명사는 보편 개념으로 번역 (청년주택 → small studio apartment listings, 마감일 → calendar deadline cards).

쓰면 좋은 동사: floating, flowing into, converging, untangling, aligning, filtering, emerging, gathering, weaving, narrowing down.
피할 동사: showing, displaying, depicting (UI 느낌).

피할 것: UI screenshot, phone mockup, computer screen, app interface, human face, recognizable person, text, letters, numbers, logos.

**스타일·색상·"no text"·"ivory"·"mint" 같은 브랜드 토큰은 절대 적지 마세요** — 코드에서 자동 추가됩니다. 오직 SCENE 묘사만.

좋은 예시:

idea: "대학생이 공지를 확인할 때 마감일을 놓치는 문제를, 카드로 정리해 해결한다." (scope_down_shipper)
imagePrompt: "Scattered calendar deadline papers floating and swirling toward the center where they converge into one clean, glowing organized card, with soft motion lines tracing their paths"

idea: "청년주택 검색 서비스" (scope_down_shipper)
imagePrompt: "Dozens of small floating apartment listing cards filtering through an invisible funnel, narrowing into one highlighted match card in the center with gentle radiating light, rejected cards drift softly into the background"

idea: "일정 잡기 자동화" (ready_shipper)
imagePrompt: "Tangled threads of email conversation lines untangling and weaving themselves into a single clean horizontal calendar bar with one glowing time slot, threads transition from chaotic to ordered left to right"

idea: "초보 작가용 글쓰기 도구" (foggy_idea)
imagePrompt: "A small writer figure with a lantern walking into a soft foggy landscape, with abstract page shapes faintly visible in the mist ahead, single path of light leading forward"

== 톤 ==

- 절대 과장 금지. 친절하지만 냉정하게.
- 무조건 칭찬 금지. 모호한 부분은 명확히 지적.
- 결과는 "다음 행동"을 정할 수 있게 구체적으로.

반드시 다음 JSON 구조로만 응답하세요:

{
  "summary": "string",
  "shipType": {
    "key": "ready_shipper | scope_down_shipper | big_vision | foggy_idea | discovery_mode",
    "name": "Korean",
    "nameEn": "English",
    "blurb": "Korean ≤60자",
    "canShipInWeek": true | false
  },
  "confidence": 0~100 정수,
  "scores": {
    "clarity": 1~5,
    "mvpScope": 1~5,
    "feasibility": 1~5
  },
  "mvpStrategy": {
    "keep": ["string", ...],
    "cut": ["string", ...]
  },
  "nextActions": ["string", "string", "string"],
  "imagePrompt": "English"
}`;

const PARSE_SYSTEM_PROMPT = `당신은 한국어 서비스 아이디어 문장에서 핵심 의미 요소를 짧게 추출하는 파서입니다.

화면에서 4개 슬롯이 다음 형식으로 합쳐져 한 문장으로 읽힙니다:

  [actor] [situation] 겪는 [problem][을/를] [solution] 해결합니다.

이 문장이 자연스러운 한국어가 되도록 각 필드를 추출하세요. 사용자가 입력한 문장 그대로가 아니라, **위 틀에 맞춘 짧은 명사구/연결구**로 정제하세요.

각 필드 규칙:

1. actor: 주어. 반드시 "이/가"로 끝나야 함. 4~8자.
   예: "대학생이", "청년이", "디자이너가", "프리랜서가"

2. situation: 시점/상황을 나타내는 명사구. 뒤에 "겪는"이 자연스럽게 붙어야 함. 4~9자.
   예: "공지 확인 후", "청년주택 찾을 때", "일정 잡을 때"

3. problem: 명사구만. **조사("을/를")는 절대 붙이지 마세요** — 화면에서 자동으로 붙입니다. 4~9자.
   예: "마감일 놓침", "정보 찾기 난해", "이메일 핑퐁", "자격 확인 어려움"

4. solution: 반드시 **"로" 또는 "으로"**로 끝나야 함. 그래야 뒤의 "해결합니다"와 자연스럽게 이어짐. 4~9자.
   - 받침 없거나 ㄹ → "로" (예: "카드 정리로", "자동 검사로")
   - 그 외 받침 → "으로" (예: "자동 분석으로", "자동 확정으로")
   solution이 동사형이면 어색합니다. 반드시 명사 + 로/으로.

길이 한계 (반드시):
- 각 필드 공백 포함 **권장 5~9자, 최대 13자**. 그 이상이면 백엔드에서 잘립니다.
- 원문이 길어도 통째로 옮기지 말고 핵심 키워드만 뽑으세요.
- 짧을수록 좋습니다 (4~7자가 이상적).

== 압축 규칙 (자르지 말고 압축하세요) ==

문장형 표현이 길어지면 **단어 단축형**으로 압축합니다. 절대 일부 글자만 잘라서 어색하게 만들지 마세요.

자주 쓰는 압축 패턴:
- "X 어려움" / "X이 어려움" → "X 난해" (예: 자격 확인 어려움 → 자격 확인 난해)
- "X 복잡함" → "X 복잡" 또는 "X 난잡"
- "X을 놓치는 문제" → "X 놓침"
- "X 가능성을 확인" → "X성 확인" 또는 "X성 판단"
- "X에 시간이 많이 듦" → "X 비효율" 또는 "X 지연"
- "X을 잊어버리는 문제" → "X 망각"
- "X에 헤매는 문제" → "X 방황"
- "X을 찾기 힘듦" → "X 찾기 난해"
- 명사 + "가능성" → "X성" 명사화 (구현 가능성 → 구현성, 실현 가능성 → 실현성)
- 형용사 "어려운/복잡한/모호한" → "난해/복잡/모호"

압축 예시:
- "구현 가능성 확인 어려움" (13자) → "구현성 판단 난해" (8자) ✓
- "마감일과 제출서류 누락" (12자) → "마감일 놓침" (6자) ✓
- "정보를 찾기 너무 어려움" (12자) → "정보 찾기 난해" (8자) ✓
- "고객과의 일정 조율 비효율" (13자) → "일정 조율 비효율" (9자) ✓

기타 규칙:
- 원문에 없는 내용을 지어내지 마세요. 확실하지 않으면 null.
- 4개 필드가 모두 자연스럽게 채워지면 isComplete=true.
- 부족한 필드는 missingFields에 추가.
- displaySentence는 모든 필드가 채워졌을 때만, 위 형식 그대로 합친 한 문장. 아니면 null.
- 반드시 JSON만 응답하세요.

좋은 추출 예시 — 합쳤을 때 자연스러운 한 문장이 됩니다:

원문: "대학생이 공지를 확인한 뒤 마감일과 제출서류를 놓치는 문제를, 신청할 일만 카드로 정리해주는 방식으로 해결한다."
응답:
{
  "actor": "대학생이",
  "situation": "공지 확인 후",
  "problem": "마감일 놓침",
  "solution": "카드 정리로",
  "isComplete": true,
  "confidence": 0.9,
  "displaySentence": "대학생이 공지 확인 후 겪는 마감일 놓침을 카드 정리로 해결합니다.",
  "missingFields": []
}

원문: "청년주택이 필요한 사람들에게 자신의 자격 요건을 검사해서 알아서 제공해주고 원문링크도 보여주고 요약해주는 서비스"
응답:
{
  "actor": "청년이",
  "situation": "청년주택 찾을 때",
  "problem": "자격 확인 난해",
  "solution": "자동 검사로",
  "isComplete": true,
  "confidence": 0.85,
  "displaySentence": "청년이 청년주택 찾을 때 겪는 자격 확인 난해를 자동 검사로 해결합니다.",
  "missingFields": []
}

원문: "개발자가 아이디어가 떠올랐을 때 그게 1주일 안에 구현 가능한 아이디어인지 빠르게 검증해주는 서비스"
응답:
{
  "actor": "개발자가",
  "situation": "아이디어 떠올랐을 때",
  "problem": "구현성 판단 난해",
  "solution": "자동 검사로",
  "isComplete": true,
  "confidence": 0.88,
  "displaySentence": "개발자가 아이디어 떠올랐을 때 겪는 구현성 판단 난해를 자동 검사로 해결합니다.",
  "missingFields": []
}

JSON 형식:
{
  "actor": "string or null",
  "situation": "string or null",
  "problem": "string or null",
  "solution": "string or null",
  "isComplete": true,
  "confidence": 0.0,
  "displaySentence": "string or null",
  "missingFields": ["actor"]
}`;

export class LLMError extends Error {
  constructor(
    public readonly kind: 'CONFIG' | 'LLM_FAILED' | 'PARSE_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

let cachedClient: Groq | null = null;

function getClient(): Groq {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new LLMError('CONFIG', 'GROQ_API_KEY is not set');
  }
  cachedClient = new Groq({ apiKey });
  return cachedClient;
}

function getModel(): string {
  return process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
}

type LLMCallOptions = {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
};

async function callJsonLLM(opts: LLMCallOptions): Promise<unknown> {
  const client = getClient();

  let text: string;
  try {
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      temperature: opts.temperature,
      response_format: { type: 'json_object' },
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new LLMError('LLM_FAILED', 'Empty response from LLM');
    }
    text = content;
  } catch (err) {
    if (err instanceof LLMError) throw err;
    throw new LLMError(
      'LLM_FAILED',
      err instanceof Error ? err.message : 'LLM call failed',
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new LLMError('PARSE_FAILED', 'LLM did not return valid JSON');
  }
}

export async function evaluateIdea(
  idea: string,
  successCriteria: string,
  parsedIdea?: ParsedIdea | null,
): Promise<EvaluationResult> {
  const parts: string[] = [];
  parts.push(`아이디어:\n${idea.trim()}`);
  if (parsedIdea) {
    const lines: string[] = [];
    if (parsedIdea.actor) lines.push(`- 누가: ${parsedIdea.actor}`);
    if (parsedIdea.situation) lines.push(`- 상황: ${parsedIdea.situation}`);
    if (parsedIdea.problem) lines.push(`- 문제: ${parsedIdea.problem}`);
    if (parsedIdea.solution) lines.push(`- 해결: ${parsedIdea.solution}`);
    if (lines.length > 0) {
      parts.push(`구조화된 아이디어 (참고용):\n${lines.join('\n')}`);
    }
  }
  parts.push(`성공 기준:\n${successCriteria.trim()}`);

  const raw = await callJsonLLM({
    systemPrompt: EVAL_SYSTEM_PROMPT,
    userPrompt: parts.join('\n\n'),
    // 0.6: 같은 카테고리 안에서도 코멘트/Keep-Cut/Next Action이 한 번씩
    // 다르게 나오게. 너무 높이면 ship_type 분류가 흔들리니 0.7 이상은 비추.
    temperature: 0.6,
  });

  const normalized = normalizeEvaluation(raw);
  if (!normalized) {
    throw new LLMError('PARSE_FAILED', 'LLM JSON missing required fields');
  }
  return normalized;
}

export async function parseIdea(idea: string): Promise<ParsedIdea> {
  const raw = await callJsonLLM({
    systemPrompt: PARSE_SYSTEM_PROMPT,
    userPrompt: idea.trim(),
    temperature: 0.2,
  });

  const normalized = normalizeParsedIdea(raw);
  if (!normalized) {
    throw new LLMError('PARSE_FAILED', 'LLM JSON could not be normalized');
  }
  return normalized;
}
