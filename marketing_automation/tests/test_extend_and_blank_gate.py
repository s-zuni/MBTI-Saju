import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

from pipeline import media_check
from pipeline.flow_extend import collapse_scenes_for_clips
from pipeline.script_gen import Scene


def _scenes(n):
    return [Scene(scene_id=i + 1, narration="가나다라마바사 " * (i + 1), visual_prompt=f"cat action {i}",
                  duration_estimate=3, media_type="video") for i in range(n)]


class CollapseTest(unittest.TestCase):
    def test_collapses_to_three_nonempty_clips(self):
        for n in (3, 4, 5, 7):
            out = collapse_scenes_for_clips(_scenes(n), 3)
            self.assertEqual([s.scene_id for s in out], [1, 2, 3])
            self.assertTrue(all(s.narration for s in out))
            self.assertTrue(all(s.visual_prompt.startswith("cat action") for s in out))
            self.assertEqual(out[0].visual_prompt, "cat action 0")

    def test_too_few_scenes_unchanged(self):
        self.assertEqual(len(collapse_scenes_for_clips(_scenes(2), 3)), 2)


class BlankTest(unittest.TestCase):
    def test_blank_vs_content(self):
        with tempfile.TemporaryDirectory() as td:
            blank = Path(td) / "b.jpg"
            Image.new("RGB", (1080, 1920), (0, 0, 0)).save(blank)
            noisy = Path(td) / "n.jpg"
            im = Image.new("RGB", (1080, 1920), (40, 40, 40))
            ImageDraw.Draw(im).ellipse([200, 500, 880, 1400], fill=(230, 190, 150))
            im.save(noisy)
            self.assertTrue(media_check.is_blank_image(blank))
            self.assertFalse(media_check.is_blank_image(noisy))
            self.assertTrue(media_check.is_blank_image(Path(td) / "missing.jpg"))


if __name__ == "__main__":
    unittest.main()
