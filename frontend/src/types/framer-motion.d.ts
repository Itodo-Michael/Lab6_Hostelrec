declare module "framer-motion" {
  import * as React from "react";

  export interface MotionProps extends React.HTMLAttributes<HTMLElement> {
    className?: string;
    initial?: any;
    animate?: any;
    transition?: any;
    whileHover?: any;
    whileTap?: any;
  }

  export const motion: {
    div: React.FC<MotionProps>;
    span: React.FC<MotionProps>;
    section: React.FC<MotionProps>;
  };
}


