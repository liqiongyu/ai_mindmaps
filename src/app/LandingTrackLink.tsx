"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import type { TelemetryEventName } from "@/lib/telemetry/events";
import { track } from "@/lib/telemetry/client";

export function LandingTrackLink(props: {
  href: string;
  className?: string;
  event: TelemetryEventName;
  eventProps?: Record<string, unknown>;
  children: ReactNode;
}) {
  const { href, className, event, eventProps, children } = props;
  return (
    <Link
      className={className}
      href={href}
      onClick={() => {
        track(event, { href, ...eventProps });
      }}
    >
      {children}
    </Link>
  );
}
