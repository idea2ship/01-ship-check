# `/1> Ship Check` 개발 프롬프트

이 문서는 `idea2ship` 브랜드의 첫 번째 미니 서비스인 **`/1> Ship Check`**를 바로 개발하기 위한 프롬프트입니다.  
Claude Code, Codex, Cursor, Windsurf 등에 그대로 넣고 개발을 시작할 수 있도록 작성했습니다.

---

## 0. 역할

당신은 숙련된 풀스택 개발자입니다.  
아래 요구사항을 바탕으로 `idea2ship` 브랜드의 첫 번째 미니 서비스 **`/1> Ship Check`**를 개발해주세요.

---

## 1. 프로젝트 배경

이 프로젝트는 익명 메이커 브랜드 `idea2ship`의 첫 번째 서비스입니다.

브랜드 철학은 다음과 같습니다.

- 아이디어를 작은 서비스로 출시합니다.
- 한 주에 하나씩, 아이디어를 서비스로 만듭니다.
- 막연한 생각을 실제로 만들 수 있는 MVP 단위로 줄입니다.
- 완벽한 서비스보다, 작게 만들고 배포하고 회고하는 것을 중요하게 봅니다.

브랜드 표기 체계는 다음과 같습니다.

- `/?>` : 아직 만들기 전, 다음에 만들 예정인 아이디어
- `/~>` : 제작 중
- `/1>`, `/2>`, `/3>` : 실제로 출시한 주차별 서비스

이번 프로젝트는 첫 번째 출시물이므로 **`/1> Ship Check`**입니다.

---

## 2. 서비스 개요

### 서비스명

`/1> Ship Check`

### 한 줄 설명

막연한 아이디어를 입력하면, 1주일 안에 만들 수 있는 MVP인지 AI가 평가해주는 서비스입니다.

### 영어 카피

```text
Can this idea be shipped in a week?
```

또는

```text
Turn rough ideas into shippable MVPs.
```

### 한국어 카피

```text
막연한 아이디어를 1주일짜리 MVP로 줄여드립니다.
```

---

## 3. 핵심 사용자 흐름

사용자는 두 가지 내용을 입력합니다.

### 입력 1. 아이디어 문장

사용자가 아래 구조에 맞게 자신의 아이디어를 작성합니다.

```text
[누가] [어떤 상황에서] [어떤 문제]를 [어떻게] 해결한다
```

placeholder 예시:

```text
예: 대학생이 공지를 확인한 뒤 마감일과 제출서류를 놓치는 문제를, 신청할 일만 카드로 정리해주는 방식으로 해결한다.
```

### 입력 2. 성공 기준

사용자는 아래 질문에 답합니다.

```text
1주일 후 무엇이 일어나면 성공인가요?
```

placeholder 예시:

```text
예: 친구 5명이 한 번씩 써보고, 2명이 다시 쓰고 싶다고 말한다.
```

---

## 4. 핵심 기능 범위

반드시 구현할 기능은 다음과 같습니다.

1. 아이디어 입력
2. 성공 기준 입력
3. LLM 평가
4. 결과 카드 출력
5. 결과 복사 버튼
6. 익명 저장 동의 체크박스
7. 콘텐츠 활용 동의 체크박스
8. Supabase DB 저장
9. Privacy Note 페이지
10. Vercel 배포 가능한 구조

이번 MVP에서 제외할 기능은 다음과 같습니다.

- 로그인
- 회원가입
- 댓글
- 좋아요
- 공개 아이디어 피드
- 랭킹
- 유저 프로필
- 결제
- 관리자 페이지
- 복잡한 대시보드

절대 과하게 만들지 말고, **입력 → 평가 → 결과 → 선택 저장** 흐름만 깔끔하게 완성해주세요.

---

## 5. 기술 스택

다음 스택을 기준으로 개발해주세요.

- Framework: Next.js
- Styling: Tailwind CSS
- Language: TypeScript
- LLM API: Gemini API 우선
- DB: Supabase
- Deploy: Vercel
- Package Manager: pnpm

LLM API Key와 Supabase Key는 절대 프론트엔드에 노출하지 마세요.  
반드시 서버 API Route 또는 Server Action을 통해 처리하세요.

---

