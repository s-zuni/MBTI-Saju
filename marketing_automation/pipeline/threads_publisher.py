"""
Threads API 게시 모듈 (텍스트 / 단일 이미지 / 다중 이미지 캐러셀 지원 — 본문 및 답글 모두 가능).

필요한 .env:
  THREADS_USER_ID=...        # GET /me 로 확인한 Threads 사용자 ID
  THREADS_ACCESS_TOKEN=...   # 장기 토큰(60일). refresh_long_lived_token()으로 연장 가능
  THREADS_APP_SECRET=...     # 앱 대시보드 -> Threads API 설정의 'Threads 앱 시크릿' (단기->장기 교환용)
"""
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv()

THREADS_API = "https://graph.threads.net"
THREADS_VERSION = os.getenv("THREADS_API_VERSION", "v1.0")
MAX_TEXT_LEN = 500
MAX_CAROUSEL_ITEMS = 20


def clean_token(token: Optional[str]) -> str:
    """Railway 등에 붙여넣다 섞인 따옴표/공백/줄바꿈/'THREADS_ACCESS_TOKEN=' 접두어를 제거합니다."""
    t = (token or "").strip()
    if "=" in t[:30]:
        t = t.split("=", 1)[1]
    return "".join(t.split()).strip("'\"")


def _url(path: str) -> str:
    return f"{THREADS_API}/{THREADS_VERSION}/{path}".rstrip("/")


