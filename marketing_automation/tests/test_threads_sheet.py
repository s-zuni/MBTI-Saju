import datetime
import re
import sys
import unittest
from collections import Counter
from unittest import mock

from pipeline import cta
from pipeline import threads_content as tc
from pipeline import threads_publisher as tp
from pipeline import threads_runner as tr
from pipeline import threads_sheet as ts
from pipeline import threads_sheet_refill as tsr


SAMPLE_VALUES = [
    ["Day", "예정일", "슬롯", "카테고리", "토픽태그", "상태", "본문 (첫 쓰레드/훅)", "답글 1", "답글 2", "답글 3 (CTA)", "CTA 유형", "게시일시", "스레드 링크", "이미지 URL", "이미지 위치"],
    ["Day 1", "2026-11-23", "morning", "사주", "사주", "발행완료", "<이미 올라간 제목>\n\n본문 내용임", "", "", "", "없음", "2026-11-23 08:25 KST", "https://threads.net/@mbti_ju/1", "", ""],
    ["Day 1", "2026-11-23", "afternoon", "사주", "사주", "대기", "<말랑 사주 메이트 본캐 찾기>\n\n모찌랑 보리 차이", "", "", "프로필에서 무료 만세력 분석이랑 메이트 미리보기 찍고 가", "간접-사주메이트무료", "", "", "https://www.mbtiju.com/images/saju-mates/mochi.jpg, https://www.mbtiju.com/images/saju-mates/bory.jpg", "본문"],
    ["Day 1", "2026-11-23", "evening", "사주", "사주", "대기", "<헤어지고 연락 오는 사주>\n\n이유가 따로 있음", "", "", "카톡 채널로 물어봐\nhttps://pf.kakao.com/_xcdXJX/chat", "직접-카톡1:1무료", "", "", "https://www.mbtiju.com/og-image.png", "CTA"],
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
                self.assertNotIn("AI 분석", th_tpl)
        for v in tc.CTA_VARIANTS:
            self.assertNotRegex(v, r"\d[\d,]*\s*원")
            self.assertNotIn("크레딧", v)
            self.assertNotIn("첫 분석 무료", v)
            self.assertNotIn("AI 분석", v)


class ThreadsSheetSelectionAndImagesTest(unittest.TestCase):
    def test_parse_and_select_with_image_positions(self):
        rows = ts.parse_scheduled_posts(SAMPLE_VALUES)
        self.assertEqual(len(rows), 3)
        self.assertEqual(ts.count_pending_posts(rows), 2)

        picked_aft = ts.select_post_from_sheet(rows, slot="afternoon", today_kst="2026-11-23")
        self.assertIsNotNone(picked_aft)
        self.assertEqual(picked_aft.image_target, "main")
        self.assertEqual(len(picked_aft.image_urls), 2)
        self.assertEqual(
            ts.resolve_post_images(picked_aft, len(picked_aft.posts)),
            {0: picked_aft.image_urls},
        )

        picked_eve = ts.select_post_from_sheet(rows, slot="evening", today_kst="2026-11-23")
        self.assertIsNotNone(picked_eve)
        self.assertEqual(picked_eve.image_target, "cta")
        self.assertEqual(
            ts.resolve_post_images(picked_eve, len(picked_eve.posts)),
            {1: ["https://www.mbtiju.com/og-image.png"]},
        )

    def test_skips_published_status_and_recent_threads_duplicate(self):
        rows = ts.parse_scheduled_posts(SAMPLE_VALUES)
        picked_morn = ts.select_post_from_sheet(rows, slot="morning", today_kst="2026-11-23")
        self.assertIsNone(picked_morn)

        picked_dup = ts.select_post_from_sheet(
            rows,
            slot="afternoon",
            today_kst="2026-11-23",
            recent_published_texts=["<말랑 사주 메이트 본캐 찾기>\n\n어쩌고"],
        )
        self.assertIsNone(picked_dup)


class ThreadsPublisherImagePayloadTest(unittest.TestCase):
    def test_publish_single_image_on_cta_reply(self):
        fake_post_resp_text = mock.Mock(ok=True, json=lambda: {"id": "c_text"})
        fake_pub_resp_text = mock.Mock(ok=True, json=lambda: {"id": "p_main"})
        fake_post_resp_img = mock.Mock(ok=True, json=lambda: {"id": "c_img"})
        fake_pub_resp_img = mock.Mock(ok=True, json=lambda: {"id": "p_reply"})
        fake_get_ready = mock.Mock(ok=True, json=lambda: {"status": "FINISHED", "permalink": "https://threads.com/p/main"})

        with mock.patch("pipeline.threads_publisher.requests.post", side_effect=[
            fake_post_resp_text, fake_pub_resp_text, fake_post_resp_img, fake_pub_resp_img,
        ]) as mock_post, \
             mock.patch("pipeline.threads_publisher.requests.get", return_value=fake_get_ready), \
             mock.patch("pipeline.threads_publisher.time.sleep"):
            res = tp.publish_thread(
                ["<본문>\n\n내용", "CTA 답글"],
                topic_tag="사주",
                user_id="u1",
                access_token="tok1",
                post_images={1: ["https://www.mbtiju.com/assets/premium/report-natal.jpg"]},
            )
            self.assertNotIn("error", res)
            self.assertEqual(res["ids"], ["p_main", "p_reply"])
            # 첫 글은 TEXT, 두 번째(CTA 답글)는 IMAGE + reply_to_id
            first_data = mock_post.call_args_list[0].kwargs["data"]
            second_data = mock_post.call_args_list[2].kwargs["data"]
            self.assertEqual(first_data["media_type"], "TEXT")
            self.assertEqual(second_data["media_type"], "IMAGE")
            self.assertEqual(second_data["reply_to_id"], "p_main")
            self.assertEqual(second_data["image_url"], "https://www.mbtiju.com/assets/premium/report-natal.jpg")

    def test_publish_carousel_on_main_post(self):
        responses = [
            mock.Mock(ok=True, json=lambda: {"id": "child_1"}),
            mock.Mock(ok=True, json=lambda: {"id": "child_2"}),
            mock.Mock(ok=True, json=lambda: {"id": "parent_car"}),
            mock.Mock(ok=True, json=lambda: {"id": "p_car"}),
        ]
        fake_get = mock.Mock(ok=True, json=lambda: {"status": "FINISHED", "permalink": "https://threads.com/p/car"})

        with mock.patch("pipeline.threads_publisher.requests.post", side_effect=responses) as mock_post, \
             mock.patch("pipeline.threads_publisher.requests.get", return_value=fake_get), \
             mock.patch("pipeline.threads_publisher.time.sleep"):
            res = tp.publish_thread(
                ["<말랑 사주 메이트>\n\n내용"],
                topic_tag="사주",
                user_id="u1",
                access_token="tok1",
                post_images={0: [
                    "https://www.mbtiju.com/images/saju-mates/mochi.jpg",
                    "https://www.mbtiju.com/images/saju-mates/bory.jpg",
                ]},
            )
            self.assertNotIn("error", res)
            self.assertEqual(mock_post.call_args_list[0].kwargs["data"]["is_carousel_item"], "true")
            self.assertEqual(mock_post.call_args_list[2].kwargs["data"]["media_type"], "CAROUSEL")
            self.assertEqual(mock_post.call_args_list[2].kwargs["data"]["children"], "child_1,child_2")


FILLER = "카톡 알림 떠도 미리보기로만 읽고 세 시간 뒤에 답장함 " * 4


class ThreadsSheetRefillTest(unittest.TestCase):
    def test_compute_next_plan_anchor(self):
        rows = ts.parse_scheduled_posts([
            SAMPLE_VALUES[0],
            ["Day 30", "2026-12-22", "evening", "사주", "사주", "발행완료", "<마지막 글>\n\n내용", "", "", "", "없음", "", "", "", ""],
        ])
        next_day, next_date = tsr.compute_next_plan_anchor(rows, today_kst="2026-12-22")
        self.assertEqual(next_day, 31)
        self.assertEqual(next_date, datetime.date(2026, 12, 23))

        next_day2, next_date2 = tsr.compute_next_plan_anchor(rows, today_kst="2027-01-05")
        self.assertEqual(next_day2, 31)
        self.assertEqual(next_date2, datetime.date(2027, 1, 5))

    def test_30day_blueprint_ratios_and_mate_slots(self):
        bp = tsr.build_30day_blueprint(start_day=31, start_date=datetime.date(2026, 12, 23), days=30)
        self.assertEqual(len(bp), 90)
        self.assertEqual(Counter(x.category for x in bp), Counter({"사주": 54, "MBTI": 18, "운세": 18}))
        self.assertEqual(Counter(x.cta_mode for x in bp), Counter({"direct": 30, "indirect": 48, "none": 12}))
        self.assertEqual(sum(1 for x in bp if x.is_mate), 6)

    def test_free_focus_cta_has_no_price_and_proper_image_target(self):
        cases = [
            ("<내년에 대박나는 3년 대운 흐름>\n\n전환기", "사주", "사주", "direct", 32, False, "/premium", "CTA"),
            ("<재회 연락 올지 고민되는 사주>\n\n이별", "사주", "사주", "direct", 33, False, "pf.kakao.com", "CTA"),
            ("<도화살 일상 증거>\n\n사람 꼬임", "사주", "사주", "indirect", 36, False, "", "CTA"),
            ("<말랑 사주 메이트 모찌 vs 보리>\n\n오행", "사주", "사주", "indirect", 37, True, "", "본문"),
        ]
        for body, cat, tag, mode, dnum, is_mate, expected_url, expected_pos in cases:
            ctype, text = tsr.build_v2_custom_cta(body, cat, tag, mode, day_num=dnum, is_mate=is_mate)
            self.assertNotRegex(text, r"\d[\d,]*\s*원")
            self.assertNotIn("AI 분석", text)
            self.assertIn("무료", text)
            self.assertFalse(tc._has_polite_ending([text]))
            if expected_url:
                self.assertIn(expected_url, text)
            else:
                self.assertNotIn("http", text)
            img_urls, img_pos = tsr.pick_service_images_for_row(ctype, text, is_mate=is_mate, day_num=dnum)
            self.assertTrue(bool(img_urls))
            self.assertEqual(img_pos, expected_pos)

    def test_body_quality_rejects_title_only_hanja_and_polite(self):
        self.assertIn("본문 부족", tsr._body_quality_issue("<제목만 있는 글>"))
        self.assertEqual(tsr._body_quality_issue("<제목>\n\n" + FILLER), "")
        self.assertEqual(tsr._body_quality_issue("<제목>\n\n" + FILLER + " 丙"), "한자 포함")
        cleaned = tsr._sanitize_generated_body("<제목>\n\n정미(丁未)년은 목(木) 기운 얘기임\n" + FILLER)
        self.assertNotRegex(cleaned, r"[一-鿿]")

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
                            main_post=f"<Day {d} {sl} 타로 3택 테스트>\n\n" + FILLER + "\n\n1번 / 2번 / 3번 중 하나 골라봐",
                            reply1="1번 고른 사람\n\n좋은 소식 올 흐름임",
                            reply2="2번 고른 사람\n\n조금 기다려라\n\n3번 고른 사람\n\n먼저 연락해봐",
                        )
                    )
                else:
                    items.append(
                        tsr.GeneratedSlotItem(
                            day_num=d,
                            slot=sl,
                            main_post=f"<Day {d} {sl} {tag} 사찰 팩폭>\n\n일상 특징 3가지임\n" + FILLER + "\n너도 해당됨?",
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
        self.assertTrue(all(len(r) == 15 for r in rows_values))
        # 가격 언급 0건
        self.assertFalse(any(re.search(r"\d[\d,]*\s*원", r[9]) for r in rows_values))
        # 본문 이미지 6편(말랑 사주 메이트), CTA 이미지 72편, 이미지 없음 12편
        self.assertEqual(sum(1 for r in rows_values if r[14] == "본문"), 6)
        self.assertEqual(sum(1 for r in rows_values if r[14] == "CTA"), 72)
        self.assertEqual(sum(1 for r in rows_values if r[14] == ""), 12)
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
            posts=["<Day 31 새 시트 글>\n\n본문 내용임", "프로필에서 무료 만세력 분석 하고 가"],
            cta_kind="간접-무료만세력",
            has_cta=True,
            col_map={"status": 5, "published_at": 11, "permalink": 12},
            image_urls=["https://www.mbtiju.com/assets/premium/report-natal.jpg"],
            image_target="cta",
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
            self.assertEqual(
                mock_pub.call_args.kwargs["post_images"],
                {1: ["https://www.mbtiju.com/assets/premium/report-natal.jpg"]},
            )
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
            cta_kind="직접-카톡1:1무료",
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
