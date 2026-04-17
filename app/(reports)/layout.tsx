import { ForceLightTheme } from "./_force-light-theme";

export const dynamic = "force-dynamic";

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
