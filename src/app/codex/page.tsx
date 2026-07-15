import { CodexBrowser } from "./_components/CodexBrowser";

// The codex list is a client experience (instant search, filters, windowed
// rows, expand-in-place). All of that lives in CodexBrowser; this route file
// stays a thin server shell so the section metadata in layout.tsx applies and
// loading.tsx can cover the initial chunk load.
export default function CodexPage() {
  return <CodexBrowser />;
}
