create table if not exists public.consultations (
  id uuid primary key,
  created_at timestamptz not null default now(),
  company text not null check (char_length(company) between 1 and 100),
  name text not null check (char_length(name) between 1 and 50),
  phone text not null check (char_length(phone) between 8 and 30),
  email text not null check (char_length(email) between 3 and 150),
  service text not null,
  message text not null check (char_length(message) between 1 and 3000),
  ip_hash text not null,
  consent_version text not null default '2026-10-08',
  status text not null default 'new'
);
alter table public.consultations enable row level security;
revoke all on public.consultations from anon, authenticated;
create index if not exists consultations_ip_created_idx on public.consultations (ip_hash, created_at);
create or replace function public.submit_consultation(
  p_request_id uuid, p_company text, p_name text, p_phone text, p_email text,
  p_service text, p_message text, p_ip_hash text
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash,0));
  if exists(select 1 from consultations where id = p_request_id) then
    return jsonb_build_object('status','duplicate');
  end if;
  if (select count(*) from consultations where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('status','rate_limited');
  end if;
  insert into consultations(id,company,name,phone,email,service,message,ip_hash)
    values(p_request_id,p_company,p_name,p_phone,p_email,p_service,p_message,p_ip_hash);
  return jsonb_build_object('status','created');
end;
$$;
revoke all on function public.submit_consultation(uuid,text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_consultation(uuid,text,text,text,text,text,text,text) to service_role;
-- Monthly retention job: delete closed inquiries more than one year after consultation completion.
-- Set a verified retention process before accepting production inquiries.
