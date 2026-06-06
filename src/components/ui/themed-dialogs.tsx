import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PromptField = {
  name: string;
  label: string;
  type?: "text" | "email" | "url" | "textarea" | "select";
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};

export type PromptOptions = {
  title: string;
  description?: string;
  fields: PromptField[];
  confirmLabel?: string;
  cancelLabel?: string;
};

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptResolver = (values: Record<string, string> | null) => void;
type ConfirmResolver = (ok: boolean) => void;

type Ctx = {
  prompt: (opts: PromptOptions) => Promise<Record<string, string> | null>;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ThemedDialogsContext = React.createContext<Ctx | null>(null);

export const ThemedDialogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [promptState, setPromptState] = React.useState<{ opts: PromptOptions; resolve: PromptResolver } | null>(null);
  const [confirmState, setConfirmState] = React.useState<{ opts: ConfirmOptions; resolve: ConfirmResolver } | null>(null);
  const [values, setValues] = React.useState<Record<string, string>>({});

  const ctx = React.useMemo<Ctx>(() => ({
    prompt: (opts) =>
      new Promise((resolve) => {
        const initial: Record<string, string> = {};
        for (const f of opts.fields) initial[f.name] = f.defaultValue ?? "";
        setValues(initial);
        setPromptState({ opts, resolve });
      }),
    confirm: (opts) =>
      new Promise((resolve) => {
        setConfirmState({ opts, resolve });
      }),
  }), []);

  const closePrompt = (result: Record<string, string> | null) => {
    promptState?.resolve(result);
    setPromptState(null);
  };
  const closeConfirm = (ok: boolean) => {
    confirmState?.resolve(ok);
    setConfirmState(null);
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptState) return;
    for (const f of promptState.opts.fields) {
      if (f.required && !values[f.name]?.trim()) return;
    }
    closePrompt({ ...values });
  };

  return (
    <ThemedDialogsContext.Provider value={ctx}>
      {children}

      <Dialog open={!!promptState} onOpenChange={(o) => { if (!o) closePrompt(null); }}>
        <DialogContent className="sm:max-w-md">
          {promptState && (
            <form onSubmit={handlePromptSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{promptState.opts.title}</DialogTitle>
                {promptState.opts.description && (
                  <DialogDescription>{promptState.opts.description}</DialogDescription>
                )}
              </DialogHeader>
              <div className="space-y-3">
                {promptState.opts.fields.map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <Label htmlFor={`prompt-${f.name}`}>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                    {f.type === "textarea" ? (
                      <Textarea
                        id={`prompt-${f.name}`}
                        value={values[f.name] ?? ""}
                        placeholder={f.placeholder}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      />
                    ) : f.type === "select" ? (
                      <select
                        id={`prompt-${f.name}`}
                        value={values[f.name] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none"
                      >
                        {(f.options ?? []).map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={`prompt-${f.name}`}
                        type={f.type ?? "text"}
                        value={values[f.name] ?? ""}
                        placeholder={f.placeholder}
                        autoFocus={promptState.opts.fields[0]?.name === f.name}
                        onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => closePrompt(null)}>
                  {promptState.opts.cancelLabel ?? "Cancel"}
                </Button>
                <Button type="submit">{promptState.opts.confirmLabel ?? "Confirm"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmState} onOpenChange={(o) => { if (!o) closeConfirm(false); }}>
        <DialogContent className="sm:max-w-md">
          {confirmState && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{confirmState.opts.title}</DialogTitle>
                {confirmState.opts.description && (
                  <DialogDescription>{confirmState.opts.description}</DialogDescription>
                )}
              </DialogHeader>
              <DialogFooter className="sm:justify-center justify-center gap-2">
                <Button variant="outline" onClick={() => closeConfirm(false)}>
                  {confirmState.opts.cancelLabel ?? "Cancel"}
                </Button>
                <Button
                  variant={confirmState.opts.destructive ? "destructive" : "default"}
                  onClick={() => closeConfirm(true)}
                  autoFocus
                >
                  {confirmState.opts.confirmLabel ?? "Confirm"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ThemedDialogsContext.Provider>
  );
};

export function useThemedDialogs(): Ctx {
  const ctx = React.useContext(ThemedDialogsContext);
  if (!ctx) throw new Error("useThemedDialogs must be used within ThemedDialogsProvider");
  return ctx;
}

export const usePromptDialog = () => useThemedDialogs().prompt;
export const useConfirmDialog = () => useThemedDialogs().confirm;
