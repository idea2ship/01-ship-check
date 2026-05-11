import type { Metadata } from 'next';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Privacy Note — /1> Ship Check',
  description: 'Ship Check는 계정 가입 없이 사용할 수 있습니다.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Header />
      <article className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="mb-2 font-mono text-xs tracking-tight text-mint">
          /1&gt; Ship Check
        </p>
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Privacy Note
        </h1>

        <div className="space-y-8 text-sm leading-relaxed text-ink">
          <p>Ship Check는 계정 가입 없이 사용할 수 있습니다.</p>

          <section>
            <h2 className="mb-2 text-base font-medium">수집하는 정보</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>사용자가 입력한 아이디어</li>
              <li>성공 기준</li>
              <li>AI 평가 결과</li>
              <li>생성 시각</li>
            </ul>
            <p className="mt-2 text-xs text-muted">
              위 항목은 사용자가 저장에 동의한 경우에만 저장됩니다. 동의하지
              않으면 어떤 항목도 저장되지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-medium">수집하지 않는 정보</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>이름</li>
              <li>이메일</li>
              <li>전화번호</li>
              <li>로그인 계정</li>
              <li>위치 정보</li>
              <li>IP 주소, 브라우저 식별자 등 개인을 식별할 수 있는 메타데이터</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-medium">이용 목적</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>아이디어 평가 결과 제공</li>
              <li>사용자가 선택 동의한 경우 서비스 개선</li>
              <li>사용자가 별도 동의한 경우 익명 콘텐츠 예시 활용</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-medium">공유 링크</h2>
            <p className="text-muted">
              저장에 동의하면 결과를 다시 볼 수 있는 비공개 URL이
              생성됩니다 (`/r/&lt;고유ID&gt;` 형태). 이 링크는 검색 엔진에
              노출되지 않으며, 추측이 사실상 불가능한 UUID로 만들어집니다.
              링크를 가진 사람만 결과를 열람할 수 있고, 본인이 직접
              공유하지 않으면 외부에 노출되지 않습니다.
            </p>
            <p className="mt-2 text-muted">
              링크 페이지에는 입력하신 아이디어 본문, 성공 기준, AI 평가
              결과가 표시됩니다. 이름·이메일·로그인 정보 등 본인을 식별할
              수 있는 정보는 포함되지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-medium">보유 기간</h2>
            <p className="text-muted">
              선택 저장 데이터는 최대 6개월 보관 후 삭제하는 것을 원칙으로
              합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-medium">주의</h2>
            <p className="text-muted">
              개인정보, 민감정보, 공개되지 않은 사업상 기밀은 입력하지
              마세요.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
