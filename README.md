# MS Commerce — منصة تجارة إلكترونية متعددة المتاجر (SaaS)

Next.js 16 (App Router) + PostgreSQL + Drizzle ORM + Tailwind v4. عربية/RTL أساساً مع تبديل للإنجليزية (LTR).

## التشغيل
```bash
cp .env.example .env        # عدّل DATABASE_URL و PLATFORM_HOST
npm install
npm run db:push             # إنشاء الجداول
npm run db:seed             # بيانات تجريبية (حذفها: npx tsx scripts/seed.ts --reset)
npm run build && npm start
```

### حسابات تجريبية
| الدور | البريد | كلمة المرور |
|---|---|---|
| مالك المنصة | admin@mscommerce.com | Admin@123 |
| تاجر | merchant@mscommerce.com | Merchant@123 |
| تاجر 2 | merchant2@mscommerce.com | Merchant@123 |
| موظف | staff@mscommerce.com | Staff@123 |
| عميل | customer@mscommerce.com | Customer@123 |

## المسارات
- `/home` الموقع الرئيسي، `/stores`, `/pricing`, `/register`, `/login`, `/signup`
- `/admin` لوحة مالك المنصة
- `/dashboard` لوحة التاجر/الموظف
- `/account` حساب العميل
- `/s/{slug}` واجهة المتجر (تُعاد كتابتها تلقائياً من `{slug}.PLATFORM_HOST` أو من دومين خاص مفعّل عبر `src/proxy.ts`)

## الدومينات وSSL
- يحصل كل متجر على رابط فرعي تلقائي.
- الدومين الخاص: يضيفه التاجر → سجلات TXT (ملكية) + CNAME/A → فحص DNS حقيقي (`dns/promises`) → تفعيل نهائي وإصدار SSL من لوحة المالك.
- في الإنتاج ضع المنصة خلف Caddy/Traefik/Nginx مع إصدار شهادات تلقائي (on-demand TLS) للدومينات النشطة في جدول `domains`.

## الدفع
- بنوك ومحافظ يمنية قابلة للإدارة من لوحة المالك (`payment_providers`) دون تعديل برمجي.
- التحويل يصل مباشرة لحساب التاجر؛ يرفع العميل رقم العملية/الإيصال؛ الطلب يبقى «بانتظار التحقق» حتى يؤكد التاجر وصول المبلغ. منع تكرار الإيصالات وأرقام العمليات.
- البوابات الإلكترونية تعمل بالمراجعة اليدوية حتى وجود تكامل رسمي مُختبر (الحقل `supportsApi`).

## العمولات
تُحتسب عند تأكيد الدفع من (المجموع − الخصم) دون الشحن، وتُلغى عند الإلغاء/الاسترجاع، وتُسجَّل كمستحق على التاجر حتى تسويتها من لوحة المالك. جميع العمليات المالية في `finance_logs` وسجل التدقيق في `audit_logs`.

## النسخ الاحتياطي
`scripts/backup.sh` (pg_dump + مجلد `uploads/`). الملفات المرفوعة تُخدم عبر `/api/files/*`.

## البيئات
`.env` للتطوير و`.env.production` للإنتاج (نفس المفاتيح). عيّن `PLATFORM_HOST`, `PLATFORM_IP`, `TRACK_SALT`.
