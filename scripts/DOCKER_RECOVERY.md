# Docker Desktop recovery

اگر Docker Desktop در Windows با خطاهایی مانند `sailor-ingest.sock`،
`dockerInference` یا `docker-secrets-engine\engine.sock` و پیام
`The file cannot be accessed by the system` متوقف شد، این دستور را از ریشه‌ی
مخزن اجرا کنید:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-goldexa-docker.ps1 -RepairDockerRuntime -Build
```

این recovery فقط processهای Docker را متوقف می‌کند، WSL را shutdown می‌کند و
پوشه‌های runtime موقت را با پسوند timestamp کنار می‌گذارد. هیچ Docker volume،
image، دیتابیس، یا فایل پروژه حذف نمی‌شود. پوشه‌های `.stale-*` را تا زمانی که
اجرای سالم Docker تأیید نشده حذف نکنید.

برای اجرای معمولی بدون rebuild:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-goldexa-docker.ps1
```
