// Email templates (brief 17.4): the welcome email and the founders' daily
// report. Each render returns a subject, an HTML part and a plain-text part.
//
// The HTML is a single-column table layout with inline styles (what every
// client understands), no images, and colours taken from the site's own tokens
// in globals.css: light theme by default, with a prefers-color-scheme block
// (Apple Mail, iOS, Outlook for Mac) and the Outlook.com [data-ogsc] hook
// switching to the dark theme. Clients that ignore both still get a readable
// light email, and clients that force-invert (Gmail apps) have nothing to break
// because there are no images or background-painted text. Boxes use the 7px
// radius, the button the 3px radius, text never goes below 13px.

export type Palette = {
  page: string;
  panel: string;
  border: string;
  text: string;
  heading: string;
  muted: string;
  accent: string;
  onAccent: string;
};

// Light theme tokens (globals.css html[data-theme="light"], site hue 37deg).
export const LIGHT: Palette = {
  page: "#edebe9", // --bg-base hsl(37 10% 92%)
  panel: "#ffffff", // --bg-panel
  border: "#d9d9d9", // --border-subtle hsl(0 0% 85%)
  text: "#3d3d3d", // --text-primary
  heading: "#232323", // --text-heading
  muted: "#666666", // --text-secondary
  accent: "#3692e7", // --accent-gold
  onAccent: "#ffffff", // --text-on-accent
};

// Dark theme tokens (globals.css :root).
export const DARK: Palette = {
  page: "#161512", // --bg-base hsl(37 10% 8%)
  panel: "#262421", // --bg-panel hsl(37 7% 14%)
  border: "#404040", // --border-subtle hsl(0 0% 25%)
  text: "#c6c6c6",
  heading: "#dedede",
  muted: "#979797",
  accent: "#3692e7",
  onAccent: "#ffffff",
};

export type RenderedEmail = { subject: string; html: string; text: string };

export type Footer = {
  /** Why the reader got this email (CASL: identify the relationship). */
  reason: string;
  /** Sender's mailing address (CASL). Required for anything sent to a player. */
  mailingAddress: string;
  /** Contact email or page shown next to the address. */
  contact: string;
  /** Signed one-click unsubscribe link, when the email goes to a player. */
  unsubscribeUrl?: string;
  settingsUrl?: string;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT = "'Noto Sans', -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function darkCss(): string {
  const d = DARK;
  const rules = (scope: string) =>
    [
      `${scope} .nc-page { background: ${d.page} !important; }`,
      `${scope} .nc-panel { background: ${d.panel} !important; border-color: ${d.border} !important; }`,
      `${scope} .nc-text { color: ${d.text} !important; }`,
      `${scope} .nc-heading { color: ${d.heading} !important; }`,
      `${scope} .nc-muted { color: ${d.muted} !important; }`,
      `${scope} .nc-rule { border-color: ${d.border} !important; }`,
    ].join("\n");
  return `@media (prefers-color-scheme: dark) {\n${rules("")}\n}\n${rules("[data-ogsc]")}`;
}

