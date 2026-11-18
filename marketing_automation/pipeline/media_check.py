"""
게시 전 영상/이미지 무결성 검사.

이미지·영상 렌더링이 실패하면 단색/검은 화면(또는 재생 불가 파일)이 그대로 합성되어 게시되던 문제를 막는다.
이 검사를 통과하지 못하면 main.run_pipeline 은 Instagram/YouTube 게시를 건너뛴다. (환경변수로 우회할 수 없음)
"""
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional

from PIL import Image, ImageStat

# 그레이스케일 표준편차가 이 값보다 작으면 '내용 없는 단색 화면'으로 본다.
BLANK_STDDEV = 6.0


def is_blank_image(path: Path) -> bool:
    """파일이 없거나 열 수 없거나 사실상 단색(검정/흰색/회색)이면 True."""
    try:
        with Image.open(path) as im:
            small = im.convert("L").resize((96, 170))
            return ImageStat.Stat(small).stddev[0] < BLANK_STDDEV
    except Exception:
        return True


def probe_duration(video_path: Path) -> float:
    """ffmpeg 로 영상 길이(초)를 읽는다. 실패 시 0.0."""
    import re
    from utils.ffmpeg_check import get_ffmpeg_path

    try:
        res = subprocess.run(
            [get_ffmpeg_path() or "ffmpeg", "-i", str(video_path)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace",
        )
        m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", res.stderr or "")
        if not m:
            return 0.0
        return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    except Exception:
        return 0.0


def _grab_frame(video_path: Path, at_sec: float, out_jpg: Path) -> bool:
    from utils.ffmpeg_check import get_ffmpeg_path

    res = subprocess.run(
        [get_ffmpeg_path() or "ffmpeg", "-y", "-ss", f"{at_sec:.2f}", "-i", str(video_path),
         "-frames:v", "1", "-q:v", "3", str(out_jpg)],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    return res.returncode == 0 and out_jpg.is_file() and out_jpg.stat().st_size > 1000


def blank_frame_ratio(video_path: Path, samples: int = 8) -> float:
    """영상 전체에서 균등 간격으로 프레임을 뽑아 '빈 화면' 비율(0~1)을 반환. 프레임을 못 뽑으면 1.0."""
    dur = probe_duration(video_path)
    if dur <= 0:
        return 1.0
    blanks = 0
    total = 0
    with tempfile.TemporaryDirectory() as td:
        for i in range(samples):
            t = max(min(dur * (i + 0.5) / samples, dur - 0.1), 0.0)
            jpg = Path(td) / f"f{i}.jpg"
            total += 1
            if not _grab_frame(video_path, t, jpg) or is_blank_image(jpg):
                blanks += 1
    return blanks / max(total, 1)


def find_visual_problems(
    raw_image_paths: List[Path],
    video_paths: Optional[Dict[int, str]] = None,
    require_video_scene_ids: Optional[List[int]] = None,
) -> List[str]:
    """장면별 원본(합성 전) 이미지/영상 클립의 문제 목록. 비어 있으면 정상."""
    problems: List[str] = []
    for p in raw_image_paths:
        if not Path(p).is_file() or is_blank_image(Path(p)):
            problems.append(f"{Path(p).name}: 빈 화면/없음")
    vids = {int(k): Path(v) for k, v in (video_paths or {}).items() if v}
    for sid in require_video_scene_ids or []:
        vp = vids.get(int(sid))
        if vp is None or not vp.is_file() or vp.stat().st_size < 30_000:
            problems.append(f"씬 {sid}: Flow 영상 클립 없음")
    for sid, vp in vids.items():
        if vp.is_file() and blank_frame_ratio(vp, samples=4) >= 0.5:
            problems.append(f"씬 {sid}: 영상 클립이 대부분 빈 화면")
    return problems


def find_final_video_problems(final_video: Path, min_duration: float = 5.0) -> List[str]:
    """최종 합성 영상 검사: 파일/길이/빈 화면 비율."""
    final_video = Path(final_video)
    if not final_video.is_file() or final_video.stat().st_size < 100_000:
        return ["최종 영상 파일이 없거나 비정상적으로 작음"]
    problems: List[str] = []
    dur = probe_duration(final_video)
    if dur < min_duration:
        problems.append(f"최종 영상 길이 {dur:.1f}초 < 최소 {min_duration:.0f}초")
    ratio = blank_frame_ratio(final_video, samples=10)
    if ratio >= 0.2:
        problems.append(f"최종 영상 프레임의 {ratio:.0%}가 빈 화면")
    return problems
