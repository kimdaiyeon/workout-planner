// index.html 505~716줄에서 추출한 관절 인형 애니메이션. 전역: RIG, G, A, archetypeFor, drawFigure, playDemo
const RIG = { torso:48, neck:7, head:9, ua:26, fa:24, th:40, sh:38, foot:14, shoulderW:15, hipW:9 };
const G = 185;                      // ground y
const R = d => d*Math.PI/180;

function sidePoints(p){
  const L = RIG;
  const vec = (len,a)=>[len*Math.sin(R(a)), len*Math.cos(R(a))];      // from straight-down
  let hip;
  if(p.hip) hip = p.hip.slice();
  else { const ank = p.ankle||[100,G]; const t1=vec(L.th,p.th), s1=vec(L.sh,p.sh); hip=[ank[0]-t1[0]-s1[0], ank[1]-t1[1]-s1[1]]; }
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
  const leg=(th,sh,ft)=>{ const k=add(hip,vec(L.th,th)); const a=add(k,vec(L.sh,sh)); const f=add(a,[L.foot*Math.cos(R(ft||0)), -L.foot*Math.sin(R(ft||0))]); return {k,a,f}; };
  const sh = add(hip,[L.torso*Math.sin(R(p.t)), -L.torso*Math.cos(R(p.t))]);
  const nk = add(sh,[L.neck*Math.sin(R(p.t)), -L.neck*Math.cos(R(p.t))]);
  const hd = add(nk,[L.head*Math.sin(R(p.t)), -L.head*Math.cos(R(p.t))]);
  const arm=(ua,fa)=>{ const e=add(sh,vec(L.ua,ua)); const h=add(e,vec(L.fa,fa)); return {e,h}; };
  const legs=[leg(p.th,p.sh,p.ft)]; if(p.th2!=null) legs.push(leg(p.th2,p.sh2??p.sh,p.ft2??p.ft));
  const arms=[arm(p.ua,p.fa)]; if(p.ua2!=null) arms.push(arm(p.ua2,p.fa2??p.fa));
  return {hip, sh, nk, hd, legs, arms, view:"side"};
}
function frontPoints(p){
  const L=RIG; const cx=110;
  const hipY = p.hipY ?? (G - L.th - L.sh);
  const kn = p.kn||0;                                    // knee bend shortens leg visually
  const legLen = (L.th+L.sh)*Math.cos(R(kn/2));
  const hipYc = p.hipY ?? (G - legLen);
  const hip=[cx,hipYc];
  const shY = hipYc - L.torso;
  const arm=(side,ab,el)=>{ const s=[cx+side*L.shoulderW, shY]; const e=[s[0]+side*L.ua*Math.sin(R(ab)), s[1]+L.ua*Math.cos(R(ab))];
    const fa = ab - el*side*0 - el;                         // elbow bend folds forearm toward midline/up
    const h=[e[0]+side*L.fa*Math.sin(R(fa)), e[1]+L.fa*Math.cos(R(fa))]; return {s,e,h}; };
  const leg=(side,la)=>{ const h=[cx+side*L.hipW, hipYc]; const k=[h[0]+side*(L.th*Math.sin(R(la))+kn*0.12), h[1]+L.th*Math.cos(R(la))*Math.cos(R(kn/2))]; const a=[h[0]+side*(L.th+L.sh)*Math.sin(R(la)), G]; return {h,k,a,f:[a[0]+side*5,a[1]]}; };
  const ab=p.ab, el=p.el||0;
  return {hip, sh:[cx,shY], nk:[cx,shY-L.neck], hd:[cx,shY-L.neck-L.head], view:"front",
    arms:[arm(-1,p.abL??ab,p.elL??el), arm(1,p.abR??ab,p.elR??el)], legs:[leg(-1,p.la||0),leg(1,p.la||0)]};
}

