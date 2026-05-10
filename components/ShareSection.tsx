'use client';

import { CopyButton } from './CopyButton';

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; message: string };

type Props = {
  getMarkdown: () => string;
  allowContentUse: boolean;
  saveState: SaveState;
  onAllowContentUseChange: (value: boolean) => void;
  onSave: () => void;
};

export function ShareSection({
  getMarkdown,
  allowContentUse,
  saveState,
  onAllowContentUseChange,
  onSave,
}: Props) {
  const saveDisabled = saveState.kind === 'saving' || saveState.kind === 'saved';

  return (
    <section className="rounded-2xl border border-border-soft bg-white p-5 shadow-soft sm:p-6">
      <h3 className="mb-4 text-sm font-medium text-ink">Share result</h3>

      <div className="mb-6">
        <p className="mb-2 text-xs text-muted">
          평가 결과를 Markdown 형태로 클립보드에 복사할 수 있습니다.
        </p>
        <CopyButton getText={getMarkdown} />
      </div>

      <div className="space-y-3 border-t border-border-soft pt-5">
        <p className="text-xs text-muted">
          저장 버튼을 누르면 아이디어와 AI 평가 결과가 익명으로 보관됩니다.
          개인을 식별할 수 있는 정보는 수집하지 않습니다.
        </p>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-mint-soft/30 p-3">
          <input
            type="checkbox"
            checked={allowContentUse}
            onChange={(e) => onAllowContentUseChange(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border-soft text-mint accent-mint focus:ring-mint"
          />
          <div className="text-sm">
            <p className="text-ink">
              [선택] 콘텐츠 예시 활용에도 동의합니다
            </p>
            <p className="mt-1 text-xs text-muted">
              익명 처리된 아이디어와 평가 결과가 추후 idea2ship 콘텐츠 예시로
              활용될 수 있습니다. 공개 시 개인을 식별할 수 있는 정보는
              제거합니다.
            </p>
          </div>
        </label>

        <div className="flex flex-col-reverse items-stretch gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            {saveState.kind === 'saved'
              ? '저장 완료. 함께해 주셔서 감사합니다.'
              : '버튼 클릭 = 익명 저장 동의'}
          </p>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="rounded-2xl bg-mint px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:bg-border-soft disabled:text-muted"
          >
            {saveState.kind === 'saving'
              ? 'Saving…'
              : saveState.kind === 'saved'
                ? 'Saved'
                : 'Save anonymously'}
          </button>
        </div>

        {saveState.kind === 'error' ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
          >
            {saveState.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export type { SaveState };
