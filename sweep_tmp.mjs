import { chromium } from 'playwright';
const base='http://localhost:3000';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:1100}});
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto(base+'/dev/lab',{waitUntil:'networkidle',timeout:60000});
await p.waitForTimeout(1500);

// gather a list of card ids to test from the browser list (instant + activated, all tiers)
async function listIds(mech){
  await p.selectOption('select[title="Mechanic"]',mech);
  await p.waitForTimeout(200);
  return await p.evaluate(()=>[...document.querySelectorAll('section:has(h2) ul li button')].slice(0,60).map(x=>x.textContent.replace(/\s+/g,' ').trim()));
}
function boardRectEval(){
  const cands=[...document.querySelectorAll('div')].filter(d=>{const r=d.getBoundingClientRect();return Math.abs(r.width-r.height)<8&&r.width>350&&r.width<820;});
  cands.sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width);
  const r=cands[0]?cands[0].getBoundingClientRect():null; return r?{x:r.x,y:r.y,w:r.width}:null;
}
async function run(nth){
  await p.getByRole('button',{name:'Reset game'}).click(); await p.waitForTimeout(120);
  const li=p.locator('section:has-text("Card browser") ul li button').nth(nth);
  if(await li.count()===0) return null;
  const label=(await li.textContent()||'').replace(/\s+/g,' ').trim();
  await li.click(); await p.waitForTimeout(80);
  await p.getByRole('button',{name:'Grant to White'}).click();
  await p.waitForTimeout(150);
  // if activated, use it
  const use=p.locator('section:has-text("Sandbox game") button',{hasText:'Use'}).first();
  if(await use.count()>0){
    await use.click(); await p.waitForTimeout(150);
    const bb=await p.evaluate(boardRectEval);
    if(bb){const cell=bb.w/8;
      outer: for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        if(await p.locator('text=Targeting:').count()===0) break outer;
        await p.mouse.click(bb.x+(c+0.5)*cell,bb.y+(r+0.5)*cell); await p.waitForTimeout(45);
      }
    }
  }
  // sample
  let poof=0,bws=0,gsig=0,ratio=0;
  for(let t=0;t<12;t++){
    const s=await p.evaluate(()=>{
      const cands=[...document.querySelectorAll('div')].filter(d=>{const r=d.getBoundingClientRect();return Math.abs(r.width-r.height)<8&&r.width>350&&r.width<820;});
      cands.sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width);
      const bw=cands[0]?cands[0].getBoundingClientRect().width:480;
      const wide=[...document.querySelectorAll('[class*="1400%"], .gsig-lead-bloom,.gsig-lead-band,.gsig-lead-orbit,.gsig-lead-rain,.gsig-lead-rise, [class*="x:"]')];
      let mx=0;for(const el of document.querySelectorAll('span,div')){const r=el.getBoundingClientRect();if(r.width>mx&&r.width<20000)mx=r.width;}
      return {poof:document.querySelectorAll('.fx-poof-ring,.fx-poof-dot').length,
        bws:document.querySelectorAll('[class*="1400%"]').length,
        gsig:document.querySelectorAll('.gsig-lead-bloom,.gsig-lead-band,.gsig-lead-orbit,.gsig-lead-rain,.gsig-lead-rise').length,
        ratio:+(mx/bw).toFixed(2)};
    });
    poof=Math.max(poof,s.poof);bws=Math.max(bws,s.bws);gsig=Math.max(gsig,s.gsig);ratio=Math.max(ratio,s.ratio);
    await p.waitForTimeout(80);
  }
  return {label:label.slice(0,30),poof,bws,gsig,ratio};
}
const flags=[];
for(const mech of ['instant','activated']){
  await p.selectOption('select[title="Mechanic"]',mech); await p.waitForTimeout(200);
  const n=await p.locator('section').filter({hasText:'Card browser'}).locator('ul li button').count();
  const lim=Math.min(n,45);
  for(let i=0;i<lim;i++){
    // reselect mech each loop since reset may not change it, but list order stable
    const r=await run(i).catch(e=>({label:'ERR'+i,err:e.message}));
    if(!r)continue;
    const bespoke = r.bws>0 || r.gsig>0;
    const genericPoofOnly = r.poof>0 && !bespoke;
    const nothing = r.poof===0 && !bespoke;
    const tooBig = r.ratio>3;
    if(genericPoofOnly||nothing||tooBig){ flags.push(`[${mech}] ${r.label.padEnd(30)} poof=${r.poof} bws=${r.bws} gsig=${r.gsig} ratio=${r.ratio} ${genericPoofOnly?'POOF':''}${nothing?'MISSING':''}${tooBig?'TOOBIG':''}`); }
  }
}
console.log('=== FLAGGED ('+flags.length+') ===');
for(const f of flags) console.log(f);
await b.close();
