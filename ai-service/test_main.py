import unittest

from pydantic import ValidationError

from main import (
    DesignCandidate,
    DesignRecommendationRequest,
    MarketMatchRequest,
    MarketParty,
    PricePredictionRequest,
    _linear_baseline,
    _recommendations,
    health,
    match_market,
    predict_price,
    recommend_designs,
)


class AiServiceTests(unittest.IsolatedAsyncioTestCase):
    def test_price_baseline_follows_clear_upward_trend(self):
        result = _linear_baseline([100, 110, 120, 130], 2)
        self.assertEqual(result["predicted_price"], 150.0)
        self.assertGreater(result["confidence"], 0)

    def test_price_input_is_strictly_validated(self):
        with self.assertRaises(ValidationError):
            PricePredictionRequest(historical_prices=[100], days_ahead=14)
        with self.assertRaises(ValidationError):
            PricePredictionRequest(historical_prices=[100, -1], days_ahead=14)
        with self.assertRaises(ValidationError):
            PricePredictionRequest(historical_prices=[100, 101], days_ahead=366)

    async def test_price_response_keeps_existing_contract(self):
        result = await predict_price(PricePredictionRequest(historical_prices=[100, 110, 120], days_ahead=1))
        self.assertIn("prediction", result)
        self.assertIn("confidence", result)
        self.assertIn("predicted_price", result)
        self.assertTrue(0 <= result["confidence"] <= 1)

    def test_recommendations_explain_history_overlap(self):
        candidates = [DesignCandidate(product_id="r1", name="Gold Ring", tags=["ring", "gold"])]
        result = _recommendations(["ring", "gold", "ring"], candidates)
        self.assertEqual(result[0]["product_id"], "r1")
        self.assertEqual(result[0]["matched_features"], ["gold", "ring"])
        self.assertIn("reason", result[0])

    def test_recommendations_use_budget_and_style(self):
        candidates = [
            DesignCandidate(product_id="cheap", name="Modern Ring", tags=["ring", "modern"], price=100),
            DesignCandidate(product_id="expensive", name="Modern Ring", tags=["ring", "modern"], price=1000),
        ]
        result = _recommendations(["ring"], candidates, budget=200, style="modern")
        self.assertEqual(result[0]["product_id"], "cheap")
        self.assertEqual(result[0]["style_matches"], ["modern"])
        self.assertEqual(result[0]["budget_score"], 1.0)

    async def test_recommendation_response_keeps_existing_contract(self):
        result = await recommend_designs(DesignRecommendationRequest(user_id="u1", user_history=["ring"]))
        self.assertIn("recommendations", result)
        self.assertTrue(result["recommendations"])
        self.assertIn("product_id", result["recommendations"][0])
        self.assertIn("score", result["recommendations"][0])

    async def test_market_match_is_explainable(self):
        result = await match_market(MarketMatchRequest(
            buyer=MarketParty(id="b", categories=["ring"], preferred_price=100, location="tehran"),
            seller=MarketParty(id="s", categories=["ring", "gold"], preferred_price=90, location="tehran"),
        ))
        self.assertEqual(result["buyer_id"], "b")
        self.assertGreater(result["score"], 0.5)
        self.assertTrue(result["reasons"])

    async def test_health_describes_local_mode(self):
        result = await health()
        self.assertEqual(result["status"], "healthy")
        self.assertEqual(result["checks"]["model_store"], "fallback")
        self.assertEqual(result["models"], {"price": False, "recommendation": False, "matching": False})


if __name__ == "__main__":
    unittest.main()
