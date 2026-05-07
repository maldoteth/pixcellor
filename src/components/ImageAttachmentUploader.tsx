import { ChangeEvent, useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB images
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB videos

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  prefix: string;
  disabled?: boolean;
  acceptVideos?: boolean;
}

export function ImageAttachmentUploader({ value, onChange, max = 20, prefix, disabled, acceptVideos = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (event.target) event.target.value = "";
    if (!files.length) return;

    if (value.length + files.length > max) {
      toast.error(`You can only upload up to ${max} files.`);
      return;
    }

    setUploading(true);
    const uploaded: string[] = [];
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !(acceptVideos && isVideo)) {
        toast.error(`${file.name} is not a supported ${acceptVideos ? "image or video" : "image"}.`);
        continue;
      }
      const limit = isVideo ? MAX_VIDEO_BYTES : MAX_BYTES;
      if (file.size > limit) {
        toast.error(`${file.name} is over ${isVideo ? "50MB" : "10MB"}.`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
      const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const { error } = await supabase.storage.from("submission-attachments").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) {
        toast.error(`Could not upload ${file.name}: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from("submission-attachments").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
    setUploading(false);
  };

  const remove = (url: string) => onChange(value.filter((u) => u !== url));

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={acceptVideos ? "image/*,video/*" : "image/*"}
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading || value.length >= max}
        className="gap-2"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        {uploading ? "Uploading…" : `${acceptVideos ? "Attach files" : "Attach images"} (${value.length}/${max})`}
      </Button>
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {value.map((url) => {
            const isVideo = /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url);
            return (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                {isVideo ? (
                  <video src={url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={url} alt="attachment" className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => remove(url)}
                  className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove attachment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
