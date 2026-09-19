# Goldexa AI service

این سرویس از الگوریتم‌های local، قطعی و قابل توضیح استفاده می‌کند و مدل ML آموزش‌دیده‌ای را ادعا نمی‌کند.

## Endpointها

- `GET /health` وضعیت سرویس و mode اجرا را برمی‌گرداند.
- `POST /predict-price` با `historical_prices` (حداقل ۲ مقدار مثبت) و `days_ahead` (۱ تا ۳۶۵) یک خط روند least-squares می‌سازد. پیش‌بینی برای افق‌های بلند با volatility مشاهده‌شده تعدیل می‌شود. `confidence` عددی بین ۰ و ۱ است و از حجم داده، `R²`، نوسان و افق زمانی اثر می‌گیرد.
- `POST /recommend-designs` با `user_id`، `user_history`، `style` اختیاری و `budget` اختیاری، سابقه، سبک و بودجه را به‌صورت explainable امتیازدهی می‌کند. برای ارائه‌ی catalog می‌توان `candidate_designs` شامل `product_id`، `name`، `tags` و `price` فرستاد؛ در غیر این صورت catalog نمونه‌ی داخلی استفاده می‌شود.
- `POST /match-market` به‌صورت اختیاری buyer/seller را با دسته‌بندی، بودجه و موقعیت امتیازدهی می‌کند.

Swagger از مسیر `/docs` در دسترس است. اجرای محلی:

```bash
uvicorn main:app --reload --port 8000
python -m unittest -v test_main.py
```

قراردادهای اصلی `prediction`، `confidence`، `predicted_price` و `recommendations` حفظ شده‌اند؛ فیلدهای توضیحی جدید backward-compatible هستند.
