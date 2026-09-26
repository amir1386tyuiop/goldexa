# راهنمای اجرای امن MVP و استقرار production

این راهنما چک‌لیست عملیاتی است؛ اجرای production فقط با secret manager، TLS و
database مستقل مجاز است.

1. از PostgreSQL و Redis جداگانه برای test استفاده کنید و `database/seed.sql` را فقط روی database توسعه اجرا کنید.
2. در production هیچ secret پیش‌فرضی قابل‌قبول نیست. `JWT_SECRET` باید تصادفی، خارج از git و حداقل ۳۲ کاراکتر باشد؛ `FRONTEND_URL` و `APP_BASE_URL` باید origin کامل HTTPS باشند. برنامه در صورت نبودن این مقادیر fail-closed می‌شود.
3. در development/test می‌توان از mock استفاده کرد؛ production باید `PAYMENT_MODE` غیر mock و merchant واقعی/ sandbox تأییدشده داشته باشد. refund آنلاین بدون provider واقعی عمداً رد می‌شود.
4. پیش از استفاده:

```powershell
cd backend
npm ci
npm run migration:run
npm run build
npm test -- --runInBand
$env:ENFORCE_SECURITY_TESTS = '1'
npm run test:security
```

5. تا pass شدن security gate و اجرای e2e روی test environment، endpointهای مالی و مدیریتی را در اختیار کاربر واقعی قرار ندهید.

برای اجرای E2E واقعی روی stack ایزوله‌ی PostgreSQL/Redis در Windows PowerShell:

```powershell
docker compose -f backend/test/docker-compose.e2e.yml up -d --build
$env:E2E_BASE_URL='http://localhost:3011'
$env:E2E_ALLOW_DB_FIXTURES='1'
$env:DB_HOST='localhost'; $env:DB_PORT='55432'
$env:DB_USERNAME='goldeksa_e2e'; $env:DB_PASSWORD='goldeksa_e2e_only'; $env:DB_DATABASE='goldeksa_e2e'
cd backend
npm run test:e2e -- --runInBand
```

در پایان stack تست را با `docker compose -f backend/test/docker-compose.e2e.yml down -v` جمع کنید؛ این volume فقط متعلق به محیط E2E است.

## کنترل‌های runtime

- CORS فقط originهای صریح `FRONTEND_URL` را می‌پذیرد؛ wildcard و origin نامعتبر رد می‌شود.
- در production originهای HTTP رد می‌شوند.
- headerهای `X-Content-Type-Options`، `X-Frame-Options`، `Referrer-Policy`،
  `Permissions-Policy`، `Cross-Origin-Resource-Policy` و CSP پایه فعال‌اند؛ HSTS
  فقط در production ارسال می‌شود.
- `/health` برای liveness و healthcheck Docker است؛ `/metrics` فقط metrics
  فرایند را برمی‌گرداند و نباید بدون reverse proxy و کنترل دسترسی عمومی expose شود.

## استقرار با compose production-like

```bash
cp .env.example .env
# تمام CHANGE_ME ها را با secret manager یا مقادیر تصادفی جایگزین کنید.
docker compose -f infra/docker-compose.yml config --quiet
docker compose -f infra/docker-compose.yml up -d --build
curl --fail https://api.example.com/health
```

پیش از استقرار:

1. PostgreSQL/Redis/RabbitMQ را private نگه دارید و فقط reverse proxy را public کنید.
2. TLS را در reverse proxy terminate کنید و `FRONTEND_URL` را با همان HTTPS origin تنظیم کنید.
3. migration را یک‌بار و به‌صورت کنترل‌شده اجرا کنید؛ `schema.sql` و `seed.sql` توسعه را در production mount نکنید.
4. backup رمزگذاری‌شده PostgreSQL و آزمون restore ثبت‌شده داشته باشید.
5. بعد از deploy، وضعیت `docker compose ps` و `/health` را بررسی کنید و لاگ‌های
   migration/backend را نگه دارید.

## CI/CD

فایل `.github/workflows/ci.yml` روی pull request و push به `main`/`develop`، backend
lint/build/unit/security، E2E واقعی PostgreSQL/Redis، frontend lint/build/audit،
compose validation و Docker build را اجرا می‌کند. Dependabot نیز dependencyهای
Node، Python و Docker را هفتگی بررسی می‌کند. merge فقط بعد از سبز شدن همه‌ی
jobهای required انجام شود.
