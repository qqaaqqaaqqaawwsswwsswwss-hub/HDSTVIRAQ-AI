/* MDR Studio Runtime 2.3 — scene editor, local GLB asset browser and static GLB importer. */
(function () {
  "use strict";
  const Core = window.MDRStudioCore;
  if (!Core) return;
  const KEY = "mdr.studio.project.v3";
  let active = null, panel = null, selectedId = null, objects = [];
  let aiImage = null, aiController = null, aiModelUrl = null;
  const style = document.createElement("style");
  style.textContent = `
  .mdr2-studio{position:absolute;z-index:40;top:12px;inset-inline-end:12px;width:min(340px,calc(100% - 24px));max-height:calc(100% - 24px);overflow:auto;padding:10px;border:1px solid #ffffff28;border-radius:14px;background:rgba(9,13,20,.93);backdrop-filter:blur(12px);color:#edf3fb;font:12px/1.5 system-ui,sans-serif;direction:rtl;box-shadow:0 12px 34px #0008}
  .mdr2-studio *{box-sizing:border-box}.mdr2-studio-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;font-weight:800;color:#ffca68}
  .mdr2-studio-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.mdr2-studio button,.mdr2-studio select{min-height:35px;border:1px solid #ffffff20;border-radius:8px;background:#202938;color:#f2f5fa;padding:6px 7px;font:600 11px system-ui;cursor:pointer}
  .mdr2-studio button:disabled{opacity:.5;cursor:wait}.mdr2-studio button.primary{background:#ffb020;color:#1b1509;border-color:#ffca68}.mdr2-studio .wide{grid-column:1/-1}
  .mdr2-studio .dock-label{display:flex;align-items:center;justify-content:space-between;margin:8px 2px 5px;color:#a9b9cc;font-size:10px;font-weight:800;letter-spacing:.04em}.mdr2-studio .dock-count{color:#ffca68;font-variant-numeric:tabular-nums}.mdr2-studio .status{margin-top:8px;color:#9fb0c6;font-size:10px;min-height:16px;overflow-wrap:anywhere}.mdr2-studio .status.error{color:#ff8585}.mdr2-studio .selected{display:block;width:100%;margin:6px 0}
  .mdr2-ai,.mdr2-assets{border-top:1px solid #ffffff24;margin-top:9px;padding-top:8px}.mdr2-ai input[type=password],.mdr2-ai input[type=file]{width:100%;max-width:100%;margin:5px 0;color:#dce6f4;font:10px system-ui}
  .mdr2-ai .ai-preview{display:none;width:100%;max-height:110px;object-fit:contain;border-radius:8px;background:#101722;margin:5px 0}.mdr2-ai .ai-note,.mdr2-assets .asset-note{font-size:9px;color:#aab9cc;line-height:1.5}.mdr2-ai button,.mdr2-assets button{width:100%;margin-top:5px}.mdr2-ai .ai-result{display:none;color:#a9e7b5;overflow-wrap:anywhere;font-size:10px}
  @media(max-width:720px){.mdr2-studio{top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);inset-inline:8px;width:auto;max-height:min(46vh,420px);padding:10px 12px;border-radius:16px;overscroll-behavior:contain}.mdr2-studio-head{position:sticky;top:-10px;z-index:2;margin:-10px -12px 8px;padding:10px 12px;background:rgba(9,13,20,.98);border-bottom:1px solid #ffffff20;border-radius:16px 16px 0 0}.mdr2-studio-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.mdr2-studio button,.mdr2-studio select{min-height:42px;padding:7px 5px;font-size:11px;touch-action:manipulation}.mdr2-studio .wide{grid-column:1/-1}.mdr2-studio .selected{min-height:42px}.mdr2-studio .status{font-size:11px}.mdr2-ai input[type=password],.mdr2-ai input[type=file]{min-height:42px;font-size:12px}}
  `;
  document.head.appendChild(style);

  const say = (message, isError = false) => {
    const el = panel && panel.querySelector(".status-main");
    if (el) { el.textContent = message; el.classList.toggle("error", isError); }
  };
  const setAIStatus = (message, isError = false) => {
    const el = panel && panel.querySelector(".ai-status");
    if (el) { el.textContent = message; el.classList.toggle("error", isError); }
  };
  const selected = () => objects.find(object => object.userData && object.userData.mdrId === selectedId) || null;
  function specFromObject(object) {
    const spec = { id: object.userData.mdrId, type: object.userData.mdrType, name: object.name,
      position: object.position.toArray(), rotation: object.rotation.toArray().slice(0, 3),
      scale: object.scale.toArray(), color: object.userData.mdrColor || "#8da9c4" };
    if (spec.type === "glb") { spec.assetId = object.userData.mdrAssetId; spec.fileName = object.userData.mdrFileName || "model.glb"; }
    return spec;
  }
  function sync() {
    return Core.validateProject({ schema: "mdr-scene", version: Core.VERSION, name: "MDR Mobile Scene", objects: objects.map(specFromObject) });
  }
  function refreshList() {
    if (!panel) return;
    const select = panel.querySelector(".mdr2-object-list");
    if (!select) return;
    select.innerHTML = "";
    const empty = document.createElement("option"); empty.value = ""; empty.textContent = "اختر عنصراً للتحرير"; select.appendChild(empty);
    for (const object of objects) {
      const option = document.createElement("option"); option.value = object.userData.mdrId;
      option.textContent = (object.userData.mdrType === "glb" ? "🧊 " : "◻ ") + object.name; select.appendChild(option);
    }
    select.value = selectedId || "";
    const count = panel.querySelector(".dock-count"); if (count) count.textContent = objects.length + " عنصر";
  }
  function updateSelection() {
    if (!panel) return;
    const object = selected();
    const label = panel.querySelector(".selected-label");
    if (label) label.textContent = object ? "العنصر المحدد: " + object.name : "لا يوجد عنصر محدد";
    refreshList();
  }
  function addPrimitive(type, data = {}) {
    if (!active || typeof active.editorAddPrimitive !== "function") throw new Error("جسر محرر MDR غير متاح لهذا المحرك");
    if (objects.length >= Core.MAX_OBJECTS) throw new Error("وصلت إلى الحد الأقصى للعناصر");
    const spec = Core.normalizeObject({ ...data, type, id: data.id || ("mdr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8)) });
    const object = active.editorAddPrimitive(spec.type, spec);
    objects.push(object); selectedId = spec.id; updateSelection(); say("تمت إضافة " + spec.name); return object;
  }
  function disposeObject(object) {
    if (!object) return;
    if (active && active.scene) active.scene.remove(object);
    const geometries = new Set(), materials = new Set(), textures = new Set();
    const collectTexture = value => { if (value && value.isTexture) textures.add(value); };
    const collectMaterial = material => {
      if (!material || materials.has(material)) return;
      materials.add(material);
      for (const value of Object.values(material)) collectTexture(value);
    };
    if (typeof object.traverse === "function") object.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      if (Array.isArray(child.material)) child.material.forEach(collectMaterial); else collectMaterial(child.material);
      if (child.shadow && child.shadow.map) textures.add(child.shadow.map);
    });
    else { if (object.geometry) geometries.add(object.geometry); if (object.material) collectMaterial(object.material); }
    geometries.forEach(geometry => geometry.dispose && geometry.dispose());
    materials.forEach(material => material.dispose && material.dispose());
    textures.forEach(texture => texture.dispose && texture.dispose());
  }
  function clearObjects() {
    for (const object of objects.slice()) disposeObject(object);
    objects = [];
    if (active) active._mdrEditorObjects = [];
    selectedId = null; updateSelection();
  }
  function save() {
    try { localStorage.setItem(KEY, Core.serialize(sync())); say("تم حفظ المشهد والأصول المرتبطة به على هذا الجهاز"); }
    catch (error) { say("تعذر الحفظ: " + error.message, true); }
  }
  async function prepareProjectAssets(data) {
    const entries = new Map();
    for (const raw of data.objects) {
      const item = Core.normalizeObject(raw);
      if (item.type !== "glb" || entries.has(item.assetId)) continue;
      const entry = await window.MDRAssetStore.get(item.assetId);
      // Check every referenced binary before clearing the currently open scene.
      window.MDRGLB.parseGLB(await entry.blob.arrayBuffer());
      entries.set(item.assetId, entry);
    }
    return entries;
  }
  async function restoreGLB(spec, entry) {
    const buffer = await entry.blob.arrayBuffer();
    const object = await window.MDRGLB.loadGLB(active, buffer, { id: spec.id, assetId: spec.assetId, name: spec.name, fileName: spec.fileName || entry.name });
    object.name = spec.name || object.name;
    object.position.fromArray(spec.position); object.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]); object.scale.fromArray(spec.scale);
    object.userData.mdrId = spec.id; object.userData.mdrAssetId = spec.assetId; object.userData.mdrFileName = spec.fileName || entry.name;
    return object;
  }
  async function applyProject(data) {
    // Validate asset availability and GLB structure first, so a missing/corrupt asset
    // cannot erase the scene that is currently open.
    const assetEntries = await prepareProjectAssets(data);
    clearObjects();
    try {
      for (const raw of data.objects) {
        const item = Core.normalizeObject(raw);
        if (item.type === "glb") {
          const object = await restoreGLB(item, assetEntries.get(item.assetId)); objects.push(object); selectedId = item.id;
        } else addPrimitive(item.type, item);
      }
      if (active) active._mdrEditorObjects = objects.slice();
      updateSelection(); say("تم تحميل " + data.objects.length + " عنصر من المشروع");
    } catch (error) {
      clearObjects();
      throw error;
    }
  }
  async function load() {
    try { const raw = localStorage.getItem(KEY) || localStorage.getItem("mdr.studio.project.v2"); if (!raw) return say("لا يوجد مشروع محفوظ"); await applyProject(Core.parse(raw)); }
    catch (error) { say("فشل التحميل: " + error.message, true); }
  }
  function importSceneFile(file) {
    if (!file) return;
    if (file.size > Core.MAX_JSON_CHARS) return say("ملف المشهد أكبر من 2MB", true);
    const reader = new FileReader();
    reader.onload = async () => { try { await applyProject(Core.parse(String(reader.result || ""))); } catch (error) { say("فشل استيراد المشهد: " + error.message, true); } };
    reader.onerror = () => say("تعذرت قراءة الملف", true);
    reader.readAsText(file);
  }
  function exportFile() {
    try {
      const blob = new Blob([Core.serialize(sync())], { type: "application/json" });
      const url = URL.createObjectURL(blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = "mdr-scene.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      say("تم تصدير بيانات المشهد؛ ملفات GLB نفسها محفوظة محلياً ويجب نقلها منفصلة");
    } catch (error) { say("فشل التصدير: " + error.message, true); }
  }
  async function exportSelectedGLB() {
    const object = selected();
    if (!object || object.userData.mdrType !== "glb") return say("اختر مجسماً مستورداً بصيغة GLB أولاً", true);
    try {
      const entry = await window.MDRAssetStore.get(object.userData.mdrAssetId);
      const url = URL.createObjectURL(entry.blob), anchor = document.createElement("a");
      anchor.href = url; anchor.download = object.userData.mdrFileName || entry.name || "model.glb";
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
      say("تم تجهيز ملف GLB للتنزيل");
    } catch (error) { say("تعذر تصدير الأصل: " + error.message, true); }
  }
  async function importGLBBuffer(buffer, fileName = "model.glb") {
    if (!active || !window.MDRGLB || !window.MDRAssetStore) throw new Error("وحدات استيراد GLB غير جاهزة");
    if (objects.length >= Core.MAX_OBJECTS) throw new Error("وصلت إلى الحد الأقصى للعناصر");
    const parsed = window.MDRGLB.parseGLB(buffer);
    const assetId = "asset-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
    const blob = new Blob([buffer], { type: "model/gltf-binary" });
    await window.MDRAssetStore.put(assetId, blob, fileName);
    try {
      const id = "mdr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      const object = await window.MDRGLB.loadGLB(active, parsed, { id, assetId, name: fileName, fileName });
      object.position.set(0, 0, 0);
      object.userData.mdrAssetId = assetId; object.userData.mdrFileName = fileName;
      objects.push(object); selectedId = id; active._mdrEditorObjects = objects.slice(); updateSelection();
      const warnings = object.userData.mdrWarnings || [];
      say("تم استيراد " + fileName + (warnings.length ? " — " + warnings.join("؛ ") : ""));
      return object;
    } catch (error) { await window.MDRAssetStore.remove(assetId).catch(() => {}); throw error; }
  }
  async function importGLBFile(file) {
    try {
      window.MDRGLB.validateFile(file);
      say("جارٍ قراءة ملف GLB…");
      const buffer = await file.arrayBuffer();
      await importGLBBuffer(buffer, file.name);
    } catch (error) { say("فشل استيراد GLB: " + error.message, true); }
  }
  function chooseAIImage(file) {
    try {
      window.MDRAI3D.validateImage(file); aiImage = file;
      const preview = panel.querySelector(".ai-preview");
      if (preview) { if (preview.dataset.url) URL.revokeObjectURL(preview.dataset.url); const url = URL.createObjectURL(file); preview.src = url; preview.dataset.url = url; preview.style.display = "block"; }
      setAIStatus("الصورة جاهزة للتحويل");
    } catch (error) { aiImage = null; setAIStatus(error.message, true); }
  }
  async function generateAI3D() {
    if (!window.MDRAI3D) return setAIStatus("وحدة AI 3D غير محمّلة", true);
    if (!aiImage) return setAIStatus("اختر صورة أولاً", true);
    const keyInput = panel.querySelector(".ai-key"), key = keyInput && keyInput.value;
    try { window.MDRAI3D.validateKey(key); window.MDRAI3D.validateImage(aiImage); }
    catch (error) { return setAIStatus(error.message, true); }
    if (aiController) aiController.abort(); aiController = new AbortController(); const signal = aiController.signal;
    const button = panel.querySelector('[data-action="ai-generate"]'); button.disabled = true; button.textContent = "جارٍ إنشاء المهمة…"; aiModelUrl = null;
    try {
      const dataURI = await window.MDRAI3D.readAsDataURI(aiImage);
      const taskId = await window.MDRAI3D.createTask({ apiKey: key, imageDataURI: dataURI, signal });
      setAIStatus("بدأت المهمة: " + taskId + " — جارٍ توليد المجسم…");
      let task = null;
      for (let i = 0; i < 180; i++) {
        if (signal.aborted) throw new Error("تم إلغاء العملية");
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("تم إلغاء العملية")); }, { once: true });
        });
        task = await window.MDRAI3D.getTask({ apiKey: key, taskId, signal });
        const progress = Math.max(0, Math.min(100, Number(task.progress) || 0));
        setAIStatus("حالة التوليد: " + (task.status || "قيد المعالجة") + " — " + progress + "%");
        if (task.status === "SUCCEEDED") break;
        if (["FAILED", "CANCELED"].includes(task.status)) throw new Error(task.task_error && (task.task_error.message || task.task_error) || "فشل توليد المجسم");
      }
      if (!task || task.status !== "SUCCEEDED") throw new Error("انتهت مهلة الانتظار. يمكنك إعادة المحاولة لاحقاً");
      const url = task.model_urls && task.model_urls.glb;
      if (!url) throw new Error("اكتملت المهمة لكن ملف GLB غير موجود");
      aiModelUrl = url;
      const result = panel.querySelector(".ai-result"); result.style.display = "block"; result.textContent = "تم إنشاء ملف GLB بنجاح. رقم المهمة: " + taskId;
      panel.querySelector('[data-action="ai-download"]').style.display = "block";
      panel.querySelector('[data-action="ai-load"]').style.display = "block";
      setAIStatus("اكتمل التوليد — أضف النموذج للمشهد أو نزّله");
    } catch (error) { if (error.name !== "AbortError") setAIStatus(error.message || "حدث خطأ أثناء التوليد", true); }
    finally { button.disabled = false; button.textContent = "حوّل الصورة إلى 3D"; aiController = null; }
  }
  function downloadAI3D() {
    if (!aiModelUrl) return setAIStatus("لا يوجد ملف GLB جاهز", true);
    const anchor = document.createElement("a"); anchor.href = aiModelUrl; anchor.target = "_blank"; anchor.rel = "noopener"; anchor.download = "mdr-ai-model.glb";
    document.body.appendChild(anchor); anchor.click(); anchor.remove(); setAIStatus("فتح رابط GLB — إذا لم يبدأ التنزيل اختر تنزيل من المتصفح");
  }
  async function loadAI3D() {
    if (!aiModelUrl) return setAIStatus("لا يوجد ملف GLB جاهز", true);
    const button = panel.querySelector('[data-action="ai-load"]'); button.disabled = true; button.textContent = "جارٍ تنزيل وإضافة المجسم…";
    try {
      const response = await fetch(aiModelUrl, { mode: "cors", credentials: "omit" });
      if (!response.ok) throw new Error("تعذر تنزيل GLB من مزود الخدمة: HTTP " + response.status);
      const buffer = await response.arrayBuffer(); await importGLBBuffer(buffer, "mdr-ai-model.glb");
      setAIStatus("أُضيف النموذج الناتج إلى المشهد بنجاح");
    } catch (error) {
      setAIStatus("تعذر جلب الملف مباشرة (قد تكون سياسة CORS). نزّله أولاً ثم استخدم زر استيراد GLB. " + error.message, true);
    } finally { button.disabled = false; button.textContent = "إضافة النموذج إلى المشهد"; }
  }
  function transform(action) {
    const object = selected(); if (!object) return say("اختر عنصراً أولاً");
    if (action === "x-") object.position.x -= 1; if (action === "x+") object.position.x += 1;
    if (action === "z-") object.position.z -= 1; if (action === "z+") object.position.z += 1;
    if (action === "rotate") object.rotation.y += Math.PI / 12;
    if (action === "scale+") object.scale.multiplyScalar(1.1); if (action === "scale-") object.scale.multiplyScalar(.9);
    say("تم تعديل " + object.name);
  }
  function remove() {
    const object = selected(); if (!object) return say("اختر عنصراً أولاً");
    const assetId = object.userData.mdrAssetId;
    disposeObject(object); objects = objects.filter(item => item !== object);
    if (active) active._mdrEditorObjects = objects.slice();
    selectedId = null; updateSelection(); say("تم حذف العنصر");
    if (assetId && window.MDRAssetStore) window.MDRAssetStore.remove(assetId).catch(error => say("حُذف المجسم، لكن تعذر حذف ملف الأصل: " + error.message, true));
  }
  function unmount() {
    if (aiController) aiController.abort();
    if (panel) {
      const preview = panel.querySelector(".ai-preview"); if (preview && preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
      panel.remove();
    }
    panel = null; active = null; objects = []; selectedId = null; aiImage = null; aiModelUrl = null;
  }
  function mount(world) {
    if (!world || !world.engine || !world.scene || active === world) return;
    unmount(); active = world; objects = (world._mdrEditorObjects || []).slice(); selectedId = null;
    const frame = world.canvas && world.canvas.parentElement; if (!frame) { active = null; return; }
    frame.style.position = "relative";
    panel = document.createElement("section"); panel.className = "mdr2-studio";
    panel.innerHTML = `
      <div class="mdr2-studio-head"><span>🧰 محرر المشهد · MDR</span><button type="button" data-action="collapse">طي</button></div>
      <div class="dock-label"><span>شجرة المشهد</span><span class="dock-count">0 عنصر</span></div>
      <select class="selected mdr2-object-list" aria-label="شجرة المشهد واختيار العنصر"></select>
      <div class="dock-label"><span>المفتش · تحويل العنصر</span><span class="selected-label">لم يُحدد عنصر</span></div>
      <div class="mdr2-studio-grid">
        <button class="primary" data-add="box">＋ مكعب</button><button data-add="sphere">＋ كرة</button><button data-add="cylinder">＋ أسطوانة</button>
        <button class="wide" data-add="directionalLight">＋ ضوء اتجاهي</button>
        <button data-transform="x-">X −</button><button data-transform="x+">X +</button><button data-transform="z-">Z −</button><button data-transform="z+">Z +</button>
        <button data-transform="rotate">دوران</button><button data-action="delete">حذف</button><button data-transform="scale-">تصغير</button><button data-transform="scale+">تكبير</button>
        <button data-action="save">حفظ</button><button data-action="load">تحميل</button><button data-action="import-json">استيراد JSON</button>
        <button class="wide" data-action="import-package">استيراد مشروع .mdrgame</button>
        <button class="primary wide" data-action="import-glb">＋ استيراد مجسم GLB</button><button data-action="export-glb" class="wide">تنزيل GLB المحدد</button><button data-action="export" class="wide">تصدير بيانات المشهد</button>
      </div>
      <div class="mdr2-assets"><b>🧊 مكتبة الأصول 3D</b>
        <div class="asset-note">استيراد GLB 2.0 حتى 50MB مع خامات PBR والصور المضمنة. الأصول تحفظ محلياً على هذا الجهاز.</div>
        <div class="status asset-status">يدعم المجسمات الثابتة؛ لا يدعم Rig أو Animation أو Draco بعد</div>
      </div>
      <div class="mdr2-ai"><b>✨ AI Image → 3D</b>
        <input class="ai-key" type="password" autocomplete="off" placeholder="Meshy API Key (لا يُحفظ)"/>
        <input class="ai-file" type="file" accept="image/png,image/jpeg,image/webp"/>
        <img class="ai-preview" alt="معاينة صورة الإدخال"/>
        <div class="ai-note">يحتاج مفتاح Meshy API وإنترنت/رصيداً لدى الخدمة. لا تضع مفتاحاً مشتركاً أو عاماً هنا.</div>
        <button class="primary" data-action="ai-generate" type="button">حوّل الصورة إلى 3D</button>
        <button data-action="ai-load" type="button" style="display:none">إضافة النموذج إلى المشهد</button>
        <button data-action="ai-download" type="button" style="display:none">تنزيل نموذج GLB</button>
        <div class="ai-result"></div><div class="status ai-status">ارفع صورة لبدء التحويل</div>
      </div>
      <div class="status status-main">جاهز — أضف مجسماً أو استورد GLB</div>`;
    frame.appendChild(panel); refreshList();
    panel.addEventListener("change", event => {
      if (event.target.matches(".mdr2-object-list")) { selectedId = event.target.value || null; updateSelection(); }
      else if (event.target.matches(".ai-file")) chooseAIImage(event.target.files && event.target.files[0]);
    });
    panel.addEventListener("click", event => {
      const button = event.target.closest("button"); if (!button) return;
      if (button.dataset.add) { try { addPrimitive(button.dataset.add); } catch (error) { say(error.message, true); } }
      else if (button.dataset.transform) transform(button.dataset.transform);
      else if (button.dataset.action === "save") save();
      else if (button.dataset.action === "load") load();
      else if (button.dataset.action === "export") exportFile();
      else if (button.dataset.action === "export-glb") exportSelectedGLB();
      else if (button.dataset.action === "delete") remove();
      else if (button.dataset.action === "import-json") {
        const input = document.createElement("input"); input.type = "file"; input.accept = ".json,application/json";
        input.onchange = () => importSceneFile(input.files && input.files[0]); input.click();
      } else if (button.dataset.action === "import-glb") {
        const input = document.createElement("input"); input.type = "file"; input.accept = ".glb,model/gltf-binary,application/octet-stream";
        input.onchange = () => importGLBFile(input.files && input.files[0]); input.click();
      } else if (button.dataset.action === "import-package") {
        const input = document.createElement("input"); input.type = "file"; input.accept = ".mdrgame,application/zip,application/octet-stream";
        input.onchange = async () => {
          const file = input.files && input.files[0]; if (!file) return;
          try { if (!window.MDRExporter) throw new Error("وحدة استيراد الحزم غير جاهزة"); say("جارٍ فحص حزمة المشروع…"); const result = await window.MDRExporter.importProjectPackage(file); say(`تم استيراد ${result.objects} عنصر و${result.assets} أصل`); }
          catch (error) { say("فشل استيراد المشروع: " + (error.message || String(error)), true); }
        }; input.click();
      } else if (button.dataset.action === "ai-generate") generateAI3D();
      else if (button.dataset.action === "ai-download") downloadAI3D();
      else if (button.dataset.action === "ai-load") loadAI3D();
      else if (button.dataset.action === "collapse") {
        const grid = panel.querySelector(".mdr2-studio-grid"), list = panel.querySelector(".mdr2-object-list");
        const hide = grid.style.display !== "none"; grid.style.display = hide ? "none" : "grid"; list.style.display = hide ? "none" : "block";
      }
    });
  }
  // Narrow public bridge for project packaging and trusted local export tools.
  window.MDRStudio = Object.freeze({
    version: "2.5.0",
    snapshot() { if (!active) throw new Error("لا يوجد عالم MDR مفتوح حالياً"); return sync(); },
    async packageSnapshot() {
      if (!active) throw new Error("لا يوجد عالم MDR مفتوح حالياً");
      const project = sync();
      const assets = [];
      const seen = new Set();
      for (const item of project.objects) {
        if (item.type !== "glb" || seen.has(item.assetId)) continue;
        seen.add(item.assetId);
        const entry = await window.MDRAssetStore.get(item.assetId);
        assets.push({ id: item.assetId, name: entry.name || item.fileName || "model.glb", blob: entry.blob });
      }
      return { project, assets };
    },
    async importPackage(project, assets = []) {
      if (!active) throw new Error("افتح عالم اللعبة أولاً");
      if (!Array.isArray(assets) || assets.length > Core.MAX_OBJECTS) throw new Error("قائمة أصول المشروع غير صالحة");
      for (const item of assets) {
        if (!item || !window.MDRAssetStore.validId(item.id) || !(item.blob instanceof Blob)) throw new Error("أحد أصول المشروع غير صالح");
        await window.MDRAssetStore.put(item.id, item.blob, item.name);
      }
      await applyProject(Core.validateProject(project));
      return { objects: objects.length, assets: assets.length };
    }
  });

  window.addEventListener("mdr2:world-ready", event => mount(event.detail));
  window.addEventListener("mdr2:world-destroy", unmount);
  const observer = new MutationObserver(() => { const world = window.__MDR2_ACTIVE_WORLD__; if (world && world !== active) mount(world); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (window.__MDR2_ACTIVE_WORLD__) mount(window.__MDR2_ACTIVE_WORLD__);
})();
