import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Code2, Megaphone, Briefcase, Check, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

type ServiceAction = "pricing" | "sales";

const SERVICE_GROUPS = [
  {
    icon: Code2,
    title: "Apps & Sites",
    action: "pricing" as ServiceAction,
    items: [
      "Landing pages",
      "Animated marketing sites",
      "Full web apps",
      "Internal tools",
      "CRM systems",
      "E-commerce stores",
      "Booking platforms",
    ],
  },
  {
    icon: Megaphone,
    title: "Marketing Solutions",
    action: "sales" as ServiceAction,
    items: [
      "Telesales campaigns",
      "Email marketing campaigns",
      "Broadcast SMS & WhatsApp",
      "Lead generation & outreach",
      "SEO & AEO optimisation",
      "Social media automation",
      "Paid ads & retargeting",
    ],
  },
  {
    icon: Briefcase,
    title: "Business Solutions",
    action: "sales" as ServiceAction,
    items: [
      "Recruitment & ATS systems",
      "Payroll & HR tooling",
      "AI integrations & agents",
      "Workflow automation",
      "Custom dashboards & analytics",
      "API & third-party integrations",
      "Bespoke internal software",
    ],
  },
] as const;

type ServiceGroup = (typeof SERVICE_GROUPS)[number];

export default function ServicesDialog() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [spinningOut, setSpinningOut] = useState(false);

  useEffect(() => {
    const handler = () => {
      setSpinningOut(false);
      setOpen(true);
    };
    window.addEventListener("pixcellor:open-services", handler);
    return () => window.removeEventListener("pixcellor:open-services", handler);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    window.dispatchEvent(new CustomEvent("pixcellor:services-open-change", { detail: { open } }));
  }, [open, isMobile]);

  const handleCardAction = useCallback((action: ServiceAction) => {
    if (isMobile) {
      setOpen(false);
      window.setTimeout(() => {
        if (action === "pricing") window.dispatchEvent(new Event("pixcellor:open-packages"));
        else window.dispatchEvent(new CustomEvent("pixcellor:open-chat", { detail: { action: "services" } }));
      }, 280);
      return;
    }
    // Desktop/tablet: spin the services card out, then hand off to next dialog
    // which spins in from the opposite side for a continuous flip feel.
    setSpinningOut(true);
    window.setTimeout(() => {
      setOpen(false);
      setSpinningOut(false);
      if (action === "pricing") {
        window.dispatchEvent(new CustomEvent("pixcellor:open-packages", { detail: { spinIn: true } }));
      } else {
        window.dispatchEvent(new CustomEvent("pixcellor:open-chat", { detail: { action: "services" } }));
      }
    }, 420);
  }, [isMobile]);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent
          className="h-[85vh] carousel-label-glass border-foreground/10 text-foreground [&>div:first-child]:hidden"
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>Our Services</DrawerTitle>
          </DrawerHeader>
          <div className="flex h-full flex-col overflow-hidden">
            <div className="mx-auto mt-3 h-2 w-[100px] flex-shrink-0 rounded-full bg-muted" />
            <div className="relative flex-shrink-0 px-4 pt-3 pb-2">
              <h2 className="text-center text-2xl font-bold text-foreground py-[10px] my-0">Our Services</h2>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] [-webkit-overflow-scrolling:touch]">
              <div className="flex flex-col gap-4">
                {SERVICE_GROUPS.map((group) => (
                  <MobileServiceCard key={group.title} group={group} onAction={handleCardAction} />
                ))}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[calc(54%-10px)] max-w-none w-auto h-auto border-none bg-transparent p-0 shadow-none sm:rounded-none [&>button]:hidden"
        style={{ background: "transparent", perspective: "1600px" }}
      >
        <div className="fixed top-3 right-3 z-[60]">
          <DialogClose className="rounded-sm p-2 text-foreground/80 transition-opacity hover:opacity-100 hover:bg-white/10 focus:outline-none">
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
        <DesktopServicesCards onAction={handleCardAction} spinningOut={spinningOut} />
      </DialogContent>
    </Dialog>
  );
}

