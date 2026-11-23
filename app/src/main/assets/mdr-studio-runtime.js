/* MDR Studio Runtime 2.3 — scene editor, local GLB asset browser and static GLB importer. */
(function () {
  "use strict";
  const Core = window.MDRStudioCore;
  if (!Core) return;
  const KEY = "mdr.studio.project.v3";
  const PROJECTS_KEY = "mdr.studio.projects.v1";
  const MAX_SAVED_PROJECTS = 10, MAX_LIBRARY_CHARS = 3_000_000;
  let projectId = null, projectName = "مشروع جديد", isDirty = false;
  let active = null, panel = null, selectedId = null, objects = [];
  let physicsBodies = new Map();
  let aiImage = null, aiController = null, aiModelUrl = null;
  const style = document.createElement("style");
  style.textContent = `
  .mdr2-studio{position:absolute;z-index:40;top:12px;inset-inline-end:12px;width:min(340px,calc(100% - 24px));max-height:calc(100% - 24px);overflow:auto;padding:10px;border:1px solid #ffffff28;border-radius:14px;background:rgba(9,13,20,.93);backdrop-filter:blur(12px);color:#edf3fb;font:12px/1.5 system-ui,sans-serif;direction:rtl;box-shadow:0 12px 34px #0008}
  .mdr2-studio *{box-sizing:border-box}.mdr2-studio-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;font-weight:800;color:#ffca68}
  .mdr2-studio-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.mdr2-studio button,.mdr2-studio select{min-height:35px;border:1px solid #ffffff20;border-radius:8px;background:#202938;color:#f2f5fa;padding:6px 7px;font:600 11px system-ui;cursor:pointer}
  .mdr2-studio button:disabled{opacity:.5;cursor:wait}.mdr2-studio button.primary{background:#ffb020;color:#1b1509;border-color:#ffca68}.mdr2-studio .wide{grid-column:1/-1}
  .mdr2-studio .project-dock{padding:8px;margin:5px 0;border:1px solid #ffffff18;border-radius:10px;background:#0d131d}.mdr2-studio .project-name{width:100%;min-height:38px;margin:4px 0;padding:7px 10px;border:1px solid #ffffff20;border-radius:8px;background:#111824;color:#f2f5fa;font:12px system-ui;direction:rtl}.mdr2-studio .project-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:5px}.mdr2-studio .project-actions button{min-height:38px}.mdr2-studio .scene-tree{display:grid;gap:3px;max-height:124px;overflow:auto;padding:2px;border:1px solid #ffffff12;border-radius:9px;background:#090d14}.mdr2-studio .scene-node{display:flex;align-items:center;gap:8px;width:100%;min-height:34px!important;text-align:right!important;background:transparent!important;border-color:transparent!important;color:#cbd6e6!important;font-weight:600!important}.mdr2-studio .scene-node[aria-pressed="true"]{background:#ffb02020!important;border-color:#ffb02065!important;color:#ffcf78!important}.mdr2-studio .scene-node-icon{width:20px;text-align:center}.mdr2-studio .physics-setting{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0;padding:7px 9px;border:1px solid #ffffff16;border-radius:9px;background:#111824;color:#a9b9cc;font-size:11px}.mdr2-studio .physics-setting select,.mdr2-studio .physics-setting input{min-height:36px;max-width:145px;padding:5px 10px;border:1px solid #ffffff20;border-radius:8px;background:#202938;color:#f2f5fa;font:600 11px system-ui}.mdr2-studio .physics-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:7px 0}.mdr2-studio .physics-actions button{min-height:40px}.mdr2-studio.physics-running{border-color:#35e0a1aa;box-shadow:0 0 0 1px #35e0a122,0 12px 34px #0008}.mdr2-studio .inspector-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.mdr2-studio .inspector-field{min-width:0;color:#9fb0c6;font-size:9px}.mdr2-studio .inspector-field span{display:block;margin:0 3px 3px}.mdr2-studio .inspector-field input{width:100%;min-width:0;min-height:38px;border:1px solid #ffffff20;border-radius:7px;background:#111824;color:#f2f5fa;padding:5px;text-align:center;direction:ltr;font:12px ui-monospace,monospace}.mdr2-studio .inspector-field input:disabled{opacity:.45}.mdr2-studio .dock-label{display:flex;align-items:center;justify-content:space-between;margin:8px 2px 5px;color:#a9b9cc;font-size:10px;font-weight:800;letter-spacing:.04em}.mdr2-studio .dock-count{color:#ffca68;font-variant-numeric:tabular-nums}.mdr2-studio .status{margin-top:8px;color:#9fb0c6;font-size:10px;min-height:16px;overflow-wrap:anywhere}.mdr2-studio .status.error{color:#ff8585}.mdr2-studio .selected{display:block;width:100%;margin:6px 0}
  .mdr2-ai,.mdr2-assets{border-top:1px solid #ffffff24;margin-top:9px;padding-top:8px}.mdr2-ai input[type=password],.mdr2-ai input[type=file]{width:100%;max-width:100%;margin:5px 0;color:#dce6f4;font:10px system-ui}
  .mdr2-ai .ai-preview{display:none;width:100%;max-height:110px;object-fit:contain;border-radius:8px;background:#101722;margin:5px 0}.mdr2-ai .ai-note,.mdr2-assets .asset-note{font-size:9px;color:#aab9cc;line-height:1.5}.mdr2-ai button,.mdr2-assets button{width:100%;margin-top:5px}.mdr2-ai .ai-result{display:none;color:#a9e7b5;overflow-wrap:anywhere;font-size:10px}
  @media(max-width:720px){.mdr2-studio{top:auto;bottom:calc(env(safe-area-inset-bottom,0px) + 8px);inset-inline:8px;width:auto;max-height:min(46vh,420px);padding:10px 12px;border-radius:16px;overscroll-behavior:contain}.mdr2-studio-head{position:sticky;top:-10px;z-index:2;margin:-10px -12px 8px;padding:10px 12px;background:rgba(9,13,20,.98);border-bottom:1px solid #ffffff20;border-radius:16px 16px 0 0}.mdr2-studio-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.mdr2-studio button,.mdr2-studio select{min-height:42px;padding:7px 5px;font-size:11px;touch-action:manipulation}.mdr2-studio .inspector-field input{min-height:42px;font-size:13px}.mdr2-studio .physics-setting select,.mdr2-studio .physics-actions button,.mdr2-studio .project-actions button,.mdr2-studio .project-name{min-height:44px}.mdr2-studio .scene-tree{max-height:100px}.mdr2-studio .wide{grid-column:1/-1}.mdr2-studio .selected{min-height:42px}.mdr2-studio .status{font-size:11px}.mdr2-ai input[type=password],.mdr2-ai input[type=file]{min-height:42px;font-size:12px}}
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
    if (object.userData.mdrPhysics) spec.physics = { ...object.userData.mdrPhysics };
    if (spec.type === "glb") { spec.assetId = object.userData.mdrAssetId; spec.fileName = object.userData.mdrFileName || "model.glb"; }
    return spec;
  }
  function sync() {
    return Core.validateProject({ schema: "mdr-scene", version: Core.VERSION, name: projectName, objects: objects.map(specFromObject) });
  }
  function refreshList() {
    if (!panel) return;
    const tree = panel.querySelector(".scene-tree");
    if (!tree) return;
    tree.replaceChildren();
    for (const object of objects) {
      const row = document.createElement("button"); row.type = "button"; row.className = "scene-node";
      row.dataset.selectObject = object.userData.mdrId; row.setAttribute("role", "treeitem");
      row.setAttribute("aria-pressed", String(object.userData.mdrId === selectedId));
      const icon = document.createElement("span"); icon.className = "scene-node-icon";
      icon.textContent = object.userData.mdrType === "glb" ? "🧊" : object.userData.mdrType === "directionalLight" ? "☼" : "◻";
      const name = document.createElement("span"); name.textContent = object.name || object.userData.mdrType || "عنصر";
      row.append(icon, name); tree.appendChild(row);
    }
    const count = panel.querySelector(".dock-count"); if (count) count.textContent = objects.length + " عنصر";
  }
  function updateSelection() {
    if (!panel) return;
    const object = selected();
    const label = panel.querySelector(".selected-label");
    if (label) label.textContent = object ? object.name : "لم يُحدد عنصر";
    refreshList();
    const fields = panel.querySelectorAll("[data-inspector]");
    fields.forEach(field => {
      const [axis, component] = field.dataset.inspector.split("-");
      const value = object ? axis === "position" ? object.position[component] : axis === "rotation" ? object.rotation[component] * 180 / Math.PI : object.scale[component] : null;
      field.value = value == null ? "" : String(Math.round(value * 100) / 100);
      field.disabled = !object || physicsBodies.size > 0;
    });
    const physicsType = panel.querySelector("[data-physics-type]");
    const physics = object && object.userData.mdrPhysics;
    if (physicsType) { physicsType.value = physics ? physics.type : "none"; physicsType.disabled = !object || physicsBodies.size > 0; }
    const massField = panel.querySelector("[data-physics-mass]");
    if (massField) { massField.value = physics ? String(physics.mass) : "1"; massField.disabled = !physics || physicsBodies.size > 0; }
    const frictionField = panel.querySelector("[data-physics-value='friction']");
    const restitutionField = panel.querySelector("[data-physics-value='restitution']");
    if (frictionField) { frictionField.value = physics ? String(physics.friction) : "0.65"; frictionField.disabled = !physics || physicsBodies.size > 0; }
    if (restitutionField) { restitutionField.value = physics ? String(physics.restitution) : "0.08"; restitutionField.disabled = !physics || physicsBodies.size > 0; }
    const nameField = panel.querySelector("[data-object-name]");
    if (nameField) { nameField.value = object ? object.name : ""; nameField.disabled = !object || physicsBodies.size > 0; }
    const colorField = panel.querySelector("[data-object-color]");
    if (colorField) { colorField.value = object && /^#[0-9a-f]{6}$/i.test(object.userData.mdrColor || "") ? object.userData.mdrColor : "#8da9c4"; colorField.disabled = !object || physicsBodies.size > 0 || object.userData.mdrType === "glb"; }
  }
  function addPrimitive(type, data = {}) {
    if (!active || typeof active.editorAddPrimitive !== "function") throw new Error("جسر محرر MDR غير متاح لهذا المحرك");
    if (objects.length >= Core.MAX_OBJECTS) throw new Error("وصلت إلى الحد الأقصى للعناصر");
    const spec = Core.normalizeObject({ ...data, type, id: data.id || ("mdr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8)) });
    const object = active.editorAddPrimitive(spec.type, spec);
    if (spec.physics) object.userData.mdrPhysics = { ...spec.physics };
    objects.push(object); selectedId = spec.id; isDirty = true; updateSelection(); say("تمت إضافة " + spec.name); return object;
  }
  async function duplicateSelected() {
    const source = selected();
    if (!source) return say("اختر عنصراً لنسخه", true);
    if (objects.length >= Core.MAX_OBJECTS) return say("وصلت إلى الحد الأقصى للعناصر", true);
    const spec = specFromObject(source);
    const name = (source.name || "عنصر") + " نسخة";
    const position = [source.position.x + 1, source.position.y, source.position.z + 1];
    try {
      if (spec.type === "glb") {
        const entry = await window.MDRAssetStore.get(spec.assetId);
        const copy = await importGLBBuffer(await entry.blob.arrayBuffer(), (spec.fileName || source.name || "model.glb").replace(/\.glb$/i, "") + "-copy.glb");
        copy.name = name; copy.position.fromArray(position); copy.rotation.set(...spec.rotation); copy.scale.fromArray(spec.scale);
        if (spec.physics) copy.userData.mdrPhysics = { ...spec.physics };
        active._mdrEditorObjects = objects.slice(); updateSelection(); isDirty = true;
        say("تم نسخ المجسم والأصل إلى عنصر مستقل");
      } else {
        addPrimitive(spec.type, { ...spec, id: "mdr-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8), name, position });
      }
    } catch (error) { say("تعذر نسخ العنصر: " + (error.message || String(error)), true); }
  }
  function applyObjectColor(object, color) {
    if (!object || !/^#[0-9a-f]{6}$/i.test(color)) return false;
    object.userData.mdrColor = color;
    const paint = target => {
      const swatch = target.material && target.material.color || target.color;
      if (swatch && typeof swatch.set === "function") swatch.set(color);
    };
    if (typeof object.traverse === "function") object.traverse(paint); else paint(object);
    return true;
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
    if (physicsBodies.size) stopPhysicsTest(false);
    for (const object of objects.slice()) disposeObject(object);
    objects = [];
    if (active) active._mdrEditorObjects = [];
    selectedId = null; updateSelection();
  }
  function savedProjects() {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      let chars = 0;
      return parsed.filter(record => {
        if (!record || typeof record !== "object" || !/^scene-[a-z0-9-]{8,80}$/.test(record.id || "") || typeof record.data !== "string" || record.data.length > Core.MAX_JSON_CHARS) return false;
        chars += record.data.length;
        return chars <= MAX_LIBRARY_CHARS;
      }).slice(0, MAX_SAVED_PROJECTS);
    } catch (_) { return []; }
  }
  function refreshProjectLibrary() {
    if (!panel) return;
    const select = panel.querySelector(".project-list");
    if (!select) return;
    select.replaceChildren();
    const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = "اختر مشروعاً محفوظاً"; select.appendChild(placeholder);
    for (const record of savedProjects()) {
      let name = record.name || "مشروع بدون اسم";
      try { name = Core.parse(record.data).name; } catch (_) { /* corrupt entry remains visible so it can be removed */ }
      const option = document.createElement("option"); option.value = record.id; option.textContent = name; select.appendChild(option);
    }
    select.value = projectId || "";
    const nameInput = panel.querySelector(".project-name");
    if (nameInput && nameInput.value !== projectName) nameInput.value = projectName;
  }
  function save() {
    try {
      const nameInput = panel && panel.querySelector(".project-name");
      projectName = String(nameInput && nameInput.value || projectName || "مشروع جديد").trim().slice(0, 80) || "مشروع جديد";
      const data = Core.serialize(sync());
      const records = savedProjects();
      const id = projectId || (`scene-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      const index = records.findIndex(record => record.id === id);
      if (index < 0 && records.length >= MAX_SAVED_PROJECTS) throw new Error("مكتبة المشاريع ممتلئة؛ احذف مشروعاً قديماً أولاً");
      const entry = { id, name: projectName, updatedAt: Date.now(), data };
      if (index >= 0) records[index] = entry; else records.unshift(entry);
      records.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      if (records.reduce((sum, record) => sum + record.data.length, 0) > MAX_LIBRARY_CHARS) throw new Error("وصلت مكتبة المشاريع إلى حد التخزين المحلي؛ صدّر بعض المشاريع كحزمة");
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(records));
      localStorage.setItem(KEY, data);
      projectId = id; isDirty = false; refreshProjectLibrary();
      say(`تم حفظ «${projectName}» محلياً — ${objects.length} عنصر`);
    } catch (error) { say("تعذر الحفظ: " + (error.message || String(error)), true); }
  }
  async function load() {
    try {
      const select = panel && panel.querySelector(".project-list");
      const chosenId = select && select.value || projectId;
      const entry = chosenId && savedProjects().find(record => record.id === chosenId);
      if (entry) { const loaded = await applyProject(Core.parse(entry.data), entry.id); if (loaded) say(`تم فتح «${projectName}»`); return; }
      const raw = localStorage.getItem(KEY);
      if (!raw) return say("لا يوجد مشروع محفوظ؛ أنشئ مشروعاً أو احفظ المشهد أولاً");
      const loaded = await applyProject(Core.parse(raw), null);
      if (loaded) say("تم تحميل آخر مشهد محفوظ");
    } catch (error) { say("فشل التحميل: " + error.message, true); }
  }
  function newProject() {
    if (!window.confirm(isDirty ? "لديك تغييرات غير محفوظة. إنشاء مشروع فارغ والتخلي عنها؟" : "إنشاء مشروع فارغ جديد؟")) return;
    clearObjects(); projectId = null; projectName = "مشروع جديد"; isDirty = false; refreshProjectLibrary(); updateSelection();
    say("مشروع جديد جاهز — أضف عناصر ثم احفظه باسم تختاره");
  }
  function deleteSavedProject() {
    const select = panel && panel.querySelector(".project-list");
    const id = select && select.value || projectId;
    if (!id) return say("اختر مشروعاً محفوظاً لحذفه", true);
    const records = savedProjects(), entry = records.find(record => record.id === id);
    if (!entry) return say("المشروع المحفوظ غير موجود", true);
    if (!window.confirm(`حذف المشروع «${entry.name || "بدون اسم"}» من هذا الجهاز؟`)) return;
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(records.filter(record => record.id !== id)));
    if (projectId === id) { projectId = null; projectName = "مشروع جديد"; }
    refreshProjectLibrary(); say("حُذف المشروع المحفوظ؛ ملفات GLB المحلية لم تُحذف");
  }
  async function exportPackage() {
    try {
      if (!window.MDRExporter || typeof window.MDRExporter.exportProjectPackage !== "function") throw new Error("أداة حزم المشاريع غير جاهزة");
      projectName = String(panel.querySelector(".project-name").value || projectName).trim().slice(0, 80) || "مشروع جديد";
      const result = await window.MDRExporter.exportProjectPackage();
      say(`تم تصدير حزمة «${projectName}» — ${result.objects} عنصر و${result.assets} أصل`);
    } catch (error) { say("فشل تصدير الحزمة: " + (error.message || String(error)), true); }
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
    if (spec.physics) object.userData.mdrPhysics = { ...spec.physics };
    return object;
  }
  async function applyProject(data, loadedProjectId = null) {
    // Validate asset availability and GLB structure first, so a missing/corrupt asset
    // cannot erase the scene that is currently open.
    const validated = Core.validateProject(data);
    const assetEntries = await prepareProjectAssets(validated);
    if (isDirty && !window.confirm("توجد تغييرات غير محفوظة. استبدال المشهد الحالي؟")) return false;
    data = validated;
    clearObjects();
    try {
      for (const raw of data.objects) {
        const item = Core.normalizeObject(raw);
        if (item.type === "glb") {
          const object = await restoreGLB(item, assetEntries.get(item.assetId)); objects.push(object); selectedId = item.id;
        } else addPrimitive(item.type, item);
      }
      if (active) active._mdrEditorObjects = objects.slice();
      projectName = data.name || "مشروع جديد"; projectId = loadedProjectId; isDirty = false; refreshProjectLibrary();
      updateSelection(); say("تم تحميل " + data.objects.length + " عنصر من المشروع"); return true;
    } catch (error) {
      clearObjects(); isDirty = true;
      throw error;
    }
  }
  function importSceneFile(file) {
    if (!file) return;
    if (file.size > Core.MAX_JSON_CHARS) return say("ملف المشهد أكبر من 2MB", true);
    const reader = new FileReader();
    reader.onload = async () => { try { const loaded = await applyProject(Core.parse(String(reader.result || ""))); if (!loaded) say("أُلغي استيراد المشهد"); } catch (error) { say("فشل استيراد المشهد: " + error.message, true); } };
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
      objects.push(object); selectedId = id; active._mdrEditorObjects = objects.slice(); isDirty = true; updateSelection();
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
    if (!window.MDRAI3D) return setAIStatus("وحدة تحويل الصور غير محمّلة", true);
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
  function bodyDimensions(object, settings) {
    const scale = object.scale;
    if (settings.shape === "sphere") {
      const geometryRadius = object.geometry && object.geometry.parameters && Number(object.geometry.parameters.radius) || 0.5;
      return { radius: Math.max(0.05, geometryRadius * Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z))) };
    }
    const params = object.geometry && object.geometry.parameters || {};
    const width = Number(params.width) || Number(params.radiusTop) * 2 || 1;
    const height = Number(params.height) || 1;
    const depth = Number(params.depth) || Number(params.radiusTop) * 2 || 1;
    return { size: [width * Math.abs(scale.x), height * Math.abs(scale.y), depth * Math.abs(scale.z)] };
  }
  function startPhysicsTest() {
    if (!active || !active.physicsWorld) return say("محرك الفيزياء غير جاهز في هذا العالم", true);
    if (physicsBodies.size) return;
    const configured = objects.filter(object => object.userData.mdrPhysics && object.userData.mdrType !== "directionalLight");
    if (!configured.length) return say("اختر نوع جسم فيزيائي لعنصر واحد على الأقل من المفتش", true);
    try {
      for (const object of configured) {
        const settings = Core.normalizeObject({ ...specFromObject(object), physics: object.userData.mdrPhysics }).physics;
        const snapshot = { position: object.position.toArray(), rotation: object.rotation.toArray().slice(0, 3), scale: object.scale.toArray() };
        const body = active.physicsWorld.addBody({
          name: object.name, object, type: settings.type, shape: settings.shape,
          position: snapshot.position, ...bodyDimensions(object, settings),
          mass: settings.mass, friction: settings.friction, restitution: settings.restitution
        });
        physicsBodies.set(body.id, { object, snapshot });
      }
      panel.classList.add("physics-running");
      panel.querySelector('[data-action="physics-start"]').disabled = true;
      panel.querySelector('[data-action="physics-stop"]').disabled = false;
      panel.querySelectorAll("[data-inspector], [data-physics-type], [data-physics-mass], [data-physics-value], [data-object-name], [data-object-color]").forEach(field => { field.disabled = true; });
      panel.querySelectorAll(".mdr2-studio-grid button, .project-actions button, .project-name, .project-list").forEach(control => { control.disabled = true; });
      say(`بدأ اختبار الفيزياء — ${physicsBodies.size} جسم. الإيقاف يعيد المشهد لوضع التحرير.`);
    } catch (error) {
      stopPhysicsTest(false);
      say("تعذر بدء اختبار الفيزياء: " + (error.message || String(error)), true);
    }
  }
  function stopPhysicsTest(report = true) {
    if (!physicsBodies.size) return;
    for (const [id, entry] of physicsBodies) {
      if (active && active.physicsWorld) active.physicsWorld.removeBody(id);
      entry.object.position.fromArray(entry.snapshot.position);
      entry.object.rotation.set(...entry.snapshot.rotation);
      entry.object.scale.fromArray(entry.snapshot.scale);
    }
    physicsBodies.clear();
    if (panel) {
      panel.classList.remove("physics-running");
      const start = panel.querySelector('[data-action="physics-start"]'), stop = panel.querySelector('[data-action="physics-stop"]');
      if (start) start.disabled = false;
      if (stop) stop.disabled = true;
      panel.querySelectorAll("[data-inspector], [data-physics-type], [data-physics-value], [data-object-name], [data-object-color]").forEach(field => { field.disabled = !selected(); });
      const mass = panel.querySelector("[data-physics-mass]"); if (mass) mass.disabled = !selected() || !selected().userData.mdrPhysics;
      panel.querySelectorAll(".mdr2-studio-grid button, .project-actions button, .project-name, .project-list").forEach(control => { control.disabled = false; });
    }
    updateSelection();
    if (report) say("توقف الاختبار؛ أُعيدت الأجسام إلى مواضع التحرير.");
  }
  function transform(action) {
    const object = selected(); if (!object) return say("اختر عنصراً أولاً");
    if (action === "x-") object.position.x -= 1; if (action === "x+") object.position.x += 1;
    if (action === "z-") object.position.z -= 1; if (action === "z+") object.position.z += 1;
    if (action === "rotate") object.rotation.y += Math.PI / 12;
    if (action === "scale+") object.scale.multiplyScalar(1.1); if (action === "scale-") object.scale.multiplyScalar(.9);
    isDirty = true; updateSelection();
    say("تم تعديل " + object.name);
  }
  function remove() {
    const object = selected(); if (!object) return say("اختر عنصراً أولاً");
    const assetId = object.userData.mdrAssetId;
    disposeObject(object); objects = objects.filter(item => item !== object);
    if (active) active._mdrEditorObjects = objects.slice();
    selectedId = null; isDirty = true; updateSelection(); say("تم حذف العنصر");
    if (assetId && window.MDRAssetStore) window.MDRAssetStore.remove(assetId).catch(error => say("حُذف المجسم، لكن تعذر حذف ملف الأصل: " + error.message, true));
  }
  function unmount() {
    if (aiController) aiController.abort();
    if (physicsBodies.size) stopPhysicsTest(false);
    if (isDirty && active && panel) save();
    if (panel) {
      const preview = panel.querySelector(".ai-preview"); if (preview && preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
      panel.remove();
    }
    panel = null; active = null; objects = []; selectedId = null; aiImage = null; aiModelUrl = null; physicsBodies = new Map();
  }
  function mount(world) {
    if (!world || !world.engine || !world.scene || active === world) return;
    unmount(); active = world; objects = (world._mdrEditorObjects || []).slice(); selectedId = null;
    const frame = world.canvas && world.canvas.parentElement; if (!frame) { active = null; return; }
    frame.style.position = "relative";
    panel = document.createElement("section"); panel.className = "mdr2-studio";
    panel.innerHTML = `
      <div class="mdr2-studio-head"><span>🧰 محرر المشهد · MDR</span><button type="button" data-action="collapse">طي</button></div>
      <div class="project-dock">
        <div class="dock-label"><span>المشروع المحلي</span><span class="project-counter">حد المكتبة 10</span></div>
        <input class="project-name" type="text" maxlength="80" value="مشروع جديد" aria-label="اسم المشروع" placeholder="اسم المشروع"/>
        <select class="project-list" aria-label="المشاريع المحفوظة"></select>
        <div class="project-actions"><button class="primary" data-action="save">حفظ المشروع</button><button data-action="load">فتح المحدد</button><button data-action="new-project">مشروع جديد</button><button data-action="delete-project">حذف المحدد</button><button class="wide" data-action="export-package">تصدير حزمة مشروع كاملة</button></div>
      </div>
      <div class="dock-label"><span>شجرة المشهد</span><span class="dock-count">0 عنصر</span></div>
      <div class="scene-tree" role="tree" aria-label="عناصر المشهد"></div>
      <div class="dock-label"><span>المفتش · تحويل العنصر</span><span class="selected-label">لم يُحدد عنصر</span></div>
      <label class="physics-setting"><span>اسم العنصر</span><input data-object-name maxlength="80" type="text" aria-label="اسم العنصر المحدد" disabled></label>
      <label class="physics-setting"><span>لون العنصر</span><input data-object-color type="color" value="#8da9c4" aria-label="لون العنصر المحدد" disabled></label>
      <div class="inspector-grid" aria-label="تحويلات العنصر">
        ${["position","rotation","scale"].map(axis => ["x","y","z"].map(component => `<label class="inspector-field"><span>${axis === "position" ? "موقع" : axis === "rotation" ? "دوران°" : "قياس"} ${component.toUpperCase()}</span><input type="number" step="0.1" data-inspector="${axis}-${component}" aria-label="${axis} ${component}" disabled></label>`).join("")).join("")}
      </div>
      <label class="physics-setting"><span>جسم الفيزياء</span><select data-physics-type aria-label="نوع جسم الفيزياء" disabled><option value="none">بدون</option><option value="static">ثابت</option><option value="dynamic">ديناميكي</option><option value="kinematic">حركي</option></select></label>
      <label class="physics-setting"><span>الكتلة (كغم)</span><input data-physics-mass type="number" min="0.001" max="10000" step="0.1" value="1" aria-label="كتلة الجسم بالكيلوغرام" disabled></label>
      <label class="physics-setting"><span>الاحتكاك</span><input data-physics-value="friction" type="number" min="0" max="1" step="0.05" value="0.65" aria-label="احتكاك الجسم" disabled></label>
      <label class="physics-setting"><span>الارتداد</span><input data-physics-value="restitution" type="number" min="0" max="1" step="0.05" value="0.08" aria-label="ارتداد الجسم" disabled></label>
      <div class="physics-actions"><button class="primary" data-action="physics-start">▶ اختبار الفيزياء</button><button data-action="physics-stop" disabled>■ إيقاف وإعادة</button></div>
      <div class="mdr2-studio-grid">
        <button class="primary" data-add="box">＋ مكعب</button><button data-add="sphere">＋ كرة</button><button data-add="cylinder">＋ أسطوانة</button>
        <button class="wide" data-add="directionalLight">＋ ضوء اتجاهي</button>
        <button data-transform="x-">X −</button><button data-transform="x+">X +</button><button data-transform="z-">Z −</button><button data-transform="z+">Z +</button>
        <button data-action="duplicate">نسخ العنصر</button><button data-transform="rotate">دوران</button><button data-action="delete">حذف</button><button data-transform="scale-">تصغير</button><button data-transform="scale+">تكبير</button>
        <button data-action="import-json">استيراد JSON</button>
        <button class="wide" data-action="import-package">استيراد مشروع .mdrgame</button>
        <button class="primary wide" data-action="import-glb">＋ استيراد مجسم GLB</button><button data-action="export-glb" class="wide">تنزيل GLB المحدد</button><button data-action="export" class="wide">تصدير بيانات المشهد</button>
      </div>
      <div class="mdr2-assets"><b>🧊 مكتبة الأصول 3D</b>
        <div class="asset-note">استيراد GLB 2.0 حتى 50MB مع خامات PBR والصور المضمنة. الأصول تحفظ محلياً على هذا الجهاز.</div>
        <div class="status asset-status">يدعم المجسمات الثابتة؛ لا يدعم Rig أو Animation أو Draco بعد</div>
      </div>
      <div class="mdr2-ai"><b>🧩 تحويل صورة إلى مجسم 3D</b>
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
    frame.appendChild(panel); refreshList(); refreshProjectLibrary();
    panel.addEventListener("input", event => {
      if (event.target.matches(".project-name")) projectName = String(event.target.value).slice(0, 80);
    });
    panel.addEventListener("change", event => {
      if (event.target.matches(".ai-file")) chooseAIImage(event.target.files && event.target.files[0]);
      else if (event.target.matches("[data-physics-type]")) {
        const object = selected(); if (!object || physicsBodies.size) return;
        const type = event.target.value;
        if (type === "none") delete object.userData.mdrPhysics;
        else object.userData.mdrPhysics = Core.normalizeObject({ ...specFromObject(object), physics: { ...(object.userData.mdrPhysics || {}), type } }).physics;
        isDirty = true; updateSelection();
        say(type === "none" ? "أزيل إعداد الفيزياء" : `تم تعيين الجسم الفيزيائي: ${type}`);
      } else if (event.target.matches("[data-physics-mass]")) {
        const object = selected(); if (!object || physicsBodies.size || !object.userData.mdrPhysics) return;
        const mass = Number(event.target.value);
        if (!Number.isFinite(mass)) return say("أدخل كتلة رقمية صحيحة", true);
        object.userData.mdrPhysics = Core.normalizeObject({ ...specFromObject(object), physics: { ...object.userData.mdrPhysics, mass } }).physics;
        isDirty = true; event.target.value = String(object.userData.mdrPhysics.mass);
        say(`كتلة ${object.name}: ${object.userData.mdrPhysics.mass} كغم`);
      }
    });
    panel.addEventListener("input", event => {
      const object = selected();
      if (event.target.matches("[data-object-name]") && object) {
        object.name = String(event.target.value).slice(0, 80); isDirty = true; refreshList(); return;
      }
      if (event.target.matches("[data-object-color]") && object && object.userData.mdrType !== "glb") {
        if (applyObjectColor(object, event.target.value)) { isDirty = true; say("تم تحديث لون " + object.name); }
        return;
      }
      const field = event.target.closest("[data-inspector]");
      if (!field || !object) return;
      const value = Number(field.value);
      if (!Number.isFinite(value)) return;
      const [axis, component] = field.dataset.inspector.split("-");
      if (axis === "position") {
        const next = object.position.toArray(); next["xyz".indexOf(component)] = Math.max(-500, Math.min(500, value)); object.position.fromArray(next);
      } else if (axis === "rotation") {
        const next = object.rotation.toArray().slice(0, 3); next["xyz".indexOf(component)] = Math.max(-3600, Math.min(3600, value)) * Math.PI / 180; object.rotation.set(next[0], next[1], next[2]);
      } else if (axis === "scale") {
        const next = object.scale.toArray(); next["xyz".indexOf(component)] = Math.max(.05, Math.min(50, value)); object.scale.fromArray(next);
      }
      isDirty = true; say("تم تحديث " + object.name);
    });
    panel.addEventListener("click", event => {
      const button = event.target.closest("button"); if (!button) return;
      if (button.dataset.selectObject) { selectedId = button.dataset.selectObject; updateSelection(); }
      else if (button.dataset.action === "physics-start") startPhysicsTest();
      else if (button.dataset.action === "physics-stop") stopPhysicsTest();
      else if (button.dataset.action === "duplicate") duplicateSelected();
      else if (button.dataset.add) { try { addPrimitive(button.dataset.add); } catch (error) { say(error.message, true); } }
      else if (button.dataset.transform) transform(button.dataset.transform);
      else if (button.dataset.action === "save") save();
      else if (button.dataset.action === "load") load();
      else if (button.dataset.action === "new-project") newProject();
      else if (button.dataset.action === "delete-project") deleteSavedProject();
      else if (button.dataset.action === "export-package") exportPackage();
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
        const grid = panel.querySelector(".mdr2-studio-grid"), tree = panel.querySelector(".scene-tree"), inspector = panel.querySelector(".inspector-grid");
        const hide = grid.style.display !== "none"; grid.style.display = hide ? "none" : "grid"; tree.style.display = hide ? "none" : "grid"; inspector.style.display = hide ? "none" : "grid";
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
      const loaded = await applyProject(Core.validateProject(project));
      return loaded ? { objects: objects.length, assets: assets.length } : { cancelled: true, objects: 0, assets: 0 };
    }
  });

  window.addEventListener("mdr2:world-ready", event => mount(event.detail));
  window.addEventListener("mdr2:world-destroy", unmount);
  const observer = new MutationObserver(() => { const world = window.__MDR2_ACTIVE_WORLD__; if (world && world !== active) mount(world); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (window.__MDR2_ACTIVE_WORLD__) mount(window.__MDR2_ACTIVE_WORLD__);
})();
