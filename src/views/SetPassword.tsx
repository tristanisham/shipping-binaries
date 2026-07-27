import type { FC } from "hono/jsx";
import { ACCOUNT_PASSWORD_MAX_BYTES } from "../auth/password.js";
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

type SetPasswordProps = {
  error?: string;
  mode: "invite" | "reset";
  token: string;
  valid: boolean;
};

// This flow is validated by validatePassword() in routes/auth.tsx, which wants
// 12 characters — not the shorter ACCOUNT_PASSWORD_RULES ladder that
// PasswordFields renders for signup. Keep the minlength here in step with that
// validator rather than reusing PasswordFields, or the form would advertise
// rules the server does not accept.
const SET_PASSWORD_MIN_LENGTH = 12;

export const SetPassword: FC<SetPasswordProps> = ({
  error,
  mode,
  token,
  valid,
}) => {
  const invite = mode === "invite";
  const title = invite ? "Accept invitation" : "Choose a new password";
  const meta: LayoutMeta = {
    title: `${title} | Shipping Binaries`,
    robots: "noindex",
  };
  const fieldClass = cn("h-11", panelField);
  const labelClass = "flex flex-col gap-2 text-sm font-semibold";

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
                {title}
              </h1>
              <CardDescription>
                {!valid
                  ? "That link can no longer be used."
                  : invite
                  ? "Set a password to activate your account."
                  : "Set a new password for your account."}
              </CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col gap-5">
              {!valid
                ? (
                  <>
                    <p
                      class={`rounded-lg px-4 py-3 text-sm font-medium ${panelRow}`}
                      role="alert"
                    >
                      This link is invalid, expired, or has already been used.
                    </p>
                    <a
                      class={`w-fit text-sm underline ${panelMuted}`}
                      href={invite ? "/login" : "/forgot-password"}
                    >
                      {invite ? "Go to log in" : "Request another reset link"}
                    </a>
                  </>
                )
                : (
                  <form
                    action={invite ? "/invite" : "/reset-password"}
                    class="flex flex-col gap-5"
                    method="post"
                  >
                    <p class={`text-sm ${panelMuted}`}>
                      Use at least {SET_PASSWORD_MIN_LENGTH} characters and no
                      more than {ACCOUNT_PASSWORD_MAX_BYTES} UTF-8 bytes.
                    </p>
                    <input name="token" type="hidden" value={token} />
                    <label class={labelClass}>
                      New password
                      <Input
                        autocomplete="new-password"
                        autofocus
                        class={fieldClass}
                        minlength={SET_PASSWORD_MIN_LENGTH}
                        name="password"
                        required
                        type="password"
                      />
                    </label>
                    <label class={labelClass}>
                      Confirm password
                      <Input
                        autocomplete="new-password"
                        class={fieldClass}
                        minlength={SET_PASSWORD_MIN_LENGTH}
                        name="passwordConfirmation"
                        required
                        type="password"
                      />
                    </label>
                    {error && (
                      <p
                        class="text-sm font-bold text-burgundy-300 dark:text-burgundy-700"
                        role="alert"
                      >
                        {error}
                      </p>
                    )}
                    <Button
                      class="h-11 w-full"
                      type="submit"
                      variant="tertiary"
                    >
                      {invite ? "Activate account" : "Update password"}
                    </Button>
                  </form>
                )}
            </CardContent>
          </Card>
        </section>
      </main>
    </Layout>
  );
};
