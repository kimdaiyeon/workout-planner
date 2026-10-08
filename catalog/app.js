// 운동 카탈로그: data/db.js 를 읽어 부위·장비·근육·패턴으로 검색/필터한다.
const DB = window.DB;
const by = (arr, k="code") => Object.fromEntries(arr.map(x=>[x[k], x]));
const PART = by(DB.parts), MPART = by(DB.muscle_parts), EQ = by(DB.equipment), CAT = by(DB.equipment_categories), M = by(DB.muscles);
const PAT = Object.fromEntries(DB.patterns.map(p=>[p.part+"/"+p.code, p]));
const $ = s => document.querySelector(s);

const state = { q:"", part:null, eq:new Set(), cat:new Set(), m:new Set(), pat:new Set() };
try{ Object.assign(state, JSON.parse(sessionStorage.getItem("catalog:f")||"{}"), {eq:new Set(), cat:new Set(), m:new Set(), pat:new Set()}); }catch(e){}

// ── 검색 색인: 이름 + 근육명 + 장비명 + 패턴명 ──
const index = DB.exercises.map(e => ({
  e, text: [e.name, ...e.muscles_primary.map(c=>M[c].name), ...e.muscles_secondary.map(c=>M[c].name),
            ...e.equipment.map(c=>EQ[c].name), PAT[e.part+"/"+e.pattern].name, PART[e.part].name].join(" ").toLowerCase()
}));
const norm = s => s.toLowerCase().replace(/\s+/g,"");

function matches(e, text, skip){
  if(state.q){ const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean); const t = norm(text); if(!terms.every(w=>t.includes(norm(w)))) return false; }
  if(state.part && e.part!==state.part) return false;
  if(skip!=="eq"){
    const eqOk = !state.eq.size || e.equipment.some(c=>state.eq.has(c));
    const catOk = !state.cat.size || e.equipment.some(c=>state.cat.has(EQ[c].category));
    if(!(eqOk && catOk)) return false;
  }
  if(skip!=="m" && state.m.size && !e.muscles_primary.concat(e.muscles_secondary).some(c=>state.m.has(c))) return false;
  if(skip!=="pat" && state.pat.size && !state.pat.has(e.part+"/"+e.pattern)) return false;
  return true;
}
const results = (skip) => index.filter(({e,text})=>matches(e,text,skip)).map(x=>x.e);

// ── 렌더 ──
function chip(label, pressed, count, onClick, cls){
  const b = document.createElement("button"); b.className = cls||""; b.setAttribute("aria-pressed", !!pressed);
  b.innerHTML = `${label}${count!=null?`<small>${count}</small>`:""}`; b.disabled = count===0 && !pressed; b.addEventListener("click", onClick); return b;
}
function toggle(set, v){ set.has(v) ? set.delete(v) : set.add(v); render(); }

