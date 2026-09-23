// ---------------------------------------------------------------------------
// test:prepaint: the pre-paint stamp must match what the app applies.
//
//   ./node_modules/.bin/tsx scripts/check-prepaint.ts
//
// src/lib/session/prePaint.ts is a hand-written copy of normalizeSettings +
// applyBoardColors + applyPieceColors + applyUiPrefs that runs in <head>
// before the first paint (F002). If the copy drifts, the page paints one
// state and SettingsBootstrap swaps it for another after hydration, which is
// exactly the flash the stamp exists to remove. This runs both paths against
// the same stored blobs (defaults, every theme, legacy ids, junk values,
// custom backgrounds, random blobs) on a fake <html> and fails on any
// attribute or custom property that differs. It also checks the rail width
// stamp and that the script survives unreadable storage.
// ---------------------------------------------------------------------------

type Store = Record<string, string>;

class FakeStyle {
  props = new Map<string, string>();
  colorScheme = "";
  setProperty(k: string, v: string) {
    this.props.set(k, v);
  }
  removeProperty(k: string) {
    this.props.delete(k);
  }
  getPropertyValue(k: string) {
    return this.props.get(k) ?? "";
  }
}

type FakeHtml = { dataset: Record<string, string>; style: FakeStyle };

function install(store: Store | "throws", media: { light: boolean; reduce: boolean }): FakeHtml {
  const html: FakeHtml = { dataset: {}, style: new FakeStyle() };
  const localStorage = {
    getItem(k: string) {
      if (store === "throws") throw new Error("blocked");
      return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
    },
    setItem(k: string, v: string) {
      if (store !== "throws") store[k] = v;
    },
  };
  const matchMedia = (q: string) => ({
    matches: q.includes("light") ? media.light : q.includes("reduce") ? media.reduce : false,
    addEventListener() {},
    removeEventListener() {},
  });
  const g = globalThis as Record<string, unknown>;
  g.document = { documentElement: html };
  g.window = { localStorage, matchMedia, dispatchEvent() {}, addEventListener() {} };
  g.localStorage = localStorage;
  g.matchMedia = matchMedia;
  return html;
}

function snapshot(html: FakeHtml) {
  const props: Record<string, string> = {};
  for (const [k, v] of [...html.style.props.entries()].sort()) props[k] = v;
  const data: Record<string, string> = {};
  for (const k of Object.keys(html.dataset).sort()) data[k] = html.dataset[k];
  return { data, props, colorScheme: html.style.colorScheme };
}

