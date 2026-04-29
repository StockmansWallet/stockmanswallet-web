import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Stockman's Wallet - Intelligent Livestock Valuation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "radial-gradient(circle at 75% 25%, #2a1d10 0%, #14110f 60%, #0a0807 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#e78822",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: 800,
              color: "#14110f",
            }}
          >
            SW
          </div>
          <span style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Stockman&apos;s Wallet
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: "28px",
              color: "#e78822",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Intelligent Livestock Valuation
          </div>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: "920px",
            }}
          >
            <span style={{ color: "#e78822" }}>Live. Stock. Market.</span>
            <br />
            Paddock to Portfolio Intelligence.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "22px",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          <span>Built for Australian producers</span>
          <span>stockmanswallet.com.au</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
