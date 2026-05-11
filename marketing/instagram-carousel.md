# `/1> Ship Check` — Instagram 캐러셀 컨텐츠 설계

> idea2ship 브랜드의 첫 출시물을 인스타로 소개하는 10장 캐러셀.
> 모든 슬라이드는 **1080×1350 (4:5)** 권장 — 인스타 피드에서 가장 잘 보이는 비율.

---

## 컨셉

**Hook → Problem → Solution → Demo → Categorization → Result → CTA** 흐름.

스크롤하면서 "어, 나도 이거 필요해" → "어떻게 만든 거지?" → "당장 써봐야지" 순으로 마음이 움직이게.

---

## 슬라이드 10장 구성

### 슬라이드 1 — Cover (Hook)

```
배경: cream + electric mint accent
폰트: 크고 굵게

상단:    /1>  Ship Check                  (mono)

중앙:    Can this idea
         be shipped
         in a week?

하단:    idea2ship — 1주일에 한 번,
         아이디어를 작은 서비스로
```

**캡션 한 줄**: "막연한 아이디어 → 1주짜리 MVP. 무료로 검증해보세요."

---

### 슬라이드 2 — Problem

```
배경: 살짝 어두운 cream

큰 텍스트:
"아이디어는 있는데,
어디서부터
만들지?"

작은 텍스트 (하단):
- 범위가 너무 크다
- 정말 만들 가치 있나
- 1주일 안에 가능?
- 누구한테 보여주지?
```

---

### 슬라이드 3 — Solution / Brand intro

```
큰 텍스트:
"AI가 1주짜리 MVP로
줄여드립니다."

중간 박스 (mint):
   [누가] [상황에서] 겪는
   [문제]를 [어떻게] 해결한다

하단:
60초 안에 검증, 무료
```

---

### 슬라이드 4 — Demo 1: 입력 화면 스크린샷

```
실제 / 화면 캡처 (모바일 사이즈로 자른)
입력 폼에 예시 텍스트 채워진 상태

오버레이 텍스트:
"막연한 아이디어를
적기만 하면"
```

**준비**: localhost 또는 배포 후 사이트에서 입력 + 결과 카드 캡처

---

### 슬라이드 5 — Demo 2: 실시간 파싱

```
화면 캡처 (좌측 슬롯이 채워진 모습)

좌측에:
  청년이
  청년주택 찾을 때 겪는
  자격 확인 난해를
  자동 검사로 해결합니다.

오버레이:
"AI가 실시간으로
구조를 잡아드려요"
```

---

### 슬라이드 6 — Demo 3: 결과 카드

```
결과 카드 전체 캡처
(Ship Type 배지 + 점수 + Keep/Cut + Next Actions)

오버레이:
"5가지 출시 유형 중 하나로
즉시 분류됩니다"
```

---

### 슬라이드 7 — 5 Ship Types 소개

```
2x3 그리드 (마지막 칸은 빈 칸 또는 logo)

🚢 Ship Now      즉시 출시형
✂️ Trim & Ship   핵심 출시형
🌊 Long Game     장기 항로형
🌫️ Fog Ahead    안개 항로형
🗺️ Chart First   탐색 항해형

각 박지에 짧은 한 줄 설명
```

---

### 슬라이드 8 — 결과 카드 deep dive

```
결과 카드 일부 zoom-in
(Keep/Cut 또는 Next Actions 부분)

오버레이:
"이번 주 만들 것은 무엇인지,
당장 할 행동 3가지까지
자동 정리"
```

---

### 슬라이드 9 — 공유 / 익명성

```
컨셉 이미지 (mint 그라디언트)

큰 텍스트:
"결과는 친구에게
링크로 공유 가능"

작은 텍스트:
- 로그인 없음
- 익명 저장 (선택)
- 개인정보 0
```

---

### 슬라이드 10 — CTA

```
큰 텍스트 (중앙):

   /1> Ship Check
   첫 번째 미니 서비스

   idea2ship.xyz

   (또는 직접: 01.idea2ship.xyz)

하단:
Built with Next.js · Groq · Cloudflare AI · Supabase

본문 캡션에:
🔗 프로필 링크에서 시도해보세요
다음 주 /2> 도 곧 만나요 👋
```

---

## 디자인 토큰 (Figma/Canva에서 통일)

```
색상
├ Background:  #FAF7F0 (warm ivory)
├ Text dark:   #1A1A1A (charcoal)
├ Accent:      #59B87B (electric mint)
└ Soft accent: #E0F6E9

폰트
├ 한글:        Pretendard Bold/SemiBold
├ 영문:        Inter Black/Bold
└ 모노:        Geist Mono / JetBrains Mono

레이아웃
├ 사이즈:      1080×1350 (4:5)
├ 여백:        72px 모든 면
├ 본문 라인:   line-height 1.3
└ 강조:        electric mint highlight (slot-chip 스타일 그대로)
```

---

## 본문 캡션 (인스타 게시물 본문)

```text
/1> Ship Check — Can this idea be shipped in a week?

막연한 아이디어를 1주일짜리 MVP로 줄여드립니다.
AI가 60초 안에 출시 유형·점수·다음 행동을 알려줘요.

🚢 즉시 출시형
✂️ 핵심 출시형
🌊 장기 항로형
🌫️ 안개 항로형
🗺️ 탐색 항해형

로그인 없음, 익명, 무료.
→ idea2ship.xyz (프로필 링크)

#idea2ship #메이커 #사이드프로젝트 #1주일MVP
#ShipCheck #프로덕트개발 #스타트업
#개발자 #aimaker
```

---

## 게시 체크리스트

- [ ] 모든 슬라이드 1080×1350로 export
- [ ] 첫 슬라이드 (cover)만 모바일에서 잘 보이는지 thumbnail로 확인
- [ ] 캡션에 idea2ship.xyz 링크는 동작하지 않으니 프로필 링크 안내
- [ ] 첫 댓글로 "👉 idea2ship.xyz" 자기 댓글 달기 (알고리즘 도움)
- [ ] 게시 시간: 평일 저녁 8-10시 KST 권장 (개발자/메이커 active)
- [ ] 스토리에도 같은 캐러셀 1~3장 cross-post
