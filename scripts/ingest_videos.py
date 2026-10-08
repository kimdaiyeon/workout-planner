"""videos/ 폴더의 영상을 운동에 연결해 data/demo_videos.json 을 만들고 db.js 를 재생성한다.

실행: python3 scripts/ingest_videos.py
매칭 순서: map.json files(정확 일치) → 파일명 앞 숫자(예: 021-lat-pulldown.mp4) → map.json slugs(뷰 접미사·-final 제거 후) → 파일명에 운동 이름 포함
뷰: 파일명 끝의 -side/-back/-top 을 읽고 없으면 front
메타데이터(길이·해상도)는 macOS `mdls` 로 읽는다. 없으면 용량만 기록.
"""
import json, re, subprocess, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
VID = ROOT / "videos"; DATA = ROOT / "data"
EXTS = {".mp4", ".webm", ".mov", ".m4v"}

def mdls(path):
    try:
        out = subprocess.run(["mdls", "-name", "kMDItemDurationSeconds", "-name", "kMDItemPixelWidth", "-name", "kMDItemPixelHeight", str(path)],
                             capture_output=True, text=True, timeout=10).stdout
    except Exception:
        return {}
    g = lambda k: (re.search(k + r"\s*=\s*([\d.]+)", out) or [None, None])[1]
    d, w, h = g("kMDItemDurationSeconds"), g("kMDItemPixelWidth"), g("kMDItemPixelHeight")
    return {"duration_sec": float(d) if d else None, "width": int(w) if w else None, "height": int(h) if h else None}

def mp4_atoms(path):
    """mdls 가 아직 색인하지 않았을 때: mvhd(길이)·tkhd(해상도) 아톰을 직접 읽는다."""
    import struct
    out = {"duration_sec": None, "width": None, "height": None}
    try:
        data = path.read_bytes()
    except Exception:
        return out
    i = data.find(b"mvhd")
    if i > 0:
        ver = data[i+4]
        if ver == 0:
            ts, dur = struct.unpack(">II", data[i+16:i+24])
        else:
            ts, = struct.unpack(">I", data[i+24:i+28]); dur, = struct.unpack(">Q", data[i+28:i+36])
        if ts: out["duration_sec"] = round(dur / ts, 2)
    j = data.find(b"tkhd")
    while j > 0:
        ver = data[j+4]; off = j + (84 if ver == 0 else 96)
        w, h = struct.unpack(">II", data[off:off+8]); w >>= 16; h >>= 16
        if w and h: out["width"], out["height"] = w, h; break
        j = data.find(b"tkhd", j + 4)
    return out

def meta(path):
    m = mdls(path)
    if not m.get("duration_sec") and path.suffix.lower() in {".mp4", ".m4v", ".mov"}:
        m = {**m, **{k: v for k, v in mp4_atoms(path).items() if v}}
    return m

def main():
    exercises = json.loads((DATA / "exercises.json").read_text(encoding="utf8"))
    by_id = {e["id"]: e for e in exercises}
    norm = lambda s: re.sub(r"[\s_\-()]+", "", s).lower()
    mp = json.loads((VID / "map.json").read_text(encoding="utf8"))
    manual, slugs = mp.get("files", {}), mp.get("slugs", {})
    files = sorted(p for p in VID.iterdir() if p.suffix.lower() in EXTS)
    videos, unmatched = [], []
    for p in files:
        ids, how = [], ""
        stem = re.sub(r"-final$", "", p.stem.lower())
        vm = re.search(r"-(side|back|top|front)$", stem)
        view = vm[1] if vm else "front"
        base = stem[:vm.start()] if vm else stem
        base = re.sub(r"^\d{1,3}-", "", base)
        if p.name in manual: ids, how = manual[p.name], "map.json files"
        elif (m := re.match(r"^(\d{1,3})\b", p.stem)) and int(m[1]) in by_id: ids, how = [int(m[1])], "id prefix"
        elif base in slugs: ids, how = slugs[base], "map.json slugs"
        else:
            n = norm(p.stem)
            hits = [e["id"] for e in exercises if norm(e["name"]) in n]
            if hits: ids, how = hits, "name match"
        if not ids: unmatched.append(p.name); continue
        videos.append({"file": p.name, "exercises": ids, "view": view, "bytes": p.stat().st_size, "matched_by": how, **meta(p)})
    (DATA / "demo_videos.json").write_text(json.dumps(videos, ensure_ascii=False, indent=1), encoding="utf8")
    covered = {i for v in videos for i in v["exercises"]}
    print(f"영상 {len(files)}개 중 연결 {len(videos)}개, 운동 {len(covered)}/{len(exercises)}개 커버")
    for v in videos: print(f"  {v['file']} → {', '.join(by_id[i]['name'] for i in v['exercises'])} [{v['view']}] ({v['matched_by']}, {v.get('duration_sec')}s {v.get('width')}x{v.get('height')})")
    if unmatched:
        print("연결 못 한 파일 (videos/map.json 에 수동 지정 필요):"); [print("  ", u) for u in unmatched]
    sys.path.insert(0, str(ROOT / "scripts")); import build_data; build_data.main()

if __name__ == "__main__":
    main()
