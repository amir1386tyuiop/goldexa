# Goldexa AI service

این سرویس مدل‌های local، قابل توضیح و قابل آموزش دارد. بدون artifact آموزشی به
fallback قطعی برمی‌گردد؛ پس API حتی قبل از ورود داده‌ی واقعی هم پایدار می‌ماند.

## Endpointها

- `GET /health` وضعیت سرویس و آماده‌بودن artifactهای price، recommendation و matching را برمی‌گرداند.
- `POST /predict-price` با `historical_prices` (حداقل ۲ مقدار مثبت) از artifact رگرسیون خطی آموزش‌دیده استفاده می‌کند؛ در نبود artifact، خط روند محلی و volatility fallback می‌شود. `confidence` عددی بین ۰ و ۱ است.
- `POST /recommend-designs` علاوه بر سابقه، سبک و بودجه، از artifact popularity/collaborative baseline نیز استفاده می‌کند. برای ارائه‌ی catalog می‌توان `candidate_designs` شامل `product_id`، `name`، `tags` و `price` فرستاد.
- `POST /match-market` buyer/seller را با وزن‌های آموزش‌دیده‌ی category، price و location امتیازدهی می‌کند.

## آموزش مدل‌های محلی

اسکریپت `train.py` به dependency سنگین نیاز ندارد و artifactها را به‌صورت
اتمی در `AI_MODEL_DIR` ذخیره می‌کند:

```bash
python train.py --prices data/gold_prices.csv \
  --interactions data/design_interactions.csv \
  --matches data/market_matches.csv \
  --output-dir model_store
```

فایل قیمت باید ستون `price` داشته باشد؛ interactions ستون `product_id` و
matches ستون‌های `category_score,price_score,location_score,label` دارد.
مدل linear قابل ردیابی است و عمداً به‌عنوان LSTM معرفی نمی‌شود.

Swagger از مسیر `/docs` در دسترس است. اجرای محلی:

```bash
uvicorn main:app --reload --port 8000
python -m unittest -v test_main.py
```

قراردادهای اصلی `prediction`، `confidence`، `predicted_price` و `recommendations` حفظ شده‌اند؛ فیلدهای توضیحی جدید backward-compatible هستند.