def _api_error(res: requests.Response) -> str:
    # 상세 원인 추적용: 콘솔 + threads_error.log (토큰은 요청 본문에만 있고 응답에는 없음)
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {res.request.method} {res.request.url.split('?')[0]} -> {res.status_code} {res.text[:1000]}"
    print(f"[THREADS][ERROR] {line}")
    try:
        with open(PROJECT_ROOT / "threads_error.log", "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass
    try:
        err = res.json().get("error", {})
        return f"[{err.get('code')}/{err.get('error_subcode')}] {err.get('message', res.text)}"
    except Exception:
        return res.text[:300]


def exchange_for_long_lived_token(short_lived_token: str, app_secret: Optional[str] = None) -> Dict[str, Any]:
    """단기 토큰(1시간)을 장기 토큰(60일)으로 교환합니다. 반환: {access_token, expires_in}"""
    app_secret = app_secret or os.getenv("THREADS_APP_SECRET", "")
    if not app_secret:
        return {"error": "THREADS_APP_SECRET 이 필요합니다."}
    res = requests.get(
        f"{THREADS_API}/access_token",
        params={"grant_type": "th_exchange_token", "client_secret": app_secret, "access_token": short_lived_token},
        timeout=30,
    )
    if not res.ok:
        return {"error": _api_error(res)}
    return res.json()


def refresh_long_lived_token(token: Optional[str] = None) -> Dict[str, Any]:
    """장기 토큰을 60일 더 연장합니다(발급 24시간 후부터, 만료 전에만 가능). 반환: {access_token, expires_in}"""
    token = clean_token(token or os.getenv("THREADS_ACCESS_TOKEN", ""))
    if not token:
        return {"error": "THREADS_ACCESS_TOKEN 이 필요합니다."}
    res = requests.get(
        f"{THREADS_API}/refresh_access_token",
        params={"grant_type": "th_refresh_token", "access_token": token},
        timeout=30,
    )
    if not res.ok:
        return {"error": _api_error(res)}
    return res.json()


def get_me(token: Optional[str] = None) -> Dict[str, Any]:
    """토큰 소유자의 id/username 조회 (설정 확인용)."""
    token = clean_token(token or os.getenv("THREADS_ACCESS_TOKEN", ""))
    res = requests.get(_url("me"), params={"fields": "id,username", "access_token": token}, timeout=30)
    if not res.ok:
        return {"error": _api_error(res)}
    return res.json()


def get_recent_threads(
    limit: int = 35,
    user_id: Optional[str] = None,
    access_token: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """최근 발행된 Threads 본문 목록을 조회합니다 (중복 발행 방지용)."""
    uid = user_id or os.getenv("THREADS_USER_ID", "")
    token = clean_token(access_token or os.getenv("THREADS_ACCESS_TOKEN", ""))
    if not uid or not token:
        return []
    try:
        res = requests.get(
            _url(f"{uid}/threads"),
            params={
                "fields": "id,text,timestamp,permalink",
                "limit": max(1, min(int(limit), 100)),
                "access_token": token,
            },
            timeout=15,
        )
        if not res.ok:
            print(f"[THREADS][WARN] 최근 글 목록 조회 실패: HTTP {res.status_code}")
            return []
        data = res.json().get("data", [])
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"[THREADS][WARN] 최근 글 목록 조회 예외: {e}")
        return []


def _wait_container_ready(
    creation_id: str,
    access_token: str,
    timeout_sec: int = 30,
    poll_interval: float = 2.0,
) -> Optional[str]:
    """이미지/캐러셀 컨테이너가 FINISHED 상태가 될 때까지 대기합니다. 성공 시 None, 오류 시 에러 문자열 반환."""
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        try:
            r = requests.get(
                _url(creation_id),
                params={"fields": "status,error_message", "access_token": access_token},
                timeout=15,
            )
            if r.ok:
                body = r.json()
                status = (body.get("status") or "").upper()
                if status in ("FINISHED", "PUBLISHED"):
                    return None
                if status in ("ERROR", "EXPIRED"):
                    return f"미디어 컨테이너 처리 실패({status}): {body.get('error_message', body)}"
            else:
                # 일부 컨테이너 타입에서 status 조회가 미지원인 경우 짧게 대기 후 진행
                time.sleep(poll_interval)
                return None
        except Exception:
            pass
        time.sleep(poll_interval)
    return None


def _create_carousel_item(
    user_id: str,
    image_url: str,
    access_token: str,
) -> Dict[str, Any]:
    """CAROUSEL 자식 IMAGE 컨테이너 1건을 생성하고 준비 완료까지 대기합니다."""
    res = requests.post(
        _url(f"{user_id}/threads"),
        data={
            "media_type": "IMAGE",
            "image_url": image_url,
            "is_carousel_item": "true",
            "access_token": access_token,
        },
        timeout=30,
    )
    if not res.ok:
        return {"error": _api_error(res), "status_code": res.status_code}
    child_id = res.json().get("id")
    if not child_id:
        return {"error": f"캐러셀 항목 컨테이너 ID 누락: {res.text[:200]}"}
    err = _wait_container_ready(child_id, access_token)
    if err:
        return {"error": err}
    return {"id": child_id}


def publish_text_to_threads(
    text: str,
    topic_tag: Optional[str] = None,
    user_id: Optional[str] = None,
    access_token: Optional[str] = None,
    reply_to_id: Optional[str] = None,
    image_url: Optional[str] = None,
    image_urls: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    글 1건을 게시합니다 (텍스트 / 단일 IMAGE / 다중 CAROUSEL 지원, reply_to_id로 답글 가능).
    성공 시 {"id": ..., "permalink": ...}, 실패 시 {"error": ...}.
    """
    user_id = user_id or os.getenv("THREADS_USER_ID", "")
    access_token = clean_token(access_token or os.getenv("THREADS_ACCESS_TOKEN", ""))
    if not user_id or not access_token:
        return {"error": "THREADS_USER_ID 및 THREADS_ACCESS_TOKEN이 필요합니다."}
    text = (text or "").strip()
    if not text:
        return {"error": "게시할 텍스트가 비어 있습니다."}
    if len(text) > MAX_TEXT_LEN:
        return {"error": f"텍스트가 {MAX_TEXT_LEN}자를 초과합니다 ({len(text)}자)."}

    raw_urls = list(image_urls) if image_urls else ([image_url] if image_url else [])
    urls = [u.strip() for u in raw_urls if u and u.strip().startswith(("http://", "https://"))][:MAX_CAROUSEL_ITEMS]

    if len(urls) >= 2:
        print(f"[THREADS] 캐러셀 컨테이너 생성 (user {user_id}, {len(text)}자, 이미지 {len(urls)}장)...")
        child_ids: List[str] = []
        for idx, u in enumerate(urls, 1):
            child = _create_carousel_item(user_id, u, access_token)
            if "error" in child:
                return {"error": f"캐러셀 이미지 {idx} 생성 실패: {child['error']}"}
            child_ids.append(child["id"])
        payload: Dict[str, Any] = {
            "media_type": "CAROUSEL",
            "children": ",".join(child_ids),
            "text": text,
            "access_token": access_token,
        }
    elif len(urls) == 1:
        print(f"[THREADS] 이미지 컨테이너 생성 (user {user_id}, {len(text)}자, 이미지 1장)...")
        payload = {
            "media_type": "IMAGE",
            "image_url": urls[0],
            "text": text,
            "access_token": access_token,
        }
    else:
        print(f"[THREADS] 컨테이너 생성 (user {user_id}, {len(text)}자)...")
        payload = {"media_type": "TEXT", "text": text, "access_token": access_token}

    if topic_tag and not reply_to_id:
        payload["topic_tag"] = topic_tag
    if reply_to_id:
        payload["reply_to_id"] = reply_to_id

    res = requests.post(_url(f"{user_id}/threads"), data=payload, timeout=30)
    if not res.ok:
        return {"error": _api_error(res), "status_code": res.status_code}
    creation_id = res.json().get("id")
    if not creation_id:
        return {"error": f"컨테이너 ID 누락: {res.text[:200]}"}

    if urls:
        wait_err = _wait_container_ready(creation_id, access_token)
        if wait_err:
            return {"error": wait_err}
    else:
        time.sleep(3)  # 컨테이너 처리 대기 (텍스트는 짧게로 충분)

    res = requests.post(
        _url(f"{user_id}/threads_publish"),
        data={"creation_id": creation_id, "access_token": access_token},
        timeout=30,
    )
    if not res.ok:
        return {"error": _api_error(res), "status_code": res.status_code}
    post_id = res.json().get("id")

    permalink = ""
    try:
        r = requests.get(_url(post_id), params={"fields": "permalink", "access_token": access_token}, timeout=15)
        if r.ok:
            permalink = r.json().get("permalink", "")
    except Exception:
        pass
    print(f"[THREADS] ✅ 게시 완료: {permalink or post_id}")
    return {"id": post_id, "permalink": permalink}


def publish_thread(
    posts: list,
    topic_tag: Optional[str] = None,
    user_id: Optional[str] = None,
    access_token: Optional[str] = None,
    post_images: Optional[Dict[int, List[str]]] = None,
) -> Dict[str, Any]:
    """타래 게시: posts[0]=본문, 이후는 직전 글에 이어지는 답글.
    post_images: {post_index: [image_url, ...]} (0=본문, len(posts)-1=마지막 CTA 답글 등).
    """
    if not posts:
        return {"error": "게시할 글이 없습니다."}
    images_map = post_images or {}
    first = publish_text_to_threads(
        posts[0],
        topic_tag=topic_tag,
        user_id=user_id,
        access_token=access_token,
        image_urls=images_map.get(0),
    )
    if "error" in first:
        return first
    ids = [first["id"]]
    for i, text in enumerate(posts[1:], start=1):
        time.sleep(2)
        r = publish_text_to_threads(
            text,
            user_id=user_id,
            access_token=access_token,
            reply_to_id=ids[-1],
            image_urls=images_map.get(i),
        )
        if "error" in r:
            return {"ids": ids, "permalink": first.get("permalink", ""), "error": f"답글 {i} 게시 실패: {r['error']}"}
        ids.append(r["id"])
    return {"ids": ids, "id": ids[0], "permalink": first.get("permalink", "")}


if __name__ == "__main__":
    # 사용법:
    #   python pipeline/threads_publisher.py exchange <단기_토큰>   -> 장기 토큰 출력
    #   python pipeline/threads_publisher.py me                    -> 사용자 ID/이름 확인
    #   python pipeline/threads_publisher.py refresh               -> 장기 토큰 연장
    cmd = sys.argv[1] if len(sys.argv) > 1 else "me"
    if cmd == "exchange" and len(sys.argv) > 2:
        out = exchange_for_long_lived_token(sys.argv[2])
    elif cmd == "refresh":
        out = refresh_long_lived_token(sys.argv[2] if len(sys.argv) > 2 else None)
    else:
        out = get_me()
    print(out)
