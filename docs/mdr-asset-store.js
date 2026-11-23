/* MDR local asset store — keeps imported binary assets offline in IndexedDB. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MDRAssetStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DB_NAME = "mdr-platform-assets";
  const STORE = "glb";
  const VERSION = 1;
  function validId(id) { return typeof id === "string" && /^asset-[a-z0-9-]{4,90}$/i.test(id); }
  function openDB() {
    if (typeof indexedDB === "undefined") return Promise.reject(new Error("التخزين المحلي غير متاح في هذا المتصفح"));
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" }); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("تعذر فتح مخزن الأصول"));
      request.onblocked = () => reject(new Error("مخزن الأصول مشغول؛ أغلق النسخ الأخرى من MDR"));
    });
  }
  async function withStore(mode, action) {
    const db = await openDB();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let request;
        try { request = action(store); } catch (error) { reject(error); return; }
        tx.oncomplete = () => resolve(request ? request.result : undefined);
        tx.onerror = () => reject(tx.error || new Error("فشلت عملية تخزين الأصل"));
        tx.onabort = () => reject(tx.error || new Error("أُلغيت عملية تخزين الأصل"));
        if (request) request.onerror = () => reject(request.error || new Error("تعذر الوصول إلى الأصل"));
      });
    } finally { db.close(); }
  }
  async function put(id, blob, name) {
    if (!validId(id)) throw new Error("معرّف الأصل غير صالح");
    if (!blob || typeof blob.size !== "number" || blob.size <= 0 || blob.size > 50 * 1024 * 1024) throw new Error("حجم الأصل غير صالح");
    return withStore("readwrite", store => store.put({ id, blob, name: String(name || "model.glb").slice(0, 120), updatedAt: Date.now() }));
  }
  async function get(id) {
    if (!validId(id)) throw new Error("معرّف الأصل غير صالح");
    const entry = await withStore("readonly", store => store.get(id));
    if (!entry || !entry.blob) throw new Error("ملف GLB المرتبط بهذا المشروع غير موجود على هذا الجهاز؛ استورده من جديد");
    return entry;
  }
  async function remove(id) {
    if (!validId(id)) throw new Error("معرّف الأصل غير صالح");
    return withStore("readwrite", store => store.delete(id));
  }
  async function list() {
    return withStore("readonly", store => store.getAll());
  }
  return Object.freeze({ validId, put, get, remove, list });
});
