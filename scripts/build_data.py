"""docs/database-spec.md 의 운동 상세 114개를 파싱해 data/*.json 과 data/db.js 를 생성한다.

실행: python3 scripts/build_data.py
"""
import json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SPEC = ROOT / "docs" / "database-spec.md"
OUT = ROOT / "data"

# ── 장비 마스터 ──────────────────────────────────────────────
CATEGORIES = [
    {"code": "bodyweight",  "name": "맨몸"},
    {"code": "free_weight", "name": "프리웨이트"},
    {"code": "band",        "name": "밴드"},
    {"code": "machine",     "name": "머신"},
    {"code": "support",     "name": "보조 기구"},
]
EQUIPMENT = [
    {"code": "body",     "name": "맨몸",       "category": "bodyweight"},
    {"code": "bar",      "name": "풀업바",     "category": "bodyweight"},
    {"code": "db",       "name": "덤벨",       "category": "free_weight"},
    {"code": "kb",       "name": "케틀벨",     "category": "free_weight"},
    {"code": "bb",       "name": "바벨",       "category": "free_weight"},
    {"code": "band",     "name": "밴드",       "category": "band"},
    {"code": "cable",    "name": "케이블머신", "category": "machine"},
    {"code": "smith",    "name": "스미스머신", "category": "machine"},
    {"code": "legpress", "name": "레그프레스", "category": "machine"},
    {"code": "machine",  "name": "머신(기타)", "category": "machine"},
    {"code": "bench",    "name": "벤치",       "category": "support"},
]
# 스펙의 is_gym=true 덤벨 운동은 실제로는 "벤치 필요"다. 바벨 벤치류도 벤치가 필요하다.
NEEDS_BENCH = {
    "덤벨 벤치 프레스", "인클라인 덤벨 프레스", "덤벨 플라이 (벤치)",
    "시티드 덤벨 숄더 프레스", "체스트 서포티드 덤벨 로우",
    "바벨 벤치 프레스", "바벨 인클라인 프레스",
}

# ── 부위 / 패턴 마스터 ───────────────────────────────────────
PARTS = [
    {"code": "shoulder", "name": "어깨"},
    {"code": "back",     "name": "등"},
    {"code": "chest",    "name": "가슴"},
    {"code": "legs",     "name": "하체"},
    {"code": "any",      "name": "코어"},
]
PATTERN_NAMES = {
    ("back","vertical"):"수직 당기기", ("back","horizontal"):"수평 당기기", ("back","lat"):"광배 고립",
    ("back","scap"):"견갑 조절", ("back","extension"):"등 신전",
    ("chest","press"):"체스트 프레스", ("chest","upper"):"상부 가슴", ("chest","fly"):"플라이",
    ("chest","inner"):"가슴 안쪽", ("chest","stability"):"가슴 안정화",
    ("legs","squat"):"스쿼트", ("legs","hinge"):"힙 힌지", ("legs","unilateral"):"한발 운동",
    ("legs","glute"):"둔근", ("legs","calf"):"종아리",
    ("shoulder","press"):"숄더 프레스", ("shoulder","lateral"):"사이드 레이즈", ("shoulder","rear"):"후면 삼각근",
    ("shoulder","front"):"프론트 레이즈", ("shoulder","stability"):"어깨 안정화",
    ("any","core"):"코어",
}

# ── 근육 마스터 ──────────────────────────────────────────────
MUSCLES = [
    # 어깨
    {"code":"delt_front",   "name":"전면 삼각근",   "en":"Anterior deltoid",  "part":"shoulder"},
    {"code":"delt_side",    "name":"측면 삼각근",   "en":"Lateral deltoid",   "part":"shoulder"},
    {"code":"delt_rear",    "name":"후면 삼각근",   "en":"Posterior deltoid", "part":"shoulder"},
    {"code":"rotator_cuff", "name":"회전근개",      "en":"Rotator cuff",      "part":"shoulder"},
    {"code":"trap_upper",   "name":"상부 승모근",   "en":"Upper trapezius",   "part":"shoulder"},
    # 등
    {"code":"lats",         "name":"광배근",        "en":"Latissimus dorsi",  "part":"back"},
    {"code":"trap_mid",     "name":"중·하부 승모근","en":"Mid/lower trapezius","part":"back"},
    {"code":"rhomboids",    "name":"능형근",        "en":"Rhomboids",         "part":"back"},
    {"code":"erectors",     "name":"척추기립근",    "en":"Erector spinae",    "part":"back"},
    # 가슴
    {"code":"pec_upper",    "name":"상부 대흉근",   "en":"Upper pectoralis",  "part":"chest"},
    {"code":"pec_mid",      "name":"중부 대흉근",   "en":"Mid pectoralis",    "part":"chest"},
    {"code":"pec_lower",    "name":"하부 대흉근",   "en":"Lower pectoralis",  "part":"chest"},
    {"code":"serratus",     "name":"전거근",        "en":"Serratus anterior", "part":"chest"},
    # 팔
    {"code":"biceps",       "name":"이두근",        "en":"Biceps",            "part":"arm"},
    {"code":"triceps",      "name":"삼두근",        "en":"Triceps",           "part":"arm"},
    # 하체
    {"code":"quads",        "name":"대퇴사두근",    "en":"Quadriceps",        "part":"legs"},
    {"code":"hams",         "name":"햄스트링",      "en":"Hamstrings",        "part":"legs"},
    {"code":"glute_max",    "name":"대둔근",        "en":"Gluteus maximus",   "part":"legs"},
    {"code":"glute_med",    "name":"중둔근",        "en":"Gluteus medius",    "part":"legs"},
    {"code":"adductors",    "name":"내전근",        "en":"Adductors",         "part":"legs"},
    {"code":"gastroc",      "name":"비복근",        "en":"Gastrocnemius",     "part":"legs"},
    {"code":"soleus",       "name":"가자미근",      "en":"Soleus",            "part":"legs"},
    {"code":"hip_flexors",  "name":"장요근",        "en":"Hip flexors",       "part":"legs"},
    # 코어
    {"code":"abs",          "name":"복직근",        "en":"Rectus abdominis",  "part":"any"},
    {"code":"obliques",     "name":"복사근",        "en":"Obliques",          "part":"any"},
    {"code":"transverse",   "name":"복횡근",        "en":"Transverse abdominis","part":"any"},
]
MUSCLE_PARTS = PARTS[:4] + [{"code":"arm","name":"팔"}, PARTS[4]]

