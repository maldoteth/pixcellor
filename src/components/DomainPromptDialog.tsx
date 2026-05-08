import { useCallback, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

type PromptOpts = {
  title?: string;
  description?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
};

type State = PromptOpts & { open: boolean };

const DEFAULTS: Required<Omit<PromptOpts, "defaultValue">> = {
  title: "Enter delivered domain",
  description: "We'll send the delivery email and tag this record with the domain.",
  label: "Domain",
  placeholder: "example.com",
  submitLabel: "Confirm",
};

export function useDomainPrompt() {
  const isMobile = useIsMobile();
  const [state, setState] = useState<State>({ open: false });
  const [value, setValue] = useState("");
  const resolverRef = useRef<((v: string | null) => void) | null>(null);

  const promptDomain = useCallback((opts: PromptOpts = {}) => {
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
      setValue(opts.defaultValue ?? "");
      setState({ ...opts, open: true });
    });
  }, []);

  const close = (result: string | null) => {
    setState((s) => ({ ...s, open: false }));
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.(result);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) close(null);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = value.trim();
    if (!v) return;
    close(v);
  };

  const merged = { ...DEFAULTS, ...state };

  const body = (
    <form onSubmit={submit} className="space-y-4 px-1">
      <div className="space-y-2">
        <Label htmlFor="domain-prompt-input">{merged.label}</Label>
        <Input
          id="domain-prompt-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={merged.placeholder}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
      </div>
    </form>
  );

  const dialog = isMobile ? (
    <Drawer open={state.open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{merged.title}</DrawerTitle>
          <DrawerDescription>{merged.description}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4">{body}</div>
        <DrawerFooter>
          <Button onClick={() => submit()} disabled={!value.trim()}>{merged.submitLabel}</Button>
          <Button variant="outline" onClick={() => close(null)}>Cancel</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open={state.open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{merged.title}</DialogTitle>
          <DialogDescription>{merged.description}</DialogDescription>
        </DialogHeader>
        {body}
        <DialogFooter>
          <Button variant="outline" onClick={() => close(null)}>Cancel</Button>
          <Button onClick={() => submit()} disabled={!value.trim()}>{merged.submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { promptDomain, dialog };
}
