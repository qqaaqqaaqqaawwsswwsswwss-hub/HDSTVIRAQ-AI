/* MDR NextGen Systems 3.0 — experimental engine systems, browser-safe and dependency-light. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MDRNextGen = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
  const finite3 = v => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
  const safeId = v => /^[a-zA-Z0-9_-]{1,64}$/.test(String(v));

  // Procedural world generator. It creates deterministic scene data; an external AI provider can replace the planner.
  function generateWorld(options = {}) {
    const seed = (Number(options.seed) >>> 0) || 0x4d4452;
    let state = seed;
    const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
    const theme = ['forest', 'desert', 'snow', 'alien'].includes(options.theme) ? options.theme : 'forest';
    const count = Math.floor(clamp(options.count ?? 48, 1, 500));
    const spread = clamp(options.spread ?? 80, 10, 500);
    const palette = { forest: ['#315c3a','#547a42','#8caa62'], desert: ['#b77b42','#d5a35b','#e4c58a'], snow: ['#9dbbd0','#dce8ef','#718ba4'], alien: ['#583d82','#2e8b83','#b64e8c'] }[theme];
    const objects = Array.from({ length: count }, (_, i) => ({ id: `world-${seed}-${i}`, type: random() > .82 ? 'sphere' : 'box', name: `${theme}-${i+1}`, position: [(random()-.5)*spread, .5, (random()-.5)*spread], scale: [0.6+random()*2,0.6+random()*4,0.6+random()*2], color: palette[Math.floor(random()*palette.length)] }));
    return { schema: 'mdr-world-plan', version: 1, seed, theme, objects, metadata: { generator: 'MDR Procedural Planner', aiProvider: options.aiProvider || null, note: 'Procedural generation; external AI inference is not included.' } };
  }

  // Renderer capability selection. WebView Three.js remains WebGL unless the renderer is explicitly built for WebGPU.
  function detectRenderer(env = {}) {
    const nav = env.navigator || (typeof navigator !== 'undefined' ? navigator : {});
    const doc = env.document || (typeof document !== 'undefined' ? document : null);
    const webgpu = !!(nav.gpu && typeof nav.gpu.requestAdapter === 'function');
    let webgl2 = false, maxTextureSize = 2048, maxRenderbufferSize = 2048;
    try { const canvas = doc && doc.createElement ? doc.createElement('canvas') : null; const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl')); if (gl) { webgl2 = !!(canvas.getContext('webgl2')); maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || maxTextureSize; maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || maxRenderbufferSize; } } catch (_) {}
    return { preferred: webgpu ? 'webgpu-capable' : webgl2 ? 'webgl2' : 'webgl-or-unavailable', webgpu, webgl2, maxTextureSize, maxRenderbufferSize, vulkan: false, note: 'Vulkan is not directly exposed to browser WebView. WebGPU availability does not guarantee that the current Three.js renderer uses it.' };
  }

  // Animation bridge for Three.js AnimationMixer / GLTF clips.
  function createAnimationController(mixer, clips = []) {
    if (!mixer || typeof mixer.clipAction !== 'function') throw new Error('A compatible AnimationMixer is required');
    const actions = new Map();
    for (const clip of clips) if (clip && typeof clip.name === 'string') actions.set(clip.name, mixer.clipAction(clip));
    let current = null;
    return Object.freeze({
      names: () => Array.from(actions.keys()),
      play(name, options = {}) { const next = actions.get(name); if (!next) throw new Error(`Unknown animation: ${name}`); if (current && current !== next) current.fadeOut(clamp(options.fade ?? .2, 0, 5)); next.reset(); next.setLoop(options.loop === false ? 2200 : 2201, options.repetitions ?? Infinity); next.fadeIn(clamp(options.fade ?? .2, 0, 5)).play(); current = next; return name; },
      stop() { if (current) current.fadeOut(.1); current = null; },
      update(delta) { mixer.update(clamp(delta, 0, .1)); }
    });
  }

  // WebSocket multiplayer transport. It requires a user-supplied relay/server URL; no hosted server is bundled.
  function createMultiplayer(options = {}) {
    let socket = null, closedByUser = false;
    const listeners = new Set();
    const emit = event => listeners.forEach(fn => { try { fn(event); } catch (_) {} });
    return Object.freeze({
      get state() { return socket ? ['connecting','open','closing','closed'][socket.readyState] || 'unknown' : 'idle'; },
      onEvent(fn) { if (typeof fn !== 'function') throw new Error('Listener must be a function'); listeners.add(fn); return () => listeners.delete(fn); },
      connect(url, room, playerId) {
        if (typeof WebSocket === 'undefined') throw new Error('WebSocket is unavailable in this runtime');
        const parsed = new URL(url); if (!['ws:','wss:'].includes(parsed.protocol)) throw new Error('Only ws:// and wss:// endpoints are allowed');
        if (!safeId(room) || !safeId(playerId)) throw new Error('Invalid room or player ID');
        if (socket && socket.readyState < 2) socket.close();
        closedByUser = false; socket = new WebSocket(parsed.href);
        socket.addEventListener('open', () => { emit({ type:'connected' }); this.send({ type:'join', room, playerId }); });
        socket.addEventListener('message', e => { if (typeof e.data !== 'string' || e.data.length > 65536) return; try { const data = JSON.parse(e.data); if (data && typeof data.type === 'string') emit({ type:'message', data }); } catch (_) {} });
        socket.addEventListener('error', () => emit({ type:'error' }));
        socket.addEventListener('close', e => emit({ type:'disconnected', code:e.code, intentional:closedByUser }));
        return true;
      },
      send(payload) { if (!socket || socket.readyState !== 1) return false; const text = JSON.stringify(payload); if (text.length > 65536) throw new Error('Multiplayer message too large'); socket.send(text); return true; },
      disconnect() { closedByUser = true; if (socket) socket.close(1000, 'user disconnect'); socket = null; }
    });
  }

  // Visual scripting: deterministic allow-listed node graph; never evaluates arbitrary source code.
  const OPS = Object.freeze({ constant: (n, inputs) => n.value, add: (n, i) => Number(i.a||0)+Number(i.b||0), multiply:(n,i)=>Number(i.a||0)*Number(i.b||0), greater:(n,i)=>Number(i.a||0)>Number(i.b||0), and:(n,i)=>!!i.a&&!!i.b, not:(n,i)=>!i.a, log:(n,i,ctx)=>{ ctx.log(String(i.value ?? '')); return i.value; }, setVariable:(n,i,ctx)=>{ if(!safeId(n.key)) throw new Error('Invalid variable key'); ctx.variables[n.key]=i.value; return i.value; }, getVariable:(n,i,ctx)=>ctx.variables[n.key] });
  function runGraph(graph, context = {}) {
    if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length > 300 || !Array.isArray(graph.edges) || graph.edges.length > 1000) throw new Error('Invalid or oversized visual graph');
    const nodes = new Map(); for (const n of graph.nodes) { if (!n || !safeId(n.id) || !OPS[n.type] || nodes.has(n.id)) throw new Error('Invalid or unsupported graph node'); nodes.set(n.id,n); }
    const incoming = new Map(); for (const e of graph.edges) { if (!e || !nodes.has(e.from) || !nodes.has(e.to) || !safeId(e.input)) throw new Error('Invalid graph edge'); const list=incoming.get(e.to)||[]; list.push(e); incoming.set(e.to,list); }
    const values = new Map(), visiting = new Set(), variables = context.variables || {}, logs=[];
    const ctx = { variables, log: value => { logs.push(value); if (typeof context.log === 'function') context.log(value); } };
    function evaluate(id) { if(values.has(id)) return values.get(id); if(visiting.has(id)) throw new Error('Visual graph cycle detected'); const node=nodes.get(id); if(!node) throw new Error('Missing graph node'); visiting.add(id); const inputs={}; for(const edge of incoming.get(id)||[]) inputs[edge.input]=evaluate(edge.from); const value=OPS[node.type](node,inputs,ctx); visiting.delete(id); values.set(id,value); return value; }
    const results={}; for(const n of graph.nodes) results[n.id]=evaluate(n.id);
    return { results, variables, logs };
  }

  // Chunk streaming with explicit load/unload callbacks and bounded active chunk count.
  function createWorldStreamer(options = {}) {
    const size=clamp(options.chunkSize ?? 64, 8, 512), max= Math.floor(clamp(options.maxActive ?? 64, 1, 512));
    const active=new Map();
    function key(x,z){return `${Math.floor(x)},${Math.floor(z)}`;}
    return Object.freeze({
      get activeCount(){return active.size;},
      async update(position, radius, callbacks={}) { if(!finite3(position)) throw new Error('Invalid streaming position'); const r=Math.floor(clamp(radius,0,12)), cx=Math.floor(position[0]/size), cz=Math.floor(position[2]/size), wanted=[]; for(let z=-r;z<=r;z++)for(let x=-r;x<=r;x++) if(x*x+z*z<=r*r+1) wanted.push([cx+x,cz+z]); wanted.sort((a,b)=>(a[0]-cx)**2+(a[1]-cz)**2-((b[0]-cx)**2+(b[1]-cz)**2));
        const keep=new Set(wanted.slice(0,max).map(([x,z])=>key(x,z))); for(const [k,value] of active) if(!keep.has(k)){ active.delete(k); if(callbacks.unload) await callbacks.unload(value,k); }
        for(const [x,z] of wanted){const k=key(x,z);if(!keep.has(k)||active.has(k))continue; const value=callbacks.load?await callbacks.load({x,z,size}):{x,z,size}; active.set(k,value);}
        return { active:active.size, loaded:Array.from(active.keys()), center:[cx,cz]};
      },
      clear(callbacks={}) { for(const [k,v] of active){ if(callbacks.unload) callbacks.unload(v,k); } active.clear(); }
    });
  }

  // Arcade vehicle dynamics helper. Produces forces/velocity; caller applies them to physics bodies.
  function stepVehicle(state, input = {}, dt = 1/60, config = {}) {
    if(!state || !finite3(state.velocity || [0,0,0])) throw new Error('Invalid vehicle state');
    dt=clamp(dt,0,.05); const throttle=clamp(input.throttle,-1,1), steer=clamp(input.steer,-1,1), brake=clamp(input.brake,0,1);
    const mass=clamp(config.mass ?? 1200,100,100000), engine=clamp(config.engineForce ?? 9000,0,100000), drag=clamp(config.drag ?? 1.8,0,20), grip=clamp(config.grip ?? 5,0,20), maxSteer=clamp(config.maxSteer ?? .55,0,1.2);
    const speed=Math.hypot(state.velocity[0],state.velocity[2]), heading=Number(state.heading)||0; const forward=[Math.sin(heading),0,Math.cos(heading)], right=[Math.cos(heading),0,-Math.sin(heading)];
    const longitudinal=state.velocity[0]*forward[0]+state.velocity[2]*forward[2]; const lateral=state.velocity[0]*right[0]+state.velocity[2]*right[2];
    const accel=(throttle*engine/mass)-Math.sign(longitudinal)*drag*longitudinal*longitudinal/mass-brake*Math.sign(longitudinal)*18;
    const nextSpeed=longitudinal+accel*dt; const nextHeading=heading+steer*maxSteer*clamp(Math.abs(nextSpeed)/8,0,1)*dt*Math.sign(nextSpeed||1);
    const lateralDamp=Math.max(0,1-grip*dt); const v=[forward[0]*nextSpeed+right[0]*lateral*lateralDamp, state.velocity[1], forward[2]*nextSpeed+right[2]*lateral*lateralDamp];
    return { velocity:v, heading:nextHeading, speed:Math.abs(nextSpeed), force:[forward[0]*accel*mass,0,forward[2]*accel*mass] };
  }

  function createDashboard() {
    if (typeof document === 'undefined' || document.getElementById('mdr-nextgen-panel')) return;
    const panel=document.createElement('section'); panel.id='mdr-nextgen-panel'; panel.dir='rtl'; panel.innerHTML=`<style>#mdr-nextgen-panel{position:fixed;z-index:99999;bottom:76px;left:12px;width:min(370px,calc(100vw - 24px));max-height:72vh;overflow:auto;background:#10151ff2;color:#edf2fa;border:1px solid #ffffff24;border-radius:16px;padding:14px;font:13px/1.6 system-ui;box-shadow:0 16px 50px #0009;display:none}#mdr-nextgen-panel.open{display:block}#mdr-nextgen-panel h3{margin:0 0 8px;font-size:16px}#mdr-nextgen-panel .ng-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}#mdr-nextgen-panel button,#mdr-nextgen-panel select,#mdr-nextgen-panel input{min-height:40px;border-radius:9px;border:1px solid #ffffff24;background:#202938;color:#fff;padding:8px;font:inherit;min-width:0}#mdr-nextgen-panel button.primary{background:#d99a27;color:#17120a;font-weight:700}#mdr-nextgen-panel .ng-note{color:#aab7c8;font-size:11px;margin:8px 0}#mdr-nextgen-toggle{position:fixed;z-index:100000;bottom:14px;left:14px;border:1px solid #ffffff30;border-radius:99px;background:#d99a27;color:#17120a;padding:12px 16px;font-weight:800;box-shadow:0 6px 22px #0008}</style><h3>⚡ MDR NextGen · أنظمة تجريبية</h3><div class="ng-grid"><select id="ng-theme"><option value="forest">غابة</option><option value="desert">صحراء</option><option value="snow">ثلج</option><option value="alien">عالم فضائي</option></select><input id="ng-count" type="number" min="1" max="500" value="48" aria-label="عدد العناصر"><button class="primary" id="ng-generate">توليد عالم إجرائي</button><button id="ng-renderer">فحص الرسوميات</button><button id="ng-graph">اختبار البرمجة المرئية</button><button id="ng-stream">اختبار تحميل العالم</button><button id="ng-vehicle">محاكاة مركبة</button><button id="ng-multi">حالة اللعب الجماعي</button></div><p class="ng-note" id="ng-output">التوليد الإجرائي محلي. الذكاء الاصطناعي السحابي وخادم اللعب الجماعي يحتاجان مزوداً خارجياً.</p>`;
    const toggle=document.createElement('button');toggle.id='mdr-nextgen-toggle';toggle.textContent='MDR NextGen';toggle.onclick=()=>panel.classList.toggle('open');document.body.append(toggle,panel);
    const out=panel.querySelector('#ng-output');
    panel.querySelector('#ng-generate').onclick=()=>{try{const plan=generateWorld({theme:panel.querySelector('#ng-theme').value,count:Number(panel.querySelector('#ng-count').value)}); const blob=new Blob([JSON.stringify(plan,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mdr-world-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);out.textContent=`تم إنشاء مخطط ${plan.theme}: ${plan.objects.length} عنصر. نزّل JSON واستورده بعد تحويله إلى عناصر مشهد.`;}catch(e){out.textContent=e.message;}};
    panel.querySelector('#ng-renderer').onclick=()=>{const r=detectRenderer();out.textContent=`Renderer: ${r.preferred} · WebGPU: ${r.webgpu?'متاح':'غير متاح'} · WebGL2: ${r.webgl2?'متاح':'غير متاح'} · Texture: ${r.maxTextureSize}. Vulkan مباشر غير متاح في WebView.`;};
    panel.querySelector('#ng-graph').onclick=()=>{try{const r=runGraph({nodes:[{id:'a',type:'constant',value:6},{id:'b',type:'constant',value:7},{id:'c',type:'multiply'}],edges:[{from:'a',to:'c',input:'a'},{from:'b',to:'c',input:'b'}]});out.textContent=`Visual Scripting OK: 6 × 7 = ${r.results.c}`;}catch(e){out.textContent=e.message;}};
    panel.querySelector('#ng-stream').onclick=async()=>{const s=createWorldStreamer({chunkSize:64,maxActive:25});const r=await s.update([0,0,0],3);out.textContent=`World Streaming: ${r.active} chunks loaded within memory budget.`;};
    panel.querySelector('#ng-vehicle').onclick=()=>{const v=stepVehicle({velocity:[0,0,0],heading:0},{throttle:1,steer:.3},1/60);out.textContent=`Vehicle Dynamics: speed ${v.speed.toFixed(2)} m/s · steering ${v.heading.toFixed(3)} rad.`;};
    panel.querySelector('#ng-multi').onclick=()=>{out.textContent='Multiplayer transport جاهز للربط، لكنه يحتاج WebSocket relay URL وغرفة مستضافة. لا يوجد خادم مرفق.';};
  }

  return Object.freeze({ generateWorld, detectRenderer, createAnimationController, createMultiplayer, runGraph, createWorldStreamer, stepVehicle, createDashboard });
});