## 6. 페이지 구성

### `/`

메인 페이지입니다.

#### Header

- 좌측: `/1> Ship Check`
- 우측: `idea2ship` 또는 `Privacy`

#### Hero

메인 문구:

```text
Can this idea be shipped in a week?
```

보조 문구:

```text
막연한 아이디어를 1주일 안에 만들 수 있는 MVP로 줄여드립니다.
```

#### Input Form

필드 1:

Label:

```text
아이디어를 적어주세요
```

Helper Text:

```text
[누가] [어떤 상황에서] [어떤 문제]를 [어떻게] 해결하는지 적어주세요.
```

Placeholder:

```text
예: 대학생이 공지를 확인한 뒤 마감일과 제출서류를 놓치는 문제를, 신청할 일만 카드로 정리해주는 방식으로 해결한다.
```

필드 2:

Label:

```text
1주일 후 무엇이 일어나면 성공인가요?
```

Placeholder:

```text
예: 친구 5명이 한 번씩 써보고, 2명이 다시 쓰고 싶다고 말한다.
```

주의 문구:

```text
개인정보, 민감정보, 공개되지 않은 사업상 기밀은 입력하지 마세요. 입력 내용은 AI 평가를 위해 사용됩니다.
```

Button:

```text
Check my idea
```

#### Result Section

LLM 평가 결과를 카드 형태로 출력합니다.

결과 카드는 다음 항목을 포함합니다.

1. `Idea Summary`
2. `Clarity Review`
3. `MVP Scope`
4. `First Feature`
5. `Success Metric`
6. `Risk / Caution`
7. `Next Action`

#### Copy Button

결과를 Markdown 형태로 복사할 수 있게 해주세요.

Button:

```text
Copy result
```

#### Save Section

결과가 나온 뒤에만 표시합니다.

체크박스 1:

```text
[선택] 입력한 아이디어와 AI 평가 결과를 익명으로 저장하여 서비스 개선에 활용하는 데 동의합니다.
```

작은 설명:

```text
저장 항목: 아이디어 내용, 성공 기준, AI 평가 결과, 생성 시각
```

체크박스 2:

```text
[선택] 익명 처리된 아이디어와 평가 결과가 추후 idea2ship 콘텐츠 예시로 활용될 수 있음에 동의합니다.
```

작은 설명:

```text
공개 시 개인을 식별할 수 있는 정보는 제거하고, 필요한 경우 문장을 일부 수정합니다.
```

저장 버튼:

```text
Save anonymously
```

중요한 정책:

- 사용자가 체크박스를 선택하지 않아도 AI 평가는 받을 수 있어야 합니다.
- `Check my idea` 버튼은 평가 전용입니다.
- DB 저장은 `Save anonymously` 버튼을 눌렀을 때만 수행합니다.
- 콘텐츠 활용 동의는 DB 저장 동의와 분리해야 합니다.
- 콘텐츠 활용에 동의하지 않은 데이터는 외부 콘텐츠 예시로 사용하면 안 됩니다.

---

### `/privacy`

간단한 Privacy Note 페이지를 만듭니다.

Title:

```text
Privacy Note
```

본문에 다음 내용을 포함합니다.

```md
Ship Check는 계정 가입 없이 사용할 수 있습니다.

## 수집하는 정보

- 사용자가 입력한 아이디어
- 성공 기준
- AI 평가 결과
- 생성 시각

## 수집하지 않는 정보

- 이름
- 이메일
- 전화번호
- 로그인 계정
- 위치 정보

## 이용 목적

- 아이디어 평가 결과 제공
- 사용자가 선택 동의한 경우 서비스 개선
- 사용자가 별도 동의한 경우 익명 콘텐츠 예시 활용

## 보유 기간

- 선택 저장 데이터는 최대 6개월 보관 후 삭제하는 것을 원칙으로 합니다.

## 주의

개인정보, 민감정보, 공개되지 않은 사업상 기밀은 입력하지 마세요.
```

---

## 7. LLM 평가 방식

LLM은 사용자의 아이디어와 성공 기준을 바탕으로 평가합니다.

### LLM System Prompt

```text
당신은 초기 아이디어를 1주일 안에 만들 수 있는 MVP로 줄여주는 제품 기획 코치입니다.

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
```

