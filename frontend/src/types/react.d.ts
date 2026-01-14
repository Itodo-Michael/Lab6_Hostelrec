declare module "react" {
  export type ReactNode = any;
  export type FC<P = {}> = (props: P & { children?: ReactNode }) => ReactNode;

  export function createElement(type: any, props?: any, ...children: any[]): ReactNode;
  export function useState<T>(initial: T): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export const Fragment: unique symbol;
  export const StrictMode: FC<{ children?: ReactNode }>;

  const React: {
    createElement: typeof createElement;
    Fragment: typeof Fragment;
    StrictMode: typeof StrictMode;
    useState: typeof useState;
    useEffect: typeof useEffect;
  };

  export default React;
}

declare module "react-dom/client" {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: React.ReactNode): void;
  };
}

