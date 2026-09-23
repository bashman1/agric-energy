// The browser half of RichTextEditor. Only ever reached through the
// ssr:false dynamic import in RichTextEditor.tsx.
"use client";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Autoformat,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  Italic,
  Link,
  List,
  Paragraph,
  Underline,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import type { RichTextEditorProps } from "./RichTextEditor";

export default function RichTextEditorClient({
  id,
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  return (
    <div className="rich-text-editor" id={id}>
      <CKEditor
        editor={ClassicEditor}
        data={value ?? ""}
        config={{
          // Self-hosted open-source use. CKEditor 5 has required a license
          // key since v44; "GPL" is the key for GPL-2.0+ usage. Swap it for
          // a commercial key if the Desk is ever distributed under terms
          // that are not GPL-compatible.
          licenseKey: "GPL",
          plugins: [
            Essentials,
            Paragraph,
            Heading,
            Bold,
            Italic,
            Underline,
            Link,
            List,
            BlockQuote,
            Autoformat,
          ],
          toolbar: [
            "heading",
            "|",
            "bold",
            "italic",
            "underline",
            "|",
            "bulletedList",
            "numberedList",
            "|",
            "link",
            "blockQuote",
            "|",
            "undo",
            "redo",
          ],
          // Headings start at h3: the page already owns h1 (job title) and
          // h2 (section), so an editor-authored h1 would break the outline.
          heading: {
            options: [
              { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
              { model: "heading3", view: "h3", title: "Heading", class: "ck-heading_heading3" },
              { model: "heading4", view: "h4", title: "Subheading", class: "ck-heading_heading4" },
            ],
          },
          link: {
            addTargetToExternalLinks: true,
            defaultProtocol: "https://",
          },
          placeholder,
        }}
        onChange={(_event, editor) => onChange(editor.getData())}
      />
    </div>
  );
}
