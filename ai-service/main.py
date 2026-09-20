"""Deterministic, explainable local algorithms for the Goldexa AI service."""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Any, Dict, List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, ConfigDict, Field, field_validator
from model_store import load_artifact

app = FastAPI(title="Goldexa AI Service", version="1.2.0", description="Local, explainable AI with optional trained JSON artifacts and safe deterministic fallbacks.")


class PricePredictionRequest(BaseModel):
    historical_prices: List[float] = Field(..., min_length=2, max_length=1000)
    days_ahead: int = Field(default=14, ge=1, le=365)

    @field_validator("historical_prices")
    @classmethod
    def validate_prices(cls, prices: List[float]) -> List[float]:
        if any(not math.isfinite(price) or price <= 0 for price in prices):
            raise ValueError("historical_prices must contain only finite positive numbers")
        return prices


class DesignCandidate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = Field(..., min_length=1, max_length=100)
    name: str = Field(default="", max_length=200)
    tags: List[str] = Field(default_factory=list, max_length=20)
    price: Optional[float] = Field(default=None, gt=0)

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, tags: List[str]) -> List[str]:
        return [tag.strip().lower() for tag in tags if tag.strip()]


class DesignRecommendationRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    user_history: List[str] = Field(..., max_length=500)
    candidate_designs: List[DesignCandidate] = Field(default_factory=list, max_length=100)
    budget: Optional[float] = Field(default=None, gt=0)
    style: Optional[str] = Field(default=None, max_length=100)

    @field_validator("user_history")
    @classmethod
    def validate_history(cls, history: List[str]) -> List[str]:
        if any(not item.strip() or len(item) > 200 for item in history):
            raise ValueError("user_history entries must be non-empty strings of at most 200 characters")
        return history


class MarketParty(BaseModel):
    id: str = Field(..., min_length=1, max_length=100)
    categories: List[str] = Field(default_factory=list, max_length=30)
    preferred_price: Optional[float] = Field(default=None, gt=0)
    location: Optional[str] = Field(default=None, max_length=100)

    @field_validator("categories")
    @classmethod
    def normalize_categories(cls, categories: List[str]) -> List[str]:
        return [item.strip().lower() for item in categories if item.strip()]


class MarketMatchRequest(BaseModel):
    buyer: MarketParty
    seller: MarketParty
    listing_price: Optional[float] = Field(default=None, gt=0)


DEFAULT_DESIGNS = [
    DesignCandidate(product_id="ring-1", name="Classic Ring", tags=["ring", "classic", "gold"]),
    DesignCandidate(product_id="ring-2", name="Modern Ring", tags=["ring", "modern", "gold"]),
    DesignCandidate(product_id="necklace-1", name="Fine Necklace", tags=["necklace", "minimal", "gold"]),
    DesignCandidate(product_id="bracelet-1", name="Gold Bracelet", tags=["bracelet", "classic", "gold"]),
    DesignCandidate(product_id="earring-1", name="Minimal Earrings", tags=["earring", "minimal", "gold"]),
]


def _tokens(value: str) -> set[str]:
    return {token for token in re.findall(r"[\w\u0600-\u06ff]+", value.lower()) if len(token) > 1}


