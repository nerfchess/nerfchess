import { chromium } from 'playwright';
const base='http://localhost:3000';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:1100}});
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto(base+'/dev/lab',{waitUntil:'networkidle',timeout:60000});
await p.waitForTimeout(1500);
// set mechanic filter to instant
await p.selectOption('select[title="Mechanic"]','instant');
await p.waitForTimeout(300);
const ids = await p.evaluate(()=>{
  const btns=[...document.querySelectorAll('section:has(h2) ul li button')];
  return btns.slice(0,18).map(x=>x.textContent);
});
console.log('instant cards sample:', ids.slice(0,18));
function boardWEval(){
  const cands=[...document.querySelectorAll('div')].filter(d=>{const r=d.getBoundingClientRect();return Math.abs(r.width-r.height)<8 && r.width>350 && r.width<820;});
  cands.sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width);
  return cands[0]?cands[0].getBoundingClientRect().width:0;
}
async function testNth(n){
  const li=p.locator('section:has-text("Card browser") ul li button').nth(n);
  const label=(await li.textContent())||'';
  await li.click(); await p.waitForTimeout(120);
  await p.getByRole('button',{name:'Grant to White'}).click();
  let best={maxW:0,cls:'',boardW:0,n:0};
  for(let t=0;t<16;t++){
    const s=await p.evaluate(()=>{
      const cands=[...document.querySelectorAll('div')].filter(d=>{const r=d.getBoundingClientRect();return Math.abs(r.width-r.height)<8 && r.width>350 && r.width<820;});
      cands.sort((a,b)=>b.getBoundingClientRect().width-a.getBoundingClientRect().width);
      const boardW=cands[0]?cands[0].getBoundingClientRect().width:0;
      const wide=[...document.querySelectorAll('[class*="1400%"], .gsig-root')];
      let maxW=0,cls='';for(const el of wide){const r=el.getBoundingClientRect();if(r.width>maxW){maxW=r.width;cls=(el.className||'').toString().slice(0,44);}}
      return {maxW,cls,boardW,n:wide.length};
    });
    if(s.maxW>best.maxW)best=s;
    await p.waitForTimeout(80);
  }
  const ratio=best.boardW?+(best.maxW/best.boardW).toFixed(2):null;
  console.log(label.slice(0,42).padEnd(44),`board=${Math.round(best.boardW)} maxWide=${Math.round(best.maxW)} ratio=${ratio} nWide=${best.n} ${best.cls}`);
  // reset to avoid buildup
  await p.getByRole('button',{name:'Reset game'}).click(); await p.waitForTimeout(200);
}
for(let i=0;i<12;i++){ await testNth(i).catch(e=>console.log('nth',i,'ERR',e.message)); }
await b.close();