function MobileServiceCard({ group, onAction }: { group: ServiceGroup; onAction: (action: ServiceAction) => void }) {
  const Icon = group.icon;
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <Icon className="h-5 w-5 text-foreground" />
        </div>
        <h3 className="text-base font-semibold text-foreground">{group.title}</h3>
      </div>
      <ul className="flex flex-col gap-2 flex-1">
        {group.items.map((item) => (
          <li key={item} className="text-sm text-foreground/80 flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-foreground/60 flex-shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onAction(group.action)}
        className="pricing-button text-foreground transition h-10 w-full flex items-center justify-center text-sm font-semibold rounded-md"
      >
        {group.action === "pricing" ? "View Pricing" : "Speak to Sales"}
      </button>
    </div>
  );
}

function DesktopServicesCards({ onAction, spinningOut = false }: { onAction: (action: ServiceAction) => void; spinningOut?: boolean }) {
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    e.currentTarget.style.setProperty("--mouse-x", x.toString());
    e.currentTarget.style.setProperty("--mouse-y", y.toString());
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.setProperty("--mouse-x", "0");
    e.currentTarget.style.setProperty("--mouse-y", "0");
  }, []);

  const cards = SERVICE_GROUPS.map((group, idx) => {
    const isCenter = idx === 1;
    const rotate = idx === 0 ? -6 : idx === 2 ? 6 : 0;
    const delay = 0.1 + idx * 0.1;
    const Icon = group.icon;

    const sharedShadow = isCenter
      ? `0 12px 40px rgba(0,0,0,0.4), 0 0 30px rgba(255,255,255,0.08), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 1px rgba(0,0,0,0.1)`
      : `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.1)`;

    return (
      <motion.div
        key={group.title}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: isCenter ? 60 : 40, rotate, scale: isCenter ? 1.05 : 1 }}
        animate={{ opacity: 1, y: isCenter ? -20 : 0, rotate, scale: isCenter ? 1.05 : 1 }}
        whileHover={{ scale: isCenter ? 1.07 : 1.03 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay }}
        className={`relative ${isCenter ? "z-20 w-[336px] border-2 border-foreground/30 bg-background/80 px-8 py-12" : "z-10 w-[302px] border border-border/40 bg-background px-7 py-10"} rounded-none overflow-hidden flex flex-col`}
        style={{ willChange: "transform", boxShadow: sharedShadow }}
      >
        <div className={`lava-blob ${isCenter ? "lava-blob-featured-1" : "lava-blob-1"}`} />
        <div className={`lava-blob ${isCenter ? "lava-blob-featured-2" : "lava-blob-2"}`} />
        <div className={`lava-blob ${isCenter ? "lava-blob-featured-3" : "lava-blob-3"}`} />
        <div className="relative z-10 flex flex-col flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <Icon className="h-5 w-5 text-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{group.title}</h3>
          </div>
          <ul className="mb-6 space-y-2 text-base text-muted-foreground flex-1">
            {group.items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="w-5 h-5 text-foreground mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Button
            variant="pricing"
            onClick={() => onAction(group.action)}
            className="h-auto w-full py-2 font-semibold"
          >
            {group.action === "pricing" ? "View Pricing" : "Speak to Sales"}
          </Button>
        </div>
      </motion.div>
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12, rotateY: -90 }}
      animate={spinningOut
        ? { opacity: 0, scale: 0.85, rotateY: 90 }
        : { opacity: 1, scale: 1, y: 0, rotateY: 0 }}
      transition={{ duration: spinningOut ? 0.42 : 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center justify-center gap-6 h-full w-full md:max-lg:scale-[0.72] md:max-lg:origin-center lg:scale-100"
      style={{ transformStyle: "preserve-3d", transformOrigin: "center" }}
    >
      {cards}
    </motion.div>
  );
}
