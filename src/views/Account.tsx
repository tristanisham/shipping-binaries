import type { FC } from "hono/jsx";
import { MAX_PROFILE_BIOGRAPHY_LENGTH } from "../models/profile.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { PasswordFields } from "./components/auth/PasswordFields.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Button } from "./components/ui/Button.js";
import { Input } from "./components/ui/Input.js";
import { Textarea } from "./components/ui/Textarea.js";
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
      <main class="container mx-auto h-full w-full px-4 sm:w-2/3 lg:w-2/5">
        <section class="mx-auto mt-16 max-w-md">
          <h1 class="mb-6 text-3xl font-bold">Account</h1>
          <form
            action="/admin/account"
            class="flex flex-col gap-5"
            method="post"
          >
            <label class="flex flex-col gap-2 font-bold">
              Name
              <Input
                autocomplete="name"
                name="label"
                value={label}
              />
            </label>
            <label class="flex flex-col gap-2 font-bold">
              Username
              <Input
                autocomplete="username"
                name="username"
                required
                value={username}
              />
            </label>
            <label class="flex flex-col gap-2 font-bold">
              Email
              <Input
                autocomplete="email"
                name="email"
                required
                type="email"
                value={email}
              />
            </label>
            <label class="flex flex-col gap-2 font-bold">
              Biography
              <Textarea
                maxlength={MAX_PROFILE_BIOGRAPHY_LENGTH}
                name="biography"
                placeholder="Tell readers about yourself."
                rows={6}
              >
                {biography}
              </Textarea>
            </label>
            <label class="flex flex-col gap-2 font-bold">
              Current password
              <Input
                autocomplete="current-password"
                name="currentPassword"
                required
                type="password"
              />
            </label>
            <PasswordFields
              confirmationLabel="Confirm new password"
              confirmationName="newPasswordConfirmation"
              idPrefix="account-new"
              label="New password"
              passwordName="newPassword"
              ruleIdPrefix="password-rule"
            />
            {error && (
              <p
                class="font-bold text-burgundy-700 dark:text-burgundy-300"
                role="alert"
              >
                {error}
              </p>
            )}
            <div class="flex items-center gap-3">
              <Button type="submit" variant="tertiary">Save changes</Button>
              <a class="font-bold underline" href="/logout">Log out</a>
            </div>
          </form>
        </section>
      </main>
    </Layout>
  );
};
