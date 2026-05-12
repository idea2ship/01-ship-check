# `/1> Ship Check` — 셋업 & 작업 로그

> 2026-05-11. OCI Ampere VM 배포부터 UX 다듬기까지의 작업을 원인·해결 형태로 정리.
> 개인 보관용 — 같은 패턴이 다시 나올 때 참고하기 위함.

---

## 1. 인프라 — 디렉토리 & 컨테이너 토폴로지

### 1.1 디렉토리 컨벤션

**고민**: 핸드오프 문서에선 `~/01-ship-check` 권장. 그러나 이 VM은 이미 `/srv/web/<service>/` 패턴 (mc-dashboard, dl.meowti.kr) 사용 중.

**결정**: `/srv/web/idea2ship/01-ship-check/` — 브랜드 그룹화. `02-`, `03-` 늘어날 때 자연스럽게 정렬.

```
/srv/web/idea2ship/
  └─ 01-ship-check/        # 소스
/srv/infra/
  ├─ caddy/                # Caddyfile + data
  └─ compose/
     ├─ caddy/             # reverse proxy compose
     └─ idea2ship/
        └─ 01-ship-check/  # app compose
```

### 1.2 nginx → Caddy 마이그레이션

**상황**: VM에 기존 `infra-nginx` 컨테이너가 port 80 점유, `*.meowti.kr` 3개 서빙. 새 idea2ship.xyz 추가에 더해 HTTPS 도입 필요.

**원인 분석**: 핸드오프 문서의 `deploy/setup.sh`는 Caddy를 호스트에 systemd로 설치 → 기존 Docker 패턴과 충돌. 80/443 포트 충돌도 발생.

**해결**: Caddy도 Docker로 운영. 기존 `frontdoor-net` Docker 네트워크에 join. `dashboard:3000`, `api:8080`은 컨테이너 alias로 그대로 해석.

**Caddyfile 핵심 패턴** — Cloudflare 뒤에 있는 호스트(meowti.kr 서브)와 직접 노출되는 호스트(idea2ship.xyz) 구분:
```
http://dashboard.meowti.kr { reverse_proxy dashboard:3000 }   # CF가 TLS 처리, origin은 HTTP
01.idea2ship.xyz           { reverse_proxy ship-check:3000 }  # Caddy가 LE로 TLS 직접
```

**컷오버**: nginx down → caddy up. 다운타임 ~10초. 사후 `infra-nginx` 컨테이너는 보존 후 안정 확인 후 제거 권장.

---

## 2. DNS + Let's Encrypt — 가장 오래 걸렸던 트러블

### 2.1 `ERR_SSL_PROTOCOL_ERROR` 진단

**증상**: `https://01.idea2ship.xyz` 접근 시 SSL 핸드셰이크 실패.

**원인 사슬**:
1. Caddy는 `01.idea2ship.xyz { … }` 블록 보고 자동으로 :80에 HTTP→HTTPS 308 리다이렉트 설치
2. 동시에 :443에 TLS 서버 등록, ACME로 LE 발급 시도
3. 그러나 cert이 아직 없음 → :443 TLS 핸드셰이크 즉시 실패
4. :80도 308 리다이렉트하니 HTTP로 fallback 불가

**해결**: 사용 가능한 회피책 두 가지를 결합

**A. dual-block 패턴** — Caddyfile에 명시 HTTP + 암묵 HTTPS 둘 다:
```caddyfile
http://01.idea2ship.xyz { reverse_proxy ship-check:3000 }   # :80 직접 처리, 자동 리다이렉트 무력화
01.idea2ship.xyz        { reverse_proxy ship-check:3000 }   # :443 + cert 발급
```
→ cert 발급 전에도 HTTP로 미리보기 가능, 발급 후엔 양쪽 모두 사용 가능.

**B. `caddy reload` 한계** — 단순 reload는 :80 라우트 캐시를 안 풀어서 변경 적용 안 됨. **container restart** 필요. config 토폴로지 크게 바꿀 때는 reload 대신 restart로 적용.

### 2.2 ns3 동기화 지연

**증상**: `01.idea2ship.xyz` DNS A 레코드 등록했는데도 LE가 NXDOMAIN으로 발급 거부.

**원인 진단**:
```bash
for ns in ns1 ns2 ns3 ns4; do
  dig +short @$ns.hosting.co.kr. 01.idea2ship.xyz
done
# ns1, ns2, ns4 → 140.245.77.37 ✓
# ns3            → (빈 응답) ✗
```

SOA serial은 4개 NS 모두 동일했으나(`3`), ns3만 NXDOMAIN. 즉 단순 복제 지연이 아니라 **ns3 데몬의 zone reload 누락 또는 hidden master push 실패**로 추정.