# (부위, 패턴) → 기본 주동근 / 협력근
DEFAULT_MUSCLES = {
    ("shoulder","press"):     (["delt_front"],            ["delt_side","triceps","trap_upper"]),
    ("shoulder","lateral"):   (["delt_side"],             ["trap_upper"]),
    ("shoulder","rear"):      (["delt_rear"],             ["rhomboids","trap_mid"]),
    ("shoulder","front"):     (["delt_front"],            ["pec_upper"]),
    ("shoulder","stability"): (["rotator_cuff","delt_front"], ["delt_side","transverse"]),
    ("back","vertical"):      (["lats"],                  ["biceps","trap_mid","rhomboids"]),
    ("back","horizontal"):    (["lats","rhomboids"],      ["trap_mid","biceps","delt_rear"]),
    ("back","lat"):           (["lats"],                  ["triceps","pec_lower"]),
    ("back","scap"):          (["trap_mid","rhomboids"],  ["delt_rear","lats"]),
    ("back","extension"):     (["erectors"],              ["glute_max","hams"]),
    ("chest","press"):        (["pec_mid"],               ["triceps","delt_front"]),
    ("chest","upper"):        (["pec_upper"],             ["delt_front","triceps"]),
    ("chest","fly"):          (["pec_mid"],               ["delt_front"]),
    ("chest","inner"):        (["pec_mid","triceps"],     ["delt_front"]),
    ("chest","stability"):    (["pec_mid"],               ["transverse","triceps","delt_front"]),
    ("legs","squat"):         (["quads","glute_max"],     ["adductors","erectors"]),
    ("legs","hinge"):         (["hams","glute_max"],      ["erectors"]),
    ("legs","unilateral"):    (["quads","glute_max"],     ["glute_med","hams"]),
    ("legs","glute"):         (["glute_max"],             ["hams"]),
    ("legs","calf"):          (["gastroc"],               ["soleus"]),
    ("any","core"):           (["abs"],                   ["obliques","hip_flexors"]),
}
# 이름에 포함된 키워드로 덮어쓰기 (앞에서 먼저 맞는 것 하나만 적용)
OVERRIDES = [
    ("업라이트",        (["delt_side","trap_upper"],        ["delt_front","biceps"])),
    ("페이스 풀",       (["delt_rear","rotator_cuff"],      ["trap_mid","rhomboids"])),
    ("풀어파트",        (["delt_rear","rhomboids"],         ["trap_mid","rotator_cuff"])),
    ("헤일로",          (["rotator_cuff"],                  ["delt_front","delt_side","obliques"])),
    ("아놀드",          (["delt_front","delt_side"],        ["triceps"])),
    ("월 워크",         (["delt_front","transverse"],       ["triceps","serratus"])),
    ("친업",            (["lats","biceps"],                 ["trap_mid"])),
    ("스캐퓰러",        (["trap_mid","lats"],               ["rhomboids"])),
    ("풀오버",          (["lats","pec_mid"],                ["triceps","serratus"])),
    ("프론 T",          (["trap_mid","rhomboids"],          ["delt_rear"])),
    ("프론 Y",          (["trap_mid","delt_rear"],          ["rotator_cuff"])),
    ("슈퍼맨",          (["erectors"],                      ["glute_max","delt_rear"])),
    ("굿모닝",          (["hams","erectors"],               ["glute_max"])),
    ("디클라인 푸시업", (["pec_upper"],                     ["delt_front","triceps"])),
    ("다이아몬드",      (["triceps","pec_mid"],             ["delt_front"])),
    ("크로스오버",      (["pec_lower","pec_mid"],           ["delt_front"])),
    ("스퀴즈",          (["pec_mid","triceps"],             ["delt_front"])),
    ("크러시",          (["pec_mid","triceps"],             ["delt_front"])),
    ("점프 스쿼트",     (["quads","glute_max"],             ["gastroc","hams"])),
    ("스윙",            (["glute_max","hams"],              ["erectors","abs"])),
    ("풀스루",          (["glute_max","hams"],              ["erectors"])),
    ("바벨 데드리프트", (["hams","glute_max","erectors"],   ["quads","trap_upper"])),
    ("사이드 스텝",     (["glute_med"],                     ["glute_max"])),
    ("어브덕션",        (["glute_med"],                     ["glute_max"])),
    ("힙 쓰러스트",     (["glute_max"],                     ["hams"])),
    ("브릿지",          (["glute_max"],                     ["hams","erectors"])),
    ("킥백",            (["glute_max"],                     ["hams"])),
    ("핵 스쿼트",       (["quads"],                         ["glute_max"])),
    ("레그 프레스",     (["quads","glute_max"],             ["hams"])),
    ("싱글레그 프레스", (["quads","glute_max"],             ["hams","glute_med"])),
    ("플랭크",          (["transverse","abs"],              ["obliques","delt_front"])),
    ("데드버그",        (["transverse","abs"],              ["hip_flexors"])),
    ("행잉 레그 레이즈",(["abs","hip_flexors"],             ["obliques"])),
    ("크런치",          (["abs"],                           ["obliques"])),
]

