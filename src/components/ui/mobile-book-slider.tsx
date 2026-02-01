import React, { useRef } from 'react'
import HTMLFlipBook from "react-pageflip";

// Import portfolio screenshots
import dehubImg from '@/assets/portfolio/dehub.png';
import holderChatImg from '@/assets/portfolio/holder-chat.png';
import secDigitalImg from '@/assets/portfolio/sec-digital.png';
import delabsImg from '@/assets/portfolio/delabs.png';
import fanSiteImg from '@/assets/portfolio/fan-site.png';
import theponziImg from '@/assets/portfolio/theponzi.png';

const portfolioData = [
  {
    name: "DeHub",
    url: "dehub.io",
    description: "A decentralized hub platform for Web3 communities and digital assets.",
    screenshot: dehubImg
  },
  {
    name: "Last Chad Standing",
    url: "lastchadstandin.com",
    description: "An exciting competitive platform where only the strongest survive.",
    screenshot: null
  },
  {
    name: "Holder Chat",
    url: "holder.chat",
    description: "Token-gated communication platform for crypto holders and communities.",
    screenshot: holderChatImg
  },
  {
    name: "SEC Digital",
    url: "sec.digital",
    description: "Digital security solutions and blockchain infrastructure services.",
    screenshot: secDigitalImg
  },
  {
    name: "DeLabs UK",
    url: "delabs.co.uk",
    description: "Innovative development laboratory building cutting-edge digital solutions.",
    screenshot: delabsImg
  },
  {
    name: "Fan Site",
    url: "fan.site",
    description: "Create and manage fan communities with powerful engagement tools.",
    screenshot: fanSiteImg
  },
  {
    name: "The Ponzi",
    url: "theponzi.lol",
    description: "A satirical take on crypto culture with gamified experiences.",
    screenshot: theponziImg
  }
];

function MobileBookSlider() {
  const bookRef = useRef<any>(null);

  const handleCoverClick = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      {/* @ts-ignore */}
      <HTMLFlipBook
        ref={bookRef}
        width={280}
        height={380}
        size="fixed"
        minWidth={280}
        maxWidth={280}
        minHeight={380}
        maxHeight={380}
        showCover={true}
        mobileScrollSupport={true}
        className="shadow-2xl"
        style={{}}
        startPage={0}
        drawShadow={true}
        flippingTime={800}
        usePortrait={true}
        startZIndex={0}
        autoSize={false}
        maxShadowOpacity={0.5}
        showPageCorners={true}
        disableFlipByClick={false}
        swipeDistance={20}
        clickEventForward={true}
        useMouseEvents={true}
      >
        {/* Cover Page - Dark Leather Style (identical to desktop) */}
        <div 
          className="relative flex items-center justify-center h-full w-full cursor-pointer"
          onClick={handleCoverClick}
          style={{
            background: 'linear-gradient(160deg, #1f1f1f 0%, #141414 40%, #0a0a0a 100%)',
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.9)',
          }}
        >
          {/* Dark leather texture overlay */}
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* Outer gold border frame */}
          <div className="absolute border-2"
            style={{
              top: '10px',
              right: '10px',
              bottom: '10px',
              left: '10px',
              borderColor: '#C9A227',
              boxShadow: '0 0 20px rgba(201,162,39,0.15)',
            }}
          />
          
          {/* Inner gold border frame */}
          <div className="absolute border"
            style={{
              top: '18px',
              right: '18px',
              bottom: '18px',
              left: '18px',
              borderWidth: '1px',
              borderColor: 'rgba(201,162,39,0.5)',
            }}
          />
          
          {/* Corner accents */}
          <svg className="absolute" style={{ top: '14px', left: '14px', width: '20px', height: '20px', color: '#C9A227' }} viewBox="0 0 24 24">
            <path d="M2 2 L2 10 M2 2 L10 2" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <svg className="absolute" style={{ top: '14px', right: '14px', width: '20px', height: '20px', color: '#C9A227' }} viewBox="0 0 24 24">
            <path d="M22 2 L22 10 M22 2 L14 2" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <svg className="absolute" style={{ bottom: '14px', left: '14px', width: '20px', height: '20px', color: '#C9A227' }} viewBox="0 0 24 24">
            <path d="M2 22 L2 14 M2 22 L10 22" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <svg className="absolute" style={{ bottom: '14px', right: '14px', width: '20px', height: '20px', color: '#C9A227' }} viewBox="0 0 24 24">
            <path d="M22 22 L22 14 M22 22 L14 22" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          
          {/* Center content */}
          <div className="relative z-10 text-center flex flex-col items-center justify-center h-full px-6 py-10">
            {/* Top flourish */}
            <svg viewBox="0 0 80 16" style={{ width: '50px', height: '10px', color: '#C9A227', marginBottom: '14px' }}>
              <path d="M40 8 Q28 2 16 8 Q8 12 0 8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M40 8 Q52 2 64 8 Q72 12 80 8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="40" cy="8" r="2" fill="currentColor"/>
            </svg>
            
            {/* Title */}
            <h1 
              className="text-xl font-bold tracking-widest uppercase mb-2"
              style={{
                color: '#C9A227',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: '0.25em',
              }}
            >
              Portfolio
            </h1>
            
            {/* Divider */}
            <div className="flex items-center justify-center gap-2 my-2">
              <div style={{ width: '25px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A227)' }}/>
              <svg viewBox="0 0 12 12" style={{ width: '6px', height: '6px', color: '#C9A227' }}>
                <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="currentColor"/>
              </svg>
              <div style={{ width: '25px', height: '1px', background: 'linear-gradient(90deg, #C9A227, transparent)' }}/>
            </div>
            
            {/* Subtitle */}
            <p 
              className="text-xs tracking-wider"
              style={{
                color: '#9A7B20',
                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontStyle: 'italic',
              }}
            >
              Tap to explore
            </p>
            
            {/* Bottom flourish */}
            <svg viewBox="0 0 80 16" style={{ width: '50px', height: '10px', color: '#C9A227', marginTop: '14px' }}>
              <path d="M40 8 Q28 14 16 8 Q8 4 0 8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M40 8 Q52 14 64 8 Q72 4 80 8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="40" cy="8" r="2" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Spine shadow effect */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-3"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
            }}
          />
        </div>

        {portfolioData.map((site) => (
          <div 
            key={site.url}
            className="bg-card border border-border overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* Screenshot */}
              <div className="h-36 bg-muted overflow-hidden">
                {site.screenshot ? (
                  <img
                    src={site.screenshot}
                    alt={site.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
                    <span className="text-muted-foreground text-sm">Coming Soon</span>
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 flex flex-col justify-center p-5">
                <div className="text-center">
                  <h2 className="text-lg font-bold text-foreground mb-1">
                    {site.name}
                  </h2>
                  <a 
                    href={`https://${site.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs mb-2 hover:underline inline-block"
                  >
                    {site.url}
                  </a>
                  <p className="text-muted-foreground text-xs leading-relaxed mt-2">
                    {site.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </HTMLFlipBook>
    </div>
  );
}

export default MobileBookSlider;
