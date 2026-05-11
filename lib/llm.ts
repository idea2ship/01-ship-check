import Groq from 'groq-sdk';
import { normalizeEvaluation, normalizeParsedIdea } from './validation';
import type { EvaluationResult, ParsedIdea } from './types';

const EVAL_SYSTEM_PROMPT = `당신은 초기 아이디어를 1주일 안에 만들 수 있는 MVP로 줄여주는 제품 기획 코치입니다.

평가 기준:
1. 대상 사용자가 명확한가?
2. 사용 상황이 구체적인가?
3. 문제가 실제로 존재하는가?
4. 해결 방식이 너무 크지 않은가?
5. 1주일 안에 만들 수 있는 MVP로 줄일 수 있는가?
6. 성공 기준이 관찰 가능한 행동으로 되어 있는가?

톤:
- 절대 과장하지 마세요. 친절하지만 냉정하게.
- 무조건 칭찬 금지. 모호한 부분은 명확히 지적.
- 결과는 "다음 행동"을 정할 수 있게 구체적으로.

**중요: 결과는 카드 형태로 표시되니 짧고 핵심만 적습니다. 줄글 금지.**

각 필드 글자 수 한계 (반드시 준수):
- summary: 80자 이내, 1 문장
- clarityReview.comment: 60자 이내, 1 문장
- mvpScope.comment: 60자 이내, 1 문장
- mvpScope.shouldCut: 각 항목 16자 이내 명사구, 최대 3개
- firstFeature.title: 14자 이내
- firstFeature.description: 60자 이내, 1 문장
- improvedSuccessMetric: 70자 이내, 측정 가능한 행동 1 문장
- risks: 각 항목 30자 이내 명사구, 최대 3개
- nextActions: 각 항목 25자 이내, 동사로 시작, 정확히 3개

imagePrompt 규칙 (반드시 영어로):
- 이 서비스 개념을 상징적으로 표현하는 **단일 컨셉 일러스트** 묘사문.
- 60~180자 정도, 영어 문장으로.
- 사용자·상황·문제·해결 흐름을 시각적 메타포로 (예: "scattered notes flowing into a single organized card", "tangled threads being untangled into clean lines").
- **스타일·색상·"no text"·"ivory"·"mint" 같은 브랜드 토큰은 절대 적지 마세요** — 코드에서 자동 추가됩니다.
- UI screenshot, app interface, phone mockup, computer screen은 절대 묘사하지 마세요.
- 사람 얼굴, 인종이 식별되는 사람 묘사 금지. 추상적 실루엣은 OK.
- 한국어/한국어 고유명사 그대로 쓰지 말고, 보편 개념으로 번역 (예: "청년주택" → "small studio apartment listings").

반드시 JSON 형식으로만 응답하세요. 출력 키:
- summary
- clarityReview { score (1~5 정수), comment }
- mvpScope { score (1~5 정수), comment, shouldCut }
- firstFeature { title, description }
- improvedSuccessMetric
- risks
- nextActions
- imagePrompt`;

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
- 각 필드 공백 포함 **9자 이내**, 절대 **11자 초과 금지**.
- 원문이 길어도 통째로 옮기지 말고 핵심 키워드만 뽑으세요.
- 짧을수록 좋습니다 (4~7자가 이상적).

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
  "problem": "자격 확인 어려움",
  "solution": "자동 검사로",
  "isComplete": true,
  "confidence": 0.85,
  "displaySentence": "청년이 청년주택 찾을 때 겪는 자격 확인 어려움을 자동 검사로 해결합니다.",
  "missingFields": []
}

원문: "프리랜서 디자이너가 클라이언트와 일정을 잡을 때 시차와 이메일 핑퐁으로 시간을 너무 많이 쓰는 문제를, 가능 시간만 보여주고 자동 확정해주는 방식으로 해결한다."
응답:
{
  "actor": "디자이너가",
  "situation": "일정 잡을 때",
  "problem": "이메일 핑퐁",
  "solution": "자동 확정으로",
  "isComplete": true,
  "confidence": 0.88,
  "displaySentence": "디자이너가 일정 잡을 때 겪는 이메일 핑퐁을 자동 확정으로 해결합니다.",
  "missingFields": []
}

원문: "혼자 사는 사람이 음식을 시킬 때 1인분이 없거나 너무 비싸서 끼니를 거르는 문제를, 1인 메뉴만 모아서 보여주는 방식으로 해결한다."
응답:
{
  "actor": "1인 가구가",
  "situation": "음식 시킬 때",
  "problem": "1인분 부재",
  "solution": "1인 메뉴 모음으로",
  "isComplete": true,
  "confidence": 0.82,
  "displaySentence": "1인 가구가 음식 시킬 때 겪는 1인분 부재를 1인 메뉴 모음으로 해결합니다.",
  "missingFields": []
}

위 예시처럼 각 필드는 4~9자 명사구이고, problem에는 조사를 안 붙이고, solution은 반드시 "로/으로"로 끝납니다.

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
    temperature: 0.4,
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
