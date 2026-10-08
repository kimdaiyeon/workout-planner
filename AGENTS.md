# 작업 컨텍스트

## 이 레포의 역할 (2026-10-06 갱신)

**운동 자세 피드백 앱의 서버(백엔드) 레포.** 기획 전체는 `docs/form-feedback-app.md`, DB 스펙 원본은 `docs/database-spec.md`.

앱 한 줄 요약: 기준 운동 영상과 사용자가 찍은 영상을 비교해, 세트가 끝난 뒤 쉬는 시간에
"몇 번째 반복에서 무엇이 틀렸는지"를 알려준다. 시장에 같은 카테고리 앱은 많다(2026-10 조사).

## 현재 집중 범위: 기반 데이터 1·2·3

사용자(대연)가 2026-10-06에 범위를 좁혔다. **지금은 기반 데이터 수집·고도화만** 한다.

| # | 데이터 | 상태 |
| --- | --- | --- |
| 1 | 운동 (exercise) 114개 | `data/exercises.json`. 스펙에서 파싱. 촬영 각도·인식 난이도·촬영 가이드 컬럼은 아직 없음 |
| 2 | 장비 (equipment) 11종 + 상위 범주 5종 | `data/equipment.json`. 맨몸/프리웨이트/밴드/머신/보조기구. 스펙의 `db` 중복은 `bench` 분리로 해결, `is_gym` 드랍 |
| 3 | 근육 (muscle) 26종 + 운동별 주동근·협력근 | `data/muscles.json`, `exercises.json` 안 `muscles_primary/secondary`. **패턴 기본값 + 이름 키워드 예외 규칙으로 생성한 초안**이라 사용자 검수 필요 |

**드랍 (사용자 결정):** 시연 영상 자산, 실사 기준 영상·규칙, 피드백 문구, 세션/세트/반복 기록, 그룹 모드·기구 자리 배정, `index.html` 파일 분리, 인형 MP4 추출.
플래너(`index.html`)의 그룹 로직과 검증 시나리오 불일치는 더 이상 작업 대상이 아니다.

## 파일 구성

- `docs/database-spec.md` — 운동 114개 상세의 **단일 원본**. 데이터 수정은 여기서 하고 아래 스크립트로 재생성
- `scripts/build_data.py` — 스펙 파싱 → `data/*.json` + `data/db.js`. 장비·근육 마스터와 근육 매핑 규칙도 이 파일 안에 있음
- `data/` — 생성물. 손으로 고치지 말 것
- `catalog/` — 데이터 확인용 예제 사이트
  - `index.html` + `app.js` + `anim.js`(플래너에서 추출한 관절 인형). 부위·장비·근육·패턴 필터, 텍스트 검색, 상세 모달. 딥링크 `?m=근육코드`, `?ex=운동id`
  - `body.html` + `body.js` — **근육 지도**. three.js(CDN importmap)로 코드 생성한 마네킹 위에 근육 26종을 타원체로 배치. 남/여는 어깨·골반·몸통 비율만 다름. 클릭 → 주동근/협력근 운동 목록, `#근육코드` 해시로 상태 유지
  - 해부학 메시 자산은 없음. 실제 메시가 필요하면 BodyParts3D(CC BY-SA, 남성만) 또는 Z-Anatomy 검토 — 사용자 결정 필요
- `index.html` — 기존 4분할 플래너 프로토타입. 그대로 둠. 구조는 `README.md`
- `.Codex/launch.json` — `static` 설정: `python3 -m http.server 8791`. 카탈로그는 `http://localhost:8791/catalog/`

## 데이터 규약

- 운동 식별자는 스펙의 번호(`id` 1~114). 이름은 UNIQUE
- `part`: shoulder, back, chest, legs, any(코어). `pattern`은 부위별 21종, `patterns.json`
- 근육 `part`에는 `arm`(이두·삼두)이 추가로 있어 부위 5종과 다르다
- `equipment` 배열은 "이 운동을 할 수 있는 장비 중 하나" 의미(OR). 벤치가 필요한 운동만 `bench`를 함께 가진다
- 카탈로그 필터는 그룹 안 OR, 그룹끼리 AND

## 데이터 공백 (2026-10-06)

- 주동근으로 쓰는 운동이 0개인 근육 4종: 전거근, 내전근, 가자미근, 복사근. 운동 추가 또는 매핑 보강 필요

## 다음 후보 (우선순위 미정)

- 근육 매핑 검수: 114개를 사용자가 훑어 틀린 것 수정 → `OVERRIDES`에 반영
- 운동에 세부 타겟 UI(앞·옆·뒤 어깨)를 근육 기준으로 노출
- 운동 테이블에 촬영 각도·인식 난이도·촬영 가이드 컬럼 추가 (자세 피드백 재개 시)
- SQLite 스키마 + 시드 스크립트 (`data/*.json` → DB)
- 서버 스택 결정 (Node vs FastAPI)

## 코드 주의점

- 플래너 `build*`는 `state`를 직접 읽음. DOM 없이 돌리려면 `<script>` 본문을 뽑아 `document`/`localStorage`/`matchMedia`를 스텁한 `vm` 컨텍스트에서 실행
- `archetypeFor`는 이름 키워드 if 체인. 114개 전부 매핑 확인됨(2026-10-06), 폴백 `squat`로 떨어지는 운동 없음
- `index.html`의 `EX` 배열에 쉼표 중복으로 빈 칸 2개 있음(412, 480줄). 플래너는 더 이상 손대지 않으므로 방치

## 환경 (2026-10-06 확인)

- macOS, Python 3.12.6, Node v25.8.1. mediapipe·opencv·ffmpeg·playwright 없음(현재 범위에서는 불필요)
- 배포: Codex.ai 아티팩트 https://Codex.ai/artifact/RJZpPr4MQz2FLTmDr3k4vn (플래너 프로토타입)
