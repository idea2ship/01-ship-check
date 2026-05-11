# /1> Ship Check

Can this idea be shipped in a week?

Ship Check는 막연한 아이디어를 입력하면 1주일 안에 만들 수 있는 MVP인지
AI가 평가해주는 작은 서비스입니다. `idea2ship` 브랜드의 첫 번째 출시물입니다.

라이브: https://01.idea2ship.xyz

## Features

- **자연어 아이디어 입력** — 한국어 그대로 작성
- **실시간 의미 파싱** — 입력을 멈추면 LLM이 `누가 / 상황 / 문제 / 해결` 4개 슬롯으로 분해해 화면 좌측에 채움 (900ms debounce)
- **MBTI 스타일 Ship Type 분류** — 5종 (`Ship Now`, `Trim & Ship`, `Long Game`, `Fog Ahead`, `Chart First`)
- **신뢰도 점수 0~100** + 3개 metric (명확성·MVP범위·실행가능성)
- **Keep / Cut 전략** — 이번 주 만들 것 vs 빼야 할 것
- **다음 행동 3가지** — 즉시 실행 가능한 action
- **컨셉 일러스트** — Cloudflare Workers AI (FLUX schnell)로 결과별 자동 생성, edge에서 1년 캐시
- **결과 카드 hover tilt** — 커서 따라 3D 입체감 (framer-motion)
- **결과 공유 링크** — `/r/[id]`로 친구에게 비공개 URL 공유, OG 카드 미리보기 자동 생성
- **선택적 익명 저장** (Supabase) — `동의하고 공유하기` / `저장하기` 두 옵션
- **로그인 0, 개인정보 0** — IP·UA·fingerprint 모두 미수집

## Tech Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v3
- **Groq** (`groq-sdk`) — Llama 3.3 70B / parse + evaluate
- **Cloudflare Workers AI** (`flux-1-schnell`) — 컨셉 이미지 생성, 10,000 neurons/day 영구 무료
- **Supabase** (`@supabase/supabase-js`) — RLS + service role 기반 안전 저장
- **framer-motion** — 결과 카드 transition + tilt
- **pnpm** + Vercel/OCI 배포

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
| `GROQ_API_KEY` | https://console.groq.com 에서 발급 (무료) |
| `GROQ_MODEL` | (선택) 기본값 `llama-3.3-70b-versatile`. 후보: `llama-3.1-8b-instant` 등 |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role / secret 키 (서버 전용) |
| `CF_ACCOUNT_ID` | Cloudflare 대시보드 URL에서 확인 |
| `CF_API_TOKEN` | Cloudflare → My Profile → API Tokens → "Workers AI" 권한 토큰 |
| `CF_ANALYTICS_TOKEN` | (선택) `./scripts/cf-usage.sh` 용 분석 토큰 |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`, `CF_API_TOKEN`은 절대 클라이언트에 노출하지 마세요.
> 클라이언트 번들엔 `NEXT_PUBLIC_*` 변수만 inline됩니다. 위 키들은 서버 라우트에서만 사용됩니다.

### 3. Supabase 테이블 만들기

`supabase/schema.sql`을 Supabase SQL Editor에 붙여넣고 실행하세요.

RLS가 활성화되며, 어떤 정책도 추가하지 않으므로 anon / authenticated
키로는 테이블에 접근할 수 없습니다. 서버 라우트에서 service role 키로만
insert가 이루어집니다.

스키마는 idempotent (`if not exists`) 이라 여러 번 실행해도 안전합니다. 
새 컬럼이 추가될 때마다 다시 한 번 실행하면 됨.

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
│   │   ├── parse/route.ts         # POST: 자연어 → 4개 슬롯 (900ms debounce)
│   │   ├── evaluate/route.ts      # POST: Groq 호출 → Ship Type 평가 (저장 X)
│   │   ├── concept-image/route.ts # GET:  CF Workers AI 프록시 (1년 immutable cache)
│   │   └── save/route.ts          # POST: 동의 시에만 Supabase insert
│   ├── r/[id]/page.tsx            # 저장된 결과의 read-only 공유 페이지
│   ├── privacy/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx
│   ├── BgLayer.tsx                # 배경 cursor parallax (rAF lerp)
│   ├── ParsedHero.tsx             # 4슬롯 실시간 파싱 UI
│   ├── IdeaForm.tsx               # 입력 폼 (Enter→다음 필드, IME-safe)
│   ├── ResultCard.tsx             # MBTI-style 카드 + tilt + glow
│   ├── ResultSkeleton.tsx
│   ├── ConceptImage.tsx           # CF 이미지 표시 (shimmer + retry)
│   ├── CopyButton.tsx
│   ├── ShareSection.tsx           # 2-state 플로우 (동의공유 / 저장하기)
│   └── ShipCheck.tsx              # 상태 컨테이너 (debounce + view machine)
├── lib/
│   ├── llm.ts                     # Groq client (parse + evaluate prompts)
│   ├── image.ts                   # CF Workers AI URL builder
│   ├── supabase.ts                # service-role client + getSavedIdea
│   ├── markdown.ts                # 결과 → MD export
│   ├── validation.ts              # 입력 검증 + LLM 응답 normalize
│   └── types.ts                   # EvaluationResult, ShipType 등
├── supabase/
│   └── schema.sql                 # idempotent migrations
├── scripts/
│   └── cf-usage.sh                # Cloudflare 사용량 확인 (GraphQL Analytics)
├── marketing/
│   ├── instagram-carousel.md      # 10장 캐러셀 컨텐츠 설계
│   └── instagram-reels.md         # 3가지 릴스 옵션 + 촬영 팁
├── public/
│   ├── bg-landscape.png           # 데스크톱 배경 (1672×941)
│   └── bg-portrait.png            # 모바일 배경 (941×1672)
├── .env.example
└── README.md
```

