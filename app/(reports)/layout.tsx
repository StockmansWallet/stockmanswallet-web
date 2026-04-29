import type { Metadata } from "next";
import { ForceLightTheme } from "./_force-light-theme";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ForceLightTheme />
      <div className="report-root bg-white text-black">{children}</div>
    </>
  );
}
