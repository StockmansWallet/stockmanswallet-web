import PageBackground from "@/components/marketing/ui/page-background";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageBackground />
      {children}
    </>
  );
}
