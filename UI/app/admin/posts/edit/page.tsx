// Create/edit a Post. Client-rendered: records created after the build
// have no prerendered page, so the editor reads ?slug= at runtime.
"use client";

import { Suspense } from "react";
import { getToken } from "@/lib/auth/token";
import AdminContentForm from "@/components/admin/AdminContentForm";
import AdminEditPage from "@/components/admin/AdminEditPage";
import { getPostBySlug } from "@/lib/data/posts";
import type { Post } from "@/lib/types";

function Editor() {
  return (
    <AdminEditPage<Post>
      module="posts"
      listLabel="Posts"
      itemLabel="Post"
      load={(slug) => getPostBySlug(slug, getToken())}
      titleOf={(x) => x.title}
    >
      {({ item, mode }) => (
        <AdminContentForm module="posts" item={item} mode={mode} />
      )}
    </AdminEditPage>
  );
}

// useSearchParams needs a Suspense boundary to prerender.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}
