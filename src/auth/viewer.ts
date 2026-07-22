import { getSessionUser } from "../models/session.js";
import { ADMIN_ROLE } from "../models/role.js";

export type ViewerProps = {
  isAdmin?: boolean;
  isAuthenticated?: boolean;
};

export type ViewerState = Required<ViewerProps>;

export const hasAdminRole = (roles: readonly string[]): boolean =>
  roles.includes(ADMIN_ROLE);

export const getSignedInPath = (roles: readonly string[]): string =>
  hasAdminRole(roles) ? "/admin" : "/admin/account";

export const getViewerState = async (
  db: D1Database,
  token: string | undefined,
): Promise<ViewerState> => {
  const user = token ? await getSessionUser(db, token) : null;

  return {
    isAdmin: user ? hasAdminRole(user.roles) : false,
    isAuthenticated: Boolean(user),
  };
};
