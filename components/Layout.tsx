import { ReactNode } from "react";

interface NormalLayoutProps {
  children: ReactNode;
}

export default function NormalLayout({ children }: NormalLayoutProps) {
  return <>{children}</>;
}
