/* MDR GLB Loader 1.0 — bounded static glTF 2.0 binary import for MDR's bundled Three.js runtime. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MDRGLB = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MAX_BYTES = 50 * 1024 * 1024;
  const MAX_ACCESSOR_ITEMS = 1_000_000;
  const MAX_DECODED_ACCESSOR_BYTES = 96 * 1024 * 1024;
  const MAX_MESH_PRIMITIVES = 2048;
  const MAX_TOTAL_VERTICES = 1_000_000;
  const MAX_IMAGE_PIXELS = 16_000_000;
  const GLB_MAGIC = 0x46546c67;
  const JSON_CHUNK = 0x4e4f534a;
  const BIN_CHUNK = 0x004e4942;
  const COMPONENTS = {
    5120: { bytes: 1, read: "getInt8", min: -128, max: 127 },
    5121: { bytes: 1, read: "getUint8", min: 0, max: 255 },
    5122: { bytes: 2, read: "getInt16", min: -32768, max: 32767 },
    5123: { bytes: 2, read: "getUint16", min: 0, max: 65535 },
    5125: { bytes: 4, read: "getUint32", min: 0, max: 4294967295 },
    5126: { bytes: 4, read: "getFloat32", min: 0, max: 1 }
  };
  const TYPE_SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

  function asArrayBuffer(input) {
    if (input instanceof ArrayBuffer) return input;
    if (ArrayBuffer.isView(input)) return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
    throw new Error("بيانات GLB غير صالحة");
  }

  function parseGLB(input) {
    const buffer = asArrayBuffer(input);
    if (buffer.byteLength < 20 || buffer.byteLength > MAX_BYTES) throw new Error("حجم GLB غير صالح أو يتجاوز 50MB");
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error("الملف ليس GLB صالحاً (magic غير صحيح)");
    const version = view.getUint32(4, true);
    const declaredLength = view.getUint32(8, true);
    if (version !== 2) throw new Error("يدعم MDR صيغة GLB 2.0 فقط");
    if (declaredLength !== buffer.byteLength) throw new Error("طول GLB المعلن لا يطابق حجم الملف");
    let offset = 12, json = null, bin = null;
    while (offset + 8 <= buffer.byteLength) {
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      offset += 8;
      if (length > buffer.byteLength - offset) throw new Error("كتلة GLB تتجاوز حدود الملف");
      if (type === JSON_CHUNK) {
        if (json) throw new Error("GLB يحتوي أكثر من كتلة JSON");
        const chunk = new Uint8Array(buffer, offset, length);
        const text = new TextDecoder().decode(chunk).replace(/[\u0000\s]+$/g, "");
        try { json = JSON.parse(text); } catch (_) { throw new Error("بيانات JSON داخل GLB تالفة"); }
      } else if (type === BIN_CHUNK) {
        if (bin) throw new Error("GLB يحتوي أكثر من كتلة BIN");
        bin = new Uint8Array(buffer, offset, length);
      }
      offset += length;
    }
    if (offset !== buffer.byteLength || !json || !bin) throw new Error("GLB يفتقد كتلة JSON أو BIN المطلوبة");
    if (!json.asset || !String(json.asset.version || "").startsWith("2.")) throw new Error("إصدار glTF داخل GLB غير مدعوم");
    if (!Array.isArray(json.buffers) || !json.buffers.length || json.buffers[0].uri) throw new Error("يجب أن يكون GLB ذاتياً ولا يعتمد على ملفات خارجية");
    if (json.buffers.length !== 1 || !Number.isSafeInteger(json.buffers[0].byteLength) || json.buffers[0].byteLength <= 0 || json.buffers[0].byteLength > bin.byteLength) throw new Error("بيانات buffer داخل GLB غير متوافقة");
    if ((json.nodes || []).length > 10000 || (json.meshes || []).length > 2000 || (json.materials || []).length > 2000 || (json.images || []).length > 8 || (json.accessors || []).length > 50000) throw new Error("ملف GLB يحتوي عدداً كبيراً من العناصر");
    let primitiveCount = 0;
    for (const mesh of json.meshes || []) {
      if (!mesh || !Array.isArray(mesh.primitives)) throw new Error("قائمة Mesh primitives داخل GLB غير صالحة");
      primitiveCount += mesh.primitives.length;
      if (primitiveCount > MAX_MESH_PRIMITIVES) throw new Error("ملف GLB يحتوي عدداً كبيراً من أجزاء المجسم");
    }
    const requiredExtensions = json.extensionsRequired || [];
    if (requiredExtensions.length) throw new Error("يحتوي GLB امتداداً إلزامياً غير مدعوم: " + requiredExtensions.join(", "));
    for (const bufferView of json.bufferViews || []) {
      const start = Number(bufferView.byteOffset || 0), length = Number(bufferView.byteLength), stride = bufferView.byteStride;
      if ((bufferView.buffer || 0) !== 0 || !Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 || length < 0 || start + length > json.buffers[0].byteLength) throw new Error("BufferView يتجاوز حدود buffer في GLB");
      if (stride !== undefined && (!Number.isSafeInteger(stride) || stride < 4 || stride > 252 || stride % 4 !== 0)) throw new Error("BufferView يحتوي byteStride غير صالح");
    }
    for (const accessor of json.accessors || []) {
      const component = COMPONENTS[accessor.componentType], itemSize = TYPE_SIZE[accessor.type];
      if (!component || !itemSize || !Number.isSafeInteger(accessor.count) || accessor.count < 0 || accessor.count > MAX_ACCESSOR_ITEMS) throw new Error("Accessor في GLB غير صالح أو يتجاوز حد العناصر");
      if (accessor.sparse) throw new Error("Sparse accessors غير مدعومة بعد");
      if (accessor.bufferView !== undefined) {
        const bv = json.bufferViews && json.bufferViews[accessor.bufferView];
        if (!bv) throw new Error("Accessor يشير إلى BufferView غير موجود");
        const stride = Number(bv.byteStride || component.bytes * itemSize);
        const offset = accessor.byteOffset === undefined ? 0 : accessor.byteOffset;
        const end = accessor.count ? offset + (accessor.count - 1) * stride + component.bytes * itemSize : offset;
        if (!Number.isSafeInteger(offset) || offset < 0 || offset % component.bytes !== 0 || end > bv.byteLength || stride < component.bytes * itemSize) throw new Error("Accessor يتجاوز حدود BufferView");
      }
    }
    if (json.skins && json.skins.length) throw new Error("المجسمات المهيكلة بالعظام غير مدعومة بعد؛ استورد نسخة Static GLB");
    for (const mesh of json.meshes || []) for (const primitive of mesh.primitives || []) {
      if (primitive.extensions && primitive.extensions.KHR_draco_mesh_compression) throw new Error("ضغط Draco غير مدعوم في هذا الإصدار");
    }
    for (const bufferView of json.bufferViews || []) {
      if (bufferView.extensions && bufferView.extensions.EXT_meshopt_compression) throw new Error("ضغط Meshopt غير مدعوم في هذا الإصدار");
    }
    return { json, bin, byteLength: buffer.byteLength };
  }

  function accessorReader(parsed) {
    const { json, bin } = parsed;
    const binView = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    let decodedBytes = 0;
    return function readAccessor(index, forceFloat = true) {
      const accessor = json.accessors && json.accessors[index];
      if (!accessor) throw new Error("GLB يحتوي مرجع Accessor غير صالح");
      if (accessor.sparse) throw new Error("Sparse accessors غير مدعومة بعد");
      const component = COMPONENTS[accessor.componentType];
      const itemSize = TYPE_SIZE[accessor.type];
      const count = Number(accessor.count);
      if (!component || !itemSize || !Number.isSafeInteger(count) || count < 0 || count > MAX_ACCESSOR_ITEMS) throw new Error("Accessor غير صالح أو كبير جداً");
      decodedBytes += count * itemSize * 4;
      if (!Number.isSafeInteger(decodedBytes) || decodedBytes > MAX_DECODED_ACCESSOR_BYTES) throw new Error("بيانات المجسم بعد فك Accessors تتجاوز حد الذاكرة الآمن");
      const output = forceFloat ? new Float32Array(count * itemSize) : new Uint32Array(count * itemSize);
      if (accessor.bufferView === undefined) return { array: output, count, itemSize };
      const bv = json.bufferViews && json.bufferViews[accessor.bufferView];
      if (!bv || (bv.buffer || 0) !== 0) throw new Error("BufferView غير صالح");
      const elementBytes = component.bytes * itemSize;
      const stride = Number(bv.byteStride || elementBytes);
      const start = Number(bv.byteOffset || 0) + Number(accessor.byteOffset || 0);
      const viewStart = Number(bv.byteOffset || 0);
      const viewEnd = viewStart + Number(bv.byteLength || 0);
      const lastEnd = count ? start + (count - 1) * stride + elementBytes : start;
      if (stride < elementBytes || start < viewStart || lastEnd > viewEnd || lastEnd > bin.byteLength) throw new Error("Accessor يتجاوز حدود BufferView");
      for (let i = 0; i < count; i++) for (let c = 0; c < itemSize; c++) {
        let value = binView[component.read](start + i * stride + c * component.bytes, true);
        if (forceFloat && accessor.normalized && accessor.componentType !== 5126) {
          value = component.min < 0 ? Math.max(value / component.max, -1) : value / component.max;
        }
        if (forceFloat && !Number.isFinite(value)) throw new Error("GLB يحتوي قيمة هندسية غير منتهية");
        output[i * itemSize + c] = value;
      }
      return { array: output, count, itemSize };
    };
  }

  function readImageBytes(parsed, image) {
    if (image.uri) throw new Error("صور GLB الخارجية غير مدعومة؛ استخدم ملف GLB يحتوي الصور داخله");
    const bv = parsed.json.bufferViews && parsed.json.bufferViews[image.bufferView];
    if (!bv) throw new Error("مرجع صورة GLB غير صالح");
    const start = Number(bv.byteOffset || 0), end = start + Number(bv.byteLength || 0);
    if (start < 0 || end > parsed.bin.byteLength || end <= start) throw new Error("بيانات صورة GLB خارج الحدود");
    const mime = String(image.mimeType || "");
    if (!/^image\/(png|jpeg|webp)$/i.test(mime)) throw new Error("صيغة صورة GLB غير مدعومة: " + (mime || "unknown"));
    return { bytes: parsed.bin.slice(start, end), mime };
  }

  async function createTextures(parsed, THREE) {
    const images = parsed.json.images || [];
    const textures = parsed.json.textures || [];
    if (textures.length > 32) throw new Error("ملف GLB يحتوي عدد Textures أكبر من الحد");
    const loadedImages = [];
    let totalPixels = 0;
    try {
      // Decode serially and enforce an aggregate pixel budget to limit mobile memory spikes.
      for (const image of images) {
        const source = readImageBytes(parsed, image);
        const url = URL.createObjectURL(new Blob([source.bytes], { type: source.mime }));
        const element = await new Promise((resolve, reject) => {
          const imageElement = new Image();
          imageElement.onload = () => { URL.revokeObjectURL(url); resolve(imageElement); };
          imageElement.onerror = () => { URL.revokeObjectURL(url); reject(new Error("تعذر فك صورة Texture من GLB")); };
          imageElement.src = url;
        });
        const pixels = element.width * element.height;
        if (!element.width || !element.height || element.width > 8192 || element.height > 8192 || pixels > MAX_IMAGE_PIXELS) throw new Error("أبعاد Texture أكبر من الحد الآمن (16 ميغابكسل)");
        totalPixels += pixels;
        if (totalPixels > MAX_IMAGE_PIXELS) throw new Error("مجموع أحجام صور GLB يتجاوز حد الذاكرة الآمن (16 ميغابكسل)");
        const texture = new THREE.Texture(element);
        texture.flipY = false;
        texture.needsUpdate = true;
        loadedImages.push(texture);
      }
    } catch (error) {
      loadedImages.forEach(texture => texture.dispose && texture.dispose());
      throw error;
    }
    return textures.map(texture => {
      const sourceIndex = texture.extensions && texture.extensions.KHR_texture_basisu ? texture.extensions.KHR_texture_basisu.source : texture.source;
      if (!Number.isInteger(sourceIndex) || !loadedImages[sourceIndex]) throw new Error("مرجع Texture داخل GLB غير صالح أو مضغوط بصيغة غير مدعومة");
      return loadedImages[sourceIndex];
    });
  }

  async function loadGLB(world, input, options = {}) {
    if (!world || !world.scene || world.destroyed) throw new Error("عالم MDR غير جاهز");
    if (typeof world.editorThreeAPI !== "function") throw new Error("جسر إنشاء مجسمات GLB غير متاح");
    const parsed = input && input.json && input.bin instanceof Uint8Array && Number.isFinite(input.byteLength) ? input : parseGLB(input);
    const { json } = parsed;
    const THREE = world.editorThreeAPI();
    const readAccessor = accessorReader(parsed);
    const textures = await createTextures(parsed, THREE);
    const useTexture = (textureInfo, colorSpace) => {
      if (!textureInfo || !Number.isInteger(textureInfo.index) || !textures[textureInfo.index]) throw new Error("مرجع Texture داخل GLB غير صالح");
      const texture = textures[textureInfo.index].clone();
      texture.colorSpace = colorSpace || "";
      texture.channel = Number.isInteger(textureInfo.texCoord) ? textureInfo.texCoord : 0;
      texture.needsUpdate = true;
      return texture;
    };
    const materials = (json.materials || []).map(material => {
      const pbr = material.pbrMetallicRoughness || {};
      const factor = pbr.baseColorFactor || [1, 1, 1, 1];
      if (factor.length !== 4 || !factor.every(value => Number.isFinite(value) && value >= 0 && value <= 1)) throw new Error("Base color factor غير صالح");
      const roughness = pbr.roughnessFactor === undefined ? 1 : pbr.roughnessFactor;
      const metalness = pbr.metallicFactor === undefined ? 1 : pbr.metallicFactor;
      if (!Number.isFinite(roughness) || roughness < 0 || roughness > 1 || !Number.isFinite(metalness) || metalness < 0 || metalness > 1) throw new Error("PBR roughness/metallic factor غير صالح");
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setRGB(factor[0], factor[1], factor[2]),
        opacity: factor[3] === undefined ? 1 : factor[3],
        transparent: factor[3] !== undefined && factor[3] < 1,
        roughness,
        metalness,
        side: material.doubleSided ? 2 : 0
      });
      const emissive = material.emissiveFactor || [0, 0, 0];
      if (emissive.length !== 3 || !emissive.every(value => Number.isFinite(value) && value >= 0)) throw new Error("Emissive factor غير صالح");
      mat.emissive.setRGB(emissive[0], emissive[1], emissive[2]);
      const base = pbr.baseColorTexture;
      if (base) mat.map = useTexture(base, "srgb");
      const normal = material.normalTexture;
      if (normal) mat.normalMap = useTexture(normal, "");
      const emissiveTexture = material.emissiveTexture;
      if (emissiveTexture) mat.emissiveMap = useTexture(emissiveTexture, "srgb");
      const mr = pbr.metallicRoughnessTexture;
      if (mr) { mat.metalnessMap = useTexture(mr, ""); mat.roughnessMap = useTexture(mr, ""); }
      if (material.alphaMode === "BLEND") { mat.transparent = true; }
      if (material.alphaMode === "MASK") mat.alphaTest = material.alphaCutoff === undefined ? 0.5 : material.alphaCutoff;
      mat.needsUpdate = true;
      return mat;
    });
    textures.forEach(texture => texture.dispose && texture.dispose());

    let totalVertices = 0;
    const makeGeometry = primitive => {
      if (primitive.mode !== undefined && primitive.mode !== 4 && primitive.mode !== 5 && primitive.mode !== 6) throw new Error("يدعم MDR مجسمات GLB المثلثية فقط حالياً");
      if (primitive.targets && primitive.targets.length) throw new Error("Morph targets غير مدعومة بعد");
      const attrs = primitive.attributes || {};
      if (!Number.isInteger(attrs.POSITION)) throw new Error("Mesh داخل GLB لا يحتوي POSITION");
      const geometry = new THREE.BufferGeometry();
      const map = { POSITION: ["position", [3]], NORMAL: ["normal", [3]], TEXCOORD_0: ["uv", [2]], TEXCOORD_1: ["uv1", [2]], COLOR_0: ["color", [3, 4]], TANGENT: ["tangent", [4]] };
      let vertexCount = 0;
      for (const [sourceName, [targetName, sizes]] of Object.entries(map)) {
        if (attrs[sourceName] === undefined) continue;
        const data = readAccessor(attrs[sourceName], true);
        if (!sizes.includes(data.itemSize)) throw new Error("حجم Attribute غير صحيح: " + sourceName);
        if (!vertexCount) vertexCount = data.count;
        if (data.count !== vertexCount) throw new Error("GLB يحتوي Attributes بأطوال غير متطابقة");
        geometry.setAttribute(targetName, new THREE.Float32BufferAttribute(data.array, data.itemSize));
      }
      if (!vertexCount) throw new Error("Mesh GLB فارغ");
      totalVertices += vertexCount;
      if (totalVertices > MAX_TOTAL_VERTICES) throw new Error("المجسم يتجاوز حد الرؤوس الآمن لهذا الجهاز");
      let indices;
      if (primitive.indices !== undefined) {
        const indexAccessor = json.accessors[primitive.indices];
        if (!indexAccessor || indexAccessor.type !== "SCALAR" || ![5121, 5123, 5125].includes(indexAccessor.componentType)) throw new Error("صيغة index داخل GLB غير مدعومة");
        const values = readAccessor(primitive.indices, false);
        if (values.itemSize !== 1) throw new Error("صيغة index غير صالحة");
        indices = Array.from(values.array);
      } else indices = Array.from({ length: vertexCount }, (_, i) => i);
      if (indices.some(index => index >= vertexCount)) throw new Error("GLB يحتوي index خارج حدود الرؤوس");
      if (primitive.mode === 5) {
        const triangles = [];
        for (let i = 0; i + 2 < indices.length; i++) triangles.push(...(i % 2 ? [indices[i + 1], indices[i], indices[i + 2]] : [indices[i], indices[i + 1], indices[i + 2]]));
        indices = triangles;
      } else if (primitive.mode === 6) {
        const triangles = [];
        for (let i = 1; i + 1 < indices.length; i++) triangles.push(indices[0], indices[i], indices[i + 1]);
        indices = triangles;
      }
      if (!indices.length || indices.length % 3 !== 0) throw new Error("عدد مؤشرات GLB لا يشكل مثلثات كاملة");
      geometry.setIndex(indices);
      if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      return geometry;
    };

    const makeMesh = (meshIndex, parent) => {
      const mesh = json.meshes && json.meshes[meshIndex];
      if (!mesh || !Array.isArray(mesh.primitives)) throw new Error("مرجع Mesh في GLB غير صالح");
      mesh.primitives.forEach((primitive, index) => {
        if (primitive.attributes && (primitive.attributes.JOINTS_0 !== undefined || primitive.attributes.WEIGHTS_0 !== undefined)) throw new Error("Skinning والعظام غير مدعومة؛ استخدم Static GLB");
        const geometry = makeGeometry(primitive);
        const material = primitive.material === undefined ? new THREE.MeshStandardMaterial({ color: 0xb8c5d5, roughness: 0.8 }) : materials[primitive.material];
        if (!material) throw new Error("مرجع Material داخل GLB غير صالح");
        const object = new THREE.Mesh(geometry, material);
        object.name = String(mesh.name || "Mesh") + (mesh.primitives.length > 1 ? " " + (index + 1) : "");
        object.castShadow = true;
        object.receiveShadow = true;
        parent.add(object);
      });
    };

    const root = new THREE.Group();
    root.name = String(options.name || (json.asset && json.asset.generator) || "GLB Model").replace(/\.[^.]+$/, "").slice(0, 100);
    const built = new Set();
    const buildNode = (nodeIndex, parent, depth = 0) => {
      if (depth > 128) throw new Error("تسلسل عقد GLB أعمق من الحد المسموح");
      const node = json.nodes && json.nodes[nodeIndex];
      if (!node || built.has(nodeIndex)) throw new Error("عقدة GLB غير صالحة أو مرتبطة بشكل دائري");
      built.add(nodeIndex);
      const group = new THREE.Group();
      group.name = String(node.name || "Node " + nodeIndex).slice(0, 100);
      if (node.matrix) {
        if (node.matrix.length !== 16 || !node.matrix.every(Number.isFinite)) throw new Error("Node matrix غير صالح");
        group.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix));
      } else {
        const t = node.translation || [0, 0, 0], r = node.rotation || [0, 0, 0, 1], s = node.scale || [1, 1, 1];
        if (t.length !== 3 || r.length !== 4 || s.length !== 3 || ![...t, ...r, ...s].every(Number.isFinite) || [...t, ...r].some(value => Math.abs(value) > 1000000) || s.some(value => Math.abs(value) > 10000)) throw new Error("Node transform خارج الحدود أو غير صالح");
        group.position.set(t[0], t[1], t[2]);
        group.quaternion.set(r[0], r[1], r[2], r[3]);
        group.scale.set(s[0], s[1], s[2]);
      }
      parent.add(group);
      if (node.mesh !== undefined) makeMesh(node.mesh, group);
      for (const child of node.children || []) buildNode(child, group, depth + 1);
      return group;
    };
    const sceneIndex = json.scene === undefined ? 0 : json.scene;
    const scene = json.scenes && json.scenes[sceneIndex];
    if (scene && Array.isArray(scene.nodes)) scene.nodes.forEach(index => buildNode(index, root));
    else if (Array.isArray(json.nodes) && json.nodes.length) {
      const childSet = new Set(json.nodes.flatMap(node => node.children || []));
      json.nodes.forEach((node, index) => { if (!childSet.has(index)) buildNode(index, root); });
    } else (json.meshes || []).forEach((mesh, index) => makeMesh(index, root));

    if (!root.children.length) throw new Error("لم يعثر MDR على مجسمات قابلة للعرض داخل GLB");
    root.userData.mdrId = options.id || ("mdr-asset-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));
    root.userData.mdrType = "glb";
    root.userData.mdrAssetId = options.assetId || "";
    root.userData.mdrFileName = String(options.fileName || options.name || "model.glb").slice(0, 120);
    root.userData.mdrColor = "#b8c5d5";
    root.userData.mdrHasAnimations = Boolean(json.animations && json.animations.length);
    root.userData.mdrWarnings = root.userData.mdrHasAnimations ? ["تم تحميل المجسم دون تشغيل التحريكات الموجودة في الملف"] : [];
    world.scene.add(root);
    world._mdrEditorObjects = world._mdrEditorObjects || [];
    world._mdrEditorObjects.push(root);
    return root;
  }

  function validateFile(file) {
    if (!file || typeof file.size !== "number" || file.size <= 0) throw new Error("اختر ملف GLB صالحاً");
    if (file.size > MAX_BYTES) throw new Error("حجم ملف GLB يجب ألا يتجاوز 50MB");
    if (!/\.glb$/i.test(String(file.name || ""))) throw new Error("الاستيراد يدعم ملفات GLB فقط حالياً");
    return true;
  }
  return Object.freeze({ MAX_BYTES, parseGLB, loadGLB, validateFile });
});