function renderParts(){
  const box = $("#parts"); box.innerHTML="";
  const all = index.filter(({e,text})=>matches({...e, part:null}, text) ).map(x=>x.e); // 부위 제외한 나머지 필터로 센다
  box.appendChild(chip("전체", !state.part, all.length, ()=>{ state.part=null; render(); }));
  for(const p of DB.parts){ const n = all.filter(e=>e.part===p.code).length; box.appendChild(chip(p.name, state.part===p.code, n, ()=>{ state.part = state.part===p.code?null:p.code; state.pat.clear(); render(); })); }
}
function renderEqFilter(){
  const box = $("#f-eq"); box.innerHTML="";
  const pool = results("eq");
  for(const c of DB.equipment_categories){
    const items = DB.equipment.filter(q=>q.category===c.code);
    const g = document.createElement("div"); g.className="grp";
    const head = document.createElement("div"); head.className="chips";
    const n = pool.filter(e=>e.equipment.some(q=>EQ[q].category===c.code)).length;
    head.appendChild(chip(c.name, state.cat.has(c.code), n, ()=>toggle(state.cat, c.code)));
    g.appendChild(head);
    const sub = document.createElement("div"); sub.className="chips"; sub.style.marginTop="4px"; sub.style.paddingLeft="10px";
    for(const q of items){ const k = pool.filter(e=>e.equipment.includes(q.code)).length; sub.appendChild(chip(q.name, state.eq.has(q.code), k, ()=>toggle(state.eq, q.code))); }
    g.appendChild(sub); box.appendChild(g);
  }
  $("#clr-eq").hidden = !(state.eq.size||state.cat.size);
}
function renderMuscleFilter(){
  const box = $("#f-m"); box.innerHTML="";
  const pool = results("m");
  for(const p of DB.muscle_parts){
    const ms = DB.muscles.filter(m=>m.part===p.code); if(!ms.length) continue;
    const g = document.createElement("div"); g.className="grp"; g.innerHTML=`<span>${p.name}</span>`;
    const row = document.createElement("div"); row.className="chips";
    for(const m of ms){ const n = pool.filter(e=>e.muscles_primary.includes(m.code)||e.muscles_secondary.includes(m.code)).length; row.appendChild(chip(m.name, state.m.has(m.code), n, ()=>toggle(state.m, m.code))); }
    g.appendChild(row); box.appendChild(g);
  }
  $("#clr-m").hidden = !state.m.size;
}
function renderPatternFilter(){
  const box = $("#f-p"); box.innerHTML="";
  const pool = results("pat");
  const pats = DB.patterns.filter(p=>!state.part || p.part===state.part);
  for(const p of pats){ const key=p.part+"/"+p.code; const n = pool.filter(e=>e.part+"/"+e.pattern===key).length; box.appendChild(chip(state.part?p.name:`${p.name} <small>${PART[p.part].name}</small>`, state.pat.has(key), n, ()=>toggle(state.pat, key))); }
  $("#clr-p").hidden = !state.pat.size;
}
function renderActive(){
  const box = $("#active"); box.innerHTML="";
  const add = (label, fn) => { const b=document.createElement("button"); b.textContent=label; b.addEventListener("click", ()=>{fn(); render();}); box.appendChild(b); };
  for(const c of state.cat) add(CAT[c].name, ()=>state.cat.delete(c));
  for(const c of state.eq) add(EQ[c].name, ()=>state.eq.delete(c));
  for(const c of state.m) add(M[c].name, ()=>state.m.delete(c));
  for(const c of state.pat) add(PAT[c].name, ()=>state.pat.delete(c));
  if(state.q) add(`"${state.q}"`, ()=>{ state.q=""; $("#q").value=""; });
}
function renderGrid(list){
  const grid = $("#grid"); grid.innerHTML="";
  $("#count").textContent = `${list.length}개 운동`;
  if(!list.length){ grid.innerHTML = `<li class="empty">조건에 맞는 운동이 없습니다. 필터를 줄여 보세요.</li>`; return; }
  for(const e of list){
    const li = document.createElement("li");
    const b = document.createElement("button"); b.className="card"; b.addEventListener("click", ()=>openDetail(e));
    b.innerHTML = `
      <p class="nm">${e.name}</p>
      <div class="meta">${PART[e.part].name} · ${PAT[e.part+"/"+e.pattern].name} · ${e.sets}세트 × ${e.reps}${/초|회|걸음|\)/.test(e.reps)?"":"회"}</div>
      <div class="tags">${e.equipment.map(c=>`<span class="tag">${EQ[c].name}</span>`).join("")}</div>
      <div class="tags">${e.muscles_primary.map(c=>`<span class="tag m">${M[c].name}</span>`).join("")}${e.muscles_secondary.map(c=>`<span class="tag m2">${M[c].name}</span>`).join("")}</div>`;
    li.appendChild(b); grid.appendChild(li);
  }
}
function renderStats(){
  const ex = DB.exercises;
  $("#stats").innerHTML = `<span>운동 <b>${ex.length}</b></span><span>장비 <b>${DB.equipment.length}</b></span><span>근육 <b>${DB.muscles.length}</b></span><span>동작 패턴 <b>${DB.patterns.length}</b></span>`;
}
function render(){
  renderParts(); renderEqFilter(); renderMuscleFilter(); renderPatternFilter(); renderActive();
  renderGrid(results());
  try{ sessionStorage.setItem("catalog:f", JSON.stringify({q:state.q, part:state.part})); }catch(e){}
}

