// /login: a server page so the query string is read on the server and the
// form renders on the first paint. It used to be a client page reading
// useSearchParams inside <Suspense fallback={null}>, which prerendered an
// empty body, header included, on every hard load (F019).

import { LoginForm } from "./LoginForm";
import { oauthErrorMessage } from "./oauthErrors";
import { safeNextPath } from "@/lib/safeNext";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return (
    <LoginForm
      // Only a path on this site survives (F041: ?next=https://evil.com and
      // ?next=/\evil.com both fall back to "/").
      next={safeNextPath(first(params.next))}
      upgrading={first(params.upgrade) === "1"}
      oauthError={oauthErrorMessage(first(params.oauthError))}
    />
  );
}