// ── archetypes: keyframes + props ──
const A = {
  // standing lower body
  squat:{view:"side", frames:[{t:0,th:0,sh:0,ua:35,fa:175},{t:35,th:72,sh:22,ua:45,fa:175}], prop:"hands-chest"},
  hinge:{view:"side", frames:[{t:0,th:-8,sh:0,ua:0,fa:0},{t:80,th:-25,sh:-5,ua:0,fa:0}], prop:"hands"},
  slrdl:{view:"side", frames:[{t:0,th:0,sh:0,th2:0,sh2:0,ua:0,fa:0},{t:80,th:-15,sh:0,th2:-95,sh2:-95,ft2:-90,ua:0,fa:0}], prop:"hands"},
  swing:{view:"side", frames:[{t:75,th:-22,sh:-5,ua:-40,fa:-40},{t:0,th:0,sh:0,ua:90,fa:90}], prop:"hands", ease:"snap"},
  lunge:{view:"side", frames:[{t:0,th:0,sh:0,th2:0,sh2:0,ft2:0,ua:0,fa:0,ankle:[110,G]},{t:5,th:55,sh:15,th2:-40,sh2:-40,ft2:-70,ua:0,fa:0,ankle:[130,G]}], prop:"hands"},
  bulgarian:{view:"side", frames:[{t:5,th:35,sh:0,th2:-70,sh2:-150,ft2:-60,ua:0,fa:0,ankle:[110,G]},{t:10,th:80,sh:10,th2:-60,sh2:-150,ft2:-60,ua:0,fa:0,ankle:[110,G]}], prop:"hands", extra:"bench-back"},
  calf:{view:"side", frames:[{t:0,th:0,sh:0,ft:0,ua:0,fa:0,hip:[100,G-78]},{t:0,th:0,sh:0,ft:35,ua:0,fa:0,hip:[100,G-86]}], prop:"hands"},
  kickback:{view:"side", frames:[{t:20,th:5,sh:0,th2:5,sh2:0,ua:60,fa:60},{t:25,th:5,sh:0,th2:-70,sh2:-70,ua:60,fa:60}], prop:"cable-ankle-back"},
  // hip / floor
  hipthrust:{view:"side", frames:[{t:-50,th:120,sh:0,ua:-20,fa:-20,hip:[100,168]},{t:-25,th:95,sh:0,ua:-20,fa:-20,hip:[105,140]}], extra:"bench-behind", prop:"hands-hip"},
  bridge:{view:"side", frames:[{t:-90,th:130,sh:0,ua:-100,fa:-100,hip:[100,178]},{t:-60,th:110,sh:0,ua:-100,fa:-100,hip:[105,158]}]},
  pushup:{view:"side", frames:[{t:90,th:-90,sh:-90,ft:80,ua:0,fa:0,hip:[95,G-54]},{t:90,th:-90,sh:-90,ft:80,ua:-50,fa:60,hip:[95,G-32]}]},
  plank:{view:"side", frames:[{t:90,th:-90,sh:-90,ft:80,ua:0,fa:90,hip:[95,G-50]},{t:90,th:-90,sh:-90,ft:80,ua:0,fa:90,hip:[95,G-49]}]},
  pike:{view:"side", frames:[{t:125,th:5,sh:0,ua:-5,fa:-5,ankle:[60,G]},{t:130,th:10,sh:0,ua:-45,fa:45,ankle:[60,G]}]},
  floorpress:{view:"side", frames:[{t:-90,th:130,sh:0,ua:180,fa:180,hip:[100,178]},{t:-90,th:130,sh:0,ua:110,fa:190,hip:[100,178]}], prop:"hands"},
  benchpress:{view:"side", frames:[{t:-90,th:120,sh:0,ua:180,fa:180,hip:[100,158]},{t:-90,th:120,sh:0,ua:110,fa:190,hip:[100,158]}], prop:"hands", extra:"bench-under"},
  inclinepress:{view:"side", frames:[{t:-55,th:110,sh:0,ua:200,fa:200,hip:[110,165]},{t:-55,th:110,sh:0,ua:135,fa:215,hip:[110,165]}], prop:"hands", extra:"bench-incline"},
  pullover:{view:"side", frames:[{t:-90,th:130,sh:0,ua:185,fa:185,hip:[100,178]},{t:-90,th:130,sh:0,ua:235,fa:232,hip:[100,178]}], prop:"hands"},
  superman:{view:"side", frames:[{t:90,th:-90,sh:-90,ua:90,fa:90,hip:[100,180]},{t:70,th:-110,sh:-110,ua:70,fa:70,hip:[100,180]}]},
  deadbug:{view:"side", frames:[{t:-90,th:130,sh:0,ua:180,fa:180,hip:[100,178]},{t:-90,th:100,sh:100,ua:245,fa:245,hip:[100,178]}]},
  crunch:{view:"side", frames:[{t:15,th:0,sh:-90,ua:160,fa:200,hip:[100,G-40]},{t:60,th:0,sh:-90,ua:160,fa:200,hip:[100,G-40]}], prop:"cable-high"},
  legpress:{view:"side", frames:[{t:-50,th:120,sh:40,ua:-30,fa:-30,hip:[60,150]},{t:-50,th:80,sh:70,ua:-30,fa:-30,hip:[60,150]}], extra:"plate"},
  // standing upper, side
  row:{view:"side", frames:[{t:55,th:-10,sh:0,ua:5,fa:5},{t:55,th:-10,sh:0,ua:-45,fa:15}], prop:"hands"},
  seatedrow:{view:"side", frames:[{t:5,th:88,sh:80,ua:90,fa:90,hip:[80,178]},{t:0,th:88,sh:80,ua:-10,fa:60,hip:[80,178]}], prop:"cable-low"},
  lowrow:{view:"side", frames:[{t:25,th:5,sh:0,ua:75,fa:75},{t:25,th:5,sh:0,ua:-30,fa:30}], prop:"cable-low"},
  invertedrow:{view:"side", frames:[{t:-70,th:-75,sh:-70,ft:80,ua:180,fa:180,hip:[100,175]},{t:-70,th:-75,sh:-70,ft:80,ua:120,fa:210,hip:[100,150]}], extra:"bar-at-hands"},
  frontraise:{view:"side", frames:[{t:0,th:0,sh:0,ua:5,fa:5},{t:0,th:0,sh:0,ua:90,fa:90}], prop:"hands"},
  facepull:{view:"side", frames:[{t:0,th:0,sh:0,ua:85,fa:85},{t:0,th:0,sh:0,ua:60,fa:140}], prop:"cable-high"},
  straightpull:{view:"side", frames:[{t:20,th:0,sh:0,ua:140,fa:140},{t:20,th:0,sh:0,ua:15,fa:15}], prop:"cable-high"},
  rearfly:{view:"side", frames:[{t:65,th:-15,sh:0,ua:0,fa:0},{t:65,th:-15,sh:0,ua:-75,fa:-75}], prop:"hands"},
  chestpress:{view:"side", frames:[{t:5,th:15,sh:0,th2:-15,sh2:-5,ua:60,fa:130},{t:5,th:15,sh:0,th2:-15,sh2:-5,ua:90,fa:90}], prop:"cable-back"},
  hanging:{view:"side", frames:[{t:5,th:0,sh:0,ua:180,fa:180,hip:[100,120]},{t:15,th:90,sh:0,ua:180,fa:180,hip:[100,120]}], extra:"bar-at-hands"},
  // front view
  ohp:{view:"front", frames:[{ab:70,el:135},{ab:170,el:5}], prop:"hands"},
  lateral:{view:"front", frames:[{ab:8,el:10},{ab:90,el:10}], prop:"hands"},
  fly:{view:"front", frames:[{ab:95,el:15},{ab:25,el:15}], prop:"hands"},
  pullapart:{view:"front", frames:[{ab:20,el:0},{ab:90,el:0}], extra:"band-hands"},
  pulldown:{view:"front", frames:[{ab:150,el:0},{ab:60,el:110}], extra:"bar-hands"},
  pullup:{view:"front", frames:[{ab:165,el:0,hipY:120},{ab:120,el:130,hipY:80}], extra:"bar-fixed"},
  scap:{view:"front", frames:[{ab:165,el:0,hipY:120},{ab:165,el:0,hipY:112}], extra:"bar-fixed"},
  upright:{view:"front", frames:[{ab:5,el:0},{ab:80,el:120}], prop:"hands"},
  halo:{view:"front", frames:[{abL:150,elL:120,abR:150,elR:120},{abL:165,elL:90,abR:135,elR:140}], prop:"hands"},
  sidestep:{view:"front", frames:[{ab:20,el:90,la:5,kn:30},{ab:20,el:90,la:22,kn:30}], extra:"band-knees"},
  wallwalk:{view:"side", frames:[{t:125,th:5,sh:0,ua:-5,fa:-5,ankle:[60,G]},{t:160,th:20,sh:20,ua:-10,fa:-10,ankle:[46,150]}], extra:"wall"},
};

