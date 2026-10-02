const h=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
const lin=c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4};
const L=([r,g,b])=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const mix=(f,b,a)=>f.map((v,i)=>v*a+b[i]*(1-a));
const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)};
for (const [n,d] of [["ice","#7ba1c0"],["brown","#b58863"],["midnight","#3a3f4b"]]) { const bg=h(d); console.log(n, cr(mix(h("#eeeed2"),bg,0.85),bg).toFixed(2), "lichess-style(opposite square):", n==="brown"?cr(h("#f0d9b5"),bg).toFixed(2):"") }