### LLM Output JSON Schema

```json
{
  "summary": "아이디어를 한 문장으로 요약",
  "clarityReview": {
    "score": 1,
    "comment": "대상, 상황, 문제, 해결 방식의 명확성 평가"
  },
  "mvpScope": {
    "score": 1,
    "comment": "1주일 안에 만들 수 있는 범위인지 평가",
    "shouldCut": ["줄여야 할 기능 1", "줄여야 할 기능 2"]
  },
  "firstFeature": {
    "title": "가장 먼저 만들 기능 이름",
    "description": "첫 기능 설명"
  },
  "improvedSuccessMetric": "더 좋은 성공 기준 제안",
  "risks": ["위험 요소 1", "위험 요소 2"],
  "nextActions": ["다음 행동 1", "다음 행동 2", "다음 행동 3"]
}
```

`score`는 1~5 사이 숫자로 주세요.

---

## 8. API 설계

### `POST /api/evaluate`

역할:

- 사용자의 `idea`, `successCriteria`를 받습니다.
- Gemini API를 호출합니다.
- JSON 결과를 반환합니다.
- 이 단계에서는 DB에 저장하지 않습니다.

Request Body:

```json
{
  "idea": "string",
  "successCriteria": "string"
}
```

Response Body:

```json
{
  "summary": "string",
  "clarityReview": {
    "score": 1,
    "comment": "string"
  },
  "mvpScope": {
    "score": 1,
    "comment": "string",
    "shouldCut": ["string"]
  },
  "firstFeature": {
    "title": "string",
    "description": "string"
  },
  "improvedSuccessMetric": "string",
  "risks": ["string"],
  "nextActions": ["string"]
}
```

Validation:

- `idea`는 필수입니다.
- `successCriteria`는 필수입니다.
- 너무 짧은 입력은 에러를 반환합니다.
- 너무 긴 입력은 제한합니다.
- 개인정보 입력 금지 안내를 UI에 표시합니다.

---

### `POST /api/save`

역할:

- 사용자가 명시적으로 저장에 동의한 경우에만 호출됩니다.
- 입력값, 평가 결과, 동의 여부를 Supabase에 저장합니다.

Request Body:

```json
{
  "idea": "string",
  "successCriteria": "string",
  "result": {
    "summary": "string",
    "clarityReview": {
      "score": 1,
      "comment": "string"
    },
    "mvpScope": {
      "score": 1,
      "comment": "string",
      "shouldCut": ["string"]
    },
    "firstFeature": {
      "title": "string",
      "description": "string"
    },
    "improvedSuccessMetric": "string",
    "risks": ["string"],
    "nextActions": ["string"]
  },
  "allowAnonymousStorage": true,
  "allowContentUse": false
}
```

중요:

- `allowAnonymousStorage`가 `true`가 아니면 저장하지 마세요.
- `allowContentUse`는 별도 컬럼으로 저장하세요.
- 개인정보는 받지 마세요.
- IP, user agent, fingerprint 등은 저장하지 마세요.

---

## 9. Supabase DB Schema

다음 테이블을 만드세요.

Table name:

```text
ship_check_ideas
```

SQL:

```sql
create table ship_check_ideas (
  id uuid primary key default gen_random_uuid(),
  idea_text text not null,
  success_criteria text not null,
  ai_summary text,
  clarity_score int,
  clarity_comment text,
  mvp_score int,
  mvp_comment text,
  should_cut text[],
  first_feature_title text,
  first_feature_description text,
  improved_success_metric text,
  risks text[],
  next_actions text[],
  allow_anonymous_storage boolean not null default false,
  allow_content_use boolean not null default false,
  created_at timestamptz not null default now()
);
```

RLS를 활성화하고, 서버 환경에서만 insert되도록 구성해주세요.  
프론트엔드에서 직접 Supabase insert를 하지 마세요.

---

## 10. GitHub 저장소 운영 방식

이미 `idea2ship`이라는 새 GitHub 계정을 만들었다면, 초기에는 별도 organization보다 **`idea2ship` 계정 아래에 서비스별 개별 레포지토리**를 만드는 방식을 추천합니다.

추천 레포지토리 이름:

