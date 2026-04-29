import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14110f",
          borderRadius: "40px",
        }}
      >
        <div
          style={{
            width: "140px",
            height: "140px",
            borderRadius: "32px",
            background: "#e78822",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "64px",
            fontWeight: 800,
            color: "#14110f",
            fontFamily: "system-ui, -apple-system, sans-serif",
            letterSpacing: "-0.04em",
          }}
        >
          SW
        </div>
      </div>
    ),
    { ...size },
  );
}
