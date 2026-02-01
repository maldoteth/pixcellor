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
        x: isOpened ? 0 : -142.5 
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
        {/* Cover Page - Luxurious Hardback */}
        <div className="relative rounded-lg overflow-hidden flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, #8B4513 0%, #5D2E0C 30%, #3D1E08 70%, #2A1506 100%)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 20px rgba(139,69,19,0.3)',
          }}
        >
          {/* Leather texture overlay */}
          <div className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* Gold border frame */}
          <div className="absolute inset-3 border-2 rounded-sm"
            style={{
              borderColor: '#D4AF37',
              boxShadow: '0 0 10px rgba(212,175,55,0.3), inset 0 0 10px rgba(212,175,55,0.1)',
            }}
          />
          
          {/* Ornate corner - Top Left */}
          <div className="absolute top-4 left-4 w-12 h-12">
            <svg viewBox="0 0 50 50" className="w-full h-full" style={{ color: '#D4AF37' }}>
              <path d="M5 5 L5 20 Q5 5 20 5 L5 5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 8 L8 15 Q8 8 15 8" fill="none" stroke="currentColor" strokeWidth="1"/>
              <circle cx="12" cy="12" r="2" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Ornate corner - Top Right */}
          <div className="absolute top-4 right-4 w-12 h-12">
            <svg viewBox="0 0 50 50" className="w-full h-full" style={{ color: '#D4AF37' }}>
              <path d="M45 5 L45 20 Q45 5 30 5 L45 5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M42 8 L42 15 Q42 8 35 8" fill="none" stroke="currentColor" strokeWidth="1"/>
              <circle cx="38" cy="12" r="2" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Ornate corner - Bottom Left */}
          <div className="absolute bottom-4 left-4 w-12 h-12">
            <svg viewBox="0 0 50 50" className="w-full h-full" style={{ color: '#D4AF37' }}>
              <path d="M5 45 L5 30 Q5 45 20 45 L5 45" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 42 L8 35 Q8 42 15 42" fill="none" stroke="currentColor" strokeWidth="1"/>
              <circle cx="12" cy="38" r="2" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Ornate corner - Bottom Right */}
          <div className="absolute bottom-4 right-4 w-12 h-12">
            <svg viewBox="0 0 50 50" className="w-full h-full" style={{ color: '#D4AF37' }}>
              <path d="M45 45 L45 30 Q45 45 30 45 L45 45" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M42 42 L42 35 Q42 42 35 42" fill="none" stroke="currentColor" strokeWidth="1"/>
              <circle cx="38" cy="38" r="2" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Top decorative flourish */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2">
            <svg viewBox="0 0 120 30" className="w-24 h-6" style={{ color: '#D4AF37' }}>
              <path d="M60 15 Q45 5 30 15 Q15 25 0 15" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M60 15 Q75 5 90 15 Q105 25 120 15" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="60" cy="15" r="3" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Bottom decorative flourish */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <svg viewBox="0 0 120 30" className="w-24 h-6" style={{ color: '#D4AF37' }}>
              <path d="M60 15 Q45 25 30 15 Q15 5 0 15" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M60 15 Q75 25 90 15 Q105 5 120 15" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="60" cy="15" r="3" fill="currentColor"/>
            </svg>
          </div>
          
          {/* Center content */}
          <div className="relative z-10 text-center p-8">
            {/* Title with embossed gold effect */}
            <h1 
              className="text-3xl font-serif font-bold mb-4 tracking-wider"
              style={{
                color: '#D4AF37',
                textShadow: '0 1px 0 #B8960C, 0 2px 0 #8B7209, 0 3px 4px rgba(0,0,0,0.5)',
                fontFamily: 'Georgia, serif',
              }}
            >
              Portfolio
            </h1>
            
            {/* Decorative divider */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37)' }}/>
              <svg viewBox="0 0 20 20" className="w-4 h-4" style={{ color: '#D4AF37' }}>
                <path d="M10 2 L12 8 L18 10 L12 12 L10 18 L8 12 L2 10 L8 8 Z" fill="currentColor"/>
              </svg>
              <div className="w-8 h-px" style={{ background: 'linear-gradient(90deg, #D4AF37, transparent)' }}/>
            </div>
            
            <p 
              className="text-sm tracking-wide"
              style={{
                color: '#C9A227',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
              }}
            >
              Flip to explore our work
            </p>
          </div>
          
          {/* Spine shadow effect */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-3"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, transparent 100%)',
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
