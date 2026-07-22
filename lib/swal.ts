import Swal from "sweetalert2";

/**
 * App-themed dialogs, replacing the browser's native confirm()/alert().
 *
 * The native ones say "www.nlaffliatearmy.com says", can't be styled, and on
 * some browsers are suppressible — a delete confirmation that silently never
 * appears is the worst possible failure for a destructive action. These match
 * the app's own look and always show.
 *
 * Every helper is async: `if (!(await confirmDialog(...))) return;`
 */

const base = {
  buttonsStyling: false,
  reverseButtons: true,
  focusConfirm: false,
  customClass: {
    popup: "rounded-2xl border border-line !bg-white/95 backdrop-blur shadow-lift",
    title: "!text-lg !font-extrabold !text-ink",
    htmlContainer: "!text-sm !text-muted-fg",
    actions: "!gap-2",
    confirmButton: "btn !py-2",
    denyButton: "btn !py-2",
    cancelButton: "btn-ghost !py-2",
  },
} as const;

/** Destructive confirmations get a red button; everything else the brand rose. */
const dangerClass = {
  ...base.customClass,
  confirmButton:
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white shadow-lift transition-all duration-200 hover:opacity-90 active:scale-[.98]",
};

export async function confirmDialog(opts: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}): Promise<boolean> {
  const res = await Swal.fire({
    ...base,
    customClass: opts.danger ? dangerClass : base.customClass,
    icon: opts.danger ? "warning" : "question",
    iconColor: opts.danger ? "#dc2626" : "#e11d48",
    title: opts.title,
    // Newlines in the message are meaningful — impact lists are line-per-item.
    text: opts.text,
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? (opts.danger ? "Delete" : "OK"),
    cancelButtonText: opts.cancelText ?? "Cancel",
  });
  return res.isConfirmed;
}

export async function alertDialog(opts: {
  title: string;
  text?: string;
  variant?: "success" | "error" | "warning" | "info";
}): Promise<void> {
  await Swal.fire({
    ...base,
    icon: opts.variant ?? "info",
    iconColor:
      opts.variant === "error" ? "#dc2626"
        : opts.variant === "success" ? "#059669"
        : "#e11d48",
    title: opts.title,
    text: opts.text,
    confirmButtonText: "OK",
  });
}

/** Brief, non-blocking confirmation for actions that simply worked. */
export function toast(title: string, variant: "success" | "error" = "success") {
  Swal.fire({
    toast: true,
    position: "top-end",
    timer: 2600,
    timerProgressBar: true,
    showConfirmButton: false,
    icon: variant,
    iconColor: variant === "error" ? "#dc2626" : "#059669",
    title,
    customClass: { popup: "rounded-xl shadow-lift", title: "!text-sm !text-ink" },
  });
}
