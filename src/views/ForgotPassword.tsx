import type { FC } from "hono/jsx";
import { defaultHeaderNav, Header } from "./components/header/Header.js";
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
      <main class="container mx-auto h-full px-4">
        <section class="mx-auto mt-16 max-w-md">
          <h1 class="mb-4 text-3xl font-bold">Reset password</h1>
          {sent
            ? (
              <div class="flex flex-col gap-5">
                <p>
                  If an active account matches that email address, a reset link
                  is on its way.
                </p>
                <a class="font-bold underline" href="/login">Back to log in</a>
              </div>
            )
            : (
              <form
                action="/forgot-password"
                class="flex flex-col gap-5"
                method="post"
              >
                <p>
                  Enter your account email and we’ll send a single-use reset
                  link.
                </p>
                <label class="flex flex-col gap-2 font-bold">
                  Email
                  <input
                    autocomplete="email"
                    autofocus
                    class="rounded-md border-2 border-mist-600 bg-transparent px-4 py-3 outline-none focus:ring-2 focus:ring-mist-600 dark:border-amber-50 dark:focus:ring-amber-50"
                    name="email"
                    required
                    type="email"
                    value={email}
                  />
                </label>
                <button
                  class="cursor-pointer rounded-md bg-mist-600 px-4 py-3 font-bold text-amber-50 dark:bg-amber-50 dark:text-mist-600"
                  type="submit"
                >
                  Send reset link
                </button>
              </form>
            )}
        </section>
      </main>
    </Layout>
  );
};