## API

| Route | Method | 역할 |
| --- | --- | --- |
| `/api/parse` | POST | 자연어 → `{ actor, situation, problem, solution }` (Groq, 900ms debounce 클라이언트 측 호출) |
| `/api/evaluate` | POST | Ship Type + 점수 + Keep/Cut + Next Actions + 영어 imagePrompt (Groq) |
| `/api/concept-image` | GET | Cloudflare flux-1-schnell 프록시. `?prompt=...&seed=...`, 1년 immutable cache |
| `/api/save` | POST | `allowAnonymousStorage: true`일 때만 Supabase insert. UUID id 반환 |

## Ship Type 분류

LLM이 5종 중 1개로 분류:

| key | 한국어 | English | Can ship in week |
| --- | --- | --- | --- |
| `ready_shipper` | 즉시 출시형 | **Ship Now** | ✅ |
| `scope_down_shipper` | 핵심 출시형 | **Trim & Ship** | ✅ |
| `big_vision` | 장기 항로형 | **Long Game** | ❌ |
| `foggy_idea` | 안개 항로형 | **Fog Ahead** | ❌ |
| `discovery_mode` | 탐색 항해형 | **Chart First** | ❌ |

각 분류는 confidence (0~100) + scores (clarity·mvpScope·feasibility 각 1~5)로 정량화됩니다.

## Privacy

이 서비스는 로그인 없이 사용할 수 있으며, 사용자가 **선택적으로 동의한
경우에만** 아이디어와 평가 결과를 익명 저장합니다.

- `Check my idea`는 평가만 수행하고 저장하지 않습니다.
- `/api/parse`, `/api/concept-image`는 LLM/AI 호출은 하지만 어떤 데이터도 DB에 저장하지 않습니다.
- `저장하기` 버튼 클릭 = 익명 저장 동의 (콘텐츠 활용 동의 X).
- `동의하고 공유하기` 버튼 클릭 = 익명 저장 + 콘텐츠 예시 활용 동의.
- 콘텐츠 활용 동의는 별도 컬럼(`allow_content_use`)에 저장됩니다. 동의 안 한 데이터는 외부 콘텐츠 예시로 사용되지 않습니다.
- IP, user-agent, 브라우저 fingerprint 등은 수집·저장하지 않습니다.

자세한 내용은 [/privacy](./app/privacy/page.tsx) 페이지를 참고하세요.

개인정보, 민감정보, 공개되지 않은 사업상 기밀은 입력하지 않는 것을
권장합니다.

## Deploy

### Vercel (가장 빠름)

1. 이 저장소를 Vercel에 import합니다.
2. 환경 변수 5개(`GROQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CF_ACCOUNT_ID`, `CF_API_TOKEN`)를 등록합니다. `GROQ_MODEL`은 선택.
3. 배포 후 Supabase에서 `supabase/schema.sql`을 한 번 실행했는지 확인합니다.
4. Vercel Project → Settings → Domains → `01.idea2ship.xyz` 추가 → DNS CNAME 안내대로 등록.

### OCI / 직접 운영

코드가 vendor-specific 의존 없이 plain Next.js이라 OCI Ampere ARM VM에 그대로 올라갑니다.

1. Ubuntu VM에 Node 22 + pnpm 설치
2. `git clone` + `pnpm install --frozen-lockfile` + `pnpm build`
3. systemd unit으로 `pnpm start` 상시 실행 (port 3000)
4. Caddy 등 reverse proxy로 `01.idea2ship.xyz` → `127.0.0.1:3000`
5. 환경 변수는 systemd `EnvironmentFile=/path/to/.env.local` 또는 별도 secret manager

## 사용량 모니터링

```bash
./scripts/cf-usage.sh        # 오늘 Cloudflare Workers AI 사용량
./scripts/cf-usage.sh 7      # 최근 7일
```

Cloudflare 무료 한도: **10,000 neurons/day** (≈ 120 flux-schnell 이미지).
Edge 캐시 덕에 같은 idea는 한 번만 생성됨.

## Brand

idea2ship
Turning ideas into small products, one week at a time.

- `/?>` 다음에 만들 아이디어
- `/~>` 제작 중
- `/1>`, `/2>`, `/3>` 출시한 주차별 서비스

이번 프로젝트는 첫 번째 출시물이므로 `/1> Ship Check` 입니다.
