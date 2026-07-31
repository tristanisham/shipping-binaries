import type { FC } from "hono/jsx";
import { SUBSCRIBER_EMAIL_MAX_LENGTH } from "../../../models/subscriber.js";
import { Button } from "../ui/Button.js";
import { Input } from "../ui/Input.js";
import { cn } from "../ui/utils.js";

export enum EmailCaptureAlignment {
  Center = "center",
  Left = "left",
  Right = "right",
}

export type EmailCaptureStatus =
  | "invalid"
  | "pending"
  | "subscribed"
  | "unsubscribed";

type EmailCaptureProps = {
  alignment: EmailCaptureAlignment;
  description: string;
  isAuthenticated?: boolean;
  label: string;
  postSlug: string;
  status?: EmailCaptureStatus;
};

const alignmentClasses: Record<EmailCaptureAlignment, string> = {
  [EmailCaptureAlignment.Center]: "text-center",
  [EmailCaptureAlignment.Left]: "text-left",
  [EmailCaptureAlignment.Right]: "text-right",
};

export const EmailCapture: FC<EmailCaptureProps> = ({
  alignment,
  description,
  isAuthenticated = false,
  label,
  postSlug,
  status,
}) => (
  <section
    aria-labelledby="email-capture-title"
    class="mt-12 rounded-xl border border-mist-600/20 bg-mist-600/5 p-6 dark:border-amber-50/20 dark:bg-amber-50/5 sm:p-8"
    id="email-capture"
  >
    <h2
      class={cn(
        "text-3xl font-bold sm:text-4xl",
        alignmentClasses[alignment],
      )}
      id="email-capture-title"
    >
      {label}
    </h2>
    <p class="mt-3 text-base opacity-75">{description}</p>

    {status === "subscribed" || status === "pending" ||
        status === "unsubscribed"
      ? (
        <p class="mt-6 font-semibold" role="status">
          {status === "subscribed"
            ? "You're subscribed."
            : status === "pending"
            ? "Check your email to confirm your subscription."
            : "This email subscription is currently unsubscribed."}
        </p>
      )
      : (
        <>
          {status === "invalid"
            ? (
              <p
                class="mt-4 text-sm font-bold text-burgundy-700 dark:text-burgundy-300"
                role="alert"
              >
                Enter a valid email address.
              </p>
            )
            : null}
          {isAuthenticated
            ? (
              <form
                action={`/blog/${postSlug}/subscribe`}
                aria-label={label}
                class="mt-6 flex h-11 items-center justify-between gap-4 rounded-md border border-onyx-300 bg-amber-50/70 px-3 shadow-xs dark:border-onyx-700 dark:bg-onyx-950/60"
                method="post"
              >
                <input name="captureLabel" type="hidden" value={label} />
                <span class="text-sm">
                  Subscribe{" "}
                  <a class="underline underline-offset-2" href="/help">
                    via Email
                  </a>
                  ?
                </span>
                <Button size="sm" type="submit" variant="tertiary">
                  Subscribe
                </Button>
              </form>
            )
            : (
              <form
                action={`/blog/${postSlug}/subscribe`}
                aria-label={label}
                class="mt-6 flex flex-col gap-3 sm:flex-row"
                method="post"
              >
                <input name="captureLabel" type="hidden" value={label} />
                <label class="sr-only" for="email-capture-address">
                  Email address
                </label>
                <Input
                  autocomplete="email"
                  class="h-11 flex-1"
                  id="email-capture-address"
                  maxlength={SUBSCRIBER_EMAIL_MAX_LENGTH}
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                />
                <Button class="h-11" type="submit" variant="tertiary">
                  Subscribe
                </Button>
              </form>
            )}
        </>
      )}
  </section>
);
