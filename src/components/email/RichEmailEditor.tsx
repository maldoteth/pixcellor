import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bold, Italic, Underline as UnderlineIcon, Heading1, Heading2,
  List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Minus, Undo2, Redo2, MousePointerClick,
} from "lucide-react";
import { usePromptDialog } from "@/components/ui/themed-dialogs";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

const ToolbarBtn = ({
  active, onClick, title, children, disabled,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`h-8 w-8 inline-flex items-center justify-center rounded-md border border-transparent text-sm transition-colors hover:bg-muted ${
      active ? "bg-foreground text-background hover:bg-foreground" : "text-foreground"
    } disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

export default function RichEmailEditor({ value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptDialog = usePromptDialog();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener", target: "_blank" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg" } }),
    ],
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[320px] px-4 py-3 focus:outline-none [&_p]:my-2 [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:mt-3 [&_h2]:mb-2",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [value, editor]);

  const setLink = useCallback(async () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const result = await promptDialog({
      title: "Insert link",
      description: "Leave URL empty to remove the link.",
      fields: [{ name: "url", label: "URL", type: "url", defaultValue: prev || "https://", placeholder: "https://" }],
      confirmLabel: "Apply",
    });
    if (!result) return;
    const url = result.url.trim();
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor, promptDialog]);

  const insertButton = useCallback(async () => {
    if (!editor) return;
    const result = await promptDialog({
      title: "Insert button",
      fields: [
        { name: "label", label: "Button label", required: true, defaultValue: "Get in touch" },
        { name: "url", label: "Button URL", type: "url", required: true, defaultValue: "https://pixcellor.com" },
      ],
      confirmLabel: "Insert",
    });
    if (!result) return;
    const label = result.label.trim();
    const url = result.url.trim();
    if (!label || !url) return;
    const safe = label.replace(/</g, "&lt;");
    const html = `<p class="px-btn"><a href="${url}">${safe}</a></p><p></p>`;
    editor.chain().focus().insertContent(html).run();
  }, [editor, promptDialog]);

  const insertImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    const ext = file.name.split(".").pop() || "png";
    const path = `broadcast/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("email-assets").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
    });
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return;
    }
    const { data } = supabase.storage.from("email-assets").getPublicUrl(path);
    editor?.chain().focus().setImage({ src: data.publicUrl, alt: file.name }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-input rounded-md bg-background overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-input bg-muted/30">
        <ToolbarBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarBtn>
        <Sep />
        <ToolbarBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-4 h-4" />
        </ToolbarBtn>
        <Sep />
        <ToolbarBtn title="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarBtn>
        <Sep />
        <ToolbarBtn title="Link" active={editor.isActive("link")} onClick={setLink}>
          <LinkIcon className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Insert button (CTA)" onClick={insertButton}>
          <MousePointerClick className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Insert image" onClick={() => fileInputRef.current?.click()}>
          <ImageIcon className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-4 h-4" />
        </ToolbarBtn>
        <Sep />
        <ToolbarBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className="w-4 h-4" />
        </ToolbarBtn>
        <ToolbarBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className="w-4 h-4" />
        </ToolbarBtn>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void insertImage(f);
            e.target.value = "";
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

const Sep = () => <span className="w-px h-5 bg-border mx-1" />;

export type { Editor };
