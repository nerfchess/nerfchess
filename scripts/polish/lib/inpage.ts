// ---------------------------------------------------------------------------
// In-page probe sources, kept as plain JavaScript strings (see common.ts for
// why: tsx's keepNames would otherwise inject a `__name` helper the page does
// not have).
//
// PROBE_INIT is installed with context.addInitScript(), so it runs before any
// page script on every navigation. It records, into window.__polish:
//
//   shifts     every layout-shift entry (buffered), with each source node
//              described as a selector plus its previous and current rect
//   loaf       long-animation-frame entries (the frame-budget offenders)
//   marks      firstPaint / FCP / DCL / load / hydrated, all as ms relative
//              to performance.timeOrigin (timeOrigin itself is exported so
//              Node can line these up with CDP screencast frame timestamps)
//   input      pointerdown / keydown / click times (so a strip knows t0)
//   raf        rAF intervals while window.__polish.rafOn is true (dropped
//              frame accounting for the strip tool)
//
// Nothing here mutates the page. It only observes.
// ---------------------------------------------------------------------------

export const PROBE_INIT = String.raw`(() => {
  if (window.__polish) return;
  var P = (window.__polish = {
    timeOrigin: performance.timeOrigin,
    shifts: [],
    loaf: [],
    marks: {},
    input: [],
    raf: [],
    rafOn: false,
  });

  function short(s, n) {
    s = (s || "").replace(/\s+/g, " ").trim();
    return s.length > n ? s.slice(0, n) + "..." : s;
  }
  function one(el) {
    if (!el || el.nodeType !== 1) return "";
    var s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    var tid = el.getAttribute("data-testid");
    if (tid) s += '[data-testid="' + tid + '"]';
    var cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean) : [];
    // Prefer semantic class names over utility soup: keep ones with a dash
    // or capital that are not obviously Tailwind utilities, then fall back.
    var sem = cls.filter(function (c) { return !/^(-?[a-z]{1,3}-|flex|grid|block|inline|hidden|relative|absolute|fixed|sticky|w-|h-|min-|max-|text-|bg-|border|rounded|shadow|font-|leading-|tracking-|items-|justify-|gap-|space-|overflow|opacity-|transition|duration-|ease-|z-|top-|left-|right-|bottom-|inset|col-|row-|order-|shrink|grow|basis|self-|place-|sm:|md:|lg:|xl:|2xl:|hover:|focus|dark:|group|peer|truncate|whitespace|break-|select-|pointer-|cursor-|sr-only|not-sr-only)/.test(c); });
    var use = (sem.length ? sem : cls).slice(0, 3);
    for (var i = 0; i < use.length; i++) s += "." + use[i].replace(/([:\[\]\/.%])/g, "\\$1");
    var role = el.getAttribute("role");
    if (role && !tid && !el.id) s += '[role="' + role + '"]';
    return s;
  }
  function describe(node) {
    var el = node && node.nodeType === 1 ? node : node && node.parentElement;
    if (!el) return { selector: "(detached)", text: "" };
    var parts = [];
    var cur = el;
    for (var d = 0; cur && cur.nodeType === 1 && d < 4; d++) {
      parts.unshift(one(cur));
      if (cur.id || cur.tagName === "BODY" || cur.tagName === "MAIN" || cur.tagName === "HEADER") break;
      cur = cur.parentElement;
    }
    return { selector: parts.join(" > "), text: short(el.textContent, 50) };
  }
  function rect(r) {
    return r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null;
  }

  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) {
        var sources = (e.sources || []).map(function (s) {
          var d = describe(s.node);
          var a = rect(s.previousRect), b = rect(s.currentRect);
          return {
            selector: d.selector,
            text: d.text,
            prev: a,
            curr: b,
            dx: a && b ? b.x - a.x : null,
            dy: a && b ? b.y - a.y : null,
            dw: a && b ? b.w - a.w : null,
            dh: a && b ? b.h - a.h : null,
          };
        });
        P.shifts.push({
          t: Math.round(e.startTime * 10) / 10,
          value: e.value,
          hadRecentInput: !!e.hadRecentInput,
          sources: sources,
        });
      });
    }).observe({ type: "layout-shift", buffered: true });
  } catch (err) {
    P.shiftError = String(err);
  }

  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) {
        P.loaf.push({
          t: Math.round(e.startTime),
          duration: Math.round(e.duration),
          blocking: Math.round(e.blockingDuration || 0),
          renderStart: Math.round(e.renderStart || 0),
          scripts: (e.scripts || [])
            .slice()
            .sort(function (a, b) { return b.duration - a.duration; })
            .slice(0, 3)
            .map(function (s) {
              return {
                duration: Math.round(s.duration),
                invoker: short(s.invoker, 80),
                source: short((s.sourceURL || "").replace(location.origin, "") + (s.sourceFunctionName ? " " + s.sourceFunctionName : ""), 120),
              };
            }),
        });
      });
    }).observe({ type: "long-animation-frame", buffered: true });
  } catch (err) {
    P.loafError = String(err);
  }

  try {
    new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) {
        if (e.name === "first-paint") P.marks.firstPaint = Math.round(e.startTime);
        if (e.name === "first-contentful-paint") P.marks.fcp = Math.round(e.startTime);
      });
    }).observe({ type: "paint", buffered: true });
  } catch (err) {}

  document.addEventListener("DOMContentLoaded", function () { P.marks.dcl = Math.round(performance.now()); }, { once: true });
  window.addEventListener("load", function () { P.marks.load = Math.round(performance.now()); }, { once: true });
  ["pointerdown", "keydown", "click"].forEach(function (type) {
    window.addEventListener(type, function (e) {
      P.input.push({ type: type, t: Math.round(e.timeStamp * 10) / 10 });
    }, { capture: true, passive: true });
  });

  // Hydration: React stamps a __reactFiber$ key on every host node it hydrates.
  // <body> is rendered by the root layout, so the key appearing on it is the
  // closest cheap signal for "the root has hydrated". Polled per frame.
  var hydrationDeadline = performance.now() + 120000;
  function hydrated() {
    var b = document.body;
    if (!b) return false;
    for (var k in b) if (k.indexOf("__reactFiber$") === 0) return true;
    return false;
  }
  // Box watch: when window.__polishWatch (an array of selectors) is set by an
  // earlier init script, every frame until settle records each matching
  // element's rect whenever it changes. This catches what layout-shift
  // entries cannot: a node that is REPLACED (unmount one chip, mount a wider
  // one) or that grows in place, which the Layout Instability API does not
  // score but a visitor still sees jump.
  P.boxes = [];
  var lastBox = {};
  function watchBoxes() {
    var sels = window.__polishWatch;
    if (!sels || !document.body) return;
    var now = Math.round(performance.now());
    for (var i = 0; i < sels.length; i++) {
      var els = document.querySelectorAll(sels[i]);
      var seen = {};
      for (var j = 0; j < els.length && j < 24; j++) {
        var el = els[j];
        var r = el.getBoundingClientRect();
        var key = sels[i] + "#" + j;
        seen[key] = 1;
        var v = Math.round(r.x) + "," + Math.round(r.y + window.scrollY) + "," + Math.round(r.width) + "," + Math.round(r.height);
        if (lastBox[key] !== v) {
          P.boxes.push({ t: now, sel: sels[i], i: j, desc: describe(el).selector, text: short(el.textContent, 40), box: v, was: lastBox[key] || null });
          lastBox[key] = v;
        }
      }
      for (var k in lastBox) {
        if (k.indexOf(sels[i] + "#") === 0 && !seen[k] && lastBox[k] !== "gone") {
          P.boxes.push({ t: now, sel: sels[i], i: Number(k.slice(sels[i].length + 1)), desc: "(removed)", text: "", box: "gone", was: lastBox[k] });
          lastBox[k] = "gone";
        }
      }
    }
  }
  var watchUntil = performance.now() + 120000;

  var last = 0;
  function frame(ts) {
    if (window.__polishWatch && performance.now() < watchUntil) watchBoxes();
    if (P.marks.hydrated === undefined && hydrated()) P.marks.hydrated = Math.round(performance.now());
    if (P.rafOn) {
      if (last) P.raf.push(Math.round((ts - last) * 10) / 10);
    }
    last = ts;
    if (
      P.rafOn ||
      (P.marks.hydrated === undefined && performance.now() < hydrationDeadline) ||
      (window.__polishWatch && performance.now() < watchUntil)
    ) {
      requestAnimationFrame(frame);
    } else {
      P.rafLoopStopped = true;
    }
  }
  requestAnimationFrame(frame);
  P.startRaf = function () {
    P.raf = [];
    P.rafOn = true;
    last = 0;
    if (P.rafLoopStopped) {
      P.rafLoopStopped = false;
      requestAnimationFrame(frame);
    }
  };
})();`;

