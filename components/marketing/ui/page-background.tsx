import Image from "next/image";

export default function PageBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0">
      <Image src="/images/landing-bg.webp" alt="" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-[#171513]/90" />
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: 0.1,
        }}
      />
    </div>
  );
}