// ── 상세 ──
let stopDemo = null;
function openDetail(e){
  const d = $("#detail");
  const mbtn = (c, cls) => `<button class="${cls||""}" data-m="${c}">${M[c].name}</button>`;
  const ebtn = c => `<button data-eq="${c}">${EQ[c].name}<small style="color:var(--muted)"> · ${CAT[EQ[c].category].name}</small></button>`;
  const VIEW = {front:"정면", side:"측면", back:"후면", top:"상단"};
  const order = ["front","side","back","top"];
  const vids = (DB.demo_videos||[]).filter(v=>v.exercises.includes(e.id)).sort((a,b)=>order.indexOf(a.view)-order.indexOf(b.view));
  const vid = vids[0];
  const demo = vid
    ? `<video class="demo" src="../videos/${vid.file}" controls loop muted playsinline preload="metadata"></video>
       <p class="demo-cap">${vids.length>1 ? `<span class="views">${vids.map((v,i)=>`<button data-v="${i}" aria-pressed="${i===0}">${VIEW[v.view]||v.view}</button>`).join("")}</span>` : `시연 영상 · ${VIEW[vid.view]||vid.view}`}</p>`
    : `<svg class="demo" role="img" aria-label="${e.name} 동작 시연"></svg><p class="demo-cap">동작 시연 · 파란색이 기구</p>`;
  d.innerHTML = `
    <div class="top"><div><h3>${e.name}</h3><div class="meta">${PART[e.part].name} · ${PAT[e.part+"/"+e.pattern].name} · 우선순위 ${e.priority}</div></div>
      <button class="close" aria-label="닫기">×</button></div>
    <div class="cols">
      <div>
        ${demo}
        <div class="kv"><span>세트</span><span>${e.sets}세트</span><span>반복</span><span>${e.reps}</span><span>ID</span><span>${e.id}</span></div>
      </div>
      <div>
        <h4>주동근</h4><div class="rowtags">${e.muscles_primary.map(c=>mbtn(c,"m")).join("")}</div>
        <h4>협력근</h4><div class="rowtags">${e.muscles_secondary.map(c=>mbtn(c)).join("")}</div>
        <h4>장비</h4><div class="rowtags">${e.equipment.map(ebtn).join("")}</div>
        <h4>하는 법</h4><ol>${e.steps.map(s=>`<li>${s}</li>`).join("")}</ol>
        <h4>흔한 실수</h4><ul>${e.mistakes.map(s=>`<li>${s}</li>`).join("")}</ul>
      </div>
    </div>`;
  d.querySelector(".close").addEventListener("click", ()=>$("#dlg").close());
  d.querySelectorAll(".views button").forEach(b=>b.addEventListener("click", ()=>{
    const v = vids[Number(b.dataset.v)]; const el = d.querySelector("video.demo"); el.src = "../videos/"+v.file; el.play().catch(()=>{});
    d.querySelectorAll(".views button").forEach(x=>x.setAttribute("aria-pressed", x===b)); }));
  d.querySelectorAll("[data-m]").forEach(b=>b.addEventListener("click", ()=>{ state.m.clear(); state.m.add(b.dataset.m); $("#dlg").close(); render(); }));
  d.querySelectorAll("[data-eq]").forEach(b=>b.addEventListener("click", ()=>{ state.eq.clear(); state.cat.clear(); state.eq.add(b.dataset.eq); $("#dlg").close(); render(); }));
  const dlg = $("#dlg"); dlg.showModal();
  if(stopDemo) stopDemo();
  stopDemo = vid ? null : playDemo(d.querySelector("svg.demo"), e.name);
}
$("#dlg").addEventListener("close", ()=>{ if(stopDemo){ stopDemo(); stopDemo=null; } });
$("#dlg").addEventListener("click", ev=>{ if(ev.target===ev.currentTarget) ev.currentTarget.close(); });

// ── 이벤트 ──
$("#q").addEventListener("input", ev=>{ state.q = ev.target.value.trim(); render(); });
$("#clr-eq").addEventListener("click", ()=>{ state.eq.clear(); state.cat.clear(); render(); });
$("#clr-m").addEventListener("click", ()=>{ state.m.clear(); render(); });
$("#clr-p").addEventListener("click", ()=>{ state.pat.clear(); render(); });
$("#q").value = state.q;
// 딥링크: ?m=근육코드 → 근육 필터, ?ex=운동id → 상세 열기
const qs = new URLSearchParams(location.search);
if(qs.get("m") && M[qs.get("m")]){ state.q=""; state.m.add(qs.get("m")); }
renderStats(); render();
if(qs.get("ex")){ const e = DB.exercises.find(x=>String(x.id)===qs.get("ex")); if(e) openDetail(e); }
