# Goldexa Mobile

وضعیت فعلی این پوشه: کلاینت React Native با Expo SDK 50 است. `App.tsx` flow ورود OTP، خانه، فروشگاه، checkout کیف پول، بازار، امانی، درگاه و پیش‌نمایش AR را دارد و `src/api.ts` و `src/auth.ts` کلاینت API و session را فراهم می‌کنند. tracking سه‌بعدی AR و پرداخت provider واقعی هنوز به اتصال خارجی نیاز دارند.

## اجرای Expo

```powershell
cd D:\goldexa\goldexacode\mobile
npm install
npm start
```

سپس یکی از گزینه‌های Expo CLI را اجرا کنید:

```powershell
npm run android   # emulator یا دستگاه Android
npm run ios       # فقط macOS با Xcode
npm run web       # مرورگر
```

برای دستگاه فیزیکی، تلفن و کامپیوتر باید روی یک شبکه باشند. در صورت مشکل شبکه از `npx expo start --tunnel` استفاده کنید. Expo SDK، React Native و dependencyهای navigation موجود در `package.json` برای همین اسکلت کافی هستند؛ dependency جدیدی فقط هنگام اضافه‌شدن قابلیت واقعی که به آن نیاز داشته باشد باید وارد شود.

## API URL

Backend به‌صورت پیش‌فرض روی `http://localhost:3001` اجرا می‌شود (`backend/.env.example`، مقدار `APP_BASE_URL`). برای کلاینت Expo پیشنهادی است URL فقط از متغیر عمومی محیطی خوانده شود:

```dotenv
# mobile/.env.local — commit نکنید
EXPO_PUBLIC_API_URL=http://localhost:3001
```

مقدارهای متداول بر اساس محل اجرا:

| محیط | مقدار نمونه |
| --- | --- |
| Android emulator | `http://10.0.2.2:3001` |
| iOS simulator | `http://localhost:3001` |
| دستگاه فیزیکی | `http://<IP-LAN-کامپیوتر>:3001` |
| Web محلی | `http://localhost:3001` |
| Production | `https://<دامنهٔ API>` |

`EXPO_PUBLIC_*` محرمانه نیست و در bundle قابل مشاهده است؛ فقط برای آدرس API و تنظیمات غیرحساس استفاده شود. در production از HTTPS و دامنهٔ واقعی استفاده کنید. در صورت نبودن متغیر، محیط توسعه از `http://localhost:3001` استفاده می‌کند؛ برای Android emulator یا دستگاه واقعی مقدار مناسب همان محیط را تنظیم کنید.

## نقش‌ها و دسترسی

Backend در JWT نقش پایهٔ کاربر (`buyer`، `seller`، `designer`، `admin` و در مدل همچنین `expert` و `premium`) و نیز `roleNames`/`permissions` را قرار می‌دهد. roleهای sync‌شدهٔ کاربردی عبارت‌اند از:

| نقش | سطح کاربرد در mobile |
| --- | --- |
| `customer` (نگاشت‌شده از `buyer`) | پروفایل، قیمت، wallet، خرید و سفارش‌های خود کاربر |
| `seller` | listingهای marketplace و سفارش‌های مرتبط با فروشنده |
| `designer` | طراحی جواهر و طرح‌های متعلق به خود کاربر |
| `admin` | عملیات مدیریتی؛ نباید به صرف مخفی‌کردن UI مجاز تلقی شود |

UI می‌تواند بر اساس `roleNames` و `permissions` نمایش را محدود کند، اما منبع صلاحیت Backend است. mobile نباید با تغییر role در کلاینت، user id در URL یا payload، یا حذف یک دکمه نقش را جعل کند. endpointهای حساس باید با access token و guardهای Backend کنترل شوند.

## Screen matrix فعلی

نام‌ها از `App.tsx` گرفته شده‌اند. چون screenها placeholder هستند، ستون وضعیت مشخص می‌کند چه چیزی اکنون واقعاً قابل استفاده است.

