# راهنمای اجرای امن MVP

این راهنما برای development/test environment است، نه مجوز deploy production.

1. از PostgreSQL و Redis جداگانه برای test استفاده کنید و `database/seed.sql` را فقط روی database توسعه اجرا کنید.
2. در `backend/.env` یک `JWT_SECRET` تصادفی و credentialهای خارج از git تنظیم کنید؛ secretهای compose نمونه‌ی توسعه‌اند.
3. برای پرداخت از `ZARINPAL_SANDBOX=true` یا mock استفاده کنید و merchant واقعی را در test وارد نکنید.
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

موارد باقی‌مانده‌ی release شامل اجرای e2e روی test environment واقعی، تکمیل ownership اختصاصی wallet/cart در تست‌های end-to-end، انتقال quoteها به Redis/Database برای چند instance، و بررسی نهایی ماژول‌های خارج از MVP است.
