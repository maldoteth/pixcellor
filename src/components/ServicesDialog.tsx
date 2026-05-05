import { useState, useEffect, useCallback } from "react";
import { Code2, Megaphone, Briefcase } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

type ServiceAction = "pricing" | "sales";

const SERVICE_GROUPS = [
  {
    icon: Code2,
    title: "Apps & Sites",
    action: "pricing" as ServiceAction,
    items: [
      "Landing pages",
      "Animated sites",
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
      "Custom analytics dashboards",
      "API & third-party integrations",
      "Bespoke internal software",
    ],
  },
] as const;

type ServiceGroup = (typeof SERVICE_GROUPS)[number];

export default function ServicesDialog() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const handler = () => setOpen(true);
    window.addEventListener("pixcellor:open-services", handler);
    return () => window.removeEventListener("pixcellor:open-services", handler);
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    window.dispatchEvent(new CustomEvent("pixcellor:services-open-change", { detail: { open } }));
  }, [open, isMobile]);

  const handleCardAction = useCallback((action: ServiceAction) => {
    setOpen(false);
    window.setTimeout(() => {
      if (action === "pricing") window.dispatchEvent(new Event("pixcellor:open-packages"));
      else window.dispatchEvent(new CustomEvent("pixcellor:open-chat", { detail: { action: "services" } }));
    }, 280);
  }, []);

  // Desktop: PackagesDialog now hosts services as the back face of the flip.
  if (!isMobile) return null;

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
