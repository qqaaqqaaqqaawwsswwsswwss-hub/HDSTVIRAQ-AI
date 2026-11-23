# MDR Platform 3.2.0

منصة عربية لتجربة محرك ألعاب ثلاثي الأبعاد ومحرر المشاهد ومصنع مشاريع Android/WebView. الإصدار الحالي يضم مساحة عمل RTL، مدينة بغداد الإجرائية التي تُضاف مباشرةً للمشهد، وموقع قابل للتثبيت والعمل دون اتصال على الهاتف.

## تشغيل نسخة الويب محلياً

يتطلب Node.js 18 أو أحدث. تبعيات npm مثبتة بإصدارات محددة في `package-lock.json`؛ `cannon-es` يُستخدم اختيارياً في Pro.

```sh
npm run build:web
python3 -m http.server 4173 --directory dist
```

افتح `http://localhost:4173`. يعتمد التطبيق على التخزين المحلي في المتصفح لبعض المشاريع والأصول؛ شغّله عبر HTTP/HTTPS وليس `file://`.

## الفحص

```sh
npm run verify
```

يشغّل فحوصات المصدر واختبارات Node. هذه الاختبارات لا تعادل بناء Android أو اختباره على جهاز حقيقي.

## نسختا APK

يتطلب البناء JDK 17 وAndroid SDK Platform 35 وBuild Tools 35.0.0. سكربت `gradlew` المرفق مشغّل bootstrap مخصص يتحقق من SHA-256 لتنزيل Gradle 8.14.8، وليس Gradle Wrapper القياسي.

```sh
./gradlew assembleStandardDebug assembleProDebug
```

- **Standard:** الإصدار القياسي بمحرك MDR الحالي.
- **Pro:** يضيف محرك الفيزياء ثلاثي الأبعاد `cannon-es`، إصدار 0.20.0 بترخيص MIT، ويحمّله عند الطلب.

المخرجات: `app/build/outputs/apk/standard/debug/app-standard-debug.apk` و`app/build/outputs/apk/pro/debug/app-pro-debug.apk`. كلاهما debug APK غير موقّع للنشر في Play Store. GitHub Actions يختبر المصدر ويبني النسختين ويرفعهما كملفين منفصلين عند دفع الفرع.

## حقوق المكونات

- `cannon-es` 0.20.0: محرك فيزياء JavaScript من مشروع [pmndrs/cannon-es](https://github.com/pmndrs/cannon-es)، ترخيص MIT محفوظ في `third_party/CANNON-ES-LICENSE`.
- سجل مراجعة المصادر المفتوحة، بما فيها المشاريع الإقليمية التي لا تملك ترخيصاً واضحاً، موجود في `docs/OPEN_SOURCE_REVIEW.md`.

## النشر

- **GitHub Pages:** شغّل `npm run build:pages` لتحديث `docs/` ثم ادفع الفرع؛ مصدر النشر هو مجلد `docs` (تفعيل GitHub Pages من إعدادات المستودع يحتاج صلاحيات Pages).
- **Vercel:** `vercel.json` يبني نسخة الويب إلى `dist/`؛ يتطلب ربط حساب GitHub داخل Vercel أولاً.
- **GitHub Actions:** يبني نسختَي Standard وPro ويرفعهما كـ artifacts منفصلين بعد نجاح الاختبارات.

## ملاحظات الأمان والحدود

- كود JavaScript الذي يدخله المستخدم في محرر المنصة يعمل داخل سياق الصفحة، وليس داخل sandbox أمني. لا تستخدم المنصة لتشغيل شيفرة غير موثوقة.
- محرك MDR وميزات NextGen أولية/تعليمية وليست بديلاً كاملاً عن Unity أو Unreal أو Godot.
- APK الناتج من CI debug artifact للتجربة، وليس إصداراً موقعاً أو جاهزاً للنشر التجاري.
