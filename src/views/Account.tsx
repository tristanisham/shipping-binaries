import type { FC } from "hono/jsx";
import { MAX_PROFILE_BIOGRAPHY_LENGTH } from "../models/profile.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { PasswordFields } from "./components/auth/PasswordFields.js";
import {
  panelDivider,
  panelField,
  panelMuted,
} from "./components/admin/panel.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Button } from "./components/ui/Button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card.js";
import { Input } from "./components/ui/Input.js";
import { Textarea } from "./components/ui/Textarea.js";
import { cn } from "./components/ui/utils.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AccountProps = {
  biography: string;
  email: string;
  error?: string;
  isAdmin?: boolean;
  label: string;
  username: string;
};

export const Account: FC<AccountProps> = ({
  biography,
  email,
  error,
  isAdmin = false,
  label,
  username,
}) => {
  const meta: LayoutMeta = {
    title: "Account | Shipping Binaries",
    robots: "noindex",
  };

  return (
    <Layout meta={meta}>
      <HeaderSlim
        isAdmin={isAdmin}
        isAuthenticated
        nav={setCurrentNavItem(defaultHeaderNav, "/admin/account")}
        viewerUsername={username}
      />
      <main class="container mx-auto h-full w-full px-4">
        <section class="mx-auto mt-10 max-w-md sm:mt-16">
          <Card>
            <CardHeader class={`border-b ${panelDivider}`}>
              <CardTitle class="text-2xl">Account</CardTitle>
              <CardDescription>
                Update your profile and password.
              </CardDescription>
            </CardHeader>
            <CardContent class="flex flex-col gap-5">
              <form
                action="/admin/account"
                class="flex flex-col gap-5"
                method="post"
              >
                <label class="flex flex-col gap-2 text-sm font-semibold">
                  Name
                  <Input
                    autocomplete="name"
                    class={cn("h-11", panelField)}
                    name="label"
                    value={label}
                  />
                </label>
                <label class="flex flex-col gap-2 text-sm font-semibold">
                  Username
                  <Input
                    autocomplete="username"
                    class={cn("h-11", panelField)}
                    name="username"
                    required
                    value={username}
                  />
                </label>
                <label class="flex flex-col gap-2 text-sm font-semibold">
                  Email
                  <Input
                    autocomplete="email"
                    class={cn("h-11", panelField)}
                    name="email"
                    required
                    type="email"
                    value={email}
                  />
                </label>
                <label class="flex flex-col gap-2 text-sm font-semibold">
                  Biography
                  <Textarea
                    class={panelField}
                    maxlength={MAX_PROFILE_BIOGRAPHY_LENGTH}
                    name="biography"
                    placeholder="Tell readers about yourself."
                    rows={6}
                  >
                    {biography}
                  </Textarea>
                </label>
                <label class="flex flex-col gap-2 text-sm font-semibold">
                  Current password
                  <Input
                    autocomplete="current-password"
                    class={cn("h-11", panelField)}
                    name="currentPassword"
                    type="password"
                  />
                </label>
                <PasswordFields
                  confirmationLabel="Confirm new password"
                  confirmationName="newPasswordConfirmation"
                  idPrefix="account-new"
                  inputClass={cn("h-11", panelField)}
                  label="New password"
                  labelClass="flex flex-col gap-2 text-sm font-semibold"
                  passwordName="newPassword"
                  required={false}
                  ruleIdPrefix="password-rule"
                />
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
                  Save changes
                </Button>
                <a
                  class={`w-fit text-sm underline ${panelMuted}`}
                  href="/logout"
                >
                  Log out
                </a>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    </Layout>
  );
};
