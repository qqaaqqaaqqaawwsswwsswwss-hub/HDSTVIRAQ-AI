/* MDR AI Image-to-3D adapter — Meshy REST API client. API keys are memory-only. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MDRAI3D=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const API='https://api.meshy.ai/openapi/v1/image-to-3d';
  const MAX_IMAGE_BYTES=20*1024*1024;
  function validateImage(file){
    if(!file)throw new Error('اختر صورة أولاً');
    if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('الصيغ المدعومة: JPG وPNG وWebP');
    if(file.size>MAX_IMAGE_BYTES)throw new Error('حجم الصورة يجب ألا يتجاوز 20MB');
    return true;
  }
  function validateKey(key){if(typeof key!=='string'||key.trim().length<12)throw new Error('أدخل مفتاح Meshy API الصحيح');return key.trim()}
  async function readAsDataURI(file){validateImage(file);return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('تعذرت قراءة الصورة'));reader.readAsDataURL(file)})}
  async function request(url,options){
    let response;try{response=await fetch(url,options)}catch(error){throw new Error('تعذر الاتصال بخدمة AI. تحقق من الإنترنت أو إعدادات CORS في الخدمة الوسيطة. '+(error&&error.message||''))}
    const text=await response.text();let data={};try{data=text?JSON.parse(text):{}}catch(_){throw new Error('استجابة غير مفهومة من خدمة AI ('+response.status+')')}
    if(!response.ok)throw new Error(data.message||data.error||data.detail||('فشل طلب AI: HTTP '+response.status));return data;
  }
  async function createTask({apiKey,imageDataURI,signal}){
    const key=validateKey(apiKey);if(typeof imageDataURI!=='string'||!/^data:image\/(jpeg|png|webp);base64,/.test(imageDataURI))throw new Error('بيانات الصورة غير صالحة');
    const data=await request(API,{method:'POST',signal,headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({image_url:imageDataURI,ai_model:'meshy-7.1',should_texture:true,enable_pbr:true,target_formats:['glb']})});
    if(!data.result)throw new Error('الخدمة لم تُرجع رقم مهمة');return String(data.result);
  }
  async function getTask({apiKey,taskId,signal}){
    const key=validateKey(apiKey);if(!/^[a-zA-Z0-9-]{8,100}$/.test(String(taskId)))throw new Error('رقم المهمة غير صالح');
    return request(API+'/'+encodeURIComponent(taskId),{method:'GET',signal,headers:{Authorization:'Bearer '+key}});
  }
  return Object.freeze({API,MAX_IMAGE_BYTES,validateImage,validateKey,readAsDataURI,createTask,getTask});
});
