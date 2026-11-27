"""
Threads Automated Content Generator & Publisher for GitHub Actions / Cron.
1. Loads scheduled MBTI x Saju thread posts strictly from Google Sheet ('30일_게시계획').
2. AI on-the-fly generation fallback is DISABLED by policy; when the 30-day sheet plan is
   exhausted, automatically generates and appends a fresh 30-day plan (90 rows) to the sheet
   and publishes strictly from the sheet.
3. Publishes to Threads account (@mbti_ju) via official Threads API and sends Telegram alerts.
"""
import argparse
import datetime
import html
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

load_dotenv()


def tg_notify(text: str):
    """텔레그램 채팅방으로 실시간 알림을 발송합니다."""
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat_id:
        print("[NOTIFY] TELEGRAM_BOT_TOKEN 또는 TELEGRAM_CHAT_ID가 없어 텔레그램 알림을 건너뜁니다.")
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False,
    }
    try:
        r = requests.post(url, json=payload, timeout=10)
        if not r.ok:
            print(f"[NOTIFY][WARN] 텔레그램 발송 실패: {r.text}")
    except Exception as e:
        print(f"[NOTIFY][WARN] 텔레그램 요청 오류: {e}")


def determine_slot() -> str:
    """현재 한국 시간(KST)에 맞춰 적절한 슬롯을 자동 판별합니다."""
    try:
        import zoneinfo
        kst = zoneinfo.ZoneInfo("Asia/Seoul")
        now_hour = datetime.datetime.now(kst).hour
    except Exception:
        # UTC + 9
        now_hour = (datetime.datetime.utcnow().hour + 9) % 24

    if 0 <= now_hour < 6:
        return "skip"
    elif now_hour < 11:
        return "morning"
    elif now_hour < 16:
        return "afternoon"
    else:
        return "evening"


def _tomorrow_kst_str() -> str:
    from pipeline.threads_sheet import get_kst_today_str
    today = datetime.date.fromisoformat(get_kst_today_str())
    return (today + datetime.timedelta(days=1)).isoformat()


def _notify_refill_result(res: dict, trigger_reason: str):
    if not res or not res.get("refilled"):
        return
    msg = (
        f"📋 <b>[Threads 30일 시트 자동 보충 완료]</b>\n\n"
        f"• <b>사유:</b> {html.escape(trigger_reason)}\n"
        f"• <b>추가 범위:</b> Day {res.get('start_day')} ~ Day {res.get('end_day')} "
        f"({res.get('start_date')} ~ {res.get('end_date')})\n"
        f"• <b>추가 건수:</b> {res.get('added_rows')}행 (직접 링크 30건 + 간접 유도 48건 + 무CTA 12건)"
    )
    tg_notify(msg)


