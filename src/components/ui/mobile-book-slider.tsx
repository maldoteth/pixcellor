import React, { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from "lucide-react";
import HTMLFlipBook from "react-pageflip";

// Import portfolio screenshots
import firstClassAgencyImg from '@/assets/portfolio/first-class-agency.png';
import dehubImg from '@/assets/portfolio/dehub.png';
import lastChadStandingImg from '@/assets/portfolio/last-chad-standing.png';
import holderChatImg from '@/assets/portfolio/holder-chat.png';
import secDigitalImg from '@/assets/portfolio/sec-digital.png';
import delabsImg from '@/assets/portfolio/delabs.png';
import fanSiteImg from '@/assets/portfolio/fan-site.png';
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
    name: "Fan Site",
    url: "fan.site",
    description: "Build and manage fan communities with engagement tools and custom branding.",
    screenshot: fanSiteImg
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

function MobileBookSlider() {
  const bookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = portfolioData.length;

  const handleFlip = (e: any) => {
    setCurrentPage(e.data);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full cursor-pointer [&_.stf__parent]:border [&_.stf__parent]:border-white/30 [&_.stf__parent]:rounded-sm">
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
        showCover={false}
        mobileScrollSupport={true}
        className=""
        style={{}}
        startPage={0}
        drawShadow={false}
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
        onFlip={handleFlip}
      >
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
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      window.open(`https://${site.url}`, '_blank', 'noopener,noreferrer');
                    }}
                    className="text-primary text-xs mb-2 hover:underline inline-block cursor-pointer"
                  >
                    {site.url}
                  </button>
                  <p className="text-muted-foreground text-xs leading-relaxed mt-2">
                    {site.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </HTMLFlipBook>

      {/* Navigation arrows */}
      <div className="flex items-center gap-6 mt-4">
        <button
          onClick={() => bookRef.current?.pageFlip()?.flipPrev()}
          className={`p-2 rounded-sm transition ${currentPage === 0 ? 'opacity-20' : 'opacity-60 hover:opacity-100'}`}
          disabled={currentPage === 0}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="text-xs text-muted-foreground">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          onClick={() => bookRef.current?.pageFlip()?.flipNext()}
          className={`p-2 rounded-sm transition ${currentPage >= totalPages - 1 ? 'opacity-20' : 'opacity-60 hover:opacity-100'}`}
          disabled={currentPage >= totalPages - 1}
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>
  );
}

export default MobileBookSlider;
