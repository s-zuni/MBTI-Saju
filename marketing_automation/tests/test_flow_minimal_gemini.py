import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from PIL import Image

from pipeline import flow_automation as fa
from pipeline import visual_gen as vg
from pipeline import visual_theme as vt
from pipeline.script_gen import Scene


def _write_dummy_jpg(path: Path) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (1080, 1920), (30, 40, 50)).save(path, "JPEG")
    return True


class MinimalGeminiApiPolicyTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.img_dir = self.root / "images"
        self.vid_dir = self.root / "videos"
        self.img_dir.mkdir(parents=True)
        self.vid_dir.mkdir(parents=True)
        self.addCleanup(self.tmp.cleanup)

    def test_flow_maximizes_content_scenes_and_reuses_for_cta_without_gemini_api(self):
        scenes = [
            Scene(scene_id=1, narration="첫째, 퇴근하자마자 알림부터 꺼요.", visual_prompt="scene 1", duration_estimate=3, media_type="video"),
            Scene(scene_id=2, narration="둘째, 약속 취소되면 속으로 환호해요.", visual_prompt="scene 2", duration_estimate=3, media_type="video"),
            Scene(scene_id=3, narration="셋째, 사실 사주에 이런 기운이 있어서 그래요.", visual_prompt="scene 3", duration_estimate=3, media_type="image"),
            Scene(scene_id=4, narration="댓글에 사주 남기거나 프로필 링크에서 무료로 확인해보세요!", visual_prompt="cta scene", duration_estimate=4, media_type="image"),
        ]

        seen_tasks = []

        def fake_batch(tasks, out_dir, visual_theme=None):
            seen_tasks.extend(tasks)
            out = {}
            for sid, _ in tasks:
                vp = out_dir / f"scene_{sid:02d}_raw.mp4"
                vp.write_bytes(b"0" * 50_000)
                out[sid] = vp
            return out

        def fake_extract(video_path, output_jpg_path, seek_sec="0.15"):
            return _write_dummy_jpg(output_jpg_path)

        env = {
            "USE_GOOGLE_FLOW": "true",
            "GEMINI_API_KEY": "fake-key-should-not-be-used-for-media",
            "IMAGE_ENGINE": "gemini",
        }
        # Ensure ALLOW_GEMINI_MEDIA_API & VIDEO_HOOK_SCENES are not set
        cleaned_env = {k: v for k, v in os.environ.items() if k not in ("ALLOW_GEMINI_MEDIA_API", "VIDEO_HOOK_SCENES", "REUSE_FLOW_FOR_CTA")}
        cleaned_env.update(env)

        with (
            mock.patch.dict(os.environ, cleaned_env, clear=True),
            mock.patch.object(fa, "acquire_scene_videos_batch", side_effect=fake_batch),
            mock.patch.object(vg, "extract_first_frame_from_video", side_effect=fake_extract),
            mock.patch.object(vg, "generate_with_gemini_nanobanana") as m_nano,
            mock.patch.object(vg, "generate_with_vertex_imagen") as m_vertex,
            mock.patch.object(vg, "generate_with_pollinations_flux") as m_flux,
            mock.patch.object(vg, "compose_reels_frame"),
        ):
            res = vg.generate_scene_images(scenes, output_dir=self.img_dir, title="테스트 제목")

        # 씬 1, 2, 3만 Flow 배치에 들어가고 마지막 CTA(씬 4)는 재활용되므로 Flow에 보내지 않음
        self.assertEqual([sid for sid, _ in seen_tasks], [1, 2, 3])
        # 씬 4(CTA)도 앞선 Flow 비디오 클립(씬 3)을 재활용해 video_paths에 연결됨
        self.assertEqual(set(res.video_paths.keys()), {1, 2, 3, 4})
        self.assertEqual(res.placeholder_count, 0)
        # Gemini 이미지 API / Vertex / Flux는 단 한 번도 호출되지 않음
        m_nano.assert_not_called()
        m_vertex.assert_not_called()
        m_flux.assert_not_called()

    def test_gemini_media_api_never_called_even_when_flux_fails_unless_opted_in(self):
        scenes = [
            Scene(scene_id=1, narration="훅 장면", visual_prompt="scene 1", duration_estimate=3, media_type="video"),
            Scene(scene_id=2, narration="본문 장면", visual_prompt="scene 2", duration_estimate=3, media_type="image"),
        ]

        def fake_batch(tasks, out_dir, visual_theme=None):
            vp = out_dir / "scene_01_raw.mp4"
            vp.write_bytes(b"0" * 50_000)
            return {1: vp}

        def fake_extract(video_path, output_jpg_path, seek_sec="0.15"):
            return _write_dummy_jpg(output_jpg_path)

        cleaned_env = {k: v for k, v in os.environ.items() if k != "ALLOW_GEMINI_MEDIA_API"}
        cleaned_env.update({
            "USE_GOOGLE_FLOW": "true",
            "VIDEO_HOOK_SCENES": "1",
            "GEMINI_API_KEY": "fake-key",
            "IMAGE_ENGINE": "gemini",
        })

        with (
            mock.patch.dict(os.environ, cleaned_env, clear=True),
            mock.patch.object(fa, "acquire_scene_videos_batch", side_effect=fake_batch),
            mock.patch.object(vg, "extract_first_frame_from_video", side_effect=fake_extract),
            mock.patch.object(vg, "generate_with_pollinations_flux", return_value=False) as m_flux,
            mock.patch.object(vg, "generate_with_gemini_nanobanana") as m_nano,
            mock.patch.object(vg, "generate_with_vertex_imagen") as m_vertex,
            mock.patch.object(vg, "compose_reels_frame"),
        ):
            res = vg.generate_scene_images(scenes, output_dir=self.img_dir, title="테스트")

        # 무료 FLUX 실패 후에도 Gemini API를 부르지 않고 씬 1 Flow 영상 프레임을 재활용해 placeholder_count=0
        m_flux.assert_called_once()
        m_nano.assert_not_called()
        m_vertex.assert_not_called()
        self.assertEqual(res.placeholder_count, 0)

    def test_gemini_media_api_called_only_when_explicitly_allowed(self):
        scenes = [
            Scene(scene_id=1, narration="본문 장면", visual_prompt="scene 1", duration_estimate=3, media_type="image"),
        ]
        with (
            mock.patch.dict(os.environ, {
                "USE_GOOGLE_FLOW": "false",
                "VIDEO_HOOK_SCENES": "0",
                "ALLOW_GEMINI_MEDIA_API": "true",
                "GEMINI_API_KEY": "fake-key",
                "IMAGE_ENGINE": "gemini",
            }, clear=True),
            mock.patch.object(vg, "generate_with_gemini_nanobanana", side_effect=lambda p, out, **kw: _write_dummy_jpg(out)) as m_nano,
            mock.patch.object(vg, "compose_reels_frame"),
        ):
            res = vg.generate_scene_images(scenes, output_dir=self.img_dir, title="테스트")

        m_nano.assert_called_once()
        self.assertEqual(res.placeholder_count, 0)

    def test_veo_api_requires_both_flags(self):
        out = self.vid_dir / "veo.mp4"
        with mock.patch.dict(os.environ, {"USE_VEO_API": "true", "GEMINI_API_KEY": "fake-key"}, clear=True):
            self.assertFalse(fa.generate_with_veo_api("prompt", out))