LE의 recursive resolver가 4개 NS 중 랜덤으로 골라 질의 → ns3 hit 시마다 NXDOMAIN → cert 발급 fail.

**해결**: 직접 통제 불가. hosting.co.kr 측 정책. 권장 액션 순서:
1. 콘솔에서 "변경 적용" / "재배포" 버튼 (있다면 즉시 해결)
2. A 레코드 삭제 → 재추가 (SOA serial bump, NOTIFY 재발송)
3. 6시간 대기 (SOA refresh 주기)
4. 고객지원 ticket

**자동 회복 셋업**: watcher 스크립트를 백그라운드에 띄워둠. 4개 NS 모두 sync 감지 시 Caddy auto-restart → cert 발급 자동 트리거.

### 2.3 Cert 발급 조건 정리 (학습용)

```
[1] Caddy → "cert 줘" → LE                  ← Caddy 백오프 타이머 만료 시 시도
[2] LE → DNS 조회 (모든 NS 일관해야 함)        ← ns3 미동기 시 여기서 막힘
[3] LE → 도메인 :80 or :443에 challenge      ← 인터넷 → 우리 IP 접근 가능해야 함
[4] LE → cert 발급 → /data/caddy/.../        ← 위 3개 통과 시
```

LE rate limit: 같은 hostname 실패 authz **5회/시간**. 초과 시 1시간 차단. 무한 재시도 금지 (Caddy 자체 백오프가 보호).

---

## 3. 개발 환경 — VSCode 원격 + git 분리

### 3.1 원격 개발 머신으로서의 VM

VSCode Remote가 SSH 터널 위에서 `vscode-server` 실행 중. VM에서 `pnpm dev`로 :3000 띄우면 자동으로 노트북에 forward됨. **코드 변경 없음**, VSCode 기본 동작.

수동으로 필요할 때:
```bash
ssh -L 3000:127.0.0.1:3000 ubuntu@140.245.77.37
# 노트북 브라우저 → http://localhost:3000
```

### 3.2 SSH 키 / git 계정 분리 (브랜드 vs 개인)

이 VM은 개인 계정 `meowtivator` 키로 GitHub 인증 중이었음. `idea2ship` 브랜드 계정과 분리 필요.

**해결**:
```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_idea2ship -N ""

# ~/.ssh/config
Host github-idea2ship
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_idea2ship

# 레포만 idea2ship 계정으로
git -C /srv/web/idea2ship/01-ship-check remote set-url origin git@github-idea2ship:idea2ship/01-ship-check.git
git -C /srv/web/idea2ship/01-ship-check config user.email "idea2ship@users.noreply.github.com"
git -C /srv/web/idea2ship/01-ship-check config user.name "idea2ship"
```

키는 **Deploy key 아닌 계정 SSH key**로 등록. 향후 02-, 03- 레포 늘어날 때 한 키로 전부 커버.

---

## 4. UX 반복 — 결과 카드 & 공유 플로우

### 4.1 공유 플로우 두 번 재설계

**1차 (자동 저장)**: 결과 도착 즉시 자동 `POST /api/save` → 링크 즉시 노출. 동의 토글은 PATCH로 사후 변경.

**2차 (명시적 액션)** — 사용자 피드백 반영: 자동 저장 → 사용자가 명시적으로 "결과 공유하기" 눌렀을 때만 저장.

최종 3버튼:
| 액션 | 동작 | 서버 |
|---|---|---|
| **결과 공유하기** | POST /api/save → ID 받음 → URL 자동 클립보드 복사 | ✅ |
| **결과 복사하기** | Markdown 텍스트 클립보드 복사 | ✗ |
| **익명으로 보태기** | 같은 row의 `allow_content_use=true` PATCH (없으면 INSERT) | ✅ |

### 4.2 체크박스 → 옵트인 액션으로 전환

**이전**: 동의 체크박스를 누르고 저장 버튼 누름 = 동의의 의미 모호. "내 데이터 가져가요" 톤.

**이후**: "익명으로 보태기" 별도 버튼. 카피를 기여형으로 — "메이커에게 도움이 돼요" → 클릭 시 "잘 받았어요 / 함께해주셔서 감사해요!".

### 4.3 CopyButton 애니메이션

상태 머신 `idle → pending(spinner) → copied(check + 글자 stagger 대각선 진입) → idle`. 글자별 framer-motion 애니메이션, `mode="wait"`로 전환.

### 4.4 결과 카드 레이아웃 진화

여러 차례 사용자 피드백 반영해 최종 구조:

