import { compare, hash, truncates } from "bcryptjs";

export const BCRYPT_COST = 10;

export const hashPassword = async (password: string): Promise<string> => {
  if (password.length === 0) {
    throw new RangeError("Password cannot be empty.");
  }

  if (truncates(password)) {
    throw new RangeError("Password cannot exceed 72 UTF-8 bytes.");
  }

  return hash(password, BCRYPT_COST);
};

export const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  if (password.length === 0 || truncates(password)) {
    return false;
  }

  return compare(password, passwordHash);
};