// map exercise name → archetype + prop kind
function archetypeFor(name, eq){
  const n = name;
  const has = (...k)=>k.some(x=>n.includes(x));
  let a;
  if(has("스윙")) a="swing";
  else if(has("불가리안")) a="bulgarian";
  else if(has("런지","스플릿")) a="lunge";
  else if(has("카프")) a="calf";
  else if(has("킥백")) a="kickback";
  else if(has("힙 쓰러스트")) a="hipthrust";
  else if(has("브릿지")) a="bridge";
  else if(has("사이드 스텝","어브덕션")) a="sidestep";
  else if(has("레그 프레스","레그프레스","싱글레그 프레스")) a="legpress";
  else if(has("싱글레그 RDL")) a="slrdl";
  else if(has("굿모닝","데드리프트","풀스루")) a="hinge";
  else if(has("스쿼트")) a="squat";
  else if(has("파이크")) a="pike";
  else if(has("월 워크")) a="wallwalk";
  else if(has("플랭크")) a="plank";
  else if(has("푸시업")) a="pushup";
  else if(has("풀오버")) a="pullover";
  else if(has("인클라인")) a="inclinepress";
  else if(has("벤치 프레스","스미스 벤치")) a="benchpress";
  else if(has("플로어 프레스","스퀴즈","크러시","얼터네이트","싱글암 플로어")) a="floorpress";
  else if(has("슈퍼맨","프론")) a="superman";
  else if(has("데드버그")) a="deadbug";
  else if(has("크런치")) a="crunch";
  else if(has("행잉")) a="hanging";
  else if(has("인버티드")) a="invertedrow";
  else if(has("시티드 로우")) a="seatedrow";
  else if(has("로우 로우")) a="lowrow";
  else if(has("서포티드","벤트오버 로우","원암 로우","케틀벨 로우")) a="row";
  else if(has("페이스 풀")) a="facepull";
  else if(has("스트레이트암")) a="straightpull";
  else if(has("리버스 플라이","리어델트")) a="rearfly";
  else if(has("풀어파트")) a="pullapart";
  else if(has("랫 풀다운")) a="pulldown";
  else if(has("스캐퓰러")) a="scap";
  else if(has("풀업","친업")) a="pullup";
  else if(has("업라이트")) a="upright";
  else if(has("헤일로")) a="halo";
  else if(has("레터럴")) a="lateral";
  else if(has("프론트 레이즈")) a="frontraise";
  else if(has("플라이","크로스오버","로우 투 하이")) a="fly";
  else if(has("체스트 프레스","싱글암 프레스")) a="chestpress";
  else if(has("프레스")) a="ohp";
  else a="squat";
  return a;
}

