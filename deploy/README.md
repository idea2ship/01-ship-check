# OCI 배포 가이드

`/1> Ship Check`를 본인의 Oracle Cloud (또는 Ubuntu 22.04+ VM)에 올리는 단계별 가이드.

## 인프라 전제

- Ubuntu 22.04+ VM (Oracle Ampere ARM A1 권장 — 4 OCPU/24GB, 영구 무료)
- Public IP 보유 (Reserved or Ephemeral)
- 도메인 `idea2ship.xyz`의 DNS 관리 권한
- SSH로 VM 접근 가능 (예: `ssh ubuntu@<VM_PUBLIC_IP>`)

## 디렉토리 / 파일 개요

```
deploy/
├── Caddyfile            # reverse proxy + Let's Encrypt 자동 TLS
├── ship-check.service   # systemd unit (Next.js 상시 실행)
├── setup.sh             # 첫 번째 설치 (Node + pnpm + Caddy + systemd 한 번에)
├── deploy.sh            # 매번 새 버전 배포할 때 실행
└── README.md            # (이 문서)
```

---

## 첫 배포 — 처음 한 번

### 1. OCI 콘솔에서 포트 열기

Oracle Cloud는 VCN(Virtual Cloud Network)의 Security List가 별도로 막혀있을 수 있습니다.

VM이 속한 VCN → Security Lists → Default Security List → Ingress Rules에 다음 추가:

| Source CIDR | Protocol | Destination Port |
|---|---|---|
| 0.0.0.0/0 | TCP | 80 |
| 0.0.0.0/0 | TCP | 443 |

(SSH 22번은 이미 열려있을 것)

### 2. DNS 등록

`idea2ship.xyz` DNS 관리 페이지(가비아·Cloudflare·Namecheap 등)에서:

```
Type     Name    Value                     TTL
A        01      <OCI_VM_PUBLIC_IP>        300
```

`01.idea2ship.xyz` 가 VM IP를 가리키게.

> Cloudflare를 쓴다면 **proxy 상태(주황 구름)는 OFF로** 처음 발급. Let's Encrypt 인증서 발급 후에 ON으로 바꿔도 OK.

5분 정도 후 확인:

```bash
dig +short 01.idea2ship.xyz
# → VM IP가 나와야 함
```

### 3. SSH 접속 + 코드 clone

본인 노트북에서:

```bash
# (이미 SSH 키 등록되어 있다고 가정)
ssh ubuntu@<VM_PUBLIC_IP>
```

VM 내부에서:

```bash
# GitHub SSH 키가 VM에도 있어야 함. 없으면 ssh-keygen + GitHub에 공개키 등록.
# 또는 HTTPS clone:
git clone https://github.com/idea2ship/01-ship-check.git ~/01-ship-check
cd ~/01-ship-check
```

### 4. `.env.local` 작성

```bash
cp .env.example .env.local
nano .env.local
```

본인 노트북의 `.env.local`과 동일하게 값 채우기:
- `GROQ_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`

저장 후:

```bash
chmod 600 .env.local
```

### 5. 셋업 스크립트 실행

```bash
bash deploy/setup.sh
```

이 스크립트가 한 번에 처리:
- Node 22 (nvm) 설치
- pnpm 설치
- `pnpm install --frozen-lockfile`
- `pnpm build`
- systemd unit 설치 + 활성화 (포트 3000 상시 실행)
- Caddy 설치 + Caddyfile 적용 + Let's Encrypt 인증서 자동 발급
- iptables 80/443 허용

성공 시 마지막에 `✓ Setup complete.` 출력.

### 6. 동작 확인

```bash
# VM 내부에서
curl -I http://localhost:3000              # ship-check 자체
curl -I https://01.idea2ship.xyz           # Caddy 통한 풀 흐름
```

본인 노트북 브라우저로도 https://01.idea2ship.xyz 열어서 확인.

### 7. Supabase 마이그레이션 (한 번만)

Supabase Dashboard → SQL Editor → `supabase/schema.sql` 내용 붙여넣고 Run.

스키마는 idempotent해서 여러 번 실행해도 안전.

---

## 매번 배포 — 새 버전 푸시 후

본인 노트북에서 작업 + 커밋 + push 후:

```bash
ssh ubuntu@<VM_PUBLIC_IP> 'cd ~/01-ship-check && bash deploy/deploy.sh'
```

스크립트가:
1. `git fetch && git reset --hard origin/main` — 깔끔하게 최신 main 동기화
2. lockfile 변경되었으면 `pnpm install`
3. `pnpm build`
4. systemd restart
5. localhost:3000 smoke test

총 1~3분.

## GitHub Actions 자동 배포 (선택)

매번 SSH 들어가기 귀찮으면 `.github/workflows/deploy.yml` 만들어서 main에 push → 자동 배포.

```yaml
name: Deploy to OCI
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.OCI_SSH_KEY }}
      - run: |
          ssh -o StrictHostKeyChecking=no ubuntu@${{ secrets.OCI_HOST }} \
            'cd ~/01-ship-check && bash deploy/deploy.sh'
```

GitHub Secrets에 `OCI_HOST`(IP), `OCI_SSH_KEY`(VM 접근용 개인키) 등록.

---

## 트러블슈팅

### systemctl status ship-check가 failed
```bash
sudo journalctl -u ship-check -n 50 --no-pager
```
대부분의 원인:
- `.env.local` 누락 또는 chmod 600 안 됨 → 위 4단계 다시
- Node 경로 mismatch → `deploy/ship-check.service`의 `ExecStart` 경로를 `which node`로 확인 후 수정. `setup.sh`가 자동 보정하지만 nvm 버전 변경 시 직접 손볼 것

### Caddy가 인증서 발급 실패
```bash
sudo journalctl -u caddy -n 50 --no-pager | grep -i error
```
원인:
- DNS가 아직 전파 안 됨 → `dig +short 01.idea2ship.xyz` 확인
- OCI 보안 그룹에서 80/443 안 열렸음 → 위 1단계 확인
- Cloudflare proxy가 켜져 있으면 challenge 실패 → 처음엔 OFF로

### 502 Bad Gateway
- ship-check 서비스가 죽음 → `sudo systemctl restart ship-check`
- 포트가 3000이 아님 → `.env.local`이나 systemd unit의 `PORT=` 확인

### 메모리 부족 (OCI Ampere A1 free tier에서 빌드 시)
빌드는 1~2GB RAM 쓰는데, 동시에 swap 활성화 안 되어 있으면 OOM. 한 번만 해두면 됨:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 운영 체크리스트

- [ ] DNS A 레코드 → VM IP
- [ ] OCI 보안 그룹 80/443 허용
- [ ] `.env.local` 5개 키 채워짐 + chmod 600
- [ ] Supabase 스키마 실행됨
- [ ] `setup.sh` 1회 실행
- [ ] https://01.idea2ship.xyz 200 응답
- [ ] systemd 자동 재시작 (재부팅 후 자동 기동) — `setup.sh`에서 `systemctl enable` 함
- [ ] swap 2GB 활성화 (빌드 시 OOM 방지)
- [ ] (선택) GitHub Actions deploy.yml
- [ ] (선택) Cloudflare proxy ON으로 → CDN + DDoS 보호
