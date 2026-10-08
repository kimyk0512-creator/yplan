import { notFound } from 'next/navigation';
import { services,groups,consultationHref } from '../../../lib/services.mjs';
export const dynamicParams = false;
export function generateStaticParams() {return services.map(service=>({slug:service.slug}));}
export async function generateMetadata({params}) {const {slug}=await params;const service=services.find(item=>item.slug===slug);return service?{title:service.name+' | 와이플랜 Y-PLAN',description:service.description}:{};}
export default async function Service({params}) {
  const {slug}=await params;
  const service=services.find(item=>item.slug===slug);
  if (!service) notFound();
  const group=groups.find(item=>item.id===service.group);
  const related=services.filter(item=>item.group===service.group&&item.slug!==service.slug).slice(0,3);
  const lines=service.headline.split('\n');
  return <main className="inner-page service-detail">
    <section className="inner-hero section-dark"><div className="breadcrumb"><a href="/">HOME</a><a href="/services">SERVICES</a><span>{service.name}</span></div><p className="eyebrow">{service.en}</p><h1>{lines[0]}<br/><span>{lines[1]}</span></h1><div className="detail-intro"><p>{service.description}</p><a className="button orange" href={consultationHref(service.name)}>{service.name} 상담하기</a></div></section>
    <section className="detail-section section-light"><div className="section-label"><span>01 — WHEN YOU NEED IT</span><span>이런 고민이 있다면</span></div><div className="detail-columns"><h2>지금 필요한 방향을,<br/><span>함께 찾습니다.</span></h2><ul className="audience-list">{service.audience.map((item,index)=><li key={item}><span>0{index+1}</span><p>{item}</p></li>)}</ul></div></section>
    <section className="detail-section section-dark"><div className="section-label"><span>02 — SERVICE SCOPE</span><span>주요 진행 내용</span></div><h2>기획에서 실행까지,<br/><span>필요한 과정을 연결합니다.</span></h2><div className="scope-grid">{service.scope.map(([title,description],index)=><article key={title}><span>0{index+1}</span><h3>{title}</h3><p>{description}</p></article>)}</div><p className="scope-note">세부 범위와 일정은 브랜드 상황을 확인한 후 상담에서 협의합니다.</p></section>
    <section className="detail-section section-light"><div className="section-label"><span>03 — GETTING STARTED</span><span>상담부터 시작하기</span></div><div className="detail-columns"><h2>첫 상담은,<br/><span>현재의 이야기부터.</span></h2><div className="prep-copy"><p>브랜드 소개와 가장 해결하고 싶은 고민을 알려주세요. 현재 운영 중인 채널이나 참고 자료가 있다면 함께 살펴봅니다.</p><ol><li>현재 상황과 목표를 이야기합니다.</li><li>필요한 진행 범위와 준비 사항을 정리합니다.</li><li>일정과 방향을 협의한 뒤 시작합니다.</li></ol></div></div></section>
    {related.length>0&&<section className="related-section section-dark"><div className="section-label"><span>EXPLORE MORE</span><span>{group.name}</span></div><h2>함께 살펴볼 서비스</h2><div className="related-links">{related.map(item=><a key={item.slug} href={'/services/'+item.slug}><span>{item.en}</span><h3>{item.name}</h3><span className="card-link">자세히 보기</span></a>)}</div></section>}
    <section className="page-cta"><p className="eyebrow">LET’S MAKE YOUR PLAN.</p><h2>{service.name},<br/>우리 브랜드에 맞게.</h2><p>서비스 선택부터 진행 방향까지 함께 이야기해 주세요.</p><a className="button" href={consultationHref(service.name)}>이 서비스 상담 신청</a><a className="all-services" href="/services">전체 서비스 살펴보기</a></section>
  </main>;
}