```
┌─ Ship Type 헤더 카드 (gradient + sparkle deco) ────────┐
│  SHIP TYPE                                              │
│  핵심 출시형  TRIM & SHIP            78               │
│  ━━━━━━━━━━━━━━━━━           ┌─────────┐            │
│  ✦ 조금만 다듬으면 가능       │ concept │   (embedded) │
│                              │ 이미지   │   (mask fade)│
│                              └─────────┘             │
└────────────────────────────────────────────────────────┘
┌─ AI 한 줄 요약 ─┬─ Can Ship in 1 Week ─┐
└────────────────┴───────────────────────┘
┌─ 측정 가능한 성공 기준 (LLM refined) ────────────┐
└──────────────────────────────────────────────────┘
┌─ 명확성 4/5 ─┬─ MVP 범위 3/5 ─┬─ 실행 가능성 4/5 ─┐
│   (mint)     │   (amber 2-3)   │     (mint 4-5)    │
└──────────────┴─────────────────┴───────────────────┘
┌─ 이번 주 MVP ─────────┬─ 다음 행동 3가지 ─────────┐
└───────────────────────┴───────────────────────────┘
```

**핵심 변경**:
- 컨셉 이미지가 hero 카드 안으로 흡수 (별도 박스 폐기) — MBTI 카드 같은 통합감
- `embedded` prop으로 image wrapper의 border/배경 제거 + radial mask로 가장자리 fade
- Metric 색상 분기: 1점=빨강, 2-3=황색, 4-5=민트
- 섹션 라벨 통일: mono uppercase tracked → mint bold normal text

### 4.5 폰트 셋업

**선택**: Pretendard Variable (body) + SUIT Variable (display 강조)
- 둘 다 OFL 라이선스, 변형 폰트 한 파일로 weight 45~920 커버
- jsdelivr CDN으로 webfont (Pretendard ≈ 2MB, SUIT 별도)

```css
@font-face {
  font-family: 'Pretendard Variable';
  src: url('https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2')
       format('woff2-variations');
}
```

Paperlogy는 jsdelivr CDN path를 못 찾아서 SUIT로 대체.

---

## 5. 백엔드 개선

### 5.1 LLM 프롬프트 — `refinedSuccessMetric` 필드 추가

**문제**: 사용자가 입력한 성공 기준이 모호한 경우 그대로 출력 ("내가 직접 써보면 좋겠다" 같은 거).

**해결**: LLM이 입력을 1주일 후 검증 가능한 한 문장으로 다듬어 별도 필드로 반환. 결과 카드는 refined 우선, 없으면 raw fallback.

프롬프트 가이드:
- 한 문장 ≤60자
- 가능하면 숫자/시점 명시 ("1주 후 X명이 Y하면 성공")
- 모호한 입력 → 합리적 구체 지표로 변환

### 5.2 컨셉 이미지 캐싱

**문제**: `/api/concept-image` 프록시가 매 요청마다 Cloudflare API 새로 호출. 공유 링크 첫 방문자마다 5-15초 대기.

**해결**: 인메모리 LRU 캐시 추가.
```ts
const IMAGE_CACHE = new Map<string, CacheEntry>();  // key = "seed::prompt"
const IMAGE_CACHE_MAX = 200;  // ~30MB RAM
```
- HIT 시 즉시 응답 (`X-Image-Cache: HIT` 헤더)
- MISS만 CF API 호출 후 캐시 저장
- 컨테이너 재시작 시 휘발 (다음 방문자가 다시 워밍)

향후 영구화 필요해지면 → Supabase Storage 옮기는 옵션.

### 5.3 이미지 preload — 결과 카드와 이미지 동시 도착

**문제**: 결과 카드가 먼저 뜨고 이미지는 비어있다가 5-15초 후 채워짐. UX 불일치.

**해결**: `handleEvaluate`에서 evaluate 응답 받은 뒤 `waitForImage()`로 이미지가 실제 로드될 때까지 대기 후에야 결과 카드 노출. AbortController로 ESC/새 평가 시 즉시 취소.

### 5.4 OG 이미지 — Satori 기반 동기화

**선택**: Satori (`next/og` `ImageResponse`)로 결과 카드와 비슷한 디자인의 1200×630 PNG 동적 생성. Supabase Storage 없이 매 요청 즉시 렌더.

**서브 트러블**:
- Pretendard에 `✦` 글자 없음 → SVG polygon으로 교체
- 상대 경로 `concept_image_url` ("/api/concept-image?…") → Satori `<img>`가 못 가져옴. `process.env.NEXT_PUBLIC_SITE_URL` 붙여 절대 URL로 변환.

