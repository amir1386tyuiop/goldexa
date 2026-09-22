# Backend performance benchmark

این benchmark روی endpoint read-only اجرا می‌شود و برای ثبت baseline قبل از
استقرار استفاده می‌شود. پیش‌فرض، صد درخواست هم‌زمان‌شده به `/health` و آستانه‌ی
`p95 <= 200ms` است.

```powershell
cd backend
npm run benchmark
```

برای محیط یا endpoint دیگر:

```powershell
$env:BENCHMARK_BASE_URL = 'http://localhost:3001'
$env:BENCHMARK_PATH = '/health/ready'
$env:BENCHMARK_REQUESTS = '500'
$env:BENCHMARK_CONCURRENCY = '25'
$env:BENCHMARK_P95_LIMIT_MS = '200'
node .\scripts\benchmark-backend.mjs
```

این ابزار به endpointهای دارای mutation یا نیازمند credential دست نمی‌زند.
نتیجه فقط وقتی معتبر است که PostgreSQL و Redis با تنظیمات production-like در
حال اجرا باشند.
