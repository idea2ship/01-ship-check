import { GoogleGenerativeAI } from '@google/generative-ai';
import { normalizeEvaluation, normalizeParsedIdea } from './validation';
import type { EvaluationResult, ParsedIdea } from './types';

const EVAL_SYSTEM_PROMPT = `당신은 초기 아이디어를 1주일 안에 만들 수 있는 MVP로 줄여주는 제품 기획 코치입니다.

평가 기준은 다음과 같습니다.

1. 대상 사용자가 명확한가?
2. 사용 상황이 구체적인가?
3. 문제가 실제로 존재하는가?
4. 해결 방식이 너무 크지 않은가?
5. 1주일 안에 만들 수 있는 MVP로 줄일 수 있는가?
6. 성공 기준이 관찰 가능한 행동으로 되어 있는가?

절대 과장하지 마세요.
친절하지만 냉정하게 평가하세요.
아이디어를 무조건 칭찬하지 말고, 모호한 부분은 명확히 지적하세요.
결과는 사용자가 바로 다음 행동을 정할 수 있게 작성하세요.

반드시 JSON 형식으로만 응답하세요.
출력은 다음 키를 모두 포함해야 합니다:
- summary (string)
- clarityReview { score (1~5 정수), comment (string) }
- mvpScope { score (1~5 정수), comment (string), shouldCut (string 배열) }
- firstFeature { title (string), description (string) }
- improvedSuccessMetric (string)
- risks (string 배열)
- nextActions (string 배열, 3개 권장)`;

const PARSE_SYSTEM_PROMPT = `당신은 한국어 서비스 아이디어 문장에서 핵심 의미 요소를 추출하는 파서입니다.

사용자의 문장에서 다음 4가지를 추출하세요.

1. actor: 누가 문제를 겪는가 (예: "대학생이", "프리랜서가")
2. situation: 어떤 상황에서 문제를 겪는가 (예: "공지를 확인할 때")
3. problem: 어떤 문제를 겪는가 (예: "마감일을 놓치는 문제")
4. solution: 어떤 방식으로 해결하려 하는가 (예: "알림 카드로 정리해")

규칙:
- 원문에 없는 내용을 지어내지 마세요.
- 확실하지 않은 값은 null로 주세요.
- 각 필드는 화면에 바로 표시할 수 있도록 자연스러운 한국어 구문으로 정리하세요.
- solution은 뒤에 "해결합니다"를 붙였을 때 자연스럽게 이어지도록 작성하세요.
- problem은 뒤에 "를"이 붙어도 자연스럽게 보이도록 작성하세요.
- situation은 뒤에 "겪는"이 붙어도 자연스럽게 보이도록 작성하세요.
- 4개 필드가 모두 충분히 구체적으로 채워지면 isComplete를 true로 주세요.
- 부족한 필드는 missingFields 배열에 넣으세요.
- displaySentence는 4개 슬롯이 모두 채워졌을 때만 자연스러운 한 문장으로 만들고, 아니면 null로 주세요.
- 반드시 JSON만 응답하세요.

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

export class GeminiError extends Error {
  constructor(
    public readonly kind: 'CONFIG' | 'LLM_FAILED' | 'PARSE_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError('CONFIG', 'GEMINI_API_KEY is not set');
  }
  return apiKey;
}

function getModelName(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
}

export async function evaluateIdea(
  idea: string,
  successCriteria: string,
  parsedIdea?: ParsedIdea | null,
): Promise<EvaluationResult> {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const model = genAI.getGenerativeModel({
    model: getModelName(),
    systemInstruction: EVAL_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  });

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
  const userPrompt = parts.join('\n\n');

  let text: string;
  try {
    const result = await model.generateContent(userPrompt);
    text = result.response.text();
  } catch (err) {
    throw new GeminiError(
      'LLM_FAILED',
      err instanceof Error ? err.message : 'LLM call failed',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError('PARSE_FAILED', 'LLM did not return valid JSON');
  }

  const normalized = normalizeEvaluation(parsed);
  if (!normalized) {
    throw new GeminiError('PARSE_FAILED', 'LLM JSON missing required fields');
  }
  return normalized;
}

export async function parseIdea(idea: string): Promise<ParsedIdea> {
  const genAI = new GoogleGenerativeAI(getApiKey());
  const model = genAI.getGenerativeModel({
    model: getModelName(),
    systemInstruction: PARSE_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  let text: string;
  try {
    const result = await model.generateContent(idea.trim());
    text = result.response.text();
  } catch (err) {
    throw new GeminiError(
      'LLM_FAILED',
      err instanceof Error ? err.message : 'LLM call failed',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError('PARSE_FAILED', 'LLM did not return valid JSON');
  }

  const normalized = normalizeParsedIdea(parsed);
  if (!normalized) {
    throw new GeminiError('PARSE_FAILED', 'LLM JSON could not be normalized');
  }
  return normalized;
}