def muscles_for(name, part, pattern):
    for kw, (p, s) in OVERRIDES:
        if kw in name:
            return p, s
    return DEFAULT_MUSCLES[(part, pattern)]

# ── 스펙 파싱 ────────────────────────────────────────────────
def parse_spec(text):
    body = text.split("## 6. 운동 상세", 1)[1]
    body = re.split(r"^## 7\. ", body, maxsplit=1, flags=re.M)[0]
    blocks = re.split(r"^### (\d+)\. ", body, flags=re.M)[1:]
    out = []
    for no, blk in zip(blocks[0::2], blocks[1::2]):
        lines = blk.rstrip().split("\n")
        name = lines[0].strip()
        m = re.search(r"- 부위/패턴: `(\w+)` / `(\w+)`", blk)
        part, pattern = m[1], m[2]
        eq = re.findall(r"`(\w+)`", re.search(r"- 장비: (.+)", blk)[1])
        m = re.search(r"우선순위: (\d) · (\d)세트 × (.+)", blk)
        pri, sets, reps = int(m[1]), int(m[2]), m[3].strip()
        steps = re.findall(r"^\s+\d+\. (.+)$", blk.split("- 수행 순서:")[1].split("- 주의점:")[0], re.M)
        mistakes = re.findall(r"^\s+- (.+)$", blk.split("- 주의점:")[1], re.M)
        assert steps and mistakes, name
        if name in NEEDS_BENCH:
            eq = eq + ["bench"]
        p, s = muscles_for(name, part, pattern)
        out.append({
            "id": int(no), "name": name, "part": part, "pattern": pattern,
            "equipment": eq, "priority": pri, "sets": sets, "reps": reps,
            "muscles_primary": p, "muscles_secondary": s,
            "steps": steps, "mistakes": mistakes,
        })
    return out

def main():
    exercises = parse_spec(SPEC.read_text(encoding="utf8"))
    assert len(exercises) == 114, len(exercises)
    valid_eq = {e["code"] for e in EQUIPMENT}; valid_m = {m["code"] for m in MUSCLES}
    for e in exercises:
        assert set(e["equipment"]) <= valid_eq, e["name"]
        assert set(e["muscles_primary"] + e["muscles_secondary"]) <= valid_m, e["name"]
        assert (e["part"], e["pattern"]) in PATTERN_NAMES, e["name"]
    patterns = [{"part": p, "code": c, "name": n} for (p, c), n in PATTERN_NAMES.items()]
    db = {
        "generated_from": "docs/database-spec.md",
        "parts": PARTS, "muscle_parts": MUSCLE_PARTS,
        "equipment_categories": CATEGORIES, "equipment": EQUIPMENT,
        "patterns": patterns, "muscles": MUSCLES, "exercises": exercises,
    }
    dv = OUT / "demo_videos.json"
    db["demo_videos"] = json.loads(dv.read_text(encoding="utf8")) if dv.exists() else []
    OUT.mkdir(exist_ok=True)
    for k in ("parts","equipment_categories","equipment","patterns","muscles","exercises"):
        (OUT / f"{k}.json").write_text(json.dumps(db[k], ensure_ascii=False, indent=1), encoding="utf8")
    (OUT / "db.js").write_text("// 자동 생성: python3 scripts/build_data.py\nwindow.DB = " + json.dumps(db, ensure_ascii=False) + ";\n", encoding="utf8")
    print(f"exercises {len(exercises)}, equipment {len(EQUIPMENT)}, muscles {len(MUSCLES)}, patterns {len(patterns)}")

if __name__ == "__main__":
    main()
