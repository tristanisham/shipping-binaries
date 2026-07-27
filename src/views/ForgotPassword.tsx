import type { FC } from "hono/jsx";
import {
  panelDivider,
  panelField,
  panelMuted,
  panelRow,
} from "./components/admin/panel.js";
import { defaultHeaderNav, Header } from "./components/header/Header.js";
import { Button } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "./components/ui/Card.js";
import { Input } from "./components/ui/Input.js";
import { cn } from "./components/ui/utils.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type ForgotPasswordProps = {
  email?: string;
  sent?: boolean;
};

export const ForgotPassword: FC<ForgotPasswordProps> = ({
  email = "",
  sent = false,
}) => {
  const meta: LayoutMeta = {
    title: "Reset password | Shipping Binaries",
    description: "Request a Shipping Binaries password reset.",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <Header nav={defaultHeaderNav} />
      <main class="container mx-auto h-full w-full px-4">
        <section class="mx-auto mt-10 max-w-md sm:mt-16">
          <Card>
            <CardHeader class={`border-b ${panelDivider}`}>
              <h1
                class="text-2xl leading-none font-semibold"
                data-slot="card-title"
              >
                Reset password
              </h1>
              <CardDescription>
                {sent
                  ? "Check your inbox for the reset link."
                  : "We’ll email you a single-use reset link."}
              </CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col gap-5">
              {sent
                ? (
                  <>
                    <p
                      class={`rounded-lg px-4 py-3 text-sm font-medium ${panelRow}`}
                      role="status"
                    >
                      If an active account matches that email address, a reset
                      link is on its way.
                    </p>
                    <a
                      class={`w-fit text-sm underline ${panelMuted}`}
                      href="/login"
                    >
                      Back to log in
                    </a>
                  </>
                )
                : (
                  <form
                    action="/forgot-password"
                    class="flex flex-col gap-5"
                    method="post"
                  >
                    <label class="flex flex-col gap-2 text-sm font-semibold">
                      Email
                      <Input
                        autocomplete="email"
                        autofocus
                        class={cn("h-11", panelField)}
                        name="email"
                        required
                        type="email"
                        value={email}
                      />
                    </label>
                    <Button
                      class="h-11 w-full"
                      type="submit"
                      variant="tertiary"
                    >
                      Send reset link
                    </Button>
                    <a
                      class={`w-fit text-sm underline ${panelMuted}`}
                      href="/login"
                    >
                      Back to log in
                    </a>
                  </form>
                )}
            </CardContent>
          </Card>
        </section>
      </main>
    </Layout>
  );
};