def main():
    parser = argparse.ArgumentParser(description="Threads 자동 포스팅 러너 (시트 전용 + 30일 소진 시 자동 보충)")
    parser.add_argument(
        "--slot",
        type=str,
        default="auto",
        choices=["auto", "morning", "afternoon", "evening"],
        help="시간대 슬롯 (auto: 현재 시각 기반 자동 판별)",
    )
    parser.add_argument(
        "--category",
        type=str,
        default="",
        choices=["", "사주", "MBTI", "운세"],
        help="카테고리 필터 (선택)",
    )
    parser.add_argument("--topic", type=str, default="", help="(비활성화됨) 즉석 AI 생성용 옵션")
    parser.add_argument("--with-cta", action="store_true", help="CTA 답글 강제 포함")
    parser.add_argument(
        "--mode",
        type=str,
        default="sheet",
        choices=["sheet", "auto", "refill", "generate"],
        help="실행 모드 (sheet/auto: 시트 전용 + 소진 시 30일 자동 보충, refill: 30일 보충만 수행, generate: 금지됨)",
    )
    parser.add_argument("--force-refill", action="store_true", help="refill 모드에서 남은 글이 있어도 새 30일치 강제 추가")
    parser.add_argument("--sheet-id", type=str, default="", help="구글 시트 ID 덮어쓰기 (선택)")
    parser.add_argument("--no-publish", action="store_true", help="게시 및 시트 쓰기 건너뛰기 (테스트용)")
    args = parser.parse_args()

    # AI 즉석 자동생성 폴백 전면 금지 가드
    if args.mode == "generate" or (args.topic or "").strip():
        err_msg = (
            "🚫 <b>[Threads 정책 가드]</b>\n"
            "AI 즉석 자동생성 폴백(--mode generate / --topic)은 현재 금지되어 있습니다.\n"
            "구글 시트(30일_게시계획) 기반 발행만 허용됩니다."
        )
        print("[GUARD] AI 자동생성 폴백은 현재 비활성화되어 있습니다. (시트 전용 정책)")
        tg_notify(err_msg)
        sys.exit(1)

    from pipeline.threads_content import GeneratedThread, build_cta
    from pipeline.threads_publisher import get_recent_threads, publish_thread, refresh_long_lived_token
    from pipeline.threads_sheet import (
        count_pending_posts,
        get_kst_today_str,
        load_and_pick_scheduled_post,
        load_sheet_rows,
        mark_sheet_row_published,
        resolve_post_images,
    )
    from pipeline.threads_sheet_refill import replenish_sheet_if_exhausted

    # 수동/예약 30일 보충 전용 모드
    if args.mode == "refill":
        print("=" * 65)
        print(f"📋 [THREADS] 30일 시트 보충 모드 실행 (force={args.force_refill})")
        print("=" * 65)
        recent_items = get_recent_threads(limit=35)
        recent_texts = [item.get("text", "") for item in recent_items if item.get("text")]
        try:
            refill_res = replenish_sheet_if_exhausted(
                recent_published_texts=recent_texts,
                threshold=0,
                force=args.force_refill,
                sheet_id=args.sheet_id or None,
                min_start_date=get_kst_today_str(),
            )
            if refill_res.get("refilled"):
                _notify_refill_result(refill_res, "수동/정기 30일 시트 보충 실행")
            else:
                print(f"[SHEET-REFILL] 현재 대기 글 {refill_res.get('pending_total')}건 남음 → 보충 불필요")
            return
        except Exception as e:
            err_msg = f"❌ <b>[Threads 30일 시트 보충 실패]</b>\n<code>{html.escape(str(e))}</code>"
            print(f"[ERROR] 30일 시트 보충 실패: {e}")
            tg_notify(err_msg)
            sys.exit(1)

    slot = determine_slot() if args.slot == "auto" else args.slot
    if slot == "skip":
        msg = "⚠️ <b>[Threads 가드] 새벽 시간대(00~06시 KST) 오발행 방지를 위해 건너뜁니다.</b>\nGitHub 스케줄 큐 지연으로 새벽에 실행된 요청을 차단했습니다."
        print(f"[GUARD] {msg}")
        tg_notify(msg)
        sys.exit(0)
    category = args.category or None

    print("=" * 65)
    print(f"🧵 [THREADS] 자동 포스팅 러너 가동 (슬롯: {slot}, 카테고리: {category or '자동'}, 모드: sheet-only)")
    print("=" * 65)

    recent_items = get_recent_threads(limit=35)
    recent_texts = [item.get("text", "") for item in recent_items if item.get("text")]
    print(f"[0/2] 🔍 최근 발행 글 {len(recent_texts)}건 확인 (중복 방지)")

    # 1. 시트 전용 로드 (소진 시 AI 즉석 폴백 금지 → 새 30일 시트 자동 작성 후 시트에서 재로드)
    t0 = time.time()
    selected_sheet_post = None
    try:
        selected_sheet_post = load_and_pick_scheduled_post(
            slot=slot,
            category=category,
            recent_published_texts=recent_texts,
            sheet_id=args.sheet_id or None,
        )

        if selected_sheet_post is None:
            if args.no_publish:
                raise RuntimeError(
                    "시트(30일_게시계획) 대기 글이 소진되었습니다. (--no-publish 테스트 모드라 자동 시트 보충을 건너뜁니다)"
                )
            print("[SHEET] ⚠️ 시트 30일 계획 소진 감지 → AI 즉석 폴백 없이 새 30일치 계획을 시트에 자동 작성합니다.")
            refill_res = replenish_sheet_if_exhausted(
                recent_published_texts=recent_texts,
                threshold=0,
                force=False,
                sheet_id=args.sheet_id or None,
                min_start_date=get_kst_today_str(),
                slot_to_check=slot,
            )
            if refill_res.get("refilled"):
                _notify_refill_result(refill_res, f"{slot} 슬롯 발행 전 30일 시트 소진 감지")

            selected_sheet_post = load_and_pick_scheduled_post(
                slot=slot,
                category=category,
                recent_published_texts=recent_texts,
                sheet_id=args.sheet_id or None,
            )

        if selected_sheet_post is None:
            raise RuntimeError(
                "시트(30일_게시계획)에서 발행 가능한 대기 글을 찾지 못했습니다. (AI 자동생성 폴백 금지 상태)"
            )

        posts = list(selected_sheet_post.posts)
        has_cta = selected_sheet_post.has_cta
        if args.with_cta and not has_cta:
            posts.append(build_cta(posts[0], selected_sheet_post.category))
            has_cta = True
        thread = GeneratedThread(
            category=selected_sheet_post.category,
            topic_tag=selected_sheet_post.topic_tag,
            posts=posts,
            has_cta=has_cta,
        )
        post_images = resolve_post_images(selected_sheet_post, len(thread.posts))
        img_summary = ""
        if post_images:
            pos_label = "본문" if 0 in post_images else "CTA 답글"
            cnt = sum(len(v) for v in post_images.values())
            img_summary = f" | 이미지: {pos_label} {cnt}장"
        print(
            f"[1/2] 📋 시트 계획 로드 완료 ({selected_sheet_post.day_label}, Row {selected_sheet_post.row_number}, {time.time() - t0:.1f}초) "
            f"| 카테고리: {thread.category} | 총 {len(thread.posts)}개 글{img_summary}"
        )
    except Exception as e:
        err_msg = f"❌ <b>[Threads 시트 로드/보충 실패 — AI 폴백 차단됨]</b>\n<code>{html.escape(str(e))}</code>"
        print(f"[ERROR] 스레드 준비 실패: {e}")
        tg_notify(err_msg)
        sys.exit(1)

    # 본문 미리보기 포맷
    preview_body = thread.posts[0]
    preview_short = preview_body[:180] + ("..." if len(preview_body) > 180 else "")

    if args.no_publish:
        print("[TEST] --no-publish 모드이므로 게시하지 않고 종료합니다.")
        print("=== 생성된 글 목록 ===")
        for idx, p in enumerate(thread.posts, 1):
            imgs = post_images.get(idx - 1, [])
            img_note = f"\n  [첨부 이미지 {len(imgs)}장]: {', '.join(imgs)}" if imgs else ""
            print(f"[{idx}] {p}{img_note}\n")
        return

    # 2. Threads API 게시
    print("[2/2] 🚀 Threads API 타래 게시 중...")
    result = publish_thread(thread.posts, topic_tag=thread.topic_tag, post_images=post_images)

    if "error" in result:
        err_msg = (
            f"❌ <b>[Threads 게시 실패]</b> ({slot} 슬롯)\n"
            f"카테고리: {thread.category}\n"
            f"오류: <code>{html.escape(str(result['error']))}</code>"
        )
        print(f"[ERROR] Threads 게시 실패: {result['error']}")
        tg_notify(err_msg)
        sys.exit(1)

    permalink = result.get("permalink", "")
    mark_sheet_row_published(selected_sheet_post, permalink=permalink)

    cta_badge = " (🔗 CTA 포함)" if thread.has_cta else ""
    source_badge = f"📋 시트 계획 ({selected_sheet_post.day_label} · Row {selected_sheet_post.row_number})"
    img_line = ""
    if post_images:
        pos_label = "본문" if 0 in post_images else "CTA 답글"
        cnt = sum(len(v) for v in post_images.values())
        img_line = f"• <b>사진:</b> {pos_label} {cnt}장 첨부\n"

    success_msg = (
        f"🧵 <b>[Threads 자동 게시 완료]</b> [{thread.category}{cta_badge}]\n\n"
        f"• <b>소스:</b> {source_badge}\n"
        f"• <b>슬롯:</b> {slot.upper()}\n"
        f"{img_line}"
        f"• <b>내용:</b>\n<i>\"{html.escape(preview_short)}\"</i>\n\n"
        f"🔗 <b>스레드 바로가기:</b> <a href=\"{permalink}\">{permalink or '스레드 열기'}</a>"
    )
    tg_notify(success_msg)
    print("\n" + "=" * 65)
    print(f"🎉 Threads 타래 게시 성공! 링크: {permalink}")
    print("=" * 65)

    # 3. 발행 완료 직후 남은 시트 대기 행이 0건이면 다음 30일치 사전 자동 작성
    try:
        updated_recent = [thread.posts[0]] + recent_texts
        remaining_rows = load_sheet_rows(sheet_id=args.sheet_id or None)
        remaining_count = count_pending_posts(remaining_rows, recent_published_texts=updated_recent)
        print(f"[POST-CHECK] 📊 발행 후 시트 잔여 대기 글: {remaining_count}건")
        if remaining_count <= 0:
            print("[POST-CHECK] 📋 30일 계획이 모두 소진되어 다음 30일치(90행)를 시트에 자동 작성합니다...")
            refill_res = replenish_sheet_if_exhausted(
                recent_published_texts=updated_recent,
                threshold=0,
                force=False,
                sheet_id=args.sheet_id or None,
                min_start_date=_tomorrow_kst_str(),
            )
            if refill_res.get("refilled"):
                _notify_refill_result(refill_res, "기존 30일 계획 마지막 글 발행 완료로 다음 한 달치 자동 작성")
    except Exception as refill_err:
        warn_msg = (
            f"⚠️ <b>[Threads 다음 30일 시트 사전 보충 지연]</b>\n"
            f"오늘 글 발행은 정상 완료되었으나 다음 30일치 자동 작성 중 오류가 발생했습니다. "
            f"(다음 발행 시점에 자동 재시도됩니다)\n"
            f"<code>{html.escape(str(refill_err))}</code>"
        )
        print(f"[POST-CHECK][WARN] 다음 30일치 사전 보충 실패: {refill_err}")
        tg_notify(warn_msg)

    # 4. 토큰 자동 갱신 시도 (만료 방지 백그라운드 케어)
    try:
        ref_res = refresh_long_lived_token()
        if ref_res.get("access_token"):
            print("  🔑 [TOKEN] Threads 60일 장기 토큰 자동 갱신 완료")
    except Exception:
        pass


if __name__ == "__main__":
    main()
