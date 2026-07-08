import { ImageResponse } from "next/og";

// Mutex Systems brand mark — turquoise-to-aqua gradient + "MS".
// Matches public/meta-app-icon.svg and the aqua accent theme.

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2DD4BF 0%, #06B6D4 100%)",
          borderRadius: 6,
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            letterSpacing: -0.5,
            lineHeight: 1,
          }}
        >
          MS
        </span>
      </div>
    ),
    { ...size },
  );
}
