"""
동물 캐릭터(사막여우 + 수달) 숏폼용 Flow '연장' 체인 — 실제 Flow UI(2026-11 확인) 기준.

흐름 (모두 Flow 'mbtiju' 프로젝트 안에서):
  1. 프로젝트 화면 하단 입력창: [동영상 · 9:16 · x1 · 10초] 로 첫 클립 생성 (약 1.5분, 30크레딧)
  2. 생성된 클립을 열면(/edit/<id>) 타임라인 끝의 `+` -> `연장` -> 길이 10초 -> 프롬프트 -> 생성 (회당 약 2분, 30크레딧) x 2
  3. 상단 다운로드 -> `720p 원본 크기`: 클립 3개가 이어진 약 30초 MP4 한 개(오디오 포함)를 받는다.
  4. 한 개의 영상을 대사 길이 비율로 씬 3개로 분할해 기존 합성 파이프라인(자막/오디오 추출)에 넘긴다.

하나라도 실패하면 빈 dict 를 돌려준다. (부분 결과로 억지로 게시하지 않는다)
"""
import copy
import re
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

from pipeline.media_check import probe_duration, blank_frame_ratio

DEFAULT_CLIPS = 3
FIRST_CLIP_SEC = 10
EXTEND_SEC = 10  # Flow 연장 슬라이더의 최대값

THUMB_ALT = "생성된 동영상 썸네일"
_PERCENT_RE = re.compile(r"^\s*\d{1,3}%\s*$")


# ───────────────────────── 대본 -> 클립 ─────────────────────────
def collapse_scenes_for_clips(scenes: list, n_clips: int = DEFAULT_CLIPS) -> list:
    """
    대본 씬들을 n_clips 개로 합친다 (클립 1개 = 씬 1개 = 약 10초 분량 대사).
    대사(narration)는 글자 수가 비슷하도록 연속 묶음으로 합친다. visual_prompt 는 각 묶음 첫 씬의 행동 묘사를 쓴다.
    (장소/캐릭터/스타일 문구는 visual_theme.format_flow_prompt 가 붙인다.)
    """
    if not scenes or len(scenes) < n_clips:
        return scenes

    total = sum(len(getattr(s, "narration", "") or "") for s in scenes) or 1
    target = total / n_clips
    groups: List[list] = [[] for _ in range(n_clips)]
    gi, acc = 0, 0
    for i, s in enumerate(scenes):
        remaining_scenes = len(scenes) - i
        groups_left_after = n_clips - 1 - gi
        # 목표 글자 수를 채웠거나, 남은 씬이 남은 그룹 수와 같아지면 다음 그룹으로 (모든 그룹이 비지 않게)
        if gi < n_clips - 1 and groups[gi] and (acc >= target or remaining_scenes <= groups_left_after):
            gi += 1
            acc = 0
        groups[gi].append(s)
        acc += len(getattr(s, "narration", "") or "")

    merged = []
    for idx, grp in enumerate(groups, start=1):
        base = copy.deepcopy(grp[0])
        base.scene_id = idx
        base.narration = " ".join((g.narration or "").strip() for g in grp).strip()
        base.duration_estimate = 10
        base.media_type = "video"
        merged.append(base)
    return merged


# ───────────────────────── Flow UI 조작 (Playwright) ─────────────────────────
def _log(msg: str) -> None:
    print(f"    [FLOW-EXTEND] {msg}")


def _type_prompt(page, textbox, text: str) -> None:
    textbox.click(force=True)
    page.keyboard.press("Control+A")
    page.keyboard.press("Delete")
    page.keyboard.insert_text(text)
    page.wait_for_timeout(500)


def _range_input(page):
    """설정/연장 팝업의 길이 슬라이더 (<input type=range aria-label="길이">)."""
    return page.locator("input[type=range]").first


def _slider_value(slider) -> Optional[int]:
    try:
        return int(float(slider.input_value(timeout=2000)))
    except Exception:
        return None


def _set_slider(page, slider, target: int) -> bool:
    """슬라이더에 포커스를 주고 방향키(1초 단위)로 target 초에 맞춘다. 포커스 없이 방향키를 보내면 클립이 이동하므로 주의."""
    slider.focus()
    for _ in range(40):
        cur = _slider_value(slider)
        if cur is None:
            return False
        if cur == target:
            return True
        page.keyboard.press("ArrowRight" if cur < target else "ArrowLeft")
        page.wait_for_timeout(120)
    return _slider_value(slider) == target


