const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../../app/src/main/assets/mdr-nextgen.js');

test('procedural world generation is deterministic and bounded', () => {
  const a=N.generateWorld({seed:42,count:25,theme:'desert'}), b=N.generateWorld({seed:42,count:25,theme:'desert'});
  assert.deepEqual(a,b); assert.equal(a.objects.length,25); assert.ok(a.objects.every(o=>o.color.startsWith('#')));
});
test('procedural world clamps oversized requests',()=>assert.equal(N.generateWorld({count:9999}).objects.length,500));
test('renderer capability detection reports WebGPU without claiming Vulkan',()=>{const r=N.detectRenderer({navigator:{gpu:{requestAdapter(){}}},document:null});assert.equal(r.webgpu,true);assert.equal(r.vulkan,false);});
test('animation controller validates mixer and plays named clips',()=>{let played=0;const action={reset(){},setLoop(){},fadeIn(){return this},fadeOut(){},play(){played++;}};const c=N.createAnimationController({clipAction:()=>action},[{name:'Run'}]);c.play('Run');assert.equal(played,1);assert.throws(()=>c.play('Fly'),/Unknown/);});
test('multiplayer rejects unsafe protocols and malformed identifiers',()=>{const m=N.createMultiplayer();assert.throws(()=>m.connect('http://localhost','room','player'),/Only ws/);assert.throws(()=>m.connect('wss://localhost','bad room','player'),/Invalid/);});
test('visual graph evaluates allow-listed nodes without eval',()=>{const r=N.runGraph({nodes:[{id:'x',type:'constant',value:8},{id:'y',type:'constant',value:9},{id:'z',type:'multiply'}],edges:[{from:'x',to:'z',input:'a'},{from:'y',to:'z',input:'b'}]});assert.equal(r.results.z,72);});
test('visual graph rejects cycles and unknown operations',()=>{assert.throws(()=>N.runGraph({nodes:[{id:'a',type:'not'}],edges:[{from:'a',to:'a',input:'a'}]}),/cycle/);assert.throws(()=>N.runGraph({nodes:[{id:'a',type:'eval'}],edges:[]}),/unsupported/);});
test('world streamer obeys active chunk budget and unloads',async()=>{const s=N.createWorldStreamer({maxActive:9});let unloaded=0;const a=await s.update([0,0,0],3);assert.equal(a.active,9);const b=await s.update([500,0,500],3,{unload:()=>unloaded++});assert.equal(b.active,9);assert.equal(unloaded,9);});
test('vehicle dynamics accelerates and returns bounded steering state',()=>{const v=N.stepVehicle({velocity:[0,0,0],heading:0},{throttle:1,steer:1},1/60);assert.ok(v.speed>0);assert.ok(Number.isFinite(v.heading));assert.equal(v.force.length,3);});
test('vehicle dynamics rejects invalid velocity',()=>assert.throws(()=>N.stepVehicle({velocity:[NaN,0,0]}),/Invalid/));

test('Baghdad theme produces a deterministic, locally-styled city plan', () => {
  const a = N.generateWorld({ seed: 91, count: 36, theme: 'baghdad' });
  const b = N.generateWorld({ seed: 91, count: 36, theme: 'baghdad' });
  assert.deepEqual(a, b);
  assert.equal(a.objects.length, 36);
  assert.ok(a.objects.every(o => o.type === 'box' && o.position[1] >= o.scale[1] / 2));
  assert.ok(a.objects.some(o => o.name.startsWith('baghdad-tower-')));
});

test('procedural world converts into a valid, bounded MDR scene for direct editor import', () => {
  const plan = N.generateWorld({ seed: 7, count: 12, theme: 'baghdad' });
  const scene = N.toSceneProject(plan);
  assert.equal(scene.schema, 'mdr-scene');
  assert.equal(scene.name, 'بغداد · مشهد إجرائي');
  assert.equal(scene.objects.length, 12);
  assert.ok(scene.objects.every(o => o.type === 'box' && o.rotation.length === 3));
});

test('procedural scene conversion rejects unsafe ids, duplicate ids, and oversized plans', () => {
  const plan = N.generateWorld({ seed: 9, count: 2 });
  assert.throws(() => N.toSceneProject({ ...plan, objects: [{ ...plan.objects[0], id: '../bad' }] }), /Invalid procedural scene object/);
  assert.throws(() => N.toSceneProject({ ...plan, objects: [plan.objects[0], plan.objects[0]] }), /Invalid procedural scene object/);
  assert.throws(() => N.toSceneProject({ ...plan, objects: Array(501).fill(plan.objects[0]) }), /Invalid procedural world plan/);
});
