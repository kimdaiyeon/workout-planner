// 근육 지도: three.js 마네킹 위에 근육 26종을 타원체로 올리고, 클릭하면 운동 목록을 보여준다.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const DB = window.DB;
const M = Object.fromEntries(DB.muscles.map(m=>[m.code,m]));
const EQ = Object.fromEntries(DB.equipment.map(e=>[e.code,e]));
const PAT = Object.fromEntries(DB.patterns.map(p=>[p.part+"/"+p.code,p]));
const PART = Object.fromEntries(DB.parts.map(p=>[p.code,p]));
const MPART = Object.fromEntries(DB.muscle_parts.map(p=>[p.code,p]));
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const $ = s => document.querySelector(s);

// ── 근육 배치: [x, y, z], [sx, sy, sz], 옵션. x>0이면 좌우 대칭 복제. group: torso|arm|leg
const MUSCLES = [
  // 어깨
  {code:"delt_front",  p:[0.195,1.405,0.055], s:[0.05,0.055,0.04],  g:"arm"},
  {code:"delt_side",   p:[0.235,1.40,0],      s:[0.04,0.065,0.05],  g:"arm"},
  {code:"delt_rear",   p:[0.195,1.405,-0.055],s:[0.05,0.055,0.04],  g:"arm"},
  {code:"rotator_cuff",p:[0.15,1.37,-0.085],  s:[0.045,0.045,0.025],g:"torso"},
  {code:"trap_upper",  p:[0.10,1.455,-0.035], s:[0.10,0.035,0.03],  g:"torso", rz:-0.35},
  // 등
  {code:"lats",        p:[0.145,1.19,-0.075], s:[0.07,0.14,0.04],   g:"torso", rz:0.15},
  {code:"trap_mid",    p:[0,1.37,-0.115],     s:[0.085,0.075,0.02], g:"torso", single:true},
  {code:"rhomboids",   p:[0.065,1.30,-0.105], s:[0.045,0.06,0.025], g:"torso"},
  {code:"erectors",    p:[0.035,1.10,-0.10],  s:[0.03,0.14,0.03],   g:"torso"},
  // 가슴
  {code:"pec_upper",   p:[0.09,1.375,0.105],  s:[0.09,0.035,0.03],  g:"torso"},
  {code:"pec_mid",     p:[0.09,1.315,0.115],  s:[0.10,0.04,0.035],  g:"torso"},
  {code:"pec_lower",   p:[0.08,1.255,0.105],  s:[0.09,0.03,0.03],   g:"torso"},
  {code:"serratus",    p:[0.155,1.24,0.045],  s:[0.03,0.065,0.05],  g:"torso"},
  // 팔
  {code:"biceps",      p:[0.245,1.27,0.04],   s:[0.035,0.10,0.03],  g:"arm"},
  {code:"triceps",     p:[0.25,1.27,-0.04],   s:[0.035,0.10,0.03],  g:"arm"},
  // 하체
  {code:"quads",       p:[0.10,0.72,0.07],    s:[0.07,0.20,0.04],   g:"leg"},
  {code:"hams",        p:[0.10,0.72,-0.065],  s:[0.06,0.18,0.04],   g:"leg"},
  {code:"glute_max",   p:[0.09,0.95,-0.10],   s:[0.09,0.085,0.05],  g:"leg"},
  {code:"glute_med",   p:[0.155,1.02,-0.04],  s:[0.05,0.05,0.045],  g:"leg"},
  {code:"adductors",   p:[0.05,0.78,0.02],    s:[0.03,0.15,0.045],  g:"leg"},
  {code:"gastroc",     p:[0.10,0.36,-0.05],   s:[0.045,0.10,0.035], g:"leg"},
  {code:"soleus",      p:[0.10,0.22,-0.04],   s:[0.035,0.07,0.03],  g:"leg"},
  {code:"hip_flexors", p:[0.07,0.955,0.10],   s:[0.035,0.05,0.03],  g:"leg"},
  // 코어
  {code:"abs",         p:[0,1.12,0.115],      s:[0.07,0.12,0.03],   g:"torso", single:true},
  {code:"obliques",    p:[0.125,1.12,0.06],   s:[0.035,0.10,0.05],  g:"torso"},
  {code:"transverse",  p:[0,1.0,0.105],       s:[0.11,0.03,0.025],  g:"torso", single:true},
];

