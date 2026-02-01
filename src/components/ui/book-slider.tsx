import React from 'react'
import HTMLFlipBook from "react-pageflip";

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
  return (
    <div className="flex items-center justify-center w-full">
      {/* @ts-ignore */}
      <HTMLFlipBook
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
      >
        {/* Cover Page */}
        <div className="bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold text-primary-foreground mb-4">Portfolio</h1>
            <p className="text-primary-foreground/80 text-sm">Flip to explore our work</p>
          </div>
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
    </div>
  );
}

export default BookSlider;
