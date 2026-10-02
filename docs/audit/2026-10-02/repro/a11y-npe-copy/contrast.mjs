function hsl(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return [f(0),f(8),f(4)].map(x=>Math.round(x*255));}
function hex(h){h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));}
function lum(c){return c.map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0);}
function cr(a,b){const x=lum(a),y=lum(b);return ((Math.max(x,y)+0.05)/(Math.min(x,y)+0.05)).toFixed(2);}
const th={dark:{base:hsl(37,10,8),panel:hsl(37,7,14),raised:hsl(37,7,18),sec:hex('#979797'),muted:hex('#8c8c8c'),accent:hex('#3692e7')},
light:{base:hsl(37,10,92),panel:[255,255,255],raised:hsl(37,10,97),sec:hex('#666666'),muted:hex('#696969'),accent:hex('#1b78d0')},
midnight:{base:hsl(218,30,8),panel:hsl(218,24,14),raised:hsl(218,20,18),sec:hex('#9aa6b8'),muted:hex('#8b96a6'),accent:hex('#4c9ff0')}};
for(const [n,t] of Object.entries(th)){for(const s of ['base','panel','raised'])console.log(n,'secondary on',s,cr(t.sec,t[s]),'muted',cr(t.muted,t[s]));console.log(n,'white on accent',cr([255,255,255],t.accent));}
