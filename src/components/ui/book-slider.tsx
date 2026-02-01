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
            background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 30%, #0f0f0f 70%, #0a0a0a 100%)',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.8), inset 0 0 30px rgba(40,40,40,0.2)',
          }}
        >
          {/* Dark leather texture overlay */}
          <div className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* Subtle grain overlay */}
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.5' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* Gold border frame - inset more to prevent clipping */}
          <div className="absolute border rounded"
            style={{
              top: '16px',
              right: '16px',
              bottom: '16px',
              left: '16px',
              borderWidth: '2px',
              borderColor: '#D4AF37',
              boxShadow: '0 0 15px rgba(212,175,55,0.25), inset 0 0 15px rgba(212,175,55,0.08)',
            }}
          />
          
          {/* Inner decorative border */}
          <div className="absolute border rounded-sm"
            style={{
              top: '24px',
              right: '24px',
              bottom: '24px',
              left: '24px',
              borderWidth: '1px',
              borderColor: 'rgba(212,175,55,0.4)',
            }}
          />
          
          {/* Corner flourishes - Top Left */}
          <svg className="absolute" style={{ top: '20px', left: '20px', width: '40px', height: '40px', color: '#D4AF37' }} viewBox="0 0 40 40">
            <path d="M4 4 L4 16 M4 4 L16 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="4" cy="4" r="2" fill="currentColor"/>
            <path d="M8 8 L8 14 M8 8 L14 8" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
          </svg>
          
          {/* Corner flourishes - Top Right */}
          <svg className="absolute" style={{ top: '20px', right: '20px', width: '40px', height: '40px', color: '#D4AF37' }} viewBox="0 0 40 40">
            <path d="M36 4 L36 16 M36 4 L24 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="36" cy="4" r="2" fill="currentColor"/>
            <path d="M32 8 L32 14 M32 8 L26 8" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
          </svg>
          
          {/* Corner flourishes - Bottom Left */}
          <svg className="absolute" style={{ bottom: '20px', left: '20px', width: '40px', height: '40px', color: '#D4AF37' }} viewBox="0 0 40 40">
            <path d="M4 36 L4 24 M4 36 L16 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="4" cy="36" r="2" fill="currentColor"/>
            <path d="M8 32 L8 26 M8 32 L14 32" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
          </svg>
          
          {/* Corner flourishes - Bottom Right */}
          <svg className="absolute" style={{ bottom: '20px', right: '20px', width: '40px', height: '40px', color: '#D4AF37' }} viewBox="0 0 40 40">
            <path d="M36 36 L36 24 M36 36 L24 36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="36" cy="36" r="2" fill="currentColor"/>
            <path d="M32 32 L32 26 M32 32 L26 32" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
          </svg>
          
          {/* Top decorative flourish */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '36px' }}>
            <svg viewBox="0 0 100 20" style={{ width: '80px', height: '16px', color: '#D4AF37' }}>
              <path d="M50 10 Q35 2 20 10 Q10 16 0 10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M50 10 Q65 2 80 10 Q90 16 100 10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="50" cy="10" r="2.5" fill="currentColor"/>
              <circle cx="20" cy="10" r="1.5" fill="currentColor" opacity="0.6"/>
              <circle cx="80" cy="10" r="1.5" fill="currentColor" opacity="0.6"/>
            </svg>
          </div>
          
          {/* Bottom decorative flourish */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '36px' }}>
            <svg viewBox="0 0 100 20" style={{ width: '80px', height: '16px', color: '#D4AF37' }}>
              <path d="M50 10 Q35 18 20 10 Q10 4 0 10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M50 10 Q65 18 80 10 Q90 4 100 10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="50" cy="10" r="2.5" fill="currentColor"/>
              <circle cx="20" cy="10" r="1.5" fill="currentColor" opacity="0.6"/>
              <circle cx="80" cy="10" r="1.5" fill="currentColor" opacity="0.6"/>
            </svg>
          </div>
          
          {/* Center content */}
          <div className="relative z-10 text-center px-10">
            {/* Title with embossed gold effect */}
            <h1 
              className="text-3xl font-bold mb-3 tracking-widest uppercase"
              style={{
                color: '#D4AF37',
                textShadow: '0 1px 0 #B8960C, 0 2px 0 #8B7209, 0 3px 6px rgba(0,0,0,0.7)',
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: '0.2em',
              }}
            >
              Portfolio
            </h1>
            
            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, transparent, #D4AF37)' }}/>
              <svg viewBox="0 0 16 16" style={{ width: '12px', height: '12px', color: '#D4AF37' }}>
                <path d="M8 1 L9.5 6.5 L15 8 L9.5 9.5 L8 15 L6.5 9.5 L1 8 L6.5 6.5 Z" fill="currentColor"/>
              </svg>
              <div style={{ width: '40px', height: '1px', background: 'linear-gradient(90deg, #D4AF37, transparent)' }}/>
            </div>
            
            <p 
              className="text-sm tracking-wide"
              style={{
                color: '#B8960C',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontStyle: 'italic',
              }}
            >
              Flip to explore our work
            </p>
          </div>
          
          {/* Spine shadow effect */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-4"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
            }}
          />
          
          {/* Subtle edge highlight */}
          <div 
            className="absolute right-0 top-0 bottom-0 w-1"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 100%)',
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
