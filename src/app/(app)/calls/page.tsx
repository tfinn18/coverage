import type { Metadata } from "next";
import { CallsView } from "@/components/calls/CallsView";

export const metadata: Metadata = { title: "Call Schedule" };

export default function CallsPage() {
  return <CallsView />;
}
