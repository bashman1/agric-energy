import { shellSlugParams } from "@/lib/routing/shell";
import ThemeDetailClient from "./ThemeDetailClient";

interface Props { params: Promise<{ slug: string }> }

/**
 * One exported shell rather than one file per slug. The real slug is read
 * from the URL at runtime, so a record approved after the build is reachable
 * immediately and the build needs no database. See lib/routing/shell.ts.
 */
export function generateStaticParams() {
  return shellSlugParams();
}

export default async function ThemeDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ThemeDetailClient slug={slug} />;
}
