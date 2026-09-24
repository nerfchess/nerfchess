"use client";

// Last-resort boundary: replaces the root layout when even it throws, so it
// renders its own html and body and cannot rely on globals.css or the font
// setup (neither is loaded here). It mirrors RouteError, the body every other
// boundary uses: a caption, what failed, the digest a player can quote, Retry,
// and a way out. The colours are literal copies of the dark theme tokens
// (design-system.md section 1) because CSS variables do not resolve without
// the app stylesheet: page #161512, box #262421, border #404040, raised
// #302e2c, hover #3c3934, heading #dedede, body #c6c6c6, muted #979797,
// accent #3692e7 (hover #4a9fee). Geometry copies the live tokens too:
// --ui-roundness is 0px on a box and --btn-roundness 2px on a button, both
// inside the design-system ceiling (7px box, 3px button). No shadow, 13px
// text floor.

import { useEffect } from "react";

const CSS = `
.ge-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:8px 14px;border-radius:2px;font:inherit;font-size:13px;font-weight:500;text-decoration:none;cursor:pointer;box-sizing:border-box}
.ge-btn:focus-visible{outline:2px solid #3692e7;outline-offset:2px}
.ge-primary{background:#3692e7;color:#fff;border:0}
.ge-default{background:#302e2c;color:#c6c6c6;border:1px solid #404040}
@media (hover:hover){.ge-primary:hover{background:#4a9fee}.ge-default:hover{background:#3c3934;color:#dedede}}
@media (pointer:fine){.ge-btn{min-height:40px}}
.ge-actions{margin-top:20px;display:flex;flex-direction:column;gap:8px}
@media (min-width:640px){.ge-actions{flex-direction:row}}
`;

export default function GlobalError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    // Same contract as RouteError: surface it for the console and any
    // attached reporter.
    console.error(error);
  }, [error]);

  return (
    <html lang="en" data-theme="dark">
      <head>
        <title>Something went wrong · Nerf Chess</title>
        <meta name="robots" content="noindex" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          boxSizing: "border-box",
          background: "#161512",
          color: "#c6c6c6",
          fontFamily: "'Noto Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          fontSize: "14px",
        }}
      >
        <main
          role="alert"
          style={{
            background: "#262421",
            border: "1px solid #404040",
            padding: "20px",
            maxWidth: "28rem",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: "12px", color: "#979797" }}>Something went wrong</div>
          <h1 style={{ margin: "4px 0 0", fontSize: "22px", fontWeight: 600, lineHeight: 1.25, color: "#dedede" }}>
            Nerf Chess hit an error
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "13px", lineHeight: 1.6, color: "#c6c6c6" }}>
            The site failed to load. Retry usually brings it back; if it does not, head to the lobby.
          </p>
          {error.digest && (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "12px",
                color: "#979797",
                fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              Reference {error.digest}
            </p>
          )}
          <div className="ge-actions">
            <button type="button" className="ge-btn ge-primary" onClick={retry ?? reset}>
              Retry
            </button>
            {/* A plain anchor on purpose: a hard navigation fully resets the
                crashed app tree, which a client-side Link cannot do here. */}
            <a className="ge-btn ge-default" href="/lobby">
              Back to lobby
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