def _linear_baseline(prices: List[float], days_ahead: int) -> Dict[str, Any]:
    """Fit a least-squares line, then temper it by observed volatility."""
    n = len(prices)
    x_mean = (n - 1) / 2
    y_mean = sum(prices) / n
    denominator = sum((index - x_mean) ** 2 for index in range(n))
    slope = sum((index - x_mean) * (price - y_mean) for index, price in enumerate(prices)) / denominator
    intercept = y_mean - slope * x_mean
    fitted = [intercept + slope * index for index in range(n)]
    residual_var = sum((price - fit) ** 2 for price, fit in zip(prices, fitted)) / n
    total_var = sum((price - y_mean) ** 2 for price in prices) / n
    r_squared = max(0.0, min(1.0, 1.0 - residual_var / total_var)) if total_var else 1.0
    mean_abs_change = sum(abs(prices[i] - prices[i - 1]) for i in range(1, n)) / (n - 1)
    volatility = mean_abs_change / y_mean if y_mean else 1.0
    trained = load_artifact("price_model")
    if trained and trained.get("model_type") == "linear_regression":
        trained_slope = float(trained.get("slope_per_step", 0))
        slope = trained_slope
        raw_forecast = prices[-1] + trained_slope * days_ahead
        r_squared = max(r_squared, float(trained.get("r_squared", 0)))
        model_type = "trained_linear_regression"
    else:
        raw_forecast = intercept + slope * (n - 1 + days_ahead)
        model_type = "local_linear_baseline"
    horizon_factor = min(1.0, 30.0 / days_ahead)
    predicted = prices[-1] + (raw_forecast - prices[-1]) * horizon_factor
    confidence = 0.2 + 0.45 * min(1.0, n / 30.0) + 0.25 * r_squared
    confidence *= max(0.15, 1.0 - min(0.7, volatility * 8.0))
    confidence *= max(0.25, 1.0 - max(0, days_ahead - 14) / 365.0)
    return {"predicted_price": round(max(0.01, predicted), 2), "confidence": round(max(0.0, min(1.0, confidence)), 3), "trend_per_day": round(slope, 2), "r_squared": round(r_squared, 3), "volatility": round(volatility, 5), "model_type": model_type}


def _recommendations(
    history: List[str],
    candidates: List[DesignCandidate],
    budget: Optional[float] = None,
    style: Optional[str] = None,
) -> List[Dict[str, Any]]:
    history_tokens = [_tokens(item) for item in history]
    counts = Counter(token for item in history_tokens for token in item)
    style_tokens = _tokens(style or "")
    popularity_artifact = load_artifact("recommendation_model") or {}
    popularity_scores = popularity_artifact.get("item_scores", {}) if isinstance(popularity_artifact.get("item_scores", {}), dict) else {}
    catalog = candidates or DEFAULT_DESIGNS
    results = []
    for index, design in enumerate(catalog):
        design_tokens = set(design.tags) | _tokens(design.name)
        overlap = sorted(design_tokens & set(counts))
        style_overlap = sorted(design_tokens & style_tokens)
        preference_score = sum(counts[token] for token in overlap) / max(1, sum(counts.values()))
        style_score = len(style_overlap) / max(1, len(style_tokens)) if style_tokens else 0.5
        budget_score = 0.5
        if budget and design.price:
            budget_score = 1.0 if design.price <= budget else max(0.0, budget / design.price)
        novelty = 0.03 * (1 - index / max(1, len(catalog)))
        popularity_score = max(0.0, min(1.0, float(popularity_scores.get(design.product_id, 0))))
        score = min(1.0, 0.12 + 0.55 * preference_score + 0.15 * style_score + 0.15 * budget_score + 0.08 * popularity_score + novelty)
        reasons = [f"اشتراک با سابقه کاربر در ویژگی‌های: {', '.join(overlap)}" if overlap else "سابقه‌ی مستقیم برای این طرح پیدا نشد"]
        if style_tokens:
            reasons.append(f"تناسب سبک: {', '.join(style_overlap)}" if style_overlap else "سبک انتخابی تطابق مستقیمی نداشت")
        if budget and design.price:
            reasons.append("قیمت طرح داخل بودجه است" if design.price <= budget else "قیمت طرح بالاتر از بودجه است و امتیاز متناسب کاهش یافت")
        if popularity_score:
            reasons.append("این محصول در تعاملات آموزشی کاربران پرتکرار بوده است")
        results.append({"product_id": design.product_id, "score": round(score, 3), "reason": "؛ ".join(reasons), "matched_features": overlap, "style_matches": style_overlap, "budget_score": round(budget_score, 3), "popularity_score": round(popularity_score, 3)})
    return sorted(results, key=lambda item: (-item["score"], item["product_id"]))[:10]