class VisualThemeRatioAndCharacterTest(unittest.TestCase):
    def test_10_video_deck_has_8_human_and_2_animal_without_consecutive_animals(self):
        for _ in range(20):
            deck = vt._build_10_video_deck()
            self.assertEqual(len(deck), 10)
            self.assertEqual(deck.count("human"), 8)
            self.assertEqual(deck.count("animal"), 2)
            # 2연속 animal 방지 확인
            self.assertFalse(any(deck[i] == "animal" and deck[i + 1] == "animal" for i in range(9)))

    def test_animal_mode_enforces_same_character_across_all_scenes(self):
        scenes = [
            Scene(scene_id=1, narration="첫째", visual_prompt="A Korean woman in her 20s at a cafe", duration_estimate=3, media_type="video"),
            Scene(scene_id=2, narration="둘째", visual_prompt="hands holding iced americano", duration_estimate=3, media_type="image"),
            Scene(scene_id=3, narration="마지막", visual_prompt="two young korean women looking at smartphone", duration_estimate=4, media_type="image"),
        ]
        vt.enforce_scene_visual_consistency(scenes, "animal")
        anchor = vt.get_animal_character_anchor()
        for sc in scenes:
            self.assertIn(anchor, sc.visual_prompt)
            self.assertNotIn("korean woman", sc.visual_prompt.lower())
            self.assertNotIn("korean women", sc.visual_prompt.lower())

    def test_github_actions_deterministic_8_to_2_ratio_without_state_file(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(vt, "STATE_FILE", Path(d) / "missing_queue.json"):
            themes = []
            for run_num in range(1, 11):
                with mock.patch.dict(os.environ, {"VISUAL_THEME": "auto", "GITHUB_RUN_NUMBER": str(run_num)}, clear=False):
                    themes.append(vt.resolve_visual_theme("auto", consume_queue=True))
        self.assertEqual(themes.count("human"), 8)
        self.assertEqual(themes.count("animal"), 2)

    def test_flow_storage_state_b64_decoding_and_omni_prompt(self):
        import base64
        sample_state = b'{"cookies": [], "origins": []}'
        b64_val = base64.b64encode(sample_state).decode("ascii")
        with mock.patch.dict(os.environ, {"FLOW_STORAGE_STATE_B64": b64_val}, clear=False):
            p = fa.FlowBrowserSession._resolve_storage_state_path()
            self.assertIsNotNone(p)
            self.assertEqual(p.read_bytes(), sample_state)
        omni_prompt = vt.format_flow_prompt("Korean woman drinking coffee", "human")
        self.assertIn("realistic physics", omni_prompt)


if __name__ == "__main__":
    unittest.main()
