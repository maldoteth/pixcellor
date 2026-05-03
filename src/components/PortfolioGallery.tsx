import React from 'react';
import { CircularGallery, GalleryItem } from '@/components/ui/circular-gallery';
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
  { name: 'First Class Agency', url: 'firstclassagencytiktok.com', category: 'TikTok Creator Network', screenshot: firstClassAgencyImg },
  { name: 'TikUp', url: 'tikup.xyz', category: 'TikTok Live Toolkit', screenshot: tikupImg },
  { name: 'Bricks', url: 'bricks.it.com', category: 'Construction SaaS', screenshot: bricksImg },
  { name: 'Oak Shore', url: 'oakshore.homes', category: 'Hospitality', screenshot: oakshoreImg },
  { name: 'Last Chad Standing', url: 'lastchadstanding.com', category: 'Web3 Game', screenshot: lastChadStandingImg },
  { name: 'Holder Chat', url: 'holder.chat', category: 'Token-Gated Chat', screenshot: holderChatImg },
  { name: 'SEC Digital', url: 'sec.digital', category: 'Crime Registry', screenshot: secDigitalImg },
  { name: 'DeLabs UK', url: 'delabs.co.uk', category: 'Software Studio', screenshot: delabsImg },
  { name: 'The Ponzi', url: 'theponzi.lol', category: 'Satirical Media', screenshot: theponziImg },
  { name: 'DHBScan', url: 'dhbscan.com', category: 'Token Analytics', screenshot: dhbscanImg },
  { name: 'DHB Docs', url: 'docs.dhb.gg', category: 'Documentation', screenshot: dhbDocsImg },
  { name: 'Arvox Agency', url: 'arvox.agency', category: 'Web3 Agency', screenshot: arvoxAgencyImg },
  { name: 'DeHub Network', url: 'dehub.net', category: 'Web3 Platform', screenshot: dehubNetworkImg },
  { name: 'DeHub', url: 'dehub.io', category: 'Social App', screenshot: dehubImg },
  {
    name: 'Highwood Village',
    url: 'berkeleygroup.co.uk',
    fullUrl: 'https://www.berkeleygroup.co.uk/developments/west-sussex/horsham/highwood-village',
    category: 'Property Development',
    screenshot: highwoodVillageImg,
  },
];

const items: GalleryItem[] = projects.map((p) => ({
  common: p.name,
  binomial: p.url,
  photo: { url: p.screenshot, text: p.name, pos: '50% 0%', by: p.category },
  href: p.fullUrl ?? `https://${p.url}`,
}));

export default function PortfolioGallery() {
  const handleSelect = (index: number) => {
    const p = projects[index];
    if (!p) return;
    void recordFalloff({ event: 'portfolio_project_opened', projectName: p.name, projectUrl: p.url });
    window.open(p.fullUrl ?? `https://${p.url}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full h-[420px] md:h-[520px]">
      <CircularGallery items={items} radius={420} autoRotateSpeed={0.04} onItemSelect={handleSelect} />
    </div>
  );
}
