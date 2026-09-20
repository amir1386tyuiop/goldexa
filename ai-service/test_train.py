import json
import tempfile
import unittest
from pathlib import Path

from model_store import load_artifact
from train import fit_matching_model, fit_price_model, fit_recommendation_model


class TrainingArtifactTests(unittest.TestCase):
    def test_all_local_models_are_saved_with_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            price = fit_price_model([100, 110, 120, 130], directory)
            recommendation = fit_recommendation_model([
                {"product_id": "ring-1"},
                {"product_id": "ring-1"},
                {"product_id": "necklace-1"},
            ], directory)
            matching = fit_matching_model([
                {"category_score": "1", "price_score": "0.8", "location_score": "1", "label": "1"},
                {"category_score": "0", "price_score": "0.1", "location_score": "0", "label": "0"},
            ], directory)

            self.assertEqual(price["model_type"], "linear_regression")
            self.assertEqual(recommendation["item_scores"]["ring-1"], 2 / 3)
            self.assertEqual(matching["model_type"], "supervised_weighted_matcher")
            self.assertEqual(json.loads(Path(directory, "price_model.json").read_text(encoding="utf-8"))["samples"], 4)

            # The runtime reader uses AI_MODEL_DIR and sees the same artifacts.
            import os
            previous = os.environ.get("AI_MODEL_DIR")
            os.environ["AI_MODEL_DIR"] = directory
            try:
                self.assertEqual(load_artifact("price_model")["model_type"], "linear_regression")
            finally:
                if previous is None:
                    os.environ.pop("AI_MODEL_DIR", None)
                else:
                    os.environ["AI_MODEL_DIR"] = previous


if __name__ == "__main__":
    unittest.main()
