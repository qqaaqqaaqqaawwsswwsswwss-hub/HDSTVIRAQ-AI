# MDR Platform 3.0.3

منصة عربية لتجربة محرك ألعاب ثلاثي الأبعاد ومحرر المشاهد ومصنع مشاريع Android/WebView. الإصدار الحالي يضم مساحة عمل RTL، واجهة متجاوبة للهاتف، أدوات لمس، ومخرجات ويب ثابتة قابلة للنشر.

## تشغيل نسخة الويب محلياً

يتطلب Node.js 18 أو أحدث. لا توجد تبعيات npm خارجية.

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

## بناء APK

يتطلب JDK 17 وAndroid SDK Platform 35 وBuild Tools 35.0.0. سكربت `gradlew` المرفق هو bootstrap مخصص يتحقق من checksum لتنزيل Gradle 8.14.8، وليس Gradle Wrapper القياسي.

```sh
./gradlew assembleDebug
```

المخرج: `app/build/outputs/apk/debug/app-debug.apk`. هذا APK تجريبي غير موقع للنشر في Play Store. لم يُضَف سير GitHub Actions بعد لأن اتصال GitHub الحالي لا يملك صلاحية كتابة ملفات workflows.

## النشر

- **Vercel:** إعداد النشر في `vercel.json` يبني نسخة الويب من أصول Android ويخرجها إلى `dist/`.
- **GitHub:** مصدر Android والويب والاختبارات وسير عمل APK محفوظة في هذا المستودع.

## ملاحظات الأمان والحدود

- كود JavaScript الذي يدخله المستخدم في محرر المنصة يعمل داخل سياق الصفحة، وليس داخل sandbox أمني. لا تستخدم المنصة لتشغيل شيفرة غير موثوقة.
- محرك MDR وميزات NextGen أولية/تعليمية وليست بديلاً كاملاً عن Unity أو Unreal أو Godot.
- APK الناتج من CI debug artifact للتجربة، وليس إصداراً موقعاً أو جاهزاً للنشر التجاري.
