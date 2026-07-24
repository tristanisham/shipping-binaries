import type { FC } from "hono/jsx";

// Lucide `link`. Kept as a fixed registry so toast icons are never built from
// caller-supplied markup — only the message text is dynamic, and that is set
// with textContent.
const toastIcons = {
  link:
    '<svg aria-hidden="true" class="size-4 fill-none stroke-current" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};

const toastScript = `
(() => {
  const ICONS = ${JSON.stringify(toastIcons)};

  window.showToast = (message, options = {}) => {
    const viewport = document.querySelector("[data-toast-viewport]");
    if (!viewport || !message) return;

    const toast = document.createElement("div");
    toast.className = "pointer-events-auto flex items-center gap-2 rounded-md bg-chocolate-500 px-4 py-3 text-sm font-semibold text-amber-50 shadow-lg";
    toast.setAttribute("role", "status");

    const icon = ICONS[options.icon];
    if (icon) {
      const slot = document.createElement("span");
      slot.className = "flex shrink-0 items-center";
      slot.innerHTML = icon;
      toast.appendChild(slot);
    }

    const label = document.createElement("span");
    label.textContent = message;
    toast.appendChild(label);

    viewport.appendChild(toast);

    window.setTimeout(() => toast.remove(), 3000);
  };

  window.copyWithToast = async (text, successMessage = "Copied", options = {}) => {
    // The toast can be held back (so it lands after a button animation), but the
    // clipboard write has to stay in the click's activation window.
    const toast = (message, icon) => {
      const show = () => window.showToast(message, { icon });
      if (options.delay > 0) window.setTimeout(show, options.delay);
      else show();
    };

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement("textarea");
        input.value = text;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        const copied = document.execCommand("copy");
        input.remove();
        if (!copied) throw new Error("Copy unavailable");
      }
      toast(successMessage, options.icon);
      return true;
    } catch {
      toast("Copy failed");
      return false;
    }
  };
})();
`;

export const ToastViewport: FC = () => (
  <>
    <div
      aria-live="polite"
      aria-relevant="additions"
      class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      data-toast-viewport
    />
    <script dangerouslySetInnerHTML={{ __html: toastScript }} />
  </>
);
