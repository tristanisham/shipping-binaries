import type { FC } from "hono/jsx";
import {
  ACCOUNT_PASSWORD_MIN_LENGTH,
  ACCOUNT_PASSWORD_RULES,
  BCRYPT_MAX_BYTES,
} from "../../../auth/password.js";
import { Input } from "../ui/Input.js";

type PasswordFieldsProps = {
  confirmationLabel?: string;
  confirmationName: string;
  idPrefix: string;
  inputClass?: string;
  label?: string;
  labelClass?: string;
  passwordName: string;
  required?: boolean;
  ruleIdPrefix?: string;
};

export const PasswordFields: FC<PasswordFieldsProps> = ({
  confirmationLabel = "Confirm password",
  confirmationName,
  idPrefix,
  inputClass,
  label = "Password",
  labelClass = "flex flex-col gap-2 font-bold",
  passwordName,
  required = true,
  ruleIdPrefix = `${idPrefix}-password-rule`,
}) => {
  const passwordId = `${idPrefix}-password`;
  const confirmationId = `${idPrefix}-password-confirmation`;
  const rulesId = `${idPrefix}-password-rules`;
  const passwordGuidanceScript = `
(function () {
  var password = document.getElementById(${JSON.stringify(passwordId)});
  var confirmation = document.getElementById(${JSON.stringify(confirmationId)});
  var rules = document.getElementById(${JSON.stringify(rulesId)});
  if (!password || !confirmation || !rules) return;

  function setRule(element, valid) {
    element.classList.toggle("font-bold", valid);
    element.classList.toggle("opacity-60", !valid);
    element.firstElementChild.textContent = valid ? "✓" : "○";
  }

  function updateGuidance() {
    var value = password.value;
    var optionalAndEmpty = ${required ? "false" : "true"} &&
      value.length === 0 && confirmation.value.length === 0;
    var validity = {
      length: value.length >= ${ACCOUNT_PASSWORD_MIN_LENGTH},
      letter: /[A-Za-z]/.test(value),
      special: /[^A-Za-z0-9\\s]/.test(value),
      bytes: new TextEncoder().encode(value).length <= ${BCRYPT_MAX_BYTES},
      match: confirmation.value.length > 0 && value === confirmation.value
    };
    rules.querySelectorAll("[data-password-rule]").forEach(function (rule) {
      setRule(rule, validity[rule.dataset.passwordRule]);
    });

    password.setCustomValidity(
      optionalAndEmpty ||
        (validity.length && validity.letter && validity.special && validity.bytes)
        ? ""
        : "Password does not meet the requirements."
    );
    confirmation.setCustomValidity(
      optionalAndEmpty || validity.match ? "" : "Passwords must match."
    );
  }

  password.addEventListener("input", updateGuidance);
  confirmation.addEventListener("input", updateGuidance);
  updateGuidance();
})();
`;

  return (
    <>
      <label class={labelClass}>
        {label}
        <Input
          aria-describedby={rulesId}
          autocomplete="new-password"
          class={inputClass}
          id={passwordId}
          minlength={ACCOUNT_PASSWORD_MIN_LENGTH}
          name={passwordName}
          required={required}
          type="password"
        />
      </label>
      <ul
        aria-live="polite"
        class="-mt-3 grid gap-1 text-xs"
        id={rulesId}
      >
        {ACCOUNT_PASSWORD_RULES.map((rule) => (
          <li
            class="opacity-60"
            data-password-rule={rule.key}
            id={`${ruleIdPrefix}-${rule.key}`}
          >
            <span aria-hidden="true">○</span> {rule.label}
          </li>
        ))}
      </ul>
      <label class={labelClass}>
        {confirmationLabel}
        <Input
          autocomplete="new-password"
          class={inputClass}
          id={confirmationId}
          minlength={ACCOUNT_PASSWORD_MIN_LENGTH}
          name={confirmationName}
          required={required}
          type="password"
        />
      </label>
      <script dangerouslySetInnerHTML={{ __html: passwordGuidanceScript }} />
    </>
  );
};
