"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface NativeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

/**
 * Native <dialog> component complying with modern-web-guidance (`dialog` and `light-dismiss-a-dialog`):
 * - Uses native `<dialog closedby="any" aria-labelledby={titleId}>`
 * - Opened via `dialog.showModal()`
 * - No redundant `role="dialog"` or `aria-modal`
 * - Uses `<h1>` as the main heading inside modal scope
 * - Includes the mandatory coordinate-based click fallback when `closedBy` is not in `HTMLDialogElement.prototype`
 */
export function NativeModal({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidthClass = "max-w-2xl",
  children,
}: NativeModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };

    dialog.addEventListener("close", handleClose);

    // Mandatory fallback from `light-dismiss-a-dialog` for browsers without `closedBy` support
    const handleFallbackClick = (event: MouseEvent) => {
      if ("closedBy" in HTMLDialogElement.prototype) return;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (isDialogContent) return;
      dialog.close();
    };

    dialog.addEventListener("click", handleFallbackClick);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleFallbackClick);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      className={`w-[94vw] ${maxWidthClass} rounded-xl bg-tomo-surface text-tomo-light border border-tomo-border shadow-2xl p-0 open:flex open:flex-col max-h-[90vh]`}
    >
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-tomo-border bg-tomo-bg/60">
        <div>
          {subtitle && (
            <p className="text-[11px] font-mono uppercase tracking-widest text-tomo-green mb-0.5">
              {subtitle}
            </p>
          )}
          <h1 id={titleId} className="font-serif text-xl font-bold text-tomo-light">
            {title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Fechar janela"
          className="p-1.5 rounded-lg text-tomo-text hover:text-tomo-light hover:bg-tomo-card transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto flex-1">{children}</div>
    </dialog>
  );
}