/** Wraps body rows in the shared shell: brand line, panel, footer. */
export function layout(opts: { title: string; preheader: string; bodyHtml: string; footer: Footer }): string {
  const p = LIGHT;
  const f = opts.footer;
  const unsub = f.unsubscribeUrl
    ? ` <a href="${escapeHtml(f.unsubscribeUrl)}" style="color: ${p.muted}; text-decoration: underline;" class="nc-muted">Unsubscribe</a>`
    : "";
  const settings = f.settingsUrl
    ? ` or change it in <a href="${escapeHtml(f.settingsUrl)}" style="color: ${p.muted}; text-decoration: underline;" class="nc-muted">settings</a>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(opts.title)}</title>
<style>
:root { color-scheme: light dark; supported-color-schemes: light dark; }
a { color: ${p.accent}; }
${darkCss()}
</style>
</head>
<body class="nc-page" style="margin: 0; padding: 0; background: ${p.page};">
<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="nc-page" style="background: ${p.page};">
<tr><td align="center" style="padding: 24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px;">
<tr><td class="nc-heading" style="padding: 0 4px 12px; font: 700 16px/1.4 ${FONT}; color: ${p.heading};">Nerf Chess</td></tr>
<tr><td class="nc-panel" style="background: ${p.panel}; border: 1px solid ${p.border}; border-radius: 7px; padding: 24px;">
${opts.bodyHtml}
</td></tr>
<tr><td class="nc-muted" style="padding: 16px 4px 0; font: 400 13px/1.5 ${FONT}; color: ${p.muted};">
${escapeHtml(f.reason)}${unsub ? ` Don't want these?${unsub}${settings}.` : ""}<br>
Nerf Chess, ${escapeHtml(f.mailingAddress)}. Contact: ${escapeHtml(f.contact)}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function para(html: string, extra = ""): string {
  return `<p class="nc-text" style="margin: 0 0 14px; font: 400 15px/1.55 ${FONT}; color: ${LIGHT.text};${extra}">${html}</p>`;
}

function heading(text: string): string {
  return `<h1 class="nc-heading" style="margin: 0 0 14px; font: 700 20px/1.3 ${FONT}; color: ${LIGHT.heading};">${escapeHtml(text)}</h1>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 4px 0 18px;"><tr><td style="background: ${LIGHT.accent}; border-radius: 3px;"><a href="${escapeHtml(href)}" style="display: inline-block; padding: 10px 18px; font: 600 15px/1.2 ${FONT}; color: ${LIGHT.onAccent}; text-decoration: none; border-radius: 3px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function link(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color: ${LIGHT.accent};">${escapeHtml(label)}</a>`;
}

function footerText(f: Footer): string {
  const lines = ["--", f.reason];
  if (f.unsubscribeUrl) lines.push(`Unsubscribe: ${f.unsubscribeUrl}`);
  if (f.settingsUrl) lines.push(`Email settings: ${f.settingsUrl}`);
  lines.push(`Nerf Chess, ${f.mailingAddress}. Contact: ${f.contact}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------- welcome

export type WelcomeInput = {
  username: string;
  siteUrl: string;
  footer: Footer;
};

const INTRO =
  "Nerf Chess is chess with power-ups and secret handicaps. There is no checkmate here: you win by capturing the king.";

export function renderWelcomeEmail(input: WelcomeInput): RenderedEmail {
  const site = input.siteUrl.replace(/\/$/, "");
  const firstGame = `${site}/tutorial/first-game`;
  const tutorial = `${site}/tutorial`;
  const nerf = `${site}/lobby?mode=nerf`;
  const buff = `${site}/lobby?mode=buff`;
  const name = input.username;
  const subject = "Welcome to Nerf Chess";
  const bodyHtml = [
    heading(`Welcome, ${name}`),
    para(INTRO),
    para("The quickest way in is a guided first game against the computer, with hints on drafting and using cards:"),
    button(firstGame, "Play your first game"),
    para(`Want the rules first? The ${link(tutorial, "tutorial")} walks through a draft and a game in a few minutes.`),
    para(
      `Then pick a mode. In ${link(nerf, "Nerf mode")} every player carries a secret handicap. In ${link(buff, "Buff mode")} you draft a power-up every 5 moves.`,
    ),
    para("See you on the board.", " margin-bottom: 0;"),
  ].join("\n");
  const html = layout({
    title: subject,
    preheader: "Your first game takes about five minutes. Here is where to start.",
    bodyHtml,
    footer: input.footer,
  });
  const text = [
    `Welcome, ${name}`,
    "",
    INTRO,
    "",
    `The quickest way in is a guided first game against the computer, with hints on drafting and using cards: ${firstGame}`,
    "",
    `Want the rules first? The tutorial walks through a draft and a game in a few minutes: ${tutorial}`,
    "",
    "Then pick a mode.",
    `Nerf mode, every player carries a secret handicap: ${nerf}`,
    `Buff mode, you draft a power-up every 5 moves: ${buff}`,
    "",
    "See you on the board.",
    "",
    footerText(input.footer),
  ].join("\n");
  return { subject, html, text };
}

// ---------------------------------------------------------- founders' report

export type ReportRow = { label: string; value: string | number; note?: string };

export type FounderReportInput = {
  dateLabel: string; // "2026-09-23"
  siteUrl: string;
  newSignups: { count: number; usernames: string[]; more: number };
  sections: { title: string; rows: ReportRow[] }[];
  problems: string[];
  footer: Footer;
};

export function renderFounderReport(input: FounderReportInput): RenderedEmail {
  const subject = `Nerf Chess daily report, ${input.dateLabel}`;
  const rowHtml = (r: ReportRow) =>
    `<tr><td class="nc-text nc-rule" style="padding: 6px 0; border-bottom: 1px solid ${LIGHT.border}; font: 400 14px/1.4 ${FONT}; color: ${LIGHT.text};">${escapeHtml(r.label)}${r.note ? `<br><span class="nc-muted" style="font-size: 13px; color: ${LIGHT.muted};">${escapeHtml(r.note)}</span>` : ""}</td><td class="nc-heading nc-rule" align="right" style="padding: 6px 0; border-bottom: 1px solid ${LIGHT.border}; font: 700 14px/1.4 ${FONT}; color: ${LIGHT.heading}; white-space: nowrap;">${escapeHtml(String(r.value))}</td></tr>`;
  const sections = input.sections.filter((s) => s.rows.length > 0);
  const sectionHtml = sections
    .map(
      (s) =>
        `<h2 class="nc-heading" style="margin: 18px 0 6px; font: 700 15px/1.3 ${FONT}; color: ${LIGHT.heading};">${escapeHtml(s.title)}</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${s.rows.map(rowHtml).join("")}</table>`,
    )
    .join("\n");
  const names = input.newSignups.usernames;
  const namesLine = names.length
    ? `${names.map(escapeHtml).join(", ")}${input.newSignups.more ? ` and ${input.newSignups.more} more` : ""}`
    : "None";
  const problemsHtml = input.problems.length
    ? `<ul class="nc-text" style="margin: 0; padding-left: 18px; font: 400 14px/1.5 ${FONT}; color: ${LIGHT.text};">${input.problems.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`
    : para("Nothing reported.", " margin-bottom: 0;");
  const bodyHtml = [
    heading(`Daily report, ${input.dateLabel}`),
    para(`New sign-ups in the last 24 hours: <strong>${input.newSignups.count}</strong>`),
    para(namesLine, ` font-size: 14px; color: ${LIGHT.muted};`).replace('class="nc-text"', 'class="nc-muted"'),
    sectionHtml,
    `<h2 class="nc-heading" style="margin: 18px 0 6px; font: 700 15px/1.3 ${FONT}; color: ${LIGHT.heading};">Anything that broke</h2>`,
    problemsHtml,
  ].join("\n");
  const html = layout({ title: subject, preheader: `${input.newSignups.count} new sign-ups`, bodyHtml, footer: input.footer });
  const text = [
    `Daily report, ${input.dateLabel}`,
    "",
    `New sign-ups in the last 24 hours: ${input.newSignups.count}`,
    names.length ? `  ${names.join(", ")}${input.newSignups.more ? ` and ${input.newSignups.more} more` : ""}` : "  None",
    ...sections.flatMap((s) => [
      "",
      s.title,
      ...s.rows.map((r) => `  ${r.label}: ${r.value}${r.note ? ` (${r.note})` : ""}`),
    ]),
    "",
    "Anything that broke",
    ...(input.problems.length ? input.problems.map((p) => `  - ${p}`) : ["  Nothing reported."]),
    "",
    footerText(input.footer),
  ].join("\n");
  return { subject, html, text };
}
