import { createHmac } from 'node:crypto';

const SERVICES = new Set(['상담 후 결정하고 싶어요','브랜드블로그','플레이스마케팅','유튜브 상위노출','유튜브 광고','체험단/기자단','카페침투 마케팅','샤오홍슈','리뷰등록','언론사 송출','영상제작','디자인&홈페이지 제작','사진촬영','할랄인증','프랜차이즈 분석','정책자금 컨설팅','통합 마케팅']);
export function validateConsultation(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const limits = {company:100,name:50,phone:30,email:150,message:3000,service:100};
  const data = {};
  for (const [key,max] of Object.entries(limits)) {
    if (typeof input[key] !== 'string') return null;
    const value = input[key].trim();
    if (!value || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return null;
    data[key] = value;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || /[\r\n]/.test(data.email)) return null;
  if (!/^[0-9+() .-]{8,30}$/.test(data.phone) || data.phone.replace(/\D/g,'').length < 8) return null;
  if (input.consent !== true || !SERVICES.has(data.service)) return null;
  if (typeof input.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId)) return null;
  data.requestId = input.requestId;
  data.consent = true;
  return data;
}
export async function handleConsultation(request, {env=process.env, fetcher=fetch} = {}) {
  const reply = (message,status=200) => Response.json({message},{status,headers:{'Cache-Control':'no-store'}});
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply('요청 경로를 확인해 주세요.',403);
  if (!request.headers.get('content-type')?.includes('application/json')) return reply('요청 형식이 올바르지 않습니다.',415);
  let raw;
  try { raw = await request.text(); } catch { return reply('요청 내용을 확인해 주세요.',400); }
  if (Buffer.byteLength(raw,'utf8') > 20000) return reply('입력 내용이 너무 깁니다.',413);
  let input;
  try { input = JSON.parse(raw); } catch { return reply('입력 내용을 확인해 주세요.',400); }
  if (input?.website) return reply('요청 내용을 확인해 주세요.',400);
  const data = validateConsultation(input);
  if (!data) return reply('필수 항목, 연락처, 이메일과 개인정보 동의를 확인해 주세요.',400);
  const dbReady = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.CONSULTATION_HASH_SECRET;
  const mailReady = env.RESEND_API_KEY && env.CONSULTATION_FROM_EMAIL;
  if (!dbReady) return reply('온라인 상담 접수를 준비 중입니다. 아래 이메일 상담을 이용해 주세요.',503);
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const ipHash = createHmac('sha256',env.CONSULTATION_HASH_SECRET).update(ip).digest('hex');
  let stored;
  try {
    const response = await fetcher(env.SUPABASE_URL+'/rest/v1/rpc/submit_consultation', {
      method:'POST', headers:{'Content-Type':'application/json',apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY},
      body:JSON.stringify({p_request_id:data.requestId,p_company:data.company,p_name:data.name,p_phone:data.phone,p_email:data.email,p_service:data.service,p_message:data.message,p_ip_hash:ipHash}),
      signal:AbortSignal.timeout(10000)
    });
    if (!response.ok) return reply('접수를 완료하지 못했습니다. 입력 내용을 유지했으니 잠시 후 다시 시도해 주세요.',502);
    stored = await response.json();
    if (stored?.status === 'rate_limited') return reply('신청이 연속으로 접수되었습니다. 잠시 후 다시 시도해 주세요.',429);
    if (!['created','duplicate'].includes(stored?.status)) return reply('접수를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',502);
  } catch { return reply('접수 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.',502); }
  if (mailReady && stored.status === 'created') {
    try {
      const response = await fetcher('https://api.resend.com/emails',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.RESEND_API_KEY,'Idempotency-Key':'consultation/'+data.requestId},
        body:JSON.stringify({from:env.CONSULTATION_FROM_EMAIL,to:[env.CONSULTATION_TO_EMAIL || 'ysh01110@naver.com'],reply_to:data.email,subject:'[와이플랜 상담] '+data.company.replace(/[\r\n]/g,' '),text:['접수번호: '+data.requestId,'회사·브랜드명: '+data.company,'담당자: '+data.name,'연락처: '+data.phone,'이메일: '+data.email,'관심 서비스: '+data.service,'','상담 내용:',data.message].join('\n')}),signal:AbortSignal.timeout(10000)
      });
      if (!response.ok) console.error('Consultation notification failed; request retained in database.');
    } catch { console.error('Consultation notification timed out; request retained in database.'); }
  }
  return reply('상담 신청이 접수되었습니다. 남겨주신 연락처로 안내드리겠습니다.');
}
