import { compare, hash } from "bcryptjs";

export const BCRYPT_COST = 10;
export const ACCOUNT_PASSWORD_MAX_BYTES = 64;
export const ACCOUNT_PASSWORD_MIN_LENGTH = 9;

const passwordByteLength = (password: string): number =>
  new TextEncoder().encode(password).length;

const exceedsPasswordByteLimit = (password: string): boolean =>
  passwordByteLength(password) > ACCOUNT_PASSWORD_MAX_BYTES;

export const ACCOUNT_PASSWORD_RULES = [
  {
    key: "length",
    label: `At least ${ACCOUNT_PASSWORD_MIN_LENGTH} characters`,
  },
  { key: "letter", label: "At least one letter" },
  { key: "special", label: "At least one special character" },
  { key: "match", label: "Passwords match" },
] as const;

export const validateAccountPassword = (password: string): string | null => {
  if (password.length < ACCOUNT_PASSWORD_MIN_LENGTH) {
    return "Use at least 9 characters.";
  }

  if (!/[A-Za-z]/.test(password)) {
    return "Include at least one letter.";
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "Include at least one special character.";
  }

  if (exceedsPasswordByteLimit(password)) {
    return `Password cannot exceed ${ACCOUNT_PASSWORD_MAX_BYTES} UTF-8 bytes.`;
  }

  return null;
};

export const hashPassword = async (password: string): Promise<string> => {
  if (password.length === 0) {
    throw new RangeError("Password cannot be empty.");
  }

  if (exceedsPasswordByteLimit(password)) {
    throw new RangeError(
      `Password cannot exceed ${ACCOUNT_PASSWORD_MAX_BYTES} UTF-8 bytes.`,
    );
  }

  return hash(password, BCRYPT_COST);
};

export const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  if (password.length === 0 || exceedsPasswordByteLimit(password)) {
    return false;
  }

  return compare(password, passwordHash);
};