async function main() {
  // Globals must exist before settings.ts loads (it registers a callback).
  install({}, { light: false, reduce: false });
  const settings = await import("../src/lib/settings");
  const { PRE_PAINT_SCRIPT } = await import("../src/lib/session/prePaint");

  const themes = Object.keys(settings.SITE_THEMES);
  const boards = Object.keys(settings.BOARD_THEMES);
  const pieces = Object.keys(settings.PIECE_THEMES);
  const colors = Object.keys(settings.PIECE_COLORS);
  const junk = [undefined, null, "toString", "constructor", 7, true, "", "nope", -3, 99, NaN, [], {}];
  const pick = <T,>(a: readonly T[], r: () => number) => a[Math.floor(r() * a.length)];

  // Deterministic PRNG so a failure reproduces.
  let seed = 0x5eed;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const blobs: Array<{ name: string; raw: string | null }> = [
    { name: "no settings", raw: null },
    { name: "not json", raw: "{oops" },
    { name: "array", raw: "[]" },
    { name: "null", raw: "null" },
    { name: "defaults", raw: JSON.stringify(settings.DEFAULT_SETTINGS) },
  ];
  for (const t of [...themes, "sepia", "void", "frost", "toString"]) {
    blobs.push({ name: `theme ${t}`, raw: JSON.stringify({ siteTheme: t }) });
  }
  for (const p of [...pieces, "ivory", "gold", "custom"]) {
    blobs.push({ name: `pieces ${p}`, raw: JSON.stringify({ pieceTheme: p, pieceColor: "ocean" }) });
  }
  blobs.push({
    name: "custom bg url",
    raw: JSON.stringify({ customBgUrl: " https://example.com/a.png ", customBgDim: 0.9 }),
  });
  blobs.push({ name: "bad bg url", raw: JSON.stringify({ customBgUrl: 'https://x.com/a.png") ; x' }) });
  blobs.push({
    name: "bg data wins",
    raw: JSON.stringify({ customBgUrl: "https://x.com/a.png", customBgData: "data:image/png;base64,AAAA" }),
  });
  blobs.push({ name: "motion off", raw: JSON.stringify({ reducedMotion: true, pieceAnimMs: 250 }) });
  blobs.push({ name: "follow system", raw: JSON.stringify({ followSystemMotion: true }) });
  blobs.push({ name: "zen fast", raw: JSON.stringify({ zenMode: true, animationSpeed: "fast", fxDuration: 7 }) });
  for (let i = 0; i < 400; i++) {
    const b: Record<string, unknown> = {};
    const maybe = (k: string, good: () => unknown) => {
      const roll = rnd();
      if (roll < 0.45) b[k] = good();
      else if (roll < 0.6) b[k] = pick(junk, rnd);
    };
    maybe("siteTheme", () => pick([...themes, "sepia", "ember"], rnd));
    maybe("boardTheme", () => pick(boards, rnd));
    maybe("pieceTheme", () => pick([...pieces, "steel"], rnd));
    maybe("pieceColor", () => pick(colors, rnd));
    maybe("boardSize", () => 0.6 + rnd() * 0.7);
    maybe("largerPieces", () => rnd() < 0.5);
    maybe("animationSpeed", () => pick(["off", "fast", "normal"], rnd));
    maybe("pieceAnimMs", () => Math.round(rnd() * 600) - 50);
    maybe("reducedMotion", () => rnd() < 0.3);
    maybe("followSystemMotion", () => rnd() < 0.5);
    maybe("zenMode", () => rnd() < 0.5);
    maybe("fxDuration", () => rnd() * 3);
    maybe("customBgDim", () => rnd());
    maybe("customBgUrl", () => pick(["https://a.b/c.jpg", "http://x.y/z.webp", "ftp://no", "https://a b"], rnd));
    blobs.push({ name: `random ${i}`, raw: JSON.stringify(b) });
  }

  const medias = [
    { light: false, reduce: false },
    { light: true, reduce: true },
  ];
  let failures = 0;
  let cells = 0;
  const run = new Function(PRE_PAINT_SCRIPT);

  for (const blob of blobs) {
    for (const media of medias) {
      cells++;
      const store: Store = blob.raw === null ? {} : { "dc:settings-v1": blob.raw };
      const stamped = install({ ...store }, media);
      run();
      const expectedHtml = install({ ...store }, media);
      const s = settings.loadSettings();
      settings.applyBoardColors(s);
      settings.applyPieceColors(s);
      settings.applyUiPrefs(s);
      const a = JSON.stringify(snapshot(stamped));
      const b = JSON.stringify(snapshot(expectedHtml));
      if (a !== b) {
        failures++;
        if (failures <= 5) {
          console.error(`MISMATCH ${blob.name} ${JSON.stringify(media)}\n  stamp: ${a}\n  app:   ${b}`);
        }
      }
    }
  }

  // Rail width: stamped clamped, absent when unset or junk.
  const rail = (v: string | null) => {
    const html = install(v === null ? {} : { "dc:rail-width": v }, medias[0]);
    run();
    return html.style.getPropertyValue("--match-rail-w");
  };
  const railCases: Array<[string | null, string]> = [
    [null, ""],
    ["abc", ""],
    ["0", ""],
    ["300", "300px"],
    ["100", "240px"],
    ["999", "440px"],
    ["301.6", "302px"],
  ];
  for (const [v, want] of railCases) {
    cells++;
    const got = rail(v);
    if (got !== want) {
      failures++;
      console.error(`RAIL ${v}: got "${got}", want "${want}"`);
    }
  }

  // Storage that throws must not throw out of the script.
  cells++;
  const blocked = install("throws", medias[0]);
  try {
    run();
    if (blocked.dataset.theme !== "dark") throw new Error(`theme ${blocked.dataset.theme}`);
  } catch (e) {
    failures++;
    console.error(`BLOCKED STORAGE: ${(e as Error).message}`);
  }

  // The script is inlined into HTML: it must not be able to close its tag.
  cells++;
  if (/<\/script/i.test(PRE_PAINT_SCRIPT)) {
    failures++;
    console.error("script contains </script");
  }

  console.log(`[prepaint] ${cells} cases, ${failures} failures, script ${PRE_PAINT_SCRIPT.length} bytes`);
  if (failures) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
