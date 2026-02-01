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

// Book cover component with hardback styling
const BookCover = React.forwardRef<HTMLDivElement>((props, ref) => (
  <div 
    ref={ref}
    className="relative rounded-r-sm overflow-hidden"
    style={{
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
      boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.3)',
    }}
  >
    {/* Spine edge effect */}
    <div 
      className="absolute left-0 top-0 bottom-0 w-3"
      style={{
        background: 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.3) 100%)',
      }}
    />
    
    {/* Leather texture overlay */}
    <div 
      className="absolute inset-0 opacity-30"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
    
    {/* Gold border frame */}
    <div className="absolute inset-4 border-2 border-amber-600/40 rounded-sm" />
    <div className="absolute inset-5 border border-amber-700/30 rounded-sm" />
    
    {/* Corner ornaments */}
    <div className="absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-amber-600/50 rounded-tl-sm" />
    <div className="absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-amber-600/50 rounded-tr-sm" />
    <div className="absolute bottom-6 left-6 w-8 h-8 border-l-2 border-b-2 border-amber-600/50 rounded-bl-sm" />
    <div className="absolute bottom-6 right-6 w-8 h-8 border-r-2 border-b-2 border-amber-600/50 rounded-br-sm" />
    
    {/* Center content */}
    <div className="relative h-full flex flex-col items-center justify-center p-8">
      {/* Decorative top flourish */}
      <div className="text-amber-600/60 text-2xl mb-4">✦</div>
      
      {/* Title */}
      <h1 
        className="text-3xl font-serif font-bold tracking-wider mb-2"
        style={{
          color: '#d4af37',
          textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.3)',
        }}
      >
        PORTFOLIO
      </h1>
      
      {/* Subtitle divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-amber-600/60 to-transparent" />
        <div className="text-amber-600/60 text-sm">◆</div>
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-amber-600/60 to-transparent" />
      </div>
      
      {/* Subtitle */}
      <p 
        className="text-sm tracking-[0.3em] uppercase"
        style={{ color: '#b8860b' }}
      >
        Our Work
      </p>
      
      {/* Decorative bottom flourish */}
      <div className="text-amber-600/60 text-2xl mt-6">✦</div>
      
      {/* Bottom text */}
      <p 
        className="absolute bottom-8 text-xs tracking-widest opacity-60"
        style={{ color: '#8b7355' }}
      >
        Pixcellor™
      </p>
    </div>
  </div>
));

BookCover.displayName = 'BookCover';

// Page component
const BookPage = React.forwardRef<HTMLDivElement, { site: typeof portfolioData[0] }>(
  ({ site }, ref) => (
    <div 
      ref={ref}
      className="bg-card border border-border rounded-sm overflow-hidden h-full"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.1)',
      }}
    >
      <div className="h-full flex flex-col">
        {/* OG Image */}
        <div className="h-40 bg-muted overflow-hidden border-b border-border">
          <img
            src={site.ogImage}
            alt={site.name}
            className="w-full h-full object-cover"
            onError={(e) => {
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
        
        {/* Page corner fold effect */}
        <div 
          className="absolute bottom-0 right-0 w-8 h-8"
          style={{
            background: 'linear-gradient(135deg, transparent 50%, hsl(var(--muted)) 50%)',
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  )
);

BookPage.displayName = 'BookPage';

function BookSlider() {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="relative">
        {/* @ts-ignore */}
        <HTMLFlipBook
          width={280}
          height={380}
          size="fixed"
          minWidth={280}
          maxWidth={280}
          minHeight={380}
          maxHeight={380}
          showCover={true}
          mobileScrollSupport={true}
          className="shadow-2xl"
          style={{}}
          startPage={0}
          drawShadow={true}
          flippingTime={800}
          usePortrait={true}
          startZIndex={0}
          autoSize={false}
          maxShadowOpacity={0.6}
          showPageCorners={true}
          disableFlipByClick={false}
          swipeDistance={30}
          clickEventForward={true}
          useMouseEvents={true}
        >
          {/* Cover Page */}
          <BookCover />

          {portfolioData.map((site) => (
            <BookPage key={site.url} site={site} />
          ))}
          
          {/* Back cover */}
          <div 
            className="rounded-l-sm"
            style={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
              boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.4)',
            }}
          >
            <div className="h-full flex items-center justify-center">
              <p className="text-amber-600/60 text-sm tracking-widest">Pixcellor™</p>
            </div>
          </div>
        </HTMLFlipBook>
      </div>
    </div>
  );
}

export default BookSlider;
