"""Train dependency-free Goldexa AI baseline models and save JSON artifacts.

The script uses transparent models that can be trained in the lightweight API
container. It does not pretend to be an LSTM: the saved artifacts are a linear
time-series regressor, an item-popularity collaborative baseline, and a
supervised weighted matcher. A later provider can replace each artifact
without changing the HTTP contract.
"""

from __future__ import annotations

import argparse
import csv
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from model_store import save_artifact


def fit_price_model(prices: list[float], output_dir: str | None = None) -> dict:
    if len(prices) < 2 or any(not math.isfinite(value) or value <= 0 for value in prices):
        raise ValueError("at least two finite positive prices are required")
    n = len(prices)
    x_mean = (n - 1) / 2
    y_mean = sum(prices) / n
    denominator = sum((index - x_mean) ** 2 for index in range(n))
    slope = sum((index - x_mean) * (price - y_mean) for index, price in enumerate(prices)) / denominator
    intercept = y_mean - slope * x_mean
    residual = sum((price - (intercept + slope * index)) ** 2 for index, price in enumerate(prices))
    total = sum((price - y_mean) ** 2 for price in prices)
    r_squared = 1.0 if total == 0 else max(0.0, min(1.0, 1 - residual / total))
    artifact = {
        "model_type": "linear_regression",
        "version": 1,
        "samples": n,
        "intercept": intercept,
        "slope_per_step": slope,
        "r_squared": r_squared,
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    save_artifact("price_model", artifact, output_dir)
    return artifact


def fit_recommendation_model(rows: Iterable[dict[str, str]], output_dir: str | None = None) -> dict:
    counts = Counter(row.get("product_id", "").strip() for row in rows if row.get("product_id", "").strip())
    total = sum(counts.values()) or 1
    artifact = {
        "model_type": "item_popularity_collaborative_baseline",
        "version": 1,
        "interactions": total if counts else 0,
        "item_scores": {key: value / total for key, value in counts.items()},
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    save_artifact("recommendation_model", artifact, output_dir)
    return artifact


def fit_matching_model(rows: Iterable[dict[str, str]], output_dir: str | None = None) -> dict:
    sums = Counter()
    positives = 0
    negatives = 0
    for row in rows:
        label = 1 if str(row.get("label", "0")).lower() in {"1", "true", "yes"} else 0
        for key in ("category_score", "price_score", "location_score"):
            value = max(0.0, min(1.0, float(row.get(key, 0) or 0)))
            sums[f"{key}_{label}"] += value
        positives += label
        negatives += 1 - label
    if not positives or not negatives:
        weights = {"category": 0.65, "price": 0.25, "location": 0.10}
    else:
        gaps = {key: max(0.0, sums[f"{key}_1"] / positives - sums[f"{key}_0"] / negatives) for key in ("category_score", "price_score", "location_score")}
        total_gap = sum(gaps.values()) or 1
        weights = {key.replace("_score", ""): value / total_gap for key, value in gaps.items()}
    artifact = {"model_type": "supervised_weighted_matcher", "version": 1, "weights": weights, "trained_at": datetime.now(timezone.utc).isoformat()}
    save_artifact("matching_model", artifact, output_dir)
    return artifact


def read_csv(path: str | None) -> list[dict[str, str]]:
    if not path:
        return []
    with Path(path).open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Goldexa local AI artifacts")
    parser.add_argument("--prices", help="CSV with a price column")
    parser.add_argument("--interactions", help="CSV with product_id column")
    parser.add_argument("--matches", help="CSV with category_score,price_score,location_score,label")
    parser.add_argument("--output-dir", default=None)
    args = parser.parse_args()
    if args.prices:
        rows = read_csv(args.prices)
        fit_price_model([float(row["price"]) for row in rows], args.output_dir)
    if args.interactions:
        fit_recommendation_model(read_csv(args.interactions), args.output_dir)
    if args.matches:
        fit_matching_model(read_csv(args.matches), args.output_dir)


if __name__ == "__main__":
    main()
