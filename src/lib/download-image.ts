import { toast } from "sonner";

/**
 * Download a remote image to the user's device. Works cross-origin for
 * public URLs (Supabase storage, etc.) by fetching as a blob first.
 */
export async function downloadImage(url: string, filename?: string) {
  if (!url) return;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "png").split(";")[0];
    const name = filename || `pixcellor-${Date.now()}.${ext}`;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (e) {
    console.error("downloadImage failed", e);
    // Fallback: open in a new tab so the user can save manually
    window.open(url, "_blank", "noopener,noreferrer");
    toast.error("Couldn't download directly — opened in a new tab.");
  }
}
