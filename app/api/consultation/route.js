import { handleConsultation } from '../../../lib/consultation.mjs';
export const runtime = 'nodejs';
export async function GET() {
  const available = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.CONSULTATION_HASH_SECRET);
  return Response.json({available},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request) { return handleConsultation(request); }
