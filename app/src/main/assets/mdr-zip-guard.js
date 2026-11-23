/* MDR ZIP Guard — shared by the app and Node.js tests. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.MDRZipGuard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DEFAULTS = Object.freeze({
    maxUploadBytes: 50 * 1024 * 1024,
    maxEntries: 1500,
    maxEntryBytes: 32 * 1024 * 1024,
    maxTotalBytes: 128 * 1024 * 1024,
    maxCompressionRatio: 2000
  });

  function validateUploadFile(file, limits = {}) {
    const cfg = { ...DEFAULTS, ...limits };
    if (!file || typeof file.size !== "number") throw new TypeError("ZIP file is required");
    if (!/\.zip$/i.test(String(file.name || ""))) throw new Error("Only .zip files are supported");
    if (file.size <= 0) throw new Error("ZIP file is empty");
    if (file.size > cfg.maxUploadBytes) throw new Error(`ZIP upload exceeds the ${Math.ceil(cfg.maxUploadBytes / (1024 * 1024))} MB limit`);
    return true;
  }

  function validateZipPath(path) {
    const raw = String(path == null ? "" : path);
    if (!raw || raw.includes("\0")) throw new Error("ZIP contains an empty or NUL path");
    if (raw.startsWith("/") || raw.startsWith("\\") || /^[a-z]:/i.test(raw)) {
      throw new Error(`Unsafe absolute ZIP path: ${raw}`);
    }
    const normalized = raw.replace(/\\/g, "/");
    const segments = normalized.split("/");
    if (segments.some(segment => segment === ".." || segment === ".")) throw new Error(`ZIP path traversal or dot segment rejected: ${raw}`);
    if (segments.some(segment => segment === "")) throw new Error(`ZIP path contains an empty segment: ${raw}`);
    if (segments.some(segment => /[<>:"|?*\u0000-\u001f]/.test(segment) || /[. ]$/.test(segment))) {
      throw new Error(`ZIP path contains a non-portable file name: ${raw}`);
    }
    return normalized;
  }

  function validateZipEntries(entries, limits = {}) {
    const cfg = { ...DEFAULTS, ...limits };
    if (!Array.isArray(entries)) throw new TypeError("ZIP entries must be an array");
    if (entries.length === 0) throw new Error("ZIP archive contains no files");
    if (entries.length > cfg.maxEntries) throw new Error(`ZIP contains more than ${cfg.maxEntries} files`);
    let totalSize = 0;
    const seen = new Set();
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") throw new TypeError("ZIP entry must be an object");
      const name = validateZipPath(entry.originalName || entry.path || entry.name);
      const normalized = name.toLowerCase();
      if (seen.has(normalized)) throw new Error(`Duplicate ZIP path: ${name}`);
      seen.add(normalized);
      const size = Number(entry.size ?? 0);
      const compressed = Number(entry.compressedSize ?? 0);
      if (!Number.isFinite(size) || size < 0 || size > cfg.maxEntryBytes) {
        throw new Error(`ZIP entry exceeds the per-file size limit: ${name}`);
      }
      if (!Number.isFinite(compressed) || compressed < 0 || (size > 0 && compressed <= 0)) {
        throw new Error(`ZIP entry has an invalid compressed size: ${name}`);
      }
      if (size > 1024 * 1024 && size / compressed > cfg.maxCompressionRatio) {
        throw new Error(`ZIP compression ratio is suspicious: ${name}`);
      }
      totalSize += size;
      if (totalSize > cfg.maxTotalBytes) {
        throw new Error(`ZIP expands beyond the ${Math.ceil(cfg.maxTotalBytes / (1024 * 1024))} MB total limit`);
      }
    }
    return { entries: entries.length, totalSize };
  }

  return Object.freeze({ DEFAULTS, validateUploadFile, validateZipPath, validateZipEntries });
});
