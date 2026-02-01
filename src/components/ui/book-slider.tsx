import React, { useState, useRef } from 'react'
import HTMLFlipBook from "react-pageflip";
import { motion } from "framer-motion";

const portfolioData = [
  {
    name: "DeHub",
    url: "dehub.io",
    description: "A decentralized hub platform for Web3 communities and digital assets.",
    ogImage: "https://dehub.io/og-image.png"
  },
  {
    name: "Last Chad Standing",
    url: "lastchadstandin.com",
    description: "An exciting competitive platform where only the strongest survive.",
    ogImage: "https://lastchadstandin.com/og-image.png"
  },
  {
    name: "Holder Chat",
    url: "holder.chat",
    description: "Token-gated communication platform for crypto holders and communities.",
    ogImage: "https://holder.chat/og-image.png"
  },
  {
    name: "SEC Digital",
    url: "sec.digital",
    description: "Digital security solutions and blockchain infrastructure services.",
    ogImage: "https://sec.digital/og-image.png"
  },
  {
    name: "DeLabs UK",
    url: "delabs.co.uk",
    description: "Innovative development laboratory building cutting-edge digital solutions.",
    ogImage: "https://delabs.co.uk/og-image.png"
  },
  {
    name: "Fan Site",
    url: "fan.site",
    description: "Create and manage fan communities with powerful engagement tools.",
    ogImage: "https://fan.site/og-image.png"
  },
  {
    name: "The Ponzi",
    url: "theponzi.lol",
    description: "A satirical take on crypto culture with gamified experiences.",
    ogImage: "https://theponzi.lol/og-image.png"
  }
];

function BookSlider() {
  const [isOpened, setIsOpened] = useState(false);
  const bookRef = useRef<any>(null);

  const handleFlip = (e: any) => {
    // When flipping away from cover (page 0), mark as opened
    if (e.data > 0) {
      setIsOpened(true);
    } else if (e.data === 0) {
      // Back to cover, mark as closed
      setIsOpened(false);
    }
  };

  return (
    <motion.div 
      className="flex items-center justify-center w-full"
      animate={{ 
        x: isOpened ? 0 : -141.5 
      }}
      transition={{ 
        type: "spring", 
        stiffness: 80, 
        damping: 20,
        duration: 0.6
      }}
    >
      {/* @ts-ignore */}
      <HTMLFlipBook
        ref={bookRef}
        width={300}
        height={400}
        size="stretch"
        minWidth={250}
        maxWidth={400}
        minHeight={350}
        maxHeight={500}
        showCover={true}
        mobileScrollSupport={true}
        className="shadow-2xl"
        style={{}}
        startPage={0}
        drawShadow={true}
        flippingTime={1000}
        usePortrait={true}
        startZIndex={0}
        autoSize={true}
        maxShadowOpacity={0.5}
        showPageCorners={true}
        disableFlipByClick={false}
        swipeDistance={30}
        clickEventForward={true}
        useMouseEvents={true}
        onFlip={handleFlip}
      >
        {/* Cover Page - Dark Leather Style */}
        <div className="relative rounded-lg flex items-center justify-center h-full w-full"
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
          <div className="absolute border-2 rounded"
            style={{
              top: '12px',
              right: '12px',
              bottom: '12px',
              left: '12px',
              borderColor: '#C9A227',
              boxShadow: '0 0 20px rgba(201,162,39,0.15)',
            }}
          />
          
          {/* Inner gold border frame */}
          <div className="absolute border rounded-sm"
            style={{
              top: '20px',
              right: '20px',
              bottom: '20px',
              left: '20px',
              borderWidth: '1px',
              borderColor: 'rgba(201,162,39,0.5)',
            }}
          />
          
          {/* Corner accents - matching the bottom style */}
          <svg className="absolute" style={{ top: '16px', left: '16px', width: '24px', height: '24px', color: '#C9A227' }} viewBox="0 0 24 24">
            <path d="M2 2 L2 10 M2 2 L10 2" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <svg className="absolute" style={{ top: '16px', right: '16px', width: '24px', height: '24px', color: '#C9A227' }} viewBox="0 0 24 24">
            <path d="M22 2 L22 10 M22 2 L14 2" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <svg className="absolute" style={{ bottom: '16px', left: '16px', width: '24px', height: '24px', color: '#C9A227' }} viewBox="0 0 24 24">
            <path d="M2 22 L2 14 M2 22 L10 22" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <svg className="absolute" style={{ bottom: '16px', right: '16px', width: '24px', height: '24px', color: '#C9A227' }} viewBox="0 0 24 24">
            <path d="M22 22 L22 14 M22 22 L14 22" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
          
          {/* Center content - properly contained */}
          <div className="relative z-10 text-center flex flex-col items-center justify-center h-full px-8 py-12">
            {/* Top flourish */}
            <svg viewBox="0 0 80 16" style={{ width: '60px', height: '12px', color: '#C9A227', marginBottom: '16px' }}>
              <path d="M40 8 Q28 2 16 8 Q8 12 0 8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M40 8 Q52 2 64 8 Q72 12 80 8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="40" cy="8" r="2" fill="currentColor"/>
            </svg>
            
            {/* Title */}
            <h1 
              className="text-2xl font-bold tracking-widest uppercase mb-2"
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
            <div className="flex items-center justify-center gap-2 my-3">
              <div style={{ width: '30px', height: '1px', background: 'linear-gradient(90deg, transparent, #C9A227)' }}/>
              <svg viewBox="0 0 12 12" style={{ width: '8px', height: '8px', color: '#C9A227' }}>
                <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="currentColor"/>
              </svg>
              <div style={{ width: '30px', height: '1px', background: 'linear-gradient(90deg, #C9A227, transparent)' }}/>
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
              Flip to explore our work
            </p>
            
            {/* Bottom flourish */}
            <svg viewBox="0 0 80 16" style={{ width: '60px', height: '12px', color: '#C9A227', marginTop: '16px' }}>
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
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            <div className="h-full flex flex-col">
              {/* OG Image */}
              <div className="h-40 bg-muted overflow-hidden">
                <img
                  src={site.ogImage}
                  alt={site.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to a gradient placeholder if image fails
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.classList.add('bg-gradient-to-br', 'from-primary/20', 'to-secondary');
                  }}
                />
              </div>
              
              {/* Content */}
              <div className="flex-1 flex flex-col justify-center p-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {site.name}
                  </h2>
                  <a 
                    href={`https://${site.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm mb-3 hover:underline inline-block"
                  >
                    {site.url}
                  </a>
                  <p className="text-muted-foreground text-sm leading-relaxed mt-3">
                    {site.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </HTMLFlipBook>
    </motion.div>
  );
}

export default BookSlider;
