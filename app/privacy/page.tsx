import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Privacy Note — /1> Ship Check',
  description: 'Ship Check는 계정 가입 없이 사용할 수 있습니다.',
};

export default function PrivacyPage() {
  return (
    <main className="relative flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="rounded-[28px] border border-white/65 bg-white/80 p-6 shadow-soft backdrop-blur-md sm:p-9">
          <p className="mb-2 font-mono text-xs tracking-tight text-mint-strong">
            /1&gt; Ship Check
          </p>
          <h1 className="mb-7 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Privacy Note
          </h1>

          <div className="space-y-7 text-sm leading-relaxed text-ink/85">
            <p className="text-base text-ink">
              Ship Check는 계정 가입 없이 사용할 수 있습니다.
            </p>

            <section>
              <h2 className="mb-2 text-base font-semibold text-ink">
                수집하는 정보
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-ink/75">
                <li>사용자가 입력한 아이디어</li>
                <li>성공 기준</li>
                <li>AI 평가 결과</li>
                <li>생성 시각</li>
              </ul>
              <p className="mt-2 text-xs text-ink/55">
                위 항목은 사용자가 저장에 동의한 경우에만 저장됩니다. 동의하지
                않으면 어떤 항목도 저장되지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-ink">
                수집하지 않는 정보
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-ink/75">
                <li>이름</li>
                <li>이메일</li>
                <li>전화번호</li>
                <li>로그인 계정</li>
                <li>위치 정보</li>
                <li>IP 주소, 브라우저 식별자 등 개인을 식별할 수 있는 메타데이터</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-ink">
                이용 목적
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-ink/75">
                <li>아이디어 평가 결과 제공</li>
                <li>사용자가 선택 동의한 경우 서비스 개선</li>
                <li>
                  사용자가 <strong className="font-semibold">동의하고 공유하기</strong>{' '}
                  버튼을 누른 경우에 한해 익명 콘텐츠 예시 활용
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-ink">
                저장 / 공유 버튼 차이
              </h2>
              <ul className="space-y-2 pl-0">
                <li className="rounded-xl bg-ink/[0.04] px-3 py-2">
                  <strong className="font-semibold text-ink">저장하기</strong>:
                  익명으로 결과만 보관 + 공유 링크 생성. 콘텐츠 예시 활용에는
                  동의하지 <strong>않음</strong>.
                </li>
                <li className="rounded-xl bg-mint-soft/60 px-3 py-2">
                  <strong className="font-semibold text-ink">
                    동의하고 공유하기
                  </strong>
                  : 위와 동일 + 추후 idea2ship 콘텐츠 예시(인스타·블로그 등)로
                  익명 처리해서 사용해도 OK.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-ink">
                공유 링크
              </h2>
              <p className="text-ink/75">
                저장하면 결과를 다시 볼 수 있는 비공개 URL이{' '}
                <code className="rounded bg-ink/[0.06] px-1 font-mono text-xs">
                  /r/&lt;고유ID&gt;
                </code>{' '}
                형태로 생성됩니다. 이 링크는 검색 엔진에 노출되지 않으며,
                추측이 사실상 불가능한 UUID로 만들어집니다. 링크를 가진 사람만
                결과를 열람할 수 있고, 본인이 직접 공유하지 않으면 외부에
                노출되지 않습니다.
              </p>
              <p className="mt-2 text-ink/75">
                링크 페이지에는 입력하신 아이디어 본문, 성공 기준, AI 평가
                결과가 표시됩니다. 이름·이메일·로그인 정보 등 본인을 식별할 수
                있는 정보는 포함되지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-ink">
                보유 기간
              </h2>
              <p className="text-ink/75">
                선택 저장 데이터는 최대 6개월 보관 후 삭제하는 것을 원칙으로
                합니다.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-ink">주의</h2>
              <p className="text-ink/75">
                개인정보, 민감정보, 공개되지 않은 사업상 기밀은 입력하지
                마세요.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-ink/10 pt-5 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-xs tracking-tight text-ink/65 transition hover:text-ink"
            >
              <span aria-hidden>←</span>
              <span>back to /1&gt; Ship Check</span>
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
