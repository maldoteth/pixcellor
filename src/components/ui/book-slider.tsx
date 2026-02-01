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

// Ornate corner SVG component
const OrnateCorner = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className}
    fill="currentColor"
  >
    <path d="M0 0 L30 0 Q20 5 15 15 Q10 25 10 35 L10 40 Q8 30 5 20 Q2 10 0 0 Z" />
    <path d="M0 0 L0 30 Q5 20 15 15 Q25 10 35 10 L40 10 Q30 8 20 5 Q10 2 0 0 Z" />
    <circle cx="8" cy="8" r="3" />
    <circle cx="20" cy="5" r="1.5" />
    <circle cx="5" cy="20" r="1.5" />
    <path d="M12 12 Q18 18 25 20 M12 12 Q18 18 20 25" stroke="currentColor" strokeWidth="0.8" fill="none" />
  </svg>
);

// Decorative flourish SVG
const Flourish = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 200 30" 
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M0 15 Q25 5 50 15 T100 15 T150 15 T200 15" />
    <path d="M40 15 Q50 8 60 15" />
    <path d="M140 15 Q150 8 160 15" />
    <circle cx="100" cy="15" r="4" fill="currentColor" />
    <circle cx="85" cy="15" r="2" fill="currentColor" />
    <circle cx="115" cy="15" r="2" fill="currentColor" />
  </svg>
);

