'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const AI=require('../../app/src/main/assets/mdr-ai3d.js');

test('AI image-to-3D validates image MIME and 20 MB limit',()=>{
  assert.throws(()=>AI.validateImage(null),/اختر صورة/);
  assert.throws(()=>AI.validateImage({type:'image/gif',size:100}),/JPG وPNG وWebP/);
  assert.throws(()=>AI.validateImage({type:'image/png',size:AI.MAX_IMAGE_BYTES+1}),/20MB/);
  assert.equal(AI.validateImage({type:'image/webp',size:1024}),true);
});

test('AI image-to-3D requires a plausible API key and image data URI',async()=>{
  assert.throws(()=>AI.validateKey('short'),/مفتاح Meshy/);
  await assert.rejects(()=>AI.createTask({apiKey:'abcdefghijklmnop',imageDataURI:'not-image'}),/بيانات الصورة/);
});

test('AI image-to-3D creates a textured GLB task and returns task id',async()=>{
  const original=global.fetch;let seen;
  global.fetch=async(url,options)=>{seen={url,options};return{ok:true,status:200,text:async()=>JSON.stringify({result:'12345678-abcd-1234-abcd-123456789012'})}};
  try{
    const id=await AI.createTask({apiKey:'test-api-key-123456',imageDataURI:'data:image/png;base64,AAAA'});
    assert.equal(id,'12345678-abcd-1234-abcd-123456789012');
    assert.equal(seen.url,AI.API);
    assert.equal(seen.options.method,'POST');
    assert.match(seen.options.headers.Authorization,/Bearer test-api-key/);
    const body=JSON.parse(seen.options.body);
    assert.equal(body.ai_model,'meshy-7.1');assert.equal(body.should_texture,true);assert.deepEqual(body.target_formats,['glb']);
  }finally{global.fetch=original}
});

test('AI task polling rejects invalid task ids and parses status',async()=>{
  await assert.rejects(()=>AI.getTask({apiKey:'test-api-key-123456',taskId:'bad'}),/رقم المهمة/);
  const original=global.fetch;let seen;
  global.fetch=async(url)=>{seen=url;return{ok:true,status:200,text:async()=>JSON.stringify({status:'IN_PROGRESS',progress:40})}};
  try{const task=await AI.getTask({apiKey:'test-api-key-123456',taskId:'12345678-abcd-1234-abcd-123456789012'});assert.equal(task.progress,40);assert.match(seen,/12345678-abcd/)}finally{global.fetch=original}
});
