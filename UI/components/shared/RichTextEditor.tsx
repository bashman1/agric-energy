// CKEditor 5, wired for the long-form job/vacancy fields.
//
// Loaded through next/dynamic with ssr:false because CKEditor touches
// `window` at module scope: importing it from a server-rendered module
// breaks both `next build` and the static export.
//
// The editor stores HTML. Nothing here is trusted on the way out —
// lib/html/sanitize.ts cleans it before any page renders it, and the API
// sanitizes again on write.
"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("./RichTextEditorClient"), {
  ssr: false,
  // Matches the textarea it replaces so the form does not jump on load.
  loading: () => (
    <div className="w-full rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-400 min-h-[180px] flex items-center">
      Loading editor…
    </div>
  ),
});

export interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichTextEditor(props: RichTextEditorProps) {
  return <Editor {...props} />;
}