```text
01-ship-check
02-readme-builder
03-caption-maker
04-scope-cutter
```

또는 `week`를 명확히 넣고 싶다면:

```text
week-01-ship-check
week-02-readme-builder
week-03-caption-maker
```

비추천 이름:

```text
1week
2week
3week
```

이유:

- 무슨 서비스인지 이름만 보고 알기 어렵습니다.
- 나중에 포트폴리오로 볼 때 맥락이 약합니다.
- 검색성과 정리성이 떨어집니다.

추천 구조:

```text
idea2ship
├── 01-ship-check
├── 02-readme-builder
├── 03-caption-maker
└── idea2ship-archive
```

`idea2ship-archive` 레포에는 전체 주차별 서비스를 모아둔 인덱스 README를 작성합니다.

Organization은 다음 경우에 만드는 것을 추천합니다.

- 여러 명이 함께 운영하게 될 때
- 디자인 시스템, 공통 패키지, 여러 서비스를 한 공간에 묶고 싶을 때
- `idea2ship`을 개인 계정이 아니라 팀/스튜디오 브랜드로 키우고 싶을 때
- 권한 관리가 필요할 때

현재 단계에서는 organization이 오히려 관리 포인트를 늘릴 수 있으므로, 먼저 개인 계정 아래에서 개별 레포로 시작하고 나중에 필요하면 organization으로 이전하는 것이 좋습니다.

---

## 11. 디자인 방향

브랜드 분위기:

- 미니멀
- 크림색 배경
- 검정 타이포
- 민트 포인트 컬러
- 넓은 여백
- 코드/터미널 느낌 약간
- 과한 스타트업 감성 금지
- 전구, 로켓, 반짝이 같은 뻔한 이미지는 사용하지 않기

추천 스타일:

- 배경: 따뜻한 off-white / cream
- 텍스트: 거의 검정에 가까운 색
- 포인트: muted mint
- 카드: rounded-2xl, 얇은 border, 부드러운 shadow
- 폰트: 시스템 sans-serif
- 전체적으로 조용하지만 브랜드감 있게

UI는 모바일에서도 보기 좋아야 합니다.  
인스타에서 유입될 가능성이 있으므로 모바일 우선으로 디자인해주세요.

---

## 12. 결과 카드 UI

결과는 카드 형태로 표시합니다.

예시 카드:

### Idea Summary

AI가 요약한 아이디어

### Clarity Review

점수와 코멘트

### MVP Scope

1주일 안에 만들 수 있는지 평가

### First Feature

가장 먼저 만들 기능

### Success Metric

개선된 성공 기준

### Risk / Caution

주의할 점

### Next Action

바로 할 일 3가지

점수는 숫자만 보여주기보다 다음처럼 보여주세요.

```text
Clarity 4/5
MVP Scope 3/5
```

---

## 13. 에러 처리

다음 상황을 처리해주세요.

- 빈 입력
- 너무 짧은 입력
- LLM API 실패
- LLM JSON 파싱 실패
- Supabase 저장 실패
- 네트워크 오류

사용자에게는 친절한 메시지를 보여주세요.

예시:

```text
평가 결과를 만드는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
```

```text
아이디어를 조금 더 구체적으로 적어주세요.
```

```text
저장 중 문제가 발생했습니다. 평가 결과는 복사해서 보관할 수 있습니다.
```

---

## 14. 환경 변수

`.env.example` 파일을 만들어주세요.

```env
GEMINI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트에 노출하지 마세요.
- README에 환경 변수 설정 방법을 적어주세요.

---

## 15. README 작성

README에는 다음 내용을 포함해주세요.

```md
# /1> Ship Check

Can this idea be shipped in a week?

Ship Check는 막연한 아이디어를 입력하면 1주일 안에 만들 수 있는 MVP인지 평가해주는 작은 서비스입니다.

## Features

- 아이디어 입력
- 성공 기준 입력
- AI 기반 MVP 평가
- 결과 카드 출력
- 결과 복사
- 선택적 익명 저장
- 선택적 콘텐츠 활용 동의

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Gemini API
- Supabase
- Vercel

## Privacy

이 서비스는 로그인 없이 사용할 수 있으며, 사용자가 선택적으로 동의한 경우에만 아이디어와 평가 결과를 익명 저장합니다.