@app.get("/")
async def root() -> Dict[str, str]:
    return {"message": "Goldexa AI Service is running", "mode": "local-trainable-models"}


@app.post("/predict-price")
async def predict_price(request: PricePredictionRequest) -> Dict[str, Any]:
    result = _linear_baseline(request.historical_prices, request.days_ahead)
    change = result["predicted_price"] - request.historical_prices[-1]
    threshold = max(request.historical_prices[-1] * 0.001, 0.01)
    direction = "up" if change > threshold else "down" if change < -threshold else "flat"
    return {"prediction": direction, "confidence": result["confidence"], "predicted_price": result["predicted_price"], "days_ahead": request.days_ahead, "method": result["model_type"], "model_status": "trained_artifact" if result["model_type"] == "trained_linear_regression" else "fallback", "trend_per_day": result["trend_per_day"], "r_squared": result["r_squared"], "volatility": result["volatility"], "disclaimer": "این خروجی مدل محلی است و توصیه‌ی مالی محسوب نمی‌شود."}


@app.post("/recommend-designs")
async def recommend_designs(request: DesignRecommendationRequest) -> Dict[str, Any]:
    return {"recommendations": _recommendations(request.user_history, request.candidate_designs, request.budget, request.style), "user_id": request.user_id, "method": "trained popularity collaborative baseline with explainable history scoring", "disclaimer": "این توصیه‌گر محلی و مبتنی بر artifact آموزشی و داده‌ی ارسالی است."}


@app.post("/match-market")
async def match_market(request: MarketMatchRequest) -> Dict[str, Any]:
    buyer_categories = set(request.buyer.categories)
    seller_categories = set(request.seller.categories)
    shared = sorted(buyer_categories & seller_categories)
    category_score = len(shared) / max(1, len(buyer_categories | seller_categories))
    location_score = 1.0 if request.buyer.location and request.buyer.location == request.seller.location else 0.0
    target_price = request.listing_price or request.seller.preferred_price
    price_score = 0.5
    if request.buyer.preferred_price and target_price:
        price_score = max(0.0, 1.0 - abs(request.buyer.preferred_price - target_price) / request.buyer.preferred_price)
    matching_artifact = load_artifact("matching_model") or {}
    weights = matching_artifact.get("weights", {}) if isinstance(matching_artifact.get("weights", {}), dict) else {}
    category_weight = float(weights.get("category", 0.65))
    price_weight = float(weights.get("price", 0.25))
    location_weight = float(weights.get("location", 0.10))
    weight_total = category_weight + price_weight + location_weight or 1
    score = round(max(0.0, min(1.0, (category_weight * category_score + price_weight * price_score + location_weight * location_score) / weight_total)), 3)
    reasons = [f"دسته‌های مشترک: {', '.join(shared)}" if shared else "دسته‌ی مشترک وجود ندارد"]
    if target_price and request.buyer.preferred_price:
        reasons.append(f"امتیاز بودجه بر اساس فاصله‌ی قیمت هدف ({target_price:g}) محاسبه شد")
    if location_score:
        reasons.append("موقعیت خریدار و فروشنده یکسان است")
    return {"buyer_id": request.buyer.id, "seller_id": request.seller.id, "match": score >= 0.5, "score": score, "reasons": reasons, "method": "trained weighted matcher" if matching_artifact else "weighted category, price and location matching", "weights": {"category": round(category_weight / weight_total, 3), "price": round(price_weight / weight_total, 3), "location": round(location_weight / weight_total, 3)}}


@app.get("/health")
async def health() -> Dict[str, Any]:
    artifacts = [load_artifact(name) for name in ("price_model", "recommendation_model", "matching_model")]
    return {"status": "healthy", "service": "goldexa-ai-service", "mode": "local-trainable-models", "checks": {"api": "ok", "model_store": "available" if any(artifacts) else "fallback"}, "models": {"price": bool(artifacts[0]), "recommendation": bool(artifacts[1]), "matching": bool(artifacts[2])}}
