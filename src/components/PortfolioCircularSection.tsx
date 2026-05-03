import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CircularGallery, type GalleryItem } from "@/components/ui/circular-gallery";

interface Project {
  name: string;
  url: string;
  category: string;
  description: string;
}

const PortfolioCircularSection = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("portfolio_projects")
        .select("name,url,category,description")
        .order("display_order", { ascending: true });

      if (!data) return;

      const mapped: GalleryItem[] = (data as Project[]).map((p) => ({
        common: p.name,
        binomial: p.category,
        photo: {
          url: `https://image.thum.io/get/width/900/crop/1200/https://${p.url}`,
          text: p.description,
          pos: "50% 0%",
          by: p.url,
        },
      }));
      setItems(mapped);
    })();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="relative w-full bg-black" style={{ height: "200vh" }}>
      <div className="sticky top-0 w-full h-screen overflow-hidden">
        <div className="absolute top-12 left-0 right-0 z-10 text-center px-4 pointer-events-none">
          <h2 className="text-3xl md:text-5xl font-semibold text-white tracking-tight">
            Our Portfolio
          </h2>
          <p className="text-sm md:text-base text-white/60 mt-2">
            Scroll to rotate the gallery
          </p>
        </div>
        <CircularGallery items={items} radius={600} autoRotateSpeed={0.02} />
      </div>
    </section>
  );
};

export default PortfolioCircularSection;
