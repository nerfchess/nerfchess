// Machado 2009 severity 1.0 matrices (linear RGB)
const M={protan:[[0.152286,1.052583,-0.204868],[0.114503,0.786281,0.099216],[-0.003882,-0.048116,1.051998]],
deutan:[[0.367322,0.860646,-0.227968],[0.280085,0.672501,0.047413],[-0.011820,0.042940,0.968881]],
tritan:[[1.255528,-0.076749,-0.178779],[-0.078411,0.930809,0.147602],[0.004733,0.691367,0.303900]]};
const hex=h=>[0,2,4].map(i=>parseInt(h.slice(1+i,3+i),16)/255);
const lin=v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4, unlin=v=>v<=0.0031308?12.92*v:1.055*v**(1/2.4)-0.055;
function sim(c,m){const l=c.map(lin);return m.map(r=>Math.min(1,Math.max(0,unlin(r[0]*l[0]+r[1]*l[1]+r[2]*l[2]))));}
function lab(c){const l=c.map(lin);let x=(0.4124*l[0]+0.3576*l[1]+0.1805*l[2])/0.95047,y=0.2126*l[0]+0.7152*l[1]+0.0722*l[2],z=(0.0193*l[0]+0.1192*l[1]+0.9505*l[2])/1.08883;const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;return [116*f(y)-16,500*(f(x)-f(y)),200*(f(y)-f(z))];}
const dE=(a,b)=>{const A=lab(a),B=lab(b);return Math.hypot(A[0]-B[0],A[1]-B[1],A[2]-B[2]).toFixed(1)};
const S={frozen:"#7dd3fc",restricted:"#b4b4bc",muzzled:"#fb923c",blind:"#a78bfa",slowed:"#d4b06a",shielded:"#86efac",empowered:"#fcd34d",warded:"#5eead4",barred:"#f87171",doomed:"#c084fc",trap:"#f59e0b"};
const pairs=[["barred","warded"],["muzzled","trap"],["slowed","empowered"],["frozen","warded"],["shielded","warded"],["blind","doomed"],["muzzled","barred"],["trap","slowed"]];
for(const [a,b] of pairs){const r=[`${a}/${b}`,"normal",dE(hex(S[a]),hex(S[b]))];for(const k of Object.keys(M))r.push(k,dE(sim(hex(S[a]),M[k]),sim(hex(S[b]),M[k])));console.log(r.join(" "));}
// all pairs under deutan with dE<10
const ks=Object.keys(S);const low=[];for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++)for(const k of Object.keys(M)){const d=+dE(sim(hex(S[ks[i]]),M[k]),sim(hex(S[ks[j]]),M[k]));if(d<12)low.push(`${ks[i]}/${ks[j]} ${k} dE=${d}`);}
console.log("pairs under 12 dE:",low.length);console.log(low.join("\n"));
