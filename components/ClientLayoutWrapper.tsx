"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const shouldShowHeader = !pathname.startsWith("/studio");

  return (
    <>
      {shouldShowHeader && <Header />}
      <main>{children}</main>
    </>
  );
}