| Screen / tab | مهمان | `customer` | `seller` / `designer` | `admin` | وضعیت فعلی |
| --- | --- | --- | --- | --- | --- |
| خانه | مشاهدهٔ عمومی | مشاهدهٔ عمومی | مشاهدهٔ عمومی | مشاهدهٔ عمومی | placeholder |
| فروشگاه | catalog عمومی؛ خرید نیازمند ورود | خرید و سفارش | مشاهده؛ flow فروشنده جداگانه | مشاهده/مدیریت طبق permission | placeholder |
| پرو مجازی | فقط در صورت فعال‌بودن feature | پس از مجوز camera | پس از مجوز camera | پس از مجوز camera | preview دوربین و fallback کاتالوگ؛ tracking سه‌بعدی هنوز provider می‌خواهد |
| پروفایل | ورود/OTP | پروفایل و داده‌های خود | داده‌های خود و ابزار نقش | ابزار admin فقط با permission | placeholder؛ auth پیاده‌سازی نشده |

ماتریس بالا قرارداد محصول است، نه bypass امنیتی. هر route جدید باید مالکیت داده و permission را در Backend بررسی کند.

## امنیت token و OTP

- پاسخ login شامل `accessToken` و `refreshToken` است و درخواست‌های محافظت‌شده باید `Authorization: Bearer <accessToken>` بفرستند.
- logout در Backend stateless است؛ کلاینت باید هر دو token را پاک کند. token را در `AsyncStorage`، فایل متنی، log، deep link یا query string نگه ندارید.
- tokenهای mobile در secure storage سیستم‌عامل (`expo-secure-store`) نگه‌داری و هنگام logout پاک می‌شوند؛ refresh کنترل‌شده و timeout باید در production تکمیل شود.
- `EXPO_PUBLIC_*` و bundle جای token، JWT secret، merchant id یا هر credential نیستند. `JWT_SECRET` فقط روی Backend و با مقدار تصادفی حداقل ۳۲ کاراکتری تنظیم شود.
- OTP در local ممکن است در پاسخ نمایش داده شود (`RETURN_OTP_IN_RESPONSE=true`)، اما production باید `RETURN_OTP_IN_RESPONSE=false` باشد تا کد فقط از مسیر SMS تحویل شود. rate limitهای request OTP و login را حفظ کنید.
- access token را کوتاه‌عمر نگه دارید و refresh را فقط از secure storage بخوانید. پس از خطای refresh، session را پاک و کاربر را دوباره authenticate کنید. هیچ role یا permission موجود در token را جایگزین بررسی Backend نکنید.

## محدودیت‌های native AR و WebAR

`expo-camera` فقط دسترسی و preview دوربین را فراهم می‌کند؛ صفحه‌ی AR موبایل همین preview را با permission و fallback کاتالوگ ارائه می‌کند، اما tracking سطح/چهره، مدل سه‌بعدی و try-on تا اتصال provider اختصاصی وجود ندارد. برای AR واقعی native به development build، native configuration و تست دستگاه نیاز است؛ Expo Go را معادل پشتیبانی کامل AR در نظر نگیرید.

WebAR به پشتیبانی مرورگر، مجوز camera، نور و توان دستگاه وابسته است و camera در web معمولاً به HTTPS یا localhost نیاز دارد. parity بین iOS، Android و web تضمین نیست. fallback باید catalog/تصویر preview معمولی باشد.

Backend نیز `AR_ENABLED=false` دارد و تا آماده‌شدن provider/مدل خارجی باید همین مقدار باقی بماند. فعال‌کردن flag بدون پیاده‌سازی کلاینت و مدل قابل اتکا، feature کامل محسوب نمی‌شود.

## تست TypeScript و smoke check

از مسیر `mobile` اجرا کنید:

```powershell
npm exec tsc -- --noEmit
npm exec expo -- config --type public
```

در وضعیت ثبت‌شدهٔ این نسخه، هر دو دستور با exit code صفر پاس شدند. دستور اول type-check است و artifact تولید نمی‌کند؛ دستور دوم معتبر بودن config و resolve شدن Expo project را بررسی می‌کند. اجرای `npm start` یا config check به‌معنی وجود screen، اتصال API، auth یا AR واقعی نیست.

## وضعیت تست این نسخه

`npm exec tsc -- --noEmit` و `npm exec expo -- export --platform web` باید قبل از commit موفق باشند. bundle وب فقط smoke build است و جای تست روی Android/iOS واقعی، مجوزهای native یا اتصال providerهای production را نمی‌گیرد.
