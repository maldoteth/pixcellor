import React, { useRef } from 'react'
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

const portfolioData = [
  {
    name: "First Class Agency",
    url: "firstclassagencytiktok.com",
    description: "Award-winning TikTok Creator Network Agency offering expert management, daily coaching, and growth strategies for content creators.",
    screenshot: firstClassAgencyImg
  },
  {
    name: "DeHub",
    url: "dehub.io",
    description: "A decentralized hub platform connecting Web3 communities, managing digital assets, and powering on-chain collaboration tools.",
    screenshot: dehubImg
  },
  {
    name: "Last Chad Standing",
    url: "lastchadstandin.com",
    description: "An exciting competitive elimination platform where players battle through challenges and only the strongest survive.",
    screenshot: lastChadStandingImg
  },
  {
    name: "Holder Chat",
    url: "holder.chat",
    description: "Token-gated communication platform enabling crypto holders and communities to connect, discuss, and collaborate securely.",
    screenshot: holderChatImg
  },
  {
    name: "SEC Digital",
    url: "sec.digital",
    description: "Digital security solutions providing blockchain infrastructure services, smart contract auditing, and compliance tools.",
    screenshot: secDigitalImg
  },
  {
    name: "DeLabs UK",
    url: "delabs.co.uk",
    description: "Innovative development laboratory building cutting-edge digital solutions, from web applications to blockchain integrations.",
    screenshot: delabsImg
  },
  {
    name: "Fan Site",
    url: "fan.site",
    description: "Create and manage fan communities with powerful engagement tools, monetization features, and custom branding options.",
    screenshot: fanSiteImg
  },
  {
    name: "The Ponzi",
    url: "theponzi.lol",
    description: "A satirical take on crypto culture featuring gamified experiences, community-driven content, and interactive storytelling.",
    screenshot: theponziImg
  },
  {
    name: "DHBScan",
    url: "dhbscan.com",
    description: "Comprehensive token analytics dashboard with revenue sharing, buyback tracking, and multi-chain supply data insights.",
    screenshot: dhbscanImg
  }
];

function MobileBookSlider() {
  const bookRef = useRef<any>(null);

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
    </div>
  );
}

export default MobileBookSlider;
