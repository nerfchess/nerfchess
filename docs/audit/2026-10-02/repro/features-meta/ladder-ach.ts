import { buildAchievementContext, evaluateAchievements, ACHIEVEMENTS } from "../../../../../src/lib/achievements";
const base = { winner: "w" as const, color: "w" as const, reason: "king captured", mode: "nerf" as const, draft: false, rated: true,
  myNerfId: "x", myNerfTier: 3, plies: 40, maxBuffTier: 0, myMaterial: 0, oppMaterial: 0, oppRatingBefore: 2000, unlocked: new Set<string>() };
// Player at 1995 wins and lands on ~2005: does "rating_2000" fire?
const a = evaluateAchievements(buildAchievementContext({ ...base, myRatingBefore: 1995 })).map(x=>x.id);
console.log("1995 -> win (after>=2000): rating_2000 fired?", a.includes("rating_2000"));
// Player at 2005 loses and drops to 1990: does it fire?
const b = evaluateAchievements(buildAchievementContext({ ...base, winner: "b", myRatingBefore: 2005 })).map(x=>x.id);
console.log("2005 -> loss (after<2000): rating_2000 fired?", b.includes("rating_2000"));
// Reachability: which achievements never fire across a grid of contexts?
const fired = new Set<string>();
for (const winner of ["w","b","draw",null] as const) for (const mode of ["nerf","buff"] as const) for (const draft of [true,false]) for (const rated of [true,false])
for (const tier of [0,1,4,8]) for (const plies of [2,10,40,120,300]) for (const mbt of [0,3,8]) for (const md of [-30,0,30]) for (const r of [null,1000,1500,2100]) for (const reason of ["king captured","timeout","resign","stalemate"]) {
  const ctx = buildAchievementContext({ ...base, winner, mode, draft, rated, myNerfId: tier? "x":"none", myNerfTier: tier, plies, maxBuffTier: mbt, myMaterial: md, oppMaterial: 0, myRatingBefore: r, oppRatingBefore: r==null?null:r+400, reason });
  for (const x of evaluateAchievements(ctx)) fired.add(x.id);
}
const never = ACHIEVEMENTS.filter(a=>!fired.has(a.id)).map(a=>a.id);
console.log("achievements:", ACHIEVEMENTS.length, "never fired in grid:", never.length, never.join(","));
