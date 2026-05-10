# /1> Ship Check

Can this idea be shipped in a week?

Ship Check는 막연한 아이디어를 입력하면 1주일 안에 만들 수 있는 MVP인지
평가해주는 작은 서비스입니다. `idea2ship` 브랜드의 첫 번째 출시물입니다.

## Features

- 자연어 아이디어 입력
- **실시간 의미 파싱** — 입력을 멈추면 LLM이 `누가 / 상황 / 문제 / 해결` 4개 슬롯으로 분해해 상단 문장에 채움
- 성공 기준 입력
- AI 기반 MVP 평가 (Gemini)
- 결과 카드 출력 (Idea Summary / Clarity / MVP Scope / First Feature / Success Metric / Risk / Next Action)
- 결과 Markdown 복사 (Share result)
- 선택적 익명 저장 (Supabase) — Save 버튼 클릭 = 저장 동의
- 콘텐츠 활용 동의는 별도 체크박스로 분리

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Gemini API (`@google/generative-ai`)
- Supabase (`@supabase/supabase-js`, server-only)
- Vercel (배포)
- pnpm

## Getting Started

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수

`.env.example`을 복사해서 `.env.local`을 만들고 값을 채워주세요.

```bash
cp .env.example .env.local
```

| 키 | 설명 |
| --- | --- |
| `GEMINI_API_KEY` | Google AI Studio에서 발급한 Gemini API 키 |
| `GEMINI_MODEL` | (선택) 사용할 모델. 기본값 `gemini-2.5-flash` |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role 키 (서버 전용) |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트에 노출하지 마세요.
> 클라이언트는 Supabase에 직접 접근하지 않으며, `NEXT_PUBLIC_*` 변수를
> 사용하지 않습니다.

### 3. Supabase 테이블 만들기

`supabase/schema.sql`을 Supabase SQL Editor에 붙여넣고 실행하세요.

RLS가 활성화되며, 어떤 정책도 추가하지 않으므로 anon / authenticated
키로는 테이블에 접근할 수 없습니다. 서버 라우트에서 service role 키로만
insert가 이루어집니다.

### 4. 개발 서버

```bash
pnpm dev
```

http://localhost:3000 에서 확인할 수 있습니다.

### 5. 빌드 / 타입 체크

```bash
pnpm typecheck
pnpm build
```

## Project Structure

```
01-ship-check/
├── app/
│   ├── api/
│   │   ├── parse/route.ts      # POST: 자연어 아이디어 → 4개 슬롯으로 분해 (debounce용)
│   │   ├── evaluate/route.ts   # POST: Gemini 호출 → 평가 JSON 반환 (저장 X)
│   │   └── save/route.ts       # POST: 동의 시에만 Supabase insert
│   ├── privacy/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx
│   ├── ParsedHero.tsx          # 슬롯 UI (실시간 파싱 표시)
│   ├── IdeaForm.tsx
│   ├── ResultCard.tsx
│   ├── CopyButton.tsx
│   ├── ShareSection.tsx        # Copy + Save anonymously + content-use checkbox
│   └── ShipCheck.tsx           # 클라이언트 상태 컨테이너 (debounced parse 포함)
├── lib/
│   ├── gemini.ts
│   ├── supabase.ts
│   ├── markdown.ts
│   ├── validation.ts
│   └── types.ts
├── supabase/
│   └── schema.sql
├── .env.example
└── README.md
```

## API

| Route | Method | 역할 |
| --- | --- | --- |
| `/api/parse` | POST | 자연어 아이디어 → `{ actor, situation, problem, solution, isComplete, ... }` (frontend는 900ms debounce 후 호출) |
| `/api/evaluate` | POST | 평가 결과 JSON 반환. `parsedIdea`를 함께 보내면 평가 안정성이 올라감 |
| `/api/save` | POST | `allowAnonymousStorage: true`일 때만 Supabase insert |

## Privacy

이 서비스는 로그인 없이 사용할 수 있으며, 사용자가 **선택적으로 동의한
경우에만** 아이디어와 평가 결과를 익명 저장합니다.

- `Check my idea`는 평가만 수행하고 저장하지 않습니다.
- `/api/parse`는 LLM 호출은 하지만 어떤 데이터도 DB에 저장하지 않습니다.
- `Save anonymously` 버튼 클릭 = 익명 저장 동의입니다. 동의 없이 자동
  저장되는 경로는 없습니다.
- 콘텐츠 활용 동의는 저장 동의와 분리된 별도 컬럼(`allow_content_use`)에
  저장됩니다. 콘텐츠 활용에 동의하지 않은 데이터는 외부 콘텐츠 예시로
  사용되지 않습니다.
- IP, user-agent, 브라우저 fingerprint 등은 수집·저장하지 않습니다.

자세한 내용은 [/privacy](./app/privacy/page.tsx) 페이지를 참고하세요.

개인정보, 민감정보, 공개되지 않은 사업상 기밀은 입력하지 않는 것을
권장합니다.

## Deploy

Vercel에 그대로 배포할 수 있습니다.

1. 이 저장소를 Vercel에 import합니다.
2. 환경 변수 4개(`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, 선택적으로 `GEMINI_MODEL`)를 등록합니다.
3. 배포 후 Supabase에서 `supabase/schema.sql`을 한 번 실행했는지 확인합니다.

## Brand

idea2ship
Turning ideas into small products, one week at a time.

- `/?>` 다음에 만들 아이디어
- `/~>` 제작 중
- `/1>`, `/2>`, `/3>` 출시한 주차별 서비스

이번 프로젝트는 첫 번째 출시물이므로 `/1> Ship Check` 입니다.
