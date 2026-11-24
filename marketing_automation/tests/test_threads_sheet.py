import datetime
import re
import sys
import unittest
from collections import Counter
from unittest import mock

from pipeline import cta
from pipeline import threads_content as tc
from pipeline import threads_runner as tr
from pipeline import threads_sheet as ts
from pipeline import threads_sheet_refill as tsr


SAMPLE_VALUES = [
    ["Day", "예정일", "슬롯", "카테고리", "토픽태그", "상태", "본문 (첫 쓰레드/훅)", "답글 1", "답글 2", "답글 3 (CTA)", "CTA 유형", "게시일시", "스레드 링크"],
    ["Day 1", "2026-11-23", "morning", "사주", "사주", "발행완료", "<이미 올라간 제목>\n\n본문 내용임", "", "", "", "없음", "2026-11-23 08:25 KST", "https://threads.net/@mbti_ju/1"],
    ["Day 1", "2026-11-23", "afternoon", "MBTI", "MBTI", "대기", "<인프피 멘탈 차이>\n\n똑같은 유형인데 완전 다름", "", "", "", "없음", "", ""],
    ["Day 1", "2026-11-23", "evening", "사주", "사주", "대기", "<헤어지고 연락 오는 사주>\n\n이유가 따로 있음", "", "", "카톡 채널로 물어봐\nhttps://pf.kakao.com/_xcdXJX/chat", "카톡1:1", "", ""],
]


class BracketTitleAndCtaPolicyTest(unittest.TestCase):
    def test_ensure_bracket_title_adds_and_normalizes_angle_brackets(self):
        self.assertEqual(
            tc._ensure_bracket_title("내년에 대박나는 사주 3가지\n\n첫째로 이럼"),
            "<내년에 대박나는 사주 3가지>\n\n첫째로 이럼",
        )
        self.assertEqual(
            tc._ensure_bracket_title("<<중복 꺽새 제목>>\n본문"),
            "<중복 꺽새 제목>\n\n본문",
        )
        self.assertEqual(
            tc._ensure_bracket_title("<이미 꺽새 제목>\n\n본문"),
            "<이미 꺽새 제목>\n\n본문",
        )

    def test_threads_ctas_have_no_price_and_no_legacy_credit_words(self):
        for kind, plans in cta.CTA_PLANS.items():
            for _, _, th_tpl in plans:
                self.assertNotRegex(th_tpl, r"\d[\d,]*\s*원")
                self.assertNotIn("크레딧", th_tpl)
                self.assertNotIn("첫 분석 무료", th_tpl)
        for v in tc.CTA_VARIANTS:
            self.assertNotRegex(v, r"\d[\d,]*\s*원")
            self.assertNotIn("크레딧", v)
            self.assertNotIn("첫 분석 무료", v)


class ThreadsSheetSelectionTest(unittest.TestCase):
    def test_parse_and_select_exact_date_slot(self):
        rows = ts.parse_scheduled_posts(SAMPLE_VALUES)
        self.assertEqual(len(rows), 3)
        self.assertEqual(ts.count_pending_posts(rows), 2)

        picked_aft = ts.select_post_from_sheet(rows, slot="afternoon", today_kst="2026-11-23")
        self.assertIsNotNone(picked_aft)
        self.assertEqual(picked_aft.row_number, 3)
        self.assertEqual(picked_aft.day_label, "Day 1")
        self.assertEqual(picked_aft.category, "MBTI")
        self.assertTrue(picked_aft.posts[0].startswith("<인프피 멘탈 차이>"))
        self.assertFalse(picked_aft.has_cta)

        picked_eve = ts.select_post_from_sheet(rows, slot="evening", today_kst="2026-11-23")
        self.assertIsNotNone(picked_eve)
        self.assertEqual(picked_eve.row_number, 4)
        self.assertTrue(picked_eve.has_cta)
        self.assertEqual(len(picked_eve.posts), 2)

    def test_skips_published_status_and_recent_threads_duplicate(self):
        rows = ts.parse_scheduled_posts(SAMPLE_VALUES)
        picked_morn = ts.select_post_from_sheet(rows, slot="morning", today_kst="2026-11-23")
        self.assertIsNone(picked_morn)

        picked_dup = ts.select_post_from_sheet(
            rows,
            slot="afternoon",
            today_kst="2026-11-23",
            recent_published_texts=["<인프피 멘탈 차이>\n\n어쩌고"],
        )
        self.assertIsNone(picked_dup)


