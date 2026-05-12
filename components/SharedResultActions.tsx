'use client';

import { CopyButton } from './CopyButton';

type Props = {
  markdown: string;
};

/**
 * Client-side wrapper for the action row on `/r/[id]`.
 *
 * `CopyButton` takes a `getText` callback, which is a function. Functions
 * can't be serialized across the Server → Client component boundary, so the
 * server-rendered shared result page can't pass them in directly. This thin
 * wrapper is a Client Component, so the arrow functions live entirely on
 * the client and never need to cross the boundary.
 */
export function SharedResultActions({ markdown }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton
        getText={() => markdown}
        label="결과 복사"
        copiedLabel="복사 완료!"
      />
      <CopyButton
        getText={() =>
          typeof window !== 'undefined' ? window.location.href : ''
        }
        label="링크 복사"
        copiedLabel="복사 완료!"
      />
    </div>
  );
}