/**
 * Evaluate in the page to snapshot the probe. Also pulls /api/* resource
 * timings, so a shift can be lined up with the fetch that caused it (the
 * auth `me` call above all).
 */
export const PROBE_READ = String.raw`(() => {
  var P = window.__polish;
  if (!P) return null;
  var nav = performance.getEntriesByType("navigation")[0];
  var api = performance
    .getEntriesByType("resource")
    .filter(function (r) { return /\/api\//.test(r.name); })
    .map(function (r) {
      return {
        url: r.name.replace(location.origin, ""),
        start: Math.round(r.startTime),
        end: Math.round(r.responseEnd),
      };
    });
  return {
    url: location.pathname + location.search,
    timeOrigin: P.timeOrigin,
    now: Math.round(performance.now()),
    marks: Object.assign({}, P.marks, nav ? { ttfb: Math.round(nav.responseStart) } : {}),
    shifts: P.shifts.slice(),
    loaf: P.loaf.slice(),
    input: P.input.slice(),
    boxes: P.boxes.slice(),
    api: api,
    errors: [P.shiftError, P.loafError].filter(Boolean),
    html: {
      theme: document.documentElement.getAttribute("data-theme"),
      anim: document.documentElement.getAttribute("data-anim"),
    },
  };
})()`;

/**
 * Returns the element under each given point in the live page, described the
 * same way the shift probe describes nodes. Used to label flash regions.
 * Call as page.evaluate(ELEMENTS_AT, points).
 */
export const ELEMENTS_AT = String.raw`(points) => points.map(function (p) {
  var el = document.elementFromPoint(p.x, p.y);
  if (!el) return null;
  var parts = [];
  var cur = el;
  for (var d = 0; cur && cur.nodeType === 1 && d < 3; d++) {
    var s = cur.tagName.toLowerCase();
    if (cur.id) s += "#" + cur.id;
    var cls = typeof cur.className === "string" ? cur.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    for (var i = 0; i < cls.length; i++) s += "." + cls[i];
    parts.unshift(s);
    if (cur.id || cur.tagName === "HEADER" || cur.tagName === "MAIN") break;
    cur = cur.parentElement;
  }
  return parts.join(" > ");
})`;
