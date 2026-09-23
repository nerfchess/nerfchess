// The pre-paint stamp (brief section 4, F002 and F008).
//
// Settings live in localStorage (dc:settings-v1), so the server cannot know
// them, and SettingsBootstrap used to apply them in an effect after
// hydration: a light-theme player watched the whole page repaint from dark,
// data-anim arrived after the first animations had already started, and the
// match rail snapped to its saved width. This builds a small synchronous
// script for <head> that stamps the same attributes and custom properties on
// <html> before the first paint, so hydration finds the page already right.
//
// The data tables are embedded from settings.ts at build time, and the logic
// mirrors normalizeSettings + applyBoardColors + applyPieceColors +
// applyUiPrefs for the keys that shape the page. scripts/check-prepaint.ts
// runs this script and the TypeScript path against the same stored blobs and
// fails on any difference, so the two cannot drift apart silently.
//
// The script must never throw (a broken stamp must not break the page), so
// the whole body is one try/catch, and it touches nothing but <html>.

import {
  BOARD_THEMES,
  DEFAULT_SETTINGS,
  PIECE_ANIM_MAX_MS,
  PIECE_COLORS,
  PIECE_THEMES,
  SITE_THEMES,
  CUSTOM_BG_DATA_MAX,
  CUSTOM_BG_URL_MAX,
  LEGACY_PIECE_COLOR_THEMES,
  LEGACY_SITE_THEMES,
} from "@/lib/settings";
import { RAIL_WIDTH_KEY, RAIL_WIDTH_MAX, RAIL_WIDTH_MIN } from "@/lib/session/railWidth";

const DATA = {
  d: {
    boardTheme: DEFAULT_SETTINGS.boardTheme,
    pieceTheme: DEFAULT_SETTINGS.pieceTheme,
    pieceColor: DEFAULT_SETTINGS.pieceColor,
    boardSize: DEFAULT_SETTINGS.boardSize,
    siteTheme: DEFAULT_SETTINGS.siteTheme,
    animationSpeed: DEFAULT_SETTINGS.animationSpeed,
    pieceAnimMs: DEFAULT_SETTINGS.pieceAnimMs,
    fxDuration: DEFAULT_SETTINGS.fxDuration,
    customBgDim: DEFAULT_SETTINGS.customBgDim,
  },
  animMax: PIECE_ANIM_MAX_MS,
  bgUrlMax: CUSTOM_BG_URL_MAX,
  bgDataMax: CUSTOM_BG_DATA_MAX,
  boards: Object.fromEntries(Object.entries(BOARD_THEMES).map(([k, v]) => [k, [v.light, v.dark]])),
  pieces: Object.fromEntries(
    Object.entries(PIECE_THEMES).map(([k, v]) => [k, [v.wFill, v.wStroke, v.bFill, v.bStroke, v.assetSet ?? ""]]),
  ),
  colors: Object.fromEntries(
    Object.entries(PIECE_COLORS).map(([k, v]) => [k, [v.wFill, v.wStroke, v.bFill, v.bStroke]]),
  ),
  themes: Object.fromEntries(
    Object.entries(SITE_THEMES).map(([k, v]) => [
      k,
      [v.scheme, v.accent.accent, v.accent.accentHi, v.accent.rgb, v.accent.rgbHi, v.accent.rgbDim],
    ]),
  ),
  legacyThemes: LEGACY_SITE_THEMES,
  legacyColors: LEGACY_PIECE_COLOR_THEMES,
  rail: [RAIL_WIDTH_KEY, RAIL_WIDTH_MIN, RAIL_WIDTH_MAX],
};