class ThreadsSheetRefillTest(unittest.TestCase):
    def test_compute_next_plan_anchor(self):
        rows = ts.parse_scheduled_posts([
            SAMPLE_VALUES[0],
            ["Day 30", "2026-12-22", "evening", "사주", "사주", "발행완료", "<마지막 글>\n\n내용", "", "", "", "없음", "", ""],
        ])
        next_day, next_date = tsr.compute_next_plan_anchor(rows, today_kst="2026-12-22")
        self.assertEqual(next_day, 31)
        self.assertEqual(next_date, datetime.date(2026, 12, 23))

        # 기존 마지막 날짜가 과거면 min_start_date로 끌어올림
        next_day2, next_date2 = tsr.compute_next_plan_anchor(rows, today_kst="2027-01-05")
        self.assertEqual(next_day2, 31)
        self.assertEqual(next_date2, datetime.date(2027, 1, 5))

    def test_30day_blueprint_ratios_and_cta_modes(self):
        bp = tsr.build_30day_blueprint(start_day=31, start_date=datetime.date(2026, 12, 23), days=30)
        self.assertEqual(len(bp), 90)
        self.assertEqual(Counter(x.category for x in bp), Counter({"사주": 54, "MBTI": 18, "운세": 18}))
        self.assertEqual(Counter(x.cta_mode for x in bp), Counter({"direct": 30, "indirect": 48, "none": 12}))
        self.assertTrue(all(x.slot == "evening" for x in bp if x.cta_mode == "direct"))
        self.assertTrue(all(x.slot != "evening" for x in bp if x.cta_mode != "direct"))

    def test_v2_custom_cta_pricing_and_guardrails(self):
        cases = [
            ("<자미두수 명궁 귀인 특징>\n\n명반 풀이", "운세", "자미두수", "direct", 31, "990원", "jamidusu"),
            ("<내년에 대박나는 3년 대운 흐름>\n\n전환기", "사주", "사주", "direct", 32, "29,000원", "/premium"),
            ("<이번 달 이직할까 버틸까>\n\n이동운", "사주", "사주", "direct", 33, "990원", "/gold"),
            ("<부부·연인 궁합 진짜 포인트>\n\n오행", "사주", "사주", "direct", 34, "990원", "/relationship"),
            ("<썸 상대 속마음 타로 리딩>\n\n속마음", "운세", "타로", "direct", 35, "490원", "type=tarot"),
            ("<도화살 일상 증거>\n\n사람 꼬임", "사주", "사주", "indirect", 36, "무료 만세력", ""),
            ("<이번 달 연애운 타로 3택>\n\n1번 2번 3번", "운세", "타로", "indirect", 37, "490원", ""),
        ]
        for body, cat, tag, mode, dnum, expected_price, expected_url_part in cases:
            ctype, text = tsr.build_v2_custom_cta(body, cat, tag, mode, day_num=dnum)
            self.assertIn(expected_price, text)
            self.assertFalse(tc._has_polite_ending([text]), f"존댓말 감지: {text}")
            self.assertEqual(tc._clean_post(text), text)
            if mode == "direct":
                self.assertIn(expected_url_part, text)
                self.assertTrue(ctype.startswith("직접-"))
            else:
                self.assertNotIn("http", text)
                self.assertNotIn("mbtiju.com", text)
                self.assertTrue(ctype.startswith("간접-"))

        # 카톡 1:1 상담은 가격 미표기(질문 1회 무료) 규칙 검증
        ctype_k, text_k = tsr.build_v2_custom_cta(
            "<재회 연락 올지 고민되는 사주>\n\n헤어지고 반복 고민",
            "사주",
            "사주",
            "direct",
            day_num=1,
        )
        self.assertEqual(ctype_k, "직접-카톡1:1")
        self.assertIn("pf.kakao.com", text_k)
        self.assertIn("질문 1회 무료", text_k)
        self.assertNotRegex(text_k, r"\d[\d,]*\s*원")

    def test_generate_30day_sheet_rows_with_mock_llm(self):
        existing = ts.parse_scheduled_posts(SAMPLE_VALUES)

        def fake_llm(system_prompt, user_prompt, schema, temperature=0.9, model_name=None):
            items = []
            for m in re.finditer(r"- Day (\d+) \([^)]+\) \| slot=(morning|afternoon|evening) \| 카테고리=([^|]+) \| 태그=([^|]+)", user_prompt):
                d = int(m.group(1))
                sl = m.group(2)
                tag = m.group(4).strip()
                if tag == "타로":
                    items.append(
                        tsr.GeneratedSlotItem(
                            day_num=d,
                            slot=sl,
                            main_post=f"<Day {d} {sl} 타로 3택 테스트>\n\n1번 / 2번 / 3번 중 하나 골라봐",
                            reply1="1번 고른 사람\n\n좋은 소식 올 흐름임",
                            reply2="2번 고른 사람\n\n조금 기다려라\n\n3번 고른 사람\n\n먼저 연락해봐",
                        )
                    )
                else:
                    items.append(
                        tsr.GeneratedSlotItem(
                            day_num=d,
                            slot=sl,
                            main_post=f"<Day {d} {sl} {tag} 사찰 팩폭>\n\n일상 특징 3가지임\n너도 해당됨?",
                            reply1="",
                            reply2="",
                        )
                    )
            return tsr.GeneratedBatchPlan(items=items)

        rows_values, s_day, e_day = tsr.generate_30day_sheet_rows(
            existing_rows=existing,
            days=30,
            today_kst="2026-11-24",
            llm_caller=fake_llm,
        )
        self.assertEqual(len(rows_values), 90)
        self.assertEqual((s_day, e_day), (2, 31))
        # 직접 링크 정확히 30개 (전부 evening), 간접 유도 48개 (URL 0개), 없음 12개
        direct = [r for r in rows_values if "http" in r[9]]
        indirect = [r for r in rows_values if r[9] and "http" not in r[9]]
        none_rows = [r for r in rows_values if not r[9]]
        self.assertEqual(len(direct), 30)
        self.assertTrue(all(r[2] == "evening" for r in direct))
        self.assertEqual(len(indirect), 48)
        self.assertEqual(len(none_rows), 12)
        # 시트 파서로 다시 읽었을 때 90행 정상 파싱
        reparsed = ts.parse_scheduled_posts([SAMPLE_VALUES[0]] + rows_values)
        self.assertEqual(len(reparsed), 90)