def _ensure_video_settings(page, first_sec: int) -> bool:
    """프로젝트 화면 하단 설정을 [동영상 · 9:16 · x1 · first_sec초]로 맞춘다."""
    trigger = page.get_by_role("button", name="설정 트리거")
    if trigger.count() == 0:
        # 에이전트 모드가 켜져 있으면 끈다 (끄면 모델/설정 칩이 나타난다)
        page.get_by_text("에이전트", exact=True).first.click()
        page.wait_for_timeout(800)
        trigger = page.get_by_role("button", name="설정 트리거")
    if trigger.count() == 0:
        _log("설정 칩을 찾지 못했습니다")
        return False
    trigger.first.click()
    page.wait_for_timeout(800)
    # 팝업의 탭/비율/개수는 role=radio 라서 텍스트로 찾는다
    page.get_by_text("동영상", exact=True).last.click()
    page.wait_for_timeout(600)
    page.get_by_text("9:16", exact=True).last.click()
    page.get_by_text("x1", exact=True).last.click()
    ok = _set_slider(page, _range_input(page), first_sec)
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    chip = trigger.first.inner_text()
    _log(f"생성 설정 확인: {' '.join(chip.split())}")
    return ok and f"{first_sec}초" in chip


def _wait_generation_done(page, timeout_sec: int, label: str) -> bool:
    """진행률(%)·'연장 중' 표시가 사라질 때까지 기다린다."""
    import time
    deadline = time.time() + timeout_sec
    page.wait_for_timeout(8000)
    while time.time() < deadline:
        busy = page.get_by_text(_PERCENT_RE).count() > 0 or page.get_by_text("연장 중").count() > 0
        if not busy:
            page.wait_for_timeout(2500)  # 완료 직후 UI 갱신 여유
            if page.get_by_text(_PERCENT_RE).count() == 0:
                _log(f"{label} 생성 완료")
                return True
        page.wait_for_timeout(5000)
    _log(f"{label} 생성 시간 초과({timeout_sec}초)")
    return False


def _page_has_error(page) -> bool:
    for t in ("생성하지 못했", "실패", "정책", "다시 시도"):
        try:
            if page.get_by_text(t).first.is_visible(timeout=300):
                return True
        except Exception:
            continue
    return False


def _create_first_clip(page, prompt: str) -> bool:
    thumbs = page.get_by_alt_text(THUMB_ALT)
    before = thumbs.count()
    box = page.get_by_role("textbox", name="무엇을 만들고 싶으신가요?")
    _type_prompt(page, box, prompt)
    page.get_by_role("button", name="생성 시작").last.click()
    _log("첫 클립 생성 요청")
    if not _wait_generation_done(page, 420, "첫 클립"):
        return False
    if thumbs.count() <= before:
        _log("새 클립 썸네일이 생기지 않았습니다 (생성 실패 가능)")
        return False
    thumbs.first.click()
    page.wait_for_url(re.compile(r"/edit/"), timeout=20_000)
    page.wait_for_timeout(2500)
    return True


def _extend_once(page, prompt: str, idx: int) -> bool:
    page.get_by_role("button", name="클립 추가").last.click()
    page.wait_for_timeout(700)
    page.get_by_role("menuitem").nth(1).click()  # 0: 클립 추가, 1: 연장
    page.wait_for_timeout(1200)

    # 연장 길이를 최대(10초)로
    page.get_by_text(re.compile(r"^\d+초$")).first.click()
    page.wait_for_timeout(600)
    if not _set_slider(page, _range_input(page), EXTEND_SEC):
        _log("연장 길이 슬라이더 설정 실패")
        return False

    box = page.get_by_role("textbox", name=re.compile(r"다음 단계|수정할지"))
    _type_prompt(page, box, prompt)
    page.get_by_role("button", name="생성 시작").last.click()
    _log(f"연장 {idx} 요청")
    return _wait_generation_done(page, 480, f"연장 {idx}")


