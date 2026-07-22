import type { FC } from "hono/jsx";
import {
  ACCOUNT_PASSWORD_MIN_LENGTH,
  ACCOUNT_PASSWORD_RULES,
  BCRYPT_MAX_BYTES,
} from "../auth/password.js";
import {
  defaultHeaderNav,
  setCurrentNavItem,
} from "./components/header/Header.js";
import { HeaderSlim } from "./components/header/Slim.js";
import { Button } from "./components/ui/Button.js";
import { Input } from "./components/ui/Input.js";
import { Layout, type LayoutMeta } from "./layouts/MainLayout.js";

type AccountProps = {
  email: string;
  error?: string;
  isAdmin?: boolean;
  username: string;
};

const passwordGuidanceScript = `
(function () {
  var password = document.getElementById("account-new-password");
  var confirmation = document.getElementById("account-password-confirmation");
  if (!password || !confirmation) return;

  function setRule(element, valid) {
    element.classList.toggle("font-bold", valid);
    element.classList.toggle("opacity-60", !valid);
    element.firstElementChild.textContent = valid ? "✓" : "○";
  }

  function updateGuidance() {
    var value = password.value;
    var validity = {
      length: value.length >= ${ACCOUNT_PASSWORD_MIN_LENGTH},
      letter: /[A-Za-z]/.test(value),
      special: /[^A-Za-z0-9\\s]/.test(value),
      bytes: new TextEncoder().encode(value).length <= ${BCRYPT_MAX_BYTES},
      match: confirmation.value.length > 0 && value === confirmation.value
    };
    document.querySelectorAll("[data-password-rule]").forEach(function (rule) {
      setRule(rule, validity[rule.dataset.passwordRule]);
    });

    password.setCustomValidity(
      validity.length && validity.letter && validity.special && validity.bytes
        ? ""
        : "Password does not meet the requirements."
    );
    confirmation.setCustomValidity(
      validity.match ? "" : "Passwords must match."
    );
  }

  password.addEventListener("input", updateGuidance);
  confirmation.addEventListener("input", updateGuidance);
  updateGuidance();
})();
`;

export const Account: FC<AccountProps> = ({
  email,
  error,
  isAdmin = false,
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
              Current password
              <Input
                autocomplete="current-password"
                name="currentPassword"
                required
                type="password"
              />
            </label>
            <label class="flex flex-col gap-2 font-bold">
              New password
              <Input
                aria-describedby="account-password-rules"
                autocomplete="new-password"
                id="account-new-password"
                minlength={ACCOUNT_PASSWORD_MIN_LENGTH}
                name="newPassword"
                required
                type="password"
              />
            </label>
            <ul
              aria-live="polite"
              class="-mt-3 grid gap-1 text-xs"
              id="account-password-rules"
            >
              {ACCOUNT_PASSWORD_RULES.map((rule) => (
                <li
                  class="opacity-60"
                  data-password-rule={rule.key}
                  id={`password-rule-${rule.key}`}
                >
                  <span aria-hidden="true">○</span> {rule.label}
                </li>
              ))}
            </ul>
            <label class="flex flex-col gap-2 font-bold">
              Confirm new password
              <Input
                autocomplete="new-password"
                id="account-password-confirmation"
                minlength={ACCOUNT_PASSWORD_MIN_LENGTH}
                name="newPasswordConfirmation"
                required
                type="password"
              />
            </label>
            {error && (
              <p class="font-bold text-burgundy-500" role="alert">
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
      <script dangerouslySetInnerHTML={{ __html: passwordGuidanceScript }} />
    </Layout>
  );
};
