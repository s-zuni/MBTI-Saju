import os
import unittest
from unittest import mock

from pipeline import cta
from pipeline import threads_content as tc
from pipeline import threads_sheet as ts


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
        # morning 행은 상태='발행완료' 이므로 선택되지 않고 None 반환
        picked_morn = ts.select_post_from_sheet(rows, slot="morning", today_kst="2026-11-23")
        self.assertIsNone(picked_morn)

        # 상태는 '대기'여도 이미 Threads API 최근 글에 동일 제목이 있으면 건너뜀
        picked_dup = ts.select_post_from_sheet(
            rows,
            slot="afternoon",
            today_kst="2026-11-23",
            recent_published_texts=["<인프피 멘탈 차이>\n\n어쩌고"],
        )
        self.assertIsNone(picked_dup)


if __name__ == "__main__":
    unittest.main()