class ThreadsRunnerNoFallbackTest(unittest.TestCase):
    def test_generate_mode_is_blocked(self):
        with mock.patch.object(sys, "argv", ["threads_runner", "--mode", "generate"]), \
             mock.patch.object(tr, "tg_notify") as mock_tg:
            with self.assertRaises(SystemExit) as ctx:
                tr.main()
            self.assertEqual(ctx.exception.code, 1)
            mock_tg.assert_called_once()
            self.assertIn("금지", mock_tg.call_args[0][0])

    def test_exhausted_sheet_triggers_30day_refill_instead_of_ai_fallback(self):
        new_post = ts.ScheduledSheetPost(
            row_number=92,
            day_label="Day 31",
            scheduled_date="2026-12-23",
            slot="morning",
            category="사주",
            topic_tag="사주",
            status="대기",
            posts=["<Day 31 새 시트 글>\n\n본문 내용임"],
            cta_kind="간접-무료만세력",
            has_cta=True,
            col_map={"status": 5, "published_at": 11, "permalink": 12},
        )
        with mock.patch.object(sys, "argv", ["threads_runner", "--slot", "morning"]), \
             mock.patch("pipeline.threads_publisher.get_recent_threads", return_value=[]), \
             mock.patch("pipeline.threads_sheet.load_and_pick_scheduled_post", side_effect=[None, new_post]) as mock_pick, \
             mock.patch("pipeline.threads_sheet_refill.replenish_sheet_if_exhausted", return_value={
                 "refilled": True, "added_rows": 90, "start_day": 31, "end_day": 60,
                 "start_date": "2026-12-23", "end_date": "2027-01-21",
             }) as mock_refill, \
             mock.patch("pipeline.threads_content.generate_threads_thread") as mock_ai_fallback, \
             mock.patch("pipeline.threads_publisher.publish_thread", return_value={"permalink": "https://threads.com/p/1"}) as mock_pub, \
             mock.patch("pipeline.threads_sheet.mark_sheet_row_published") as mock_mark, \
             mock.patch("pipeline.threads_sheet.load_sheet_rows", return_value=[new_post]), \
             mock.patch("pipeline.threads_sheet.count_pending_posts", return_value=89), \
             mock.patch("pipeline.threads_publisher.refresh_long_lived_token", return_value={}), \
             mock.patch.object(tr, "tg_notify"):
            tr.main()
            mock_ai_fallback.assert_not_called()
            mock_refill.assert_called_once()
            self.assertEqual(mock_pick.call_count, 2)
            mock_pub.assert_called_once()
            mock_mark.assert_called_once()

    def test_post_publish_refills_next_30days_when_last_row_consumed(self):
        last_post = ts.ScheduledSheetPost(
            row_number=91,
            day_label="Day 30",
            scheduled_date="2026-12-22",
            slot="evening",
            category="사주",
            topic_tag="사주",
            status="대기",
            posts=["<Day 30 마지막 글>\n\n본문 내용임"],
            cta_kind="직접-카톡1:1",
            has_cta=True,
            col_map={"status": 5, "published_at": 11, "permalink": 12},
        )
        with mock.patch.object(sys, "argv", ["threads_runner", "--slot", "evening"]), \
             mock.patch("pipeline.threads_publisher.get_recent_threads", return_value=[]), \
             mock.patch("pipeline.threads_sheet.load_and_pick_scheduled_post", return_value=last_post), \
             mock.patch("pipeline.threads_sheet_refill.replenish_sheet_if_exhausted", return_value={
                 "refilled": True, "added_rows": 90, "start_day": 31, "end_day": 60,
                 "start_date": "2026-12-23", "end_date": "2027-01-21",
             }) as mock_refill, \
             mock.patch("pipeline.threads_publisher.publish_thread", return_value={"permalink": "https://threads.com/p/91"}), \
             mock.patch("pipeline.threads_sheet.mark_sheet_row_published"), \
             mock.patch("pipeline.threads_sheet.load_sheet_rows", return_value=[]), \
             mock.patch("pipeline.threads_sheet.count_pending_posts", return_value=0), \
             mock.patch("pipeline.threads_publisher.refresh_long_lived_token", return_value={}), \
             mock.patch.object(tr, "tg_notify"):
            tr.main()
            mock_refill.assert_called_once()


if __name__ == "__main__":
    unittest.main()