---

## 6. 자잘한 버그 픽스

### 6.1 `/r/[id]` 500 에러

**원인**: 페이지가 Server Component인데 Client Component인 `<CopyButton>`에 함수(`getText`)를 prop으로 전달. Next.js 13+ App Router에서 함수는 server→client boundary 못 넘음.

**해결**: 함수 prop이 필요한 부분을 `'use client'` wrapper (`SharedResultActions.tsx`)로 분리.

### 6.2 컨셉 이미지 URL이 DB에 저장 안 됨

**원인**: `/api/save`가 `conceptImageUrl.startsWith('http')`만 통과시킴. 우리 URL은 `/api/concept-image?…` 상대경로라 항상 null로 저장.

**해결**: validation을 `startsWith('http') || startsWith('/')`로 확장.

### 6.3 `/api/concept-image` Content-Type 불일치

**원인**: 라우트가 항상 `image/png` 반환하는데 CF는 실제로 JPEG 반환할 때도 있음.

**해결**: 응답 바이트의 magic bytes (`FF D8 FF` for JPEG) 검사해서 올바른 Content-Type 설정.

### 6.4 SLA: ImageResponse fonts CDN

**원인**: 최초 시도한 Pretendard CDN path (`@v1.3.9/dist/web/variable/woff2/...`) 404.

**해결**: 검증된 npm path 사용 — `https://cdn.jsdelivr.net/npm/pretendard@1.3.9/...`.

---

## 7. 운영 체크리스트

### 7.1 자주 쓰는 명령

```bash
# 앱 컨테이너
docker logs -f ship-check-web
cd /srv/infra/compose/idea2ship/01-ship-check && docker compose up -d --build

# Caddy
docker logs -f infra-caddy
docker exec infra-caddy caddy reload --config /etc/caddy/Caddyfile

# 로컬 dev (VSCode forwarded :3000)
cd /srv/web/idea2ship/01-ship-check && pnpm dev

# 타입 검증
pnpm typecheck

# Cloudflare 사용량
./scripts/cf-usage.sh
```

### 7.2 환경변수 (`.env.local`)

```env
GROQ_API_KEY=
GROQ_MODEL=                # 선택, default llama-3.3-70b-versatile
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY= # secret/service_role, 서버 전용
CF_ACCOUNT_ID=
CF_API_TOKEN=              # Workers AI Read 권한
CF_ANALYTICS_TOKEN=        # 선택
```

`chmod 600` 필수. `.gitignore`에 이미 포함됨.

### 7.3 Supabase 마이그레이션 SQL

`supabase/schema.sql` 멱등 작성. 새 컬럼 추가할 때마다 Dashboard SQL Editor에서 한 번 실행. 현재까지 3개 마이그레이션:
1. 초기 wide-row 스키마
2. concept image + ship-type 컬럼군
3. `refined_success_metric` 컬럼

---

## 8. 미해결 / 다음 단계 후보

- [ ] Cloudflare 사용량 자동 모니터링 (cron + Slack/이메일 알림)
- [ ] 인스타 캐러셀/릴스 컨텐츠 (marketing/ 디렉토리 참고)
- [ ] favicon 교체 (현재 Next.js 기본)
- [ ] 404 페이지 커스터마이즈
- [ ] 컨셉 이미지를 Supabase Storage로 영구화 (현재 in-memory LRU)
- [ ] LLM 응답 캐싱 (같은 idea/successCriteria → 같은 결과)
- [ ] `infra-nginx` 컨테이너 완전 제거 (현재 down 상태로 보존 중)

---

## 9. 디자인 원칙 — 이번 작업에서 굳어진 것들

1. **Caddy 자동 HTTPS는 강력하지만 cert 못 받으면 사이트 다운**. dual-block 패턴이 안전망.
2. **상대 URL 저장 금지 (서버 측 fetch가 필요한 곳에선)** — 항상 절대 URL로 정규화.
3. **이모지/특수문자는 폰트가 못 받쳐주면 깨짐** — OG/이미지 생성처럼 폰트 통제가 빡빡한 곳은 inline SVG.
4. **UI 비동기 도착은 한 덩어리로** — 데이터 + 이미지 둘 다 준비된 후에 노출. 부분 로딩은 UX 깨짐.
5. **서버 캐시는 메모리 우선, 영속화는 필요해질 때만** — 200 entries × 150KB ≈ 30MB는 충분히 작아서 in-memory가 정답.
6. **Server Component / Client Component 경계** — Server에서 Client에 함수 prop 못 보냄. 인터랙티브 부분은 작은 'use client' wrapper로.