// ── drawing ──
const NS="http://www.w3.org/2000/svg";
function el(tag, attrs){ const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); return e; }
function lerpPose(a,b,u){ const o={}; for(const k in a){ const av=a[k], bv=b[k]; if(Array.isArray(av)) o[k]=av.map((v,i)=>v+(bv[i]-v)*u); else if(typeof av==="number") o[k]=av+(bv-av)*u; else o[k]=av; } return o; }
const ease = u => u<.5 ? 2*u*u : 1-Math.pow(-2*u+2,2)/2;

function drawFigure(svg, pts, opts){
  svg.innerHTML="";
  const g = el("g",{fill:"none",stroke:"var(--ink)","stroke-width":4,"stroke-linecap":"round","stroke-linejoin":"round"});
  svg.appendChild(g);
  if(opts.extra==="bar-fixed"||opts.extra==="bar-at-hands"){ const hy = pts.view==="front" ? pts.arms[0].h[1] : pts.arms[0].h[1]; const BAR = opts.extra==="bar-fixed" ? 38 : (opts.barY||38); const dy = BAR - hy; g.setAttribute("transform",`translate(0 ${dy})`); }
  const line=(a,b,attrs)=>g.appendChild(el("line",{x1:a[0],y1:a[1],x2:b[0],y2:b[1],...(attrs||{})}));
  const poly=(arr,attrs)=>g.appendChild(el("polyline",{points:arr.map(p=>p.join(",")).join(" "),...(attrs||{})}));
  // ground (outside the translated group)
  svg.insertBefore(el("line",{x1:10,y1:G,x2:210,y2:G,stroke:"var(--line)","stroke-width":2}), g);
  // extras behind
  const ex = opts.extra||"";
  if(ex==="bench-under") g.appendChild(el("rect",{x:40,y:pts.hip[1]+6,width:120,height:8,rx:2,fill:"var(--chip)",stroke:"var(--line)","stroke-width":2}));
  if(ex==="bench-behind") g.appendChild(el("rect",{x:40,y:pts.sh[1]+2,width:34,height:G-pts.sh[1]-2,fill:"var(--chip)",stroke:"var(--line)","stroke-width":2}));
  if(ex==="bench-back"){ const b=pts.legs[1]; g.appendChild(el("rect",{x:20,y:b.a[1]+2,width:30,height:G-b.a[1]-2,fill:"var(--chip)",stroke:"var(--line)","stroke-width":2})); }
  if(ex==="bench-incline") g.appendChild(el("polygon",{points:`70,${G} 70,160 128,128 138,134 86,${G}`,fill:"var(--chip)",stroke:"var(--line)","stroke-width":2}));
  if(ex==="plate"){ const a=pts.legs[0].a; g.appendChild(el("rect",{x:a[0]+4,y:a[1]-26,width:8,height:52,rx:2,fill:"var(--chip)",stroke:"var(--line)","stroke-width":2})); }
  if(ex==="wall") g.appendChild(el("line",{x1:44,y1:30,x2:44,y2:G,stroke:"var(--line)","stroke-width":3}));
  // body
  const back = pts.view==="side" && pts.legs[1]; if(back){ poly([pts.hip,back.k,back.a,back.f],{stroke:"var(--muted)"}); }
  const backArm = pts.arms[1] && pts.view==="side" ? pts.arms[1] : null; if(backArm) poly([pts.sh,backArm.e,backArm.h],{stroke:"var(--muted)"});
  if(pts.view==="front"){ for(const l of pts.legs) poly([l.h,l.k,l.a,l.f]); line(pts.legs[0].h,pts.legs[1].h); }
  else { const l=pts.legs[0]; poly([pts.hip,l.k,l.a,l.f]); }
  line(pts.hip,pts.sh); line(pts.sh,pts.nk);
  g.appendChild(el("circle",{cx:pts.hd[0],cy:pts.hd[1],r:RIG.head,fill:"var(--surface)"}));
  if(pts.view==="front"){ line(pts.arms[0].s,pts.arms[1].s); for(const a of pts.arms) poly([a.s,a.e,a.h]); }
  else { const a=pts.arms[0]; poly([pts.sh,a.e,a.h]); }
  // props
  const hands = pts.view==="front" ? pts.arms.map(a=>a.h) : [pts.arms[0].h];
  const prop = opts.prop||"";
  const hl = "var(--accent)";
  const drawWeight = h => { g.appendChild(el("rect",{x:h[0]-9,y:h[1]-3,width:18,height:6,rx:2,fill:hl,stroke:"none"})); };
  if(prop==="hands"||prop==="hands-chest"||prop==="hands-hip") hands.forEach(drawWeight);
  if(prop.startsWith("cable")){
    let anchor = prop==="cable-high" ? [205,40] : prop==="cable-low" ? [205,170] : prop==="cable-back" ? [15,60] : prop==="cable-ankle-back" ? [15,170] : [205,60];
    const target = prop==="cable-ankle-back" && pts.legs[1] ? pts.legs[1].a : hands[0];
    g.appendChild(el("line",{x1:anchor[0],y1:anchor[1],x2:target[0],y2:target[1],stroke:hl,"stroke-width":2}));
    g.appendChild(el("rect",{x:anchor[0]-4,y:20,width:8,height:G-20,fill:"var(--chip)",stroke:"var(--line)","stroke-width":2}));
    g.appendChild(el("circle",{cx:anchor[0],cy:anchor[1],r:4,fill:hl}));
  }
  if(ex==="bar-hands"||ex==="bar-fixed"||ex==="bar-at-hands"){ const y=hands[0][1]; const xs=hands.map(h=>h[0]); const x1=Math.min(...xs)-22, x2=Math.max(...xs)+22; g.appendChild(el("line",{x1,y1:y,x2,y2:y,stroke:hl,"stroke-width":4}));
    if(ex!=="bar-hands"){ g.appendChild(el("line",{x1:x1,y1:y,x2:x1,y2:y-120,stroke:"var(--line)","stroke-width":3})); g.appendChild(el("line",{x1:x2,y1:y,x2:x2,y2:y-120,stroke:"var(--line)","stroke-width":3})); }
    if(ex==="bar-hands"){ g.appendChild(el("line",{x1:110,y1:y,x2:110,y2:10,stroke:hl,"stroke-width":2})); }
  }
  if(ex==="band-hands") g.appendChild(el("line",{x1:hands[0][0],y1:hands[0][1],x2:hands[1][0],y2:hands[1][1],stroke:hl,"stroke-width":3}));
  if(ex==="band-knees"){ const k=pts.legs.map(l=>l.k); g.appendChild(el("line",{x1:k[0][0],y1:k[0][1],x2:k[1][0],y2:k[1][1],stroke:hl,"stroke-width":3})); }
}

function computePoints(arch, pose){ return arch.view==="front" ? frontPoints(pose) : sidePoints(pose); }

// play: loops A→B→A. returns stop()
function playDemo(svg, name){
  const key = archetypeFor(name); const arch = A[key];
  svg.setAttribute("viewBox","0 0 220 200");
  const [fa,fb] = arch.frames; const dur = 1800;
  let raf, t0=performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function frame(now){
    let u = ((now-t0)%dur)/dur; u = u<.5 ? u*2 : 2-u*2;      // 0→1→0
    u = ease(u);
    const pose = lerpPose(fa,fb,u);
    drawFigure(svg, computePoints(arch,pose), arch);
    if(!reduce) raf = requestAnimationFrame(frame);
  }
  frame(t0);
  return ()=>cancelAnimationFrame(raf);
}


