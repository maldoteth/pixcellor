import { useState, useEffect } from "react";
import { Code2, Megaphone, Briefcase, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

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

export default function ServicesDialog() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("pixcellor:open-services", handler);
    return () => window.removeEventListener("pixcellor:open-services", handler);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    window.dispatchEvent(new CustomEvent("pixcellor:services-open-change", { detail: { open } }));
  }, [open, isMobile]);

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
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-2 rounded-sm p-2 text-foreground/70 transition-opacity hover:opacity-100 focus:outline-none"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
              <h2 className="text-center text-2xl font-bold text-foreground">Our Services</h2>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] [-webkit-overflow-scrolling:touch]">
              <div className="flex flex-col gap-4">
                {SERVICE_GROUPS.map((group) => (
                  <ServiceCard key={group.title} group={group} onClose={() => setOpen(false)} />
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
        className="top-[54%] max-w-none w-auto h-auto border-none bg-transparent p-0 shadow-none sm:rounded-none [&>button]:hidden"
        style={{ background: "transparent" }}
      >
        <div className="absolute top-3 right-3 z-50">
          <DialogClose className="rounded-sm p-2 text-foreground/70 transition-opacity hover:opacity-100 hover:bg-white/10 focus:outline-none">
            <X className="h-6 w-6" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
        <div className="flex flex-col items-center gap-6 px-6">
          <h2 className="text-3xl font-bold text-foreground text-center">Our Services</h2>
          <div className="grid grid-cols-3 gap-5 w-[min(1200px,92vw)] items-stretch">
            {SERVICE_GROUPS.map((group) => (
              <ServiceCard key={group.title} group={group} onClose={() => setOpen(false)} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ServiceCard({ group, onClose }: { group: (typeof SERVICE_GROUPS)[number]; onClose: () => void }) {
  const Icon = group.icon;
  const handleClick = () => {
    onClose();
    if (group.action === "pricing") {
      window.dispatchEvent(new Event("pixcellor:open-packages"));
    } else {
      window.dispatchEvent(new CustomEvent("pixcellor:open-chat", { detail: { action: "services" } }));
    }
  };
  return (
    <div
      className="rounded-2xl p-5 md:p-6 flex flex-col gap-4 h-full"
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
        <h3 className="text-base md:text-lg font-semibold text-foreground">{group.title}</h3>
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
        onClick={handleClick}
        className="pricing-button text-foreground transition h-10 w-full flex items-center justify-center text-sm font-semibold rounded-md"
      >
        {group.action === "pricing" ? "View Pricing" : "Speak to Sales"}
      </button>
    </div>
  );
}