// ── 씬 ──
const canvas = $("#c"), stage = $("#stage");
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 3/4, 0.1, 20);
camera.position.set(0, 0.95, 3.1);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.95, 0); controls.enablePan=false; controls.minDistance=1.8; controls.maxDistance=6; controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.6));
const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(2,4,3); scene.add(key);
const fill = new THREE.DirectionalLight(0xffffff, 0.6); fill.position.set(-3,2,-2); scene.add(fill);

const skinMat = new THREE.MeshStandardMaterial({color:new THREE.Color(css("--skin")), roughness:.85, metalness:0});
const baseMuscle = new THREE.Color(css("--muscle")), litMuscle = new THREE.Color(css("--muscle2")), accent = new THREE.Color(css("--accent"));

const body = new THREE.Group(); scene.add(body);
const groups = { torso:new THREE.Group(), arm:new THREE.Group(), leg:new THREE.Group() };
Object.values(groups).forEach(g=>body.add(g));

const sphere = new THREE.SphereGeometry(1, 32, 24);
const capsule = (r,len,segs=12) => new THREE.CapsuleGeometry(r, len, 6, segs);
function skin(geo, pos, scale, rot){ const m=new THREE.Mesh(geo, skinMat); m.position.set(...pos); if(scale) m.scale.set(...scale); if(rot) m.rotation.set(...rot); return m; }
function limb(group, x, y1, y2, r){ const len=y1-y2; const m=skin(capsule(r,len-2*r), [x,(y1+y2)/2,0]); group.add(m); }

// 몸통·머리
groups.torso.add(skin(sphere,[0,1.26,0],[0.185,0.23,0.11]));     // 흉곽
groups.torso.add(skin(sphere,[0,1.07,0],[0.15,0.12,0.095]));      // 복부
groups.torso.add(skin(capsule(0.045,0.06),[0,1.5,0]));            // 목
groups.torso.add(skin(sphere,[0,1.64,0],[0.10,0.12,0.11]));       // 머리
groups.leg.add(skin(sphere,[0,0.98,0],[0.17,0.12,0.11]));         // 골반
for(const s of [-1,1]){
  limb(groups.arm, s*0.245, 1.42, 1.12, 0.045);                   // 위팔
  limb(groups.arm, s*0.25, 1.13, 0.86, 0.037);                    // 아래팔
  groups.arm.add(skin(sphere,[s*0.25,0.83,0.01],[0.035,0.05,0.025])); // 손
  limb(groups.leg, s*0.10, 0.98, 0.52, 0.075);                    // 허벅지
  limb(groups.leg, s*0.10, 0.53, 0.09, 0.05);                     // 정강이
  groups.leg.add(skin(sphere,[s*0.10,0.045,0.05],[0.05,0.035,0.11])); // 발
}

// 근육
const muscleMeshes = [];
for(const d of MUSCLES){
  const sides = d.single ? [1] : [1,-1];
  for(const s of sides){
    const mat = new THREE.MeshStandardMaterial({color:baseMuscle.clone(), roughness:.6, metalness:0});
    const m = new THREE.Mesh(sphere, mat);
    m.position.set(d.p[0]*s, d.p[1], d.p[2]); m.scale.set(...d.s); if(d.rz) m.rotation.z = d.rz*s;
    m.userData.code = d.code; m.renderOrder = 1;
    groups[d.g].add(m); muscleMeshes.push(m);
  }
}

