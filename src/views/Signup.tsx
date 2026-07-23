import type { FC } from "hono/jsx";
import {
  defaultHeaderNav,
  Header,
  setCurrentNavItem,
} from "./components/header/Header.js";
import {
  panelDivider,
  panelField,
  panelMuted,
} from "./components/admin/panel.js";
import { PasswordFields } from "./components/auth/PasswordFields.js";
import { Button } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { Input } from "./components/ui/Input.js";
import { cn } from "./components/ui/utils.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

export type SignupValues = {
  email: string;
  label: string;
  username: string;
};

type SignupProps = {
  error?: string;
  values?: Partial<SignupValues>;
};

export const Signup: FC<SignupProps> = ({ error, values = {} }) => {
  const meta: LayoutMeta = {
    title: "Sign up | Shipping Binaries",
    description: "Create a Shipping Binaries account.",
    robots: "noindex",
  };
  const fieldClass = cn("h-11", panelField);

  return (
    <Layout meta={meta}>
      <Header nav={setCurrentNavItem(defaultHeaderNav, "/signup")} />
      <main class="container mx-auto h-full w-full px-4">
        <section class="mx-auto mt-10 max-w-md sm:mt-16">
          <Card>
            <CardHeader class={`border-b ${panelDivider}`}>
              <CardTitle class="text-2xl">Sign up</CardTitle>
              <CardDescription>
                Create your Shipping Binaries account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action="/signup" class="flex flex-col gap-5" method="post">
                <label class="flex flex-col gap-2 text-sm font-semibold">
                  Name
                  <Input
                    autocomplete="name"
                    autofocus
                    class={fieldClass}
                    name="label"
                    required
                    value={values.label ?? ""}
                  />
                </label>
                <label class="flex flex-col gap-2 text-sm font-semibold">
                  Username
                  <Input
                    autocapitalize="none"
                    autocomplete="username"
                    class={fieldClass}
                    name="username"
                    oninput="this.value = this.value.toLowerCase()"
                    required
                    value={values.username ?? ""}
                  />
                </label>
                <label class="flex flex-col gap-2 text-sm font-semibold">
                  Email
                  <Input
                    autocomplete="email"
                    class={fieldClass}
                    name="email"
                    required
                    type="email"
                    value={values.email ?? ""}
                  />
                </label>
                <PasswordFields
                  confirmationName="passwordConfirmation"
                  idPrefix="signup"
                  inputClass={fieldClass}
                  labelClass="flex flex-col gap-2 text-sm font-semibold"
                  passwordName="password"
                />
                {error && (
                  <p
                    class="text-sm font-bold text-burgundy-300 dark:text-burgundy-700"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
                <Button class="h-11 w-full" type="submit" variant="tertiary">
                  Sign up
                </Button>
                <a
                  class={`w-fit text-sm underline ${panelMuted}`}
                  href="/login"
                >
                  Already have an account? Log in
                </a>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    </Layout>
  );
};