def _download_scene(page, out_path: Path) -> bool:
    page.get_by_role("button", name="미디어 다운로드").first.click()
    page.wait_for_timeout(800)
    with page.expect_download(timeout=180_000) as dl_info:
        page.get_by_text("원본 크기").first.click()
    dl_info.value.save_as(str(out_path))
    return out_path.is_file() and out_path.stat().st_size > 100_000


# ───────────────────────── 분할 ─────────────────────────
def _split(master: Path, weights: List[float], out_dir: Path) -> Dict[int, Path]:
    """마스터 영상을 weights 비율로 나눠 scene_XX_raw.mp4 로 저장한다."""
    from utils.ffmpeg_check import get_ffmpeg_path

    ff = get_ffmpeg_path() or "ffmpeg"
    total = probe_duration(master)
    wsum = sum(weights) or 1.0
    out: Dict[int, Path] = {}
    start = 0.0
    for i, w in enumerate(weights, start=1):
        length = total * (w / wsum) if i < len(weights) else max(total - start, 0.5)
        dst = out_dir / f"scene_{i:02d}_raw.mp4"
        res = subprocess.run(
            [ff, "-y", "-ss", f"{start:.3f}", "-i", str(master), "-t", f"{length:.3f}",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "192k", str(dst)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace",
        )
        if res.returncode != 0 or not dst.is_file() or dst.stat().st_size < 30_000:
            return {}
        out[i] = dst
        start += length
    return out


# ───────────────────────── 진입점 ─────────────────────────
def generate_extended_clips(
    scene_prompts: Dict[int, str],
    dialogues: Dict[int, str],
    out_dir: Path,
    visual_theme: Optional[str] = "animal",
    min_total_sec: float = 20.0,
) -> Dict[int, Path]:
    """
    scene_prompts: {1: 첫 클립 행동 묘사, 2: 연장 1 행동 묘사, 3: 연장 2 행동 묘사}
    dialogues:     {1: 첫 클립 한국어 대사, ...}
    성공 시 {1: scene_01_raw.mp4, 2: ..., 3: ...}, 실패 시 {}.
    """
    from pipeline.flow_automation import FlowBrowserSession, is_flow_enabled, _write_source_tag
    from pipeline.visual_theme import format_flow_prompt

    if not is_flow_enabled():
        _log("USE_GOOGLE_FLOW 비활성 -> 연장 체인을 만들 수 없습니다.")
        return {}

    out_dir.mkdir(parents=True, exist_ok=True)
    ids = sorted(scene_prompts)
    master = out_dir / "master_extended.mp4"
    if master.exists():
        master.unlink()

    full = {sid: format_flow_prompt(scene_prompts[sid], visual_theme, dialogue=dialogues.get(sid, "")) for sid in ids}

    try:
        with FlowBrowserSession() as session:
            if not session._ready or session._page is None:
                _log("Flow 세션/프로젝트 준비 실패")
                return {}
            page = session._page
            if not _ensure_video_settings(page, FIRST_CLIP_SEC):
                _log("영상 생성 설정(9:16 · x1 · 10초) 맞추기 실패")
                return {}
            if not _create_first_clip(page, full[ids[0]]):
                return {}
            for n, sid in enumerate(ids[1:], start=1):
                if not _extend_once(page, full[sid], n):
                    return {}
            if not _download_scene(page, master):
                _log("다운로드 실패")
                return {}
    except Exception as e:
        _log(f"Flow 자동화 예외: {e}")
        return {}

    total = probe_duration(master)
    _log(f"최종 영상 {total:.1f}초")
    if total < min_total_sec:
        _log(f"전체 길이 {total:.1f}초 < {min_total_sec:.0f}초")
        return {}
    if blank_frame_ratio(master, samples=8) >= 0.2:
        _log("영상에 빈 화면이 많습니다")
        return {}

    # 클립 경계가 곧 씬 경계다: 첫 클립 10초 + 연장 10초 x N (대사 길이와 무관하게 실제 생성 길이로 자른다)
    weights = [FIRST_CLIP_SEC] + [EXTEND_SEC] * (len(ids) - 1)
    scenes = _split(master, weights, out_dir)
    if len(scenes) != len(ids):
        return {}
    for sid, path in scenes.items():
        _write_source_tag(path, scene_prompts[ids[sid - 1]])
    return scenes
