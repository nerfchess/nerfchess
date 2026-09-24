// Where a sign-in flow may send the browser afterwards.
//
// A `next` value comes from the query string (or from a cookie that copied
// it), so it is attacker-controlled. Prefix checks like
// `startsWith("/") && !startsWith("//")` are not enough: browsers treat a
// backslash as a slash in http(s) URLs, so "/\evil.com" resolves to
// https://evil.com/. The only reliable test is to resolve the value the way
// the browser will and compare origins. What comes back is always a path on
// this site (pathname + search + hash), never an absolute URL.

const BASE = "https://nerfchess.invalid";

export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return fallback;
  // Only site-relative paths are accepted as input. Control characters are
  // refused outright: the URL parser strips tabs and newlines, which is how
  // "/\t/evil.com" style tricks smuggle a second slash in.
  if (!next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  const path = url.pathname + url.search + url.hash;
  // A path that still starts with two slashes would be read as
  // protocol-relative wherever it is used as a Location or href.
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}
