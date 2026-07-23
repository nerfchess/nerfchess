import { chromium } from 'playwright';
const base='http://localhost:3000';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:1100}});
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto(base+'/dev/lab',{waitUntil:'networkidle',timeout:60000});
await p.waitForTimeout(1500);
const dir='/tmp/claude-0/-home-user-nerfchess/b8f01bb4-9594-5db0-a7df-64db5708fb65/scratchpad/';

async function useCard(id, shot){
  await p.getByRole('button',{name:'Reset game'}).click(); await p.waitForTimeout(150);
  await p.locator('input[placeholder^="fuzzy"]').fill(id);
  await p.waitForTimeout(250);
  const li=p.locator('section:has-text("Card browser") ul li button').first();
  const label=(await li.textContent()||'').replace(/\s+/g,' ').trim();
  await li.click(); await p.waitForTimeout(120);
  await p.getByRole('button',{name:'Grant to White'}).click();
  await p.waitForTimeout(200);
  // click Use in White holds
  const use=p.locator('section:has-text("Sandbox game") button', {hasText:'Use'}).first();
  if(await use.count()===0){console.log(label.slice(0,26).padEnd(28),'no Use btn (not activated?)');return;}
  await use.click();
  await p.waitForTimeout(200);
  // find candidate pick squares on the board: they have a highlight. Click via board grid.
  // Board root: the square container. Get its rect.
  const boardBox = await p.evaluate(()=>{
    // pick-square highlighted cells: look for ring/gold highlight class or role
    const btns=[...document.querySelectorAll('button, div')].filter(d=>{const r=d.getBoundingClientRect();return r.width>40&&r.width<70&&Math.abs(r.width-r.height)<6;});
    // board container = parent of these cells
    const parent = btns[0]?btns[0].parentElement.getBoundingClientRect():null;
    return parent?{x:parent.x,y:parent.y,w:parent.width}:null;
  });
  // click through candidate squares until targeting clears
  let cleared=false;
  const cell = boardBox? boardBox.w/8 : 60;
  outer:
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const stillTargeting = await p.locator('text=Targeting:').count();
    if(stillTargeting===0){cleared=true;break outer;}
    if(!boardBox) break;
    const x=boardBox.x+(c+0.5)*cell, y=boardBox.y+(r+0.5)*cell;
    await p.mouse.click(x,y);
    await p.waitForTimeout(60);
  }
  // now sample
  if(shot) await p.screenshot({path:dir+shot, clip:{x:400,y:160,width:520,height:520}});
  let poof=0,bws=0,gsig=0,det=0;
  for(let t=0;t<14;t++){
    const s=await p.evaluate(()=>({
      poof:document.querySelectorAll('.fx-poof-ring, .fx-poof-dot').length,
      bws:document.querySelectorAll('[class*="1400%"]').length,
      gsig:document.querySelectorAll('.gsig-lead-bloom, .gsig-lead-band, .gsig-lead-orbit, .gsig-lead-rain, .gsig-lead-rise').length,
    }));
    poof=Math.max(poof,s.poof);bws=Math.max(bws,s.bws);gsig=Math.max(gsig,s.gsig);
    await p.waitForTimeout(85);
  }
  console.log(label.slice(0,26).padEnd(28),`cleared=${cleared} poof=${poof} bespokeLead=${bws} genLead=${gsig}`);
}
await useCard('summon_knight','p_use_summonknight.png');
await useCard('phantom_rook','p_use_phantomrook.png');
await useCard('double_queen','p_use_doublequeen.png');
await useCard('promote_now',null);
await useCard('queen_storm','p_use_queenstorm.png');
await b.close();
