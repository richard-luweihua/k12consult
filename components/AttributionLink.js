"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function AttributionLink({ href, className, children }) {
  const searchParams = useSearchParams();
  const nextParams = new URLSearchParams(searchParams.toString());
  const separator = href.includes("?") ? "&" : "?";
  const resolvedHref = nextParams.toString() ? `${href}${separator}${nextParams.toString()}` : href;

  return (
    <Link className={className} href={resolvedHref}>
      {children}
    </Link>
  );
}
