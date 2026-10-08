import test from 'node:test';
import assert from 'node:assert/strict';
import { handleConsultation } from '../lib/consultation.mjs';
const valid = {company:'테스트 브랜드',name:'테스트 담당자',phone:'010-0000-0000',email:'test@example.com',service:'브랜드블로그',message:'테스트 상담 요청',consent:true,requestId:'7b98e87b-a6c8-43b9-8bd8-3e2b4a4390d8'};
const env = {SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-key',CONSULTATION_HASH_SECRET:'test-hash-key',RESEND_API_KEY:'test-resend',CONSULTATION_FROM_EMAIL:'Y-PLAN <contact@example.com>'};
function request(data=valid,origin='https://y-plan.example') {return new Request('https://y-plan.example/api/consultation',{method:'POST',headers:{'Content-Type':'application/json',origin,'x-forwarded-for':'192.0.2.1'},body:JSON.stringify(data)});}
test('invalid consent is rejected before any external request',async()=>{
  let calls=0;const result=await handleConsultation(request({...valid,consent:false}),{env,fetcher:async()=>{calls++;}});
  assert.equal(result.status,400);assert.equal(calls,0);
});
test('foreign origin cannot submit',async()=>{const result=await handleConsultation(request(valid,'https://another.example'),{env});assert.equal(result.status,403);});
test('unconfigured database never reports success',async()=>{const result=await handleConsultation(request(),{env:{}});assert.equal(result.status,503);});
test('database failure does not send email or report success',async()=>{
  let calls=0;const result=await handleConsultation(request(),{env,fetcher:async()=>{calls++;return Response.json({}, {status:500});}});
  assert.equal(result.status,502);assert.equal(calls,1);
});
test('durable rate limit prevents an email',async()=>{let calls=0;const result=await handleConsultation(request(),{env,fetcher:async()=>{calls++;return Response.json({status:'rate_limited'});}});assert.equal(result.status,429);assert.equal(calls,1);});
test('successful submission hashes the address and notifies the intended mailbox',async()=>{
  const calls=[];const result=await handleConsultation(request(),{env,fetcher:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return Response.json(calls.length===1?{status:'created'}:{id:'mail-test'});}});
  assert.equal(result.status,200);assert.equal(calls.length,2);assert.match(calls[0].body.p_ip_hash,/^[a-f0-9]{64}$/);assert.equal(calls[0].body.p_ip_hash.includes('192.0.2.1'),false);assert.deepEqual(calls[1].body.to,['ysh01110@naver.com']);
});
test('retries do not send duplicate email',async()=>{let calls=0;const result=await handleConsultation(request(),{env,fetcher:async()=>{calls++;return Response.json({status:'duplicate'});}});assert.equal(result.status,200);assert.equal(calls,1);});
test('header injection and unknown service are rejected',async()=>{assert.equal((await handleConsultation(request({...valid,email:'a@example.com\r\nBcc: b@example.com'}),{env})).status,400);assert.equal((await handleConsultation(request({...valid,service:'unknown'}),{env})).status,400);});
