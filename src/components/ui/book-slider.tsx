import React, { useState, useRef } from 'react'
import HTMLFlipBook from "react-pageflip";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileBookSlider from "./mobile-book-slider";

// Import portfolio screenshots
import firstClassAgencyImg from '@/assets/portfolio/first-class-agency.png';
import dehubImg from '@/assets/portfolio/dehub.png';
import lastChadStandingImg from '@/assets/portfolio/last-chad-standing.png';
import holderChatImg from '@/assets/portfolio/holder-chat.png';
import secDigitalImg from '@/assets/portfolio/sec-digital.png';
import delabsImg from '@/assets/portfolio/delabs.png';

import theponziImg from '@/assets/portfolio/theponzi.png';
import dhbscanImg from '@/assets/portfolio/dhbscan.png';
import tikupImg from '@/assets/portfolio/tikup.png';
import bricksImg from '@/assets/portfolio/bricks.png';

const portfolioData = [
  {
    name: "First Class Agency",
    url: "firstclassagencytiktok.com",
    description: "TikTok Creator Network Agency offering expert management and daily coaching.",
    screenshot: firstClassAgencyImg
  },
  {
    name: "DeHub",
    url: "dehub.io",
    description: "Full stack app, large scale YouTube and X alternative packed with features.",
    screenshot: dehubImg
  },
  {
    name: "TikUp",
    url: "tikup.xyz",
    description: "Comprehensive TikTok live streaming toolkit integrated with TikTok APIs to help creators thrive.",
    screenshot: tikupImg
  },
  {
    name: "Bricks",
    url: "bricks.it.com",
    description: "Construction recruitment, payroll and HR app utilising latest advancements in technology.",
    screenshot: bricksImg
  },
  {
    name: "Last Chad Standing",
    url: "lastchadstanding.com",
    description: "Competitive elimination platform where players battle and only the strongest survive.",
    screenshot: lastChadStandingImg
  },
  {
    name: "Holder Chat",
    url: "holder.chat",
    description: "Token-gated chat platform for crypto holders and communities to connect securely.",
    screenshot: holderChatImg
  },
  {
    name: "SEC Digital",
    url: "sec.digital",
    description: "Blockchain infrastructure services with smart contract auditing and compliance.",
    screenshot: secDigitalImg
  },
  {
    name: "DeLabs UK",
    url: "delabs.co.uk",
    description: "Development lab building cutting-edge web applications and blockchain integrations.",
    screenshot: delabsImg
  },
  {
    name: "The Ponzi",
    url: "theponzi.lol",
    description: "Satirical crypto culture platform with gamified experiences and community content.",
    screenshot: theponziImg
  },
  {
    name: "DHBScan",
    url: "dhbscan.com",
    description: "Token analytics dashboard with revenue sharing, buyback tracking, and supply data.",
    screenshot: dhbscanImg
  }
];

function BookSlider() {
  const isMobile = useIsMobile();
  const [isOpened, setIsOpened] = useState(false);
  const bookRef = useRef<any>(null);

  const handleFlip = (e: any) => {
    if (e.data > 0) {
      setIsOpened(true);
    } else if (e.data === 0) {
      setIsOpened(false);
    }
  };

  // Mobile uses completely separate component
  if (isMobile) {
    return <div className="mt-[20px]"><MobileBookSlider /></div>;
  }

  // Desktop/Tablet version with cover and animation
  return (
    <motion.div 
      className="flex items-center justify-center w-full cursor-pointer mt-[33px] [&_.stf__parent]:border [&_.stf__parent]:border-white/30 [&_.stf__parent]:rounded-sm"
      animate={{ 
        x: isOpened ? 5 : -136.1 
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
        className=""
        style={{}}
        startPage={0}
        drawShadow={false}
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
        <div className="relative flex items-center justify-center h-full w-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, #0a0a0a 100%), #0a0a0a',
            borderTop: '2px solid rgba(255,255,255,0.35)',
            borderLeft: '2px solid rgba(255,255,255,0.25)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            boxShadow: `
              0 12px 40px rgba(0,0,0,0.5),
              0 4px 16px rgba(0,0,0,0.3),
              inset 0 2px 3px rgba(255,255,255,0.3),
              inset 0 -2px 3px rgba(0,0,0,0.3),
              inset 2px 0 3px rgba(255,255,255,0.15),
              inset -2px 0 3px rgba(0,0,0,0.2)
            `,
          }}
        >
          {/* Inner glow overlay */}
          <div className="absolute inset-1 opacity-60 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)',
            }}
          />
          
          {/* Subtle border frame */}
          <div className="absolute"
            style={{
              top: '12px', right: '12px', bottom: '12px', left: '12px',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          />
          
          {/* Center content */}
          <div className="relative z-10 text-center flex flex-col items-center justify-center h-full px-8 py-12">
            <h1 
              className="text-2xl font-bold tracking-widest uppercase mb-2 text-foreground"
              style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                letterSpacing: '0.25em',
              }}
            >
              Portfolio
            </h1>
            
            {/* Divider */}
            <div className="flex items-center justify-center gap-2 my-3">
              <div style={{ width: '30px', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4))' }}/>
              <div className="w-1.5 h-1.5 bg-foreground/40 rotate-45" />
              <div style={{ width: '30px', height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.4), transparent)' }}/>
            </div>
            
            <p className="text-xs tracking-wider text-muted-foreground italic">
              Flip to explore our work
            </p>
          </div>
        </div>

        {portfolioData.map((site) => (
          <div 
            key={site.url}
            className="overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, #0a0a0a 100%), #0a0a0a',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: `
                0 8px 32px rgba(0,0,0,0.3),
                inset 0 1px 1px rgba(255,255,255,0.3),
                inset 0 -1px 1px rgba(0,0,0,0.1)
              `,
            }}
          >
            <div className="h-full flex flex-col">
              {/* Screenshot */}
              <div className="h-40 bg-muted overflow-hidden">
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
              <div className="flex-1 flex flex-col justify-center p-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {site.name}
                  </h2>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      window.open(`https://${site.url}`, '_blank', 'noopener,noreferrer');
                    }}
                    className="text-primary text-sm mb-3 hover:underline inline-block cursor-pointer"
                    aria-label={`Visit ${site.name} at ${site.url}`}
                  >
                    {site.url}
                  </button>
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
