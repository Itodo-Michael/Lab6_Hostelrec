declare module "react-router-dom" {
  import * as React from "react";

  export const BrowserRouter: React.FC<{ children?: React.ReactNode }>;
  export const Routes: React.FC<{ children?: React.ReactNode }>;
  export const Route: React.FC<{ path?: string; element?: React.ReactNode }>;
  export const Navigate: React.FC<{ to: string; replace?: boolean; state?: unknown }>;
  export const NavLink: React.FC<{
    to: string;
    end?: boolean;
    className?: string | ((props: { isActive: boolean }) => string);
    children?: React.ReactNode | ((props: { isActive: boolean }) => React.ReactNode);
    key?: React.Key;
  }>;
  export const Outlet: React.FC;
  export const Link: React.FC<{ to: string; className?: string; children?: React.ReactNode }>;
  export const useNavigate: () => (to: string, opts?: { replace?: boolean; state?: unknown }) => void;
  export const useLocation: () => { pathname: string };
  export const useParams: <T extends Record<string, string>>() => T;
}