// Plain ES5-ish JavaScript: it runs before any bundle, in every browser the
// site supports. `D` is the data above; `h` is <html>; `s` its style.
const BODY = `
var h=document.documentElement,s=h.style,d=D.d,p={};
var own=function(m,k){return typeof k==="string"&&Object.prototype.hasOwnProperty.call(m,k);};
var num=function(v){return typeof v==="number"&&isFinite(v);};
var mm=function(q){try{return !!(window.matchMedia&&window.matchMedia(q).matches);}catch(e){return false;}};
try{var raw=localStorage.getItem("dc:settings-v1");if(raw){var j=JSON.parse(raw);if(j&&typeof j==="object"&&!Array.isArray(j))p=j;}}catch(e){}
var board=own(D.boards,p.boardTheme)?p.boardTheme:d.boardTheme;
var piece=own(D.pieces,p.pieceTheme)?p.pieceTheme:own(D.legacyColors,p.pieceTheme)?"classic":d.pieceTheme;
var color=own(D.colors,p.pieceColor)?p.pieceColor:own(D.legacyColors,p.pieceTheme)?D.legacyColors[p.pieceTheme]:d.pieceColor;
var size=typeof p.boardSize==="number"?Math.max(0.8,Math.min(1.1,p.boardSize)):d.boardSize;
var theme=typeof p.siteTheme!=="string"?d.siteTheme:own(D.themes,p.siteTheme)?p.siteTheme:own(D.legacyThemes,p.siteTheme)?D.legacyThemes[p.siteTheme]:d.siteTheme;
var speed=p.animationSpeed==="off"||p.animationSpeed==="fast"||p.animationSpeed==="normal"?p.animationSpeed:d.animationSpeed;
var glide=num(p.pieceAnimMs)?Math.max(0,Math.min(D.animMax,Math.round(p.pieceAnimMs))):d.pieceAnimMs;
var fx=num(p.fxDuration)?Math.max(0.5,Math.min(2,p.fxDuration)):d.fxDuration;
var dim=num(p.customBgDim)?Math.max(0,Math.min(0.6,p.customBgDim)):d.customBgDim;
var b=D.boards[board]||D.boards.brown;
s.setProperty("--sq-light",b[0]);s.setProperty("--sq-dark",b[1]);
var pd=D.pieces[piece]||D.pieces.lichessCburnett,pf=pd[4]?pd:(D.colors[color]||D.colors.classic);
s.setProperty("--piece-w-fill",pf[0]);s.setProperty("--piece-w-stroke",pf[1]);s.setProperty("--piece-b-fill",pf[2]);s.setProperty("--piece-b-stroke",pf[3]);
if(pd[4]){h.dataset.pieceSource="lichess";var cs=["w","b"],ts=["k","q","r","b","n","p"];for(var i=0;i<2;i++)for(var k=0;k<6;k++)s.setProperty("--piece-"+cs[i]+ts[k]+"-image",'url("/piece/lichess/'+pd[4]+"/"+cs[i]+ts[k].toUpperCase()+'.svg")');}else h.dataset.pieceSource="inline";
s.setProperty("--board-cap",Math.round(720*size)+"px");
s.setProperty("--piece-fit",p.largerPieces===true?"97%":"88%");
h.dataset.theme=theme==="system"?(mm("(prefers-color-scheme: light)")?"light":"dark"):theme;
var t=D.themes[h.dataset.theme],scheme=t?t[0]:"dark";
s.colorScheme=scheme;
if(scheme==="light")h.dataset.light="on";else delete h.dataset.light;
var a=t||D.themes.dark;
s.setProperty("--accent",a[1]);s.setProperty("--accent-hi",a[2]);s.setProperty("--gold",a[1]);s.setProperty("--gold-leaf",a[2]);
s.setProperty("--accent-rgb",a[3]);s.setProperty("--accent-hi-rgb",a[4]);s.setProperty("--accent-dim-rgb",a[5]);
var held=p.reducedMotion===true||(p.followSystemMotion===true&&mm("(prefers-reduced-motion: reduce)"));
h.dataset.anim=held?"off":speed;
s.setProperty("--piece-anim-ms",String(held||speed==="off"?0:glide));
if(p.zenMode===true)h.dataset.zen="on";else delete h.dataset.zen;
s.setProperty("--fx-dur",String(fx));
var bd=typeof p.customBgData==="string"&&p.customBgData&&p.customBgData.length<=D.bgDataMax&&/^data:image\\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.customBgData)?p.customBgData:"";
var bu="";if(typeof p.customBgUrl==="string"){var u=p.customBgUrl.trim();if(u&&u.length<=D.bgUrlMax&&/^https?:\\/\\//i.test(u)&&!/[\\s"'\\\\<>()]/.test(u))bu=u;}
var bg=bd||bu;
if(bg){h.dataset.customBg="on";s.setProperty("--custom-bg-url",'url("'+bg+'")');s.setProperty("--custom-bg-dim",String(dim));}
else{delete h.dataset.customBg;s.removeProperty("--custom-bg-url");s.removeProperty("--custom-bg-dim");}
try{var rw=Number(localStorage.getItem(D.rail[0]));if(isFinite(rw)&&rw>0)s.setProperty("--match-rail-w",Math.min(D.rail[2],Math.max(D.rail[1],Math.round(rw)))+"px");}catch(e){}
`;

/** The inline <head> script. Safe to embed: the data is our own constants,
 *  and `<` is escaped so no value can close the script element. */
export const PRE_PAINT_SCRIPT = `(function(){try{var D=${JSON.stringify(DATA).replace(/</g, "\\u003c")};${BODY.trim()}}catch(e){}})();`;
