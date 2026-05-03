import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "#16a34a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3C7 3 3 7 3 12c0 3.5 2 6.5 5 8l1-4c-1.5-1-2.5-2.5-2.5-4 0-3 2.5-5.5 5.5-5.5S17.5 9 17.5 12c0 1.5-0.7 2.9-1.8 3.8L17 20c3.5-1.8 5.5-5.2 5.5-8.5C22.5 6.5 18 3 12 3z"
            fill="white"
          />
          <line x1="12" y1="20" x2="12" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    ),
    { ...size }
  );
}
