import React, { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
import dhbDocsImg from '@/assets/portfolio/dhb-docs.png';
import tikupImg from '@/assets/portfolio/tikup.png';
import bricksImg from '@/assets/portfolio/bricks.png';
import arvoxAgencyImg from '@/assets/portfolio/arvox-agency.png';
import highwoodVillageImg from '@/assets/portfolio/highwood-village.png';
import oakshoreImg from '@/assets/portfolio/oakshore.png';

const portfolioData = [
  {
    name: "First Class Agency",
    url: "firstclassagencytiktok.com",
    description: "TikTok Creator Network Agency offering expert management and daily coaching.",
    screenshot: firstClassAgencyImg
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
    name: "Oak Shore",
    url: "oakshore.homes",
    description: "Boutique lakeside retreat website showcasing availability, tranquil getaways and bookings.",
    screenshot: oakshoreImg
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
    description: "Decentralized crime registry for recording, verifying, and surfacing community-reported incidents.",
    screenshot: secDigitalImg
  },
  {
    name: "DeLabs UK",
    url: "delabs.co.uk",
    description: "UK-registered software consultancy delivering bespoke products and scalable web platforms.",
    screenshot: delabsImg
  },
  {
    name: "The Ponzi",
    url: "theponzi.lol",
    description: "Satirical AI news platform and community building onchain experiences.",
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
    screenshot: dhbDocsImg
  },
  {
    name: "Arvox Agency",
    url: "arvox.agency",
    description: "Web3 talent agency connecting brands with creators, communities, and onchain growth.",
    screenshot: arvoxAgencyImg
  },
  {
    name: "DeHub Network",
    url: "dehub.net",
    description: "Web3 ecosystem platform connecting creators, communities and decentralised products.",
    screenshot: dehubNetworkImg
  },
  {
    name: "DeHub",
    url: "dehub.io",
    description: "Full stack app, large scale YouTube and X alternative packed with features.",
    screenshot: dehubImg
  },
  {
    name: "Highwood Village",
    url: "berkeleygroup.co.uk",
    fullUrl: "https://www.berkeleygroup.co.uk/developments/west-sussex/horsham/highwood-village",
    description: "Secured exclusive suppliers list and provided all agency freelancers to Highwood.",
    screenshot: highwoodVillageImg
  }
];

// Preload all portfolio screenshots once at module load so flicking is instant
if (typeof window !== "undefined") {
  portfolioData.forEach((p) => {
    const img = new Image();
    img.src = p.screenshot;
  });
}

function MobileBookSlider() {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const totalPages = portfolioData.length;
  const site = portfolioData[currentPage];

  const goToPage = (page: number, nextDirection: number) => {
    const target = Math.min(Math.max(page, 0), totalPages - 1);
    if (target === currentPage) return;

    setDirection(nextDirection);
    setCurrentPage(target);
    void recordFalloff({ event: "portfolio_page_viewed", portfolioPage: target + 1 });
  };

  const goToPreviousPage = () => goToPage(currentPage - 1, -1);
  const goToNextPage = () => goToPage(currentPage + 1, 1);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) > 16 && Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;

    e.preventDefault();
    e.stopPropagation();

    if (deltaX > 0) {
      goToPreviousPage();
    } else {
      goToNextPage();
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center w-full cursor-pointer touch-pan-y"
      data-pixcellor-horizontal-swipe="true"
      onTouchStartCapture={handleTouchStart}
      onTouchMoveCapture={handleTouchMove}
      onTouchEndCapture={handleTouchEnd}
    >
      <div className="relative h-[391px] w-[288px] overflow-hidden border border-border bg-card">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={site.url}
            custom={direction}
            initial={{ x: direction > 0 ? 40 : -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -40 : 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="absolute inset-0 bg-card"
          >
            <div className="h-full flex flex-col">
              <div className="h-36 bg-muted overflow-hidden">
                <img
                  src={site.screenshot}
                  alt={site.name}
                  loading="eager"
                  decoding="sync"
                  fetchPriority="high"
                  className="w-full h-full object-cover object-top"
                />
              </div>

              <div className="flex-1 flex flex-col justify-center p-5 relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goToPreviousPage(); }}
                  className={`absolute top-2 left-2 p-1 transition ${currentPage === 0 ? 'opacity-0 pointer-events-none' : 'opacity-90 hover:opacity-100'}`}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goToNextPage(); }}
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
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      void recordFalloff({ event: "portfolio_project_opened", projectName: site.name, projectUrl: site.url });
                      window.open((site as any).fullUrl ?? `https://${site.url}`, '_blank', 'noopener,noreferrer');
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default MobileBookSlider;
