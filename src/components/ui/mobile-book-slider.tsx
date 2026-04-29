import React, { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from "lucide-react";
import HTMLFlipBook from "react-pageflip";
import { recordFalloff } from "@/lib/checkoutTracking";

// Import portfolio screenshots
import firstClassAgencyImg from '@/assets/portfolio/first-class-agency.png';
import dehubImg from '@/assets/portfolio/dehub.png';
import dehubNetworkImg from '@/assets/portfolio/dehub-network.png';
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
    name: "DeHub Network",
    url: "dehub.net",
    description: "Web3 ecosystem platform connecting creators, communities and decentralised products.",
    screenshot: dehubNetworkImg
  },
  {
    name: "TikUp",
    url: "tikup.xyz",
    description: "TikTok live streaming toolkit integrated with TikTok APIs to help creators thrive.",
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
    description: "Satirical crypto culture platform with gamified experiences and community.",
    screenshot: theponziImg
  },
  {
    name: "DHBScan",
    url: "dhbscan.com",
    description: "Token analytics dashboard with revenue sharing, buyback tracking, and supply data.",
    screenshot: dhbscanImg
  },
  {
    name: "DHB Docs",
    url: "docs.dhb.gg",
    description: "Technical documentation hub for DeHub products, token utilities and ecosystem guidance.",
    screenshot: dhbscanImg
  },
  {
    name: "Arvox Agency",
    url: "arvox.agency",
    description: "Modern agency website presenting premium creative services, brand strategy and digital delivery.",
    screenshot: firstClassAgencyImg
  }
];

function MobileBookSlider() {
  const bookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = portfolioData.length;

  const handleFlip = (e: any) => {
    setCurrentPage(e.data);
    void recordFalloff({ event: "portfolio_page_viewed", portfolioPage: e.data + 1 });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full cursor-pointer [&_.stf__parent]:border [&_.stf__parent]:border-white/30 [&_.stf__parent]:rounded-sm">
      {/* @ts-ignore */}
      <HTMLFlipBook
        ref={bookRef}
        width={288}
        height={391}
        size="fixed"
        minWidth={288}
        maxWidth={288}
        minHeight={391}
        maxHeight={391}
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
              
              {/* Content with inline arrows */}
              <div className="flex-1 flex flex-col justify-center p-5 relative">
                {/* Nav arrows in top corners of text area */}
                <button
                  onClick={(e) => { e.stopPropagation(); bookRef.current?.pageFlip()?.flipPrev(); }}
                  className={`absolute top-2 left-2 p-1 transition ${currentPage === 0 ? 'opacity-0 pointer-events-none' : 'opacity-90 hover:opacity-100'}`}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); bookRef.current?.pageFlip()?.flipNext(); }}
                  className={`absolute top-2 right-2 p-1 transition ${currentPage >= totalPages - 1 ? 'opacity-0 pointer-events-none' : 'opacity-90 hover:opacity-100'}`}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-5 h-5 text-foreground" />
                </button>

                <div className="text-center">
                  <h2 className="text-lg font-bold text-foreground mb-1">
                    {site.name}
                  </h2>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      void recordFalloff({ event: "portfolio_project_opened", projectName: site.name, projectUrl: site.url });
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
    </div>
  );
}

export default MobileBookSlider;
