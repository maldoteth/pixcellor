import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { RadialScrollGallery } from '@/components/ui/portfolio-and-image-gallery';
import { Badge } from '@/components/ui/badge';
import { recordFalloff } from '@/lib/checkoutTracking';

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

type Project = {
  name: string;
  url: string;
  fullUrl?: string;
  category: string;
  screenshot: string;
};

const projects: Project[] = [
  { name: 'First Class Agency', url: 'firstclassagencytiktok.com', category: 'Agency', screenshot: firstClassAgencyImg },
  { name: 'TikUp', url: 'tikup.xyz', category: 'Creator', screenshot: tikupImg },
  { name: 'Bricks', url: 'bricks.it.com', category: 'SaaS', screenshot: bricksImg },
  { name: 'Oak Shore', url: 'oakshore.homes', category: 'Hospitality', screenshot: oakshoreImg },
  { name: 'Last Chad Standing', url: 'lastchadstanding.com', category: 'Web3', screenshot: lastChadStandingImg },
  { name: 'Holder Chat', url: 'holder.chat', category: 'Web3', screenshot: holderChatImg },
  { name: 'SEC Digital', url: 'sec.digital', category: 'Platform', screenshot: secDigitalImg },
  { name: 'DeLabs UK', url: 'delabs.co.uk', category: 'Studio', screenshot: delabsImg },
  { name: 'The Ponzi', url: 'theponzi.lol', category: 'Media', screenshot: theponziImg },
  { name: 'DHBScan', url: 'dhbscan.com', category: 'Analytics', screenshot: dhbscanImg },
  { name: 'DHB Docs', url: 'docs.dhb.gg', category: 'Docs', screenshot: dhbDocsImg },
  { name: 'Arvox Agency', url: 'arvox.agency', category: 'Agency', screenshot: arvoxAgencyImg },
  { name: 'DeHub Network', url: 'dehub.net', category: 'Web3', screenshot: dehubNetworkImg },
  { name: 'DeHub', url: 'dehub.io', category: 'Web3', screenshot: dehubImg },
  {
    name: 'Highwood Village',
    url: 'berkeleygroup.co.uk',
    fullUrl: 'https://www.berkeleygroup.co.uk/developments/west-sussex/horsham/highwood-village',
    category: 'Property',
    screenshot: highwoodVillageImg,
  },
];

export default function PortfolioGallery() {
  const handleSelect = (index: number) => {
    const p = projects[index];
    if (!p) return;
    void recordFalloff({ event: 'portfolio_project_opened', projectName: p.name, projectUrl: p.url });
    window.open(p.fullUrl ?? `https://${p.url}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full">
      <RadialScrollGallery
        baseRadius={320}
        mobileRadius={170}
        visiblePercentage={55}
        onItemSelect={handleSelect}
      >
        {(hoveredIndex) =>
          projects.map((project, index) => {
            const isActive = hoveredIndex === index;
            return (
              <div
                key={project.url}
                className="relative w-[150px] h-[200px] md:w-[170px] md:h-[224px] rounded-xl overflow-hidden border border-white/15 bg-card shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
              >
                <img
                  src={project.screenshot}
                  alt={project.name}
                  loading="lazy"
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="bg-white/15 text-white border-white/20 backdrop-blur-md text-[10px]">
                    {project.category}
                  </Badge>
                  <div
                    className={`p-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <ArrowUpRight className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="absolute bottom-2 left-2 right-2">
                  <h3 className="text-sm font-semibold text-white tracking-tight truncate">
                    {project.name}
                  </h3>
                  <p className="text-[10px] text-white/70 truncate">{project.url}</p>
                </div>
              </div>
            );
          })
        }
      </RadialScrollGallery>
    </div>
  );
}