// ── 성별: 비율만 바꾼다 ──
function setSex(sex){
  const f = sex==="f";
  groups.arm.scale.set(f?0.86:1, 1, 1);
  groups.leg.scale.set(f?1.12:1, 1, 1);
  groups.torso.scale.set(f?0.88:1, 1, f?0.94:1);
  body.scale.setScalar(f?0.94:1);
  document.querySelectorAll("#sex button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.s===sex));
}
function setView(v){
  const d = camera.position.distanceTo(controls.target);
  const pos = v==="front" ? [0,0.95,d] : v==="back" ? [0,0.95,-d] : [d,0.95,0];
  camera.position.set(...pos); controls.update();
  document.querySelectorAll("#view button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===v));
}
document.querySelectorAll("#sex button").forEach(b=>b.addEventListener("click", ()=>setSex(b.dataset.s)));
document.querySelectorAll("#view button").forEach(b=>b.addEventListener("click", ()=>setView(b.dataset.v)));
controls.addEventListener("start", ()=>document.querySelectorAll("#view button").forEach(b=>b.setAttribute("aria-pressed","false")));

// ── 피킹 ──
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let hovered = null, selected = null;
function pick(ev){
  const r = canvas.getBoundingClientRect();
  ptr.set(((ev.clientX-r.left)/r.width)*2-1, -((ev.clientY-r.top)/r.height)*2+1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(muscleMeshes, false)[0];
  return hit ? hit.object.userData.code : null;
}
function paint(){
  for(const m of muscleMeshes){
    const c = m.userData.code;
    m.material.color.copy(c===selected ? accent : c===hovered ? litMuscle : baseMuscle);
    m.material.emissive.set(c===selected ? 0x223366 : 0x000000);
  }
}
const tip = $("#tip");
canvas.addEventListener("pointermove", ev=>{
  const code = pick(ev); if(code!==hovered){ hovered=code; paint(); canvas.style.cursor = code?"pointer":"grab"; }
  if(code){ const r=stage.getBoundingClientRect(); tip.style.display="block"; tip.style.left=(ev.clientX-r.left)+"px"; tip.style.top=(ev.clientY-r.top)+"px"; tip.textContent=M[code].name; }
  else tip.style.display="none";
});
canvas.addEventListener("pointerleave", ()=>{ hovered=null; paint(); tip.style.display="none"; });
let down=null;
canvas.addEventListener("pointerdown", ev=>{ down=[ev.clientX,ev.clientY]; });
canvas.addEventListener("pointerup", ev=>{
  if(!down || Math.hypot(ev.clientX-down[0], ev.clientY-down[1])>6){ down=null; return; } down=null;
  const code = pick(ev); if(code) select(code);
});

// ── 패널 ──
function exLink(e, role){
  const pat = PAT[e.part+"/"+e.pattern].name;
  return `<li><a href="./?ex=${e.id}"><div><div class="nm">${e.name}</div><div class="sub">${PART[e.part].name} · ${pat} · ${e.sets}세트 × ${e.reps}</div></div>
    <div class="tags">${e.equipment.map(c=>`<span class="tag">${EQ[c].name}</span>`).join("")}</div></a></li>`;
}
function select(code){
  selected = code; paint(); renderLegend();
  const m = M[code];
  const prim = DB.exercises.filter(e=>e.muscles_primary.includes(code)).sort((a,b)=>b.priority-a.priority);
  const sec  = DB.exercises.filter(e=>e.muscles_secondary.includes(code)).sort((a,b)=>b.priority-a.priority);
  $("#panel").innerHTML = `
    <h2>${m.name}</h2>
    <div class="meta">${m.en} · ${MPART[m.part].name} · 운동 ${prim.length+sec.length}개</div>
    <h3>주동근으로 쓰는 운동 ${prim.length} <a href="./?m=${code}">카탈로그에서 보기</a></h3>
    ${prim.length ? `<ul>${prim.map(e=>exLink(e,"p")).join("")}</ul>` : `<div class="empty">없음</div>`}
    <h3>협력근으로 쓰는 운동 ${sec.length}</h3>
    ${sec.length ? `<ul>${sec.map(e=>exLink(e,"s")).join("")}</ul>` : `<div class="empty">없음</div>`}`;
  history.replaceState(null, "", "#"+code);
}
function renderLegend(){
  const box = $("#legend");
  box.innerHTML="";
  for(const p of DB.muscle_parts){
    const ms = DB.muscles.filter(m=>m.part===p.code); if(!ms.length) continue;
    const g=document.createElement("div"); g.className="g"; g.textContent=p.name; box.appendChild(g);
    for(const m of ms){ const b=document.createElement("button"); b.textContent=m.name; b.setAttribute("aria-pressed", m.code===selected); b.addEventListener("click", ()=>select(m.code)); box.appendChild(b); }
  }
}

// ── 루프 ──
function resize(){ const r=stage.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect=r.width/r.height; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(stage); resize();
renderer.setAnimationLoop(()=>{ controls.update(); renderer.render(scene, camera); });

setSex("m"); paint(); renderLegend();
const initial = location.hash.slice(1); if(initial && M[initial]) select(initial);
