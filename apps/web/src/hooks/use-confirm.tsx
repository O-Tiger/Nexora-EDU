"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from "@nexora/ui";

interface Options {
  title?: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  cancelLabel?: string;
}

/**
 * Substitui `window.confirm()` por um modal acessível.
 *
 * Uso:
 *   const [ConfirmDialog, confirm] = useConfirm();
 *   if (!await confirm({ description: "Excluir?" })) return;
 *   // ação confirmada
 *   <ConfirmDialog />  ← renderizar no JSX
 */
export function useConfirm(): [
  () => React.JSX.Element,
  (opts: Options) => Promise<boolean>,
] {
  const [state, setState] = useState<{
    open: boolean;
    opts: Options;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = useCallback((opts: Options): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, opts, resolve });
    });
  }, []);

  function answer(value: boolean) {
    state?.resolve(value);
    setState(null);
  }

  const ConfirmDialog = useCallback(() => {
    if (!state) return <></>;
    const { opts } = state;
    return (
      <Dialog open={state.open} onOpenChange={(open) => !open && answer(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{opts.title ?? "Confirmar"}</DialogTitle>
            <DialogDescription>{opts.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => answer(false)}>
              {opts.cancelLabel ?? "Cancelar"}
            </Button>
            <Button
              variant={opts.confirmVariant ?? "default"}
              onClick={() => answer(true)}
            >
              {opts.confirmLabel ?? "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return [ConfirmDialog, confirm];
}
