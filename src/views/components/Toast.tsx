import type { FC } from "hono/jsx";

const toastScript = `
(() => {
  window.showToast = (message) => {
    const viewport = document.querySelector("[data-toast-viewport]");
    if (!viewport || !message) return;

    const toast = document.createElement("div");
    toast.className = "pointer-events-auto rounded-md bg-chocolate-500 px-4 py-3 text-sm font-semibold text-amber-50 shadow-lg";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    viewport.appendChild(toast);

    window.setTimeout(() => toast.remove(), 3000);
  };

  window.copyWithToast = async (text, successMessage = "Copied") => {
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
      window.showToast(successMessage);
      return true;
    } catch {
      window.showToast("Copy failed");
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
      class="pointer-events-none fixed right-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
      data-toast-viewport
    />
    <script dangerouslySetInnerHTML={{ __html: toastScript }} />
  </>
);