function BookSlider() {
  const [isOpened, setIsOpened] = useState(false);
  const bookRef = useRef<any>(null);

  const handleFlip = (e: any) => {
    if (e.data > 0) {
      setIsOpened(true);
    } else if (e.data === 0) {
      setIsOpened(false);
    }
  };

  return (
    <motion.div 
      className="flex items-center justify-center w-full"
      initial={{ y: 150, opacity: 0 }}
      animate={{ 
        y: 0,
        opacity: 1,
        x: isOpened ? 0 : -150 
      }}
      transition={{ 
        y: { type: "spring", stiffness: 50, damping: 20, delay: 0.3 },
        opacity: { duration: 0.8, delay: 0.3 },
        x: { type: "spring", stiffness: 80, damping: 20 }
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
        {/* Luxurious Hardback Cover */}
        <div 
          className="relative rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1a1410 0%, #2d241c 25%, #1a1410 50%, #2d241c 75%, #1a1410 100%)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,215,0,0.1)',
          }}
        >
          {/* Leather texture overlay */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              mixBlendMode: 'overlay',
            }}
          />
          
          {/* Gold border frame */}
          <div className="absolute inset-3 border-2 border-amber-600/40 rounded pointer-events-none" />
          <div className="absolute inset-4 border border-amber-500/20 rounded pointer-events-none" />
          
          {/* Ornate corners */}
          <OrnateCorner className="absolute top-2 left-2 w-12 h-12 text-amber-500/70" />
          <OrnateCorner className="absolute top-2 right-2 w-12 h-12 text-amber-500/70 -scale-x-100" />
          <OrnateCorner className="absolute bottom-2 left-2 w-12 h-12 text-amber-500/70 -scale-y-100" />
          <OrnateCorner className="absolute bottom-2 right-2 w-12 h-12 text-amber-500/70 -scale-x-100 -scale-y-100" />
          
          {/* Center content */}
          <div className="relative h-full flex flex-col items-center justify-center p-8 z-10">
            {/* Top flourish */}
            <Flourish className="w-40 h-6 text-amber-500/60 mb-6" />
            
            {/* Embossed title area */}
            <div 
              className="text-center px-6 py-4"
              style={{
                background: 'linear-gradient(180deg, rgba(255,215,0,0.05) 0%, rgba(255,215,0,0.02) 100%)',
                borderRadius: '4px',
              }}
            >
              <h1 
                className="text-3xl font-serif font-bold tracking-wider mb-2"
                style={{
                  background: 'linear-gradient(180deg, #ffd700 0%, #b8860b 50%, #ffd700 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  filter: 'drop-shadow(0 1px 1px rgba(255,215,0,0.3))',
                }}
              >
                PORTFOLIO
              </h1>
              <div className="w-24 h-0.5 mx-auto bg-gradient-to-r from-transparent via-amber-500/60 to-transparent mb-2" />
              <p 
                className="text-xs tracking-[0.3em] uppercase"
                style={{
                  color: '#b8860b',
                }}
              >
                Collection
              </p>
            </div>
            
            {/* Bottom flourish */}
            <Flourish className="w-40 h-6 text-amber-500/60 mt-6 rotate-180" />
            
            {/* Subtle instruction */}
            <p className="absolute bottom-8 text-amber-600/40 text-xs tracking-widest uppercase">
              Open to explore
            </p>
          </div>
          
          {/* Spine effect on left edge */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-3"
            style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.4) 0%, rgba(139,90,43,0.3) 50%, rgba(0,0,0,0.2) 100%)',
            }}
          />
        </div>

        {/* Portfolio Pages */}
        {portfolioData.map((site, index) => (
          <div 
            key={site.url}
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #faf8f5 0%, #f5f0e8 50%, #efe8dc 100%)',
            }}
          >
            {/* Page texture */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
            
            {/* Gold corner accents */}
            <div className="absolute top-3 left-3 w-8 h-8 border-l-2 border-t-2 border-amber-600/30" />
            <div className="absolute top-3 right-3 w-8 h-8 border-r-2 border-t-2 border-amber-600/30" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-l-2 border-b-2 border-amber-600/30" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-r-2 border-b-2 border-amber-600/30" />
            
            <div className="h-full flex flex-col relative z-10">
              {/* Header with page number */}
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                <Flourish className="w-16 h-4 text-amber-700/30" />
                <span className="text-xs text-amber-800/40 font-serif italic">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Flourish className="w-16 h-4 text-amber-700/30 rotate-180" />
              </div>
              
              {/* OG Image with elegant frame */}
              <div className="px-6 pt-2">
                <div 
                  className="relative rounded overflow-hidden"
                  style={{
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(139,90,43,0.2)',
                  }}
                >
                  <div className="h-36 bg-gradient-to-br from-amber-50 to-amber-100/50 overflow-hidden">
                    <img
                      src={site.ogImage}
                      alt={site.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                        const placeholder = document.createElement('div');
                        placeholder.className = 'text-amber-700/30 text-4xl font-serif';
                        placeholder.textContent = site.name.charAt(0);
                        e.currentTarget.parentElement!.appendChild(placeholder);
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 flex flex-col justify-center px-6 py-4">
                <div className="text-center">
                  {/* Decorative line */}
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-8 h-px bg-gradient-to-r from-transparent to-amber-700/30" />
                    <div className="w-1.5 h-1.5 rotate-45 border border-amber-700/40" />
                    <div className="w-8 h-px bg-gradient-to-l from-transparent to-amber-700/30" />
                  </div>
                  
                  <h2 
                    className="text-xl font-serif font-semibold tracking-wide mb-1"
                    style={{ color: '#2d241c' }}
                  >
                    {site.name}
                  </h2>
                  <a 
                    href={`https://${site.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm mb-3 hover:underline inline-block font-medium"
                    style={{ color: '#8b5a2b' }}
                  >
                    {site.url}
                  </a>
                  
                  <div className="w-12 h-px mx-auto bg-gradient-to-r from-transparent via-amber-700/40 to-transparent my-3" />
                  
                  <p 
                    className="text-sm leading-relaxed font-serif italic"
                    style={{ color: '#5c4a3a' }}
                  >
                    {site.description}
                  </p>
                </div>
              </div>
              
              {/* Footer flourish */}
              <div className="flex justify-center pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-px bg-amber-700/20" />
                  <div className="w-2 h-2 rounded-full border border-amber-700/30" />
                  <div className="w-6 h-px bg-amber-700/20" />
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
