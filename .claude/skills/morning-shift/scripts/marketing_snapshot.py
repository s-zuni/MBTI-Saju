"""marketing_automation/state.db 를 읽기 전용으로 열어 봇/발행/인사이트 상태 요약을 출력한다.

morning-shift 스킬의 marketing-operator 워커가 사용한다.
DB를 수정하지 않으며, 민감 토큰·원문 본문은 출력하지 않는다(건수·날짜·제목·점수 요약만).
"""
import os
import sqlite3
import sys
from datetime import datetime, timedelta

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
DB_PATH = os.path.join(ROOT, "marketing_automation", "state.db")
STALE_AFTER_DAYS = 2
LOOKBACK_DAYS = 14


def table_exists(conn: sqlite3.Connection, name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)
    ).fetchone()
    return row is not None


def main() -> None:
    if not os.path.exists(DB_PATH):
        print("스냅샷: marketing_automation/state.db 없음 — 성과 데이터 없음으로 처리할 것")
        return

    modified = datetime.fromtimestamp(os.path.getmtime(DB_PATH))
    age_days = (datetime.now() - modified).days
    stale = age_days > STALE_AFTER_DAYS
    print(f"스냅샷 파일 기준: {modified:%Y-%m-%d %H:%M} (약 {age_days}일 전)")
    if stale:
        print(
            "주의: 로컬 state.db가 최근 이틀 이상 갱신되지 않음. "
            "GitHub Actions(ubuntu-latest) 실행분은 로컬 DB에 반영되지 않을 수 있음."
        )

    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    try:
        if table_exists(conn, "published_posts"):
            total_cnt, last_pub = conn.execute(
                "SELECT COUNT(*), MAX(published_at) FROM published_posts"
            ).fetchone()
            print(f"\n[누적 발행] 총 {total_cnt}건 (최근 발행일시: {last_pub or '없음'})")

            since = (datetime.now() - timedelta(days=LOOKBACK_DAYS)).strftime("%Y-%m-%d")
            rows = conn.execute(
                "SELECT format, series, mbti, title, published_at "
                "FROM published_posts WHERE published_at >= ? "
                "ORDER BY published_at DESC LIMIT 10",
                (since,),
            ).fetchall()
            print(f"[최근 {LOOKBACK_DAYS}일 발행 목록]")
            if rows:
                for fmt, series, mbti, title, pub_at in rows:
                    tag = f"{series}/{mbti}" if mbti else series
                    print(f"  - ({fmt}) [{tag}] {title} @ {pub_at}")
            else:
                print("  없음")

        if table_exists(conn, "post_insights"):
            ins_cnt, last_col, max_score = conn.execute(
                "SELECT COUNT(*), MAX(collected_at), MAX(score) FROM post_insights"
            ).fetchone()
            print(
                f"\n[인사이트 수집] 총 {ins_cnt}건 (최근 수집: {last_col or '없음'}, 최고 점수: {max_score})"
            )
            top_rows = conn.execute(
                "SELECT p.title, p.series, i.window_h, i.score "
                "FROM post_insights i LEFT JOIN published_posts p ON i.media_id = p.media_id "
                "ORDER BY i.score DESC LIMIT 5"
            ).fetchall()
            if top_rows:
                print("[상위 점수 스냅샷]")
                for title, series, win_h, score in top_rows:
                    print(f"  - [{series or '-'}] {title or '(제목없음)'} ({win_h}h): score={score}")

        if table_exists(conn, "pending_proposals"):
            cnt, oldest, newest = conn.execute(
                "SELECT COUNT(*), MIN(created_at), MAX(created_at) FROM pending_proposals"
            ).fetchone()
            print(f"\n[텔레그램 승인 대기] {cnt}건 (최초: {oldest or '-'}, 최신: {newest or '-'})")

        if table_exists(conn, "daily_schedule"):
            sched_rows = conn.execute(
                "SELECT schedule_date, sent_at FROM daily_schedule ORDER BY schedule_date DESC LIMIT 5"
            ).fetchall()
            print("\n[일일 스케줄 발송 기록 (최근 5건)]")
            if sched_rows:
                for s_date, sent_at in sched_rows:
                    print(f"  - {s_date}: {sent_at}")
            else:
                print("  없음")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
