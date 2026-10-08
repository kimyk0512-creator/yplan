import { Noto_Sans_KR } from 'next/font/google';
import "../public/styles.css";
import Script from "next/script";
import { Header, Footer, PrivacyDialog } from "../components/SiteChrome";
const noto = Noto_Sans_KR({weight:'variable',display:'swap',preload:false,variable:'--font-noto'});
export const metadata = {title: "와이플랜 Y-PLAN | 브랜드의 다음을 계획하다", description: "브랜드블로그, 플레이스, 유튜브, 콘텐츠 제작과 비즈니스 컨설팅. 와이플랜과 브랜드의 다음을 계획하세요.", icons: { icon: "/favicon.svg" }};
export default function RootLayout({children}) {return <html lang="ko" className={noto.variable}><body><a className="skip-link" href="#main-content">본문으로 건너뛰기</a><Header/><div id="main-content">{children}</div><Footer/><PrivacyDialog/><Script src="/app.js" strategy="afterInteractive" /></body></html>;}
