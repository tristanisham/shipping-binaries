import type { FC } from "hono/jsx";
import { defaultHeaderNav, Header } from "./components/header/Header.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type SetPasswordProps = {
  error?: string;
  mode: "invite" | "reset";
  token: string;
  valid: boolean;
};

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

  return (
    <Layout meta={meta}>
      <Header nav={defaultHeaderNav} />
      <main class="container mx-auto h-full px-4">
        <section class="mx-auto mt-16 max-w-md">
          <h1 class="mb-4 text-3xl font-bold">{title}</h1>
          {!valid
            ? (
              <div class="flex flex-col gap-5">
                <p role="alert">
                  This link is invalid, expired, or has already been used.
                </p>
                <a
                  class="font-bold underline"
                  href={invite ? "/login" : "/forgot-password"}
                >
                  {invite ? "Go to log in" : "Request another reset link"}
                </a>
              </div>
            )
            : (
              <form
                action={invite ? "/invite" : "/reset-password"}
                class="flex flex-col gap-5"
                method="post"
              >
                <p>
                  {invite
                    ? "Set a password to activate your account."
                    : "Set a new password for your account."}
                  {" "}Use at least 12 characters.
                </p>
                <input name="token" type="hidden" value={token} />
                <label class="flex flex-col gap-2 font-bold">
                  New password
                  <input
                    autocomplete="new-password"
                    autofocus
                    class="rounded-md border-2 border-mist-600 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-mist-600 dark:border-amber-50 dark:focus:ring-amber-50"
                    minlength={12}
                    name="password"
                    required
                    type="password"
                  />
                </label>
                <label class="flex flex-col gap-2 font-bold">
                  Confirm password
                  <input
                    autocomplete="new-password"
                    class="rounded-md border-2 border-mist-600 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-mist-600 dark:border-amber-50 dark:focus:ring-amber-50"
                    minlength={12}
                    name="passwordConfirmation"
                    required
                    type="password"
                  />
                </label>
                {error && (
                  <p class="font-bold text-burgundy-500" role="alert">
                    {error}
                  </p>
                )}
                <button
                  class="cursor-pointer rounded-md bg-mist-600 px-4 py-3 font-bold text-amber-50 dark:bg-amber-50 dark:text-mist-600"
                  type="submit"
                >
                  {invite ? "Activate account" : "Update password"}
                </button>
              </form>
            )}
        </section>
      </main>
    </Layout>
  );
};