개인정보, 민감정보, 공개되지 않은 사업상 기밀은 입력하지 않는 것을 권장합니다.

## Brand

idea2ship  
Turning ideas into small products, one week at a time.
```

---

## 16. 인스타 업로드용 콘텐츠 고려

개발 후 인스타 캐러셀로 소개할 예정입니다.

캐러셀 구성은 다음과 같습니다.

### 1장

```text
/1> Ship Check
Can this idea be shipped in a week?
```

### 2장

```text
Problem
아이디어는 많은데, 어디서부터 만들어야 할지 막막합니다.
```

### 3장

```text
Input
[누가] [어떤 상황에서] [어떤 문제]를 [어떻게] 해결하는지 적습니다.
```

### 4장

```text
Success Metric
1주일 후 무엇이 일어나면 성공인지 적습니다.
```

### 5장

```text
AI Review
명확성, MVP 가능성, 첫 기능, 성공 기준을 평가합니다.
```

### 6장

```text
Built with
Next.js · Supabase · Gemini API
```

### 7장

```text
Learned
아이디어 평가는 점수가 아니라, 다음 행동을 정하는 과정이었습니다.
```

개발 결과물의 UI가 이 캐러셀에 캡처되어 들어갈 수 있도록 깔끔하게 만들어주세요.

---

## 17. 개발 우선순위

다음 순서로 개발해주세요.

1. Next.js 프로젝트 기본 세팅
2. Tailwind 스타일 세팅
3. 메인 페이지 UI 구현
4. 입력 폼 구현
5. `/api/evaluate` 구현
6. LLM JSON 응답 처리
7. 결과 카드 UI 구현
8. Copy result 구현
9. Supabase 테이블 연결
10. `/api/save` 구현
11. 선택 동의 체크박스 구현
12. `/privacy` 페이지 구현
13. README 작성
14. `.env.example` 작성
15. 에러 처리 및 모바일 반응형 점검

---

## 18. 완료 기준

다음 조건을 만족하면 완료입니다.

- 사용자가 아이디어와 성공 기준을 입력할 수 있다.
- `Check my idea`를 누르면 AI 평가 결과가 나온다.
- 결과가 카드 형태로 보기 좋게 출력된다.
- 결과를 복사할 수 있다.
- 사용자가 동의하지 않으면 DB에 저장되지 않는다.
- 사용자가 익명 저장에 동의하고 `Save anonymously`를 누르면 Supabase에 저장된다.
- 콘텐츠 활용 동의 여부가 별도 컬럼으로 저장된다.
- Privacy Note 페이지가 존재한다.
- 모바일 화면에서 자연스럽게 보인다.
- API Key가 클라이언트에 노출되지 않는다.
- README와 `.env.example`이 있다.

---

## 19. 중요한 개발 원칙

- 이번 프로젝트는 완성형 플랫폼이 아니라 1주일 MVP입니다.
- 기능을 늘리지 말고 핵심 흐름을 완성하세요.
- 로그인은 만들지 마세요.
- 공개 피드는 만들지 마세요.
- 아이디어를 자동으로 공개하지 마세요.
- 저장과 콘텐츠 활용은 반드시 사용자의 선택 동의 이후에만 처리하세요.
- 개인정보를 수집하지 마세요.
- 디자인은 과하게 꾸미지 말고, 조용하고 신뢰감 있게 만드세요.
- `/1> Ship Check`라는 브랜드 문법이 잘 보이게 해주세요.

---

# 코드 작성 전에 먼저 확인할 프롬프트

개발 도구에 바로 전체 구현을 맡기기 전에, 아래 프롬프트를 먼저 사용하면 좋습니다.

```md
위 요구사항을 읽고 바로 코드를 작성하지 말고, 먼저 다음만 출력해주세요.

1. 구현할 파일 구조
2. 필요한 패키지
3. API Route 설계
4. Supabase 테이블 설계
5. 예상 개발 순서
6. 구현 범위에서 제외할 것

출력 후 제가 승인하면 그때 코드를 작성하세요.
```

처음부터 코드 생성을 시키면 범위가 커질 수 있으므로, **설계 확인 → 구현** 순서로 진행하는 것을 추천합니다.
