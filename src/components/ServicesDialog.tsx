import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Code2, Megaphone, Briefcase, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDrawerTouchScroll } from "@/hooks/use-drawer-touch-scroll";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

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
      "Broadcast SMS",
      "Lead generation",
      "SEO & AEO optimisation",
      "Social media automation",
    ],
  },
  {
    icon: Briefcase,
    title: "Business Solutions",
    action: "sales" as ServiceAction,
    items: [
      "Recruitment systems",
      "Payroll & HR tooling",
      "AI integrations & agents",
      "Workflow automation",
      "Custom dashboards & analytics",
      "API & third-party integrations",
    ],
  },
] as const;

export default function ServicesDialog() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const drawerScrollRef = useDrawerTouchScroll<HTMLElement>(isMobile && open, {
    onCloseDrag: () => setOpen(false),
  });

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

    return createPortal(
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end" role="presentation" data-pixcellor-mobile-drawer="true">
            <motion.div
              className="absolute inset-0 bg-background/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOpen(false)}
            />
            <motion.section
              ref={drawerScrollRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="services-dialog-title"
              className="relative h-[82dvh] max-h-[82dvh] w-full touch-none overflow-y-scroll overscroll-contain rounded-t-[10px] border border-border bg-background/95 backdrop-blur-xl scrollbar-none [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
            >
              <div className="mx-auto mt-4 h-2 w-[100px] flex-shrink-0 rounded-full bg-muted" />
              <div className="relative grid gap-1.5 p-4 pb-2 text-left">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute right-4 top-3 rounded-sm p-2 text-foreground/70 transition-opacity hover:opacity-100 focus:outline-none"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </button>
                <h2 id="services-dialog-title" className="text-center text-2xl font-bold text-foreground">
                  Our Services
                </h2>
              </div>
              <div
                className="px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]"
                data-pixcellor-drawer-scroll="true"
              >
                <div className="flex flex-col gap-4">
                  {SERVICE_GROUPS.map((group) => (
                    <ServiceCard key={group.title} group={group} onClose={() => setOpen(false)} />
                  ))}
                </div>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>,
      document.body,
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
          <div className="grid grid-cols-3 gap-5 max-w-5xl">
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
      window.dispatchEvent(new CustomEvent("pixcellor:open-chat", { detail: { action: "call" } }));
    }
  };
  return (
    <div
      className="rounded-2xl p-5 md:p-6 flex flex-col gap-4"
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
      <ul className="flex flex-col gap-2">
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
