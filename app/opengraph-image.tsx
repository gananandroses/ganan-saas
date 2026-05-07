// Branded link preview — what shows up when /landing is shared on WhatsApp,
// Facebook, Telegram, etc. Standard OpenGraph dimensions.

import { ImageResponse } from "next/og";

export const alt = "גנן Pro — תפסיק לנהל לקוחות. תתחיל לנהל עסק.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #16a34a 0%, #047857 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          padding: 80,
          position: "relative",
        }}
      >
        {/* Soft decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -150,
            right: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            left: -120,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: 32,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
            }}
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>גנן Pro</div>
            <div style={{ fontSize: 30, opacity: 0.85, marginTop: 8 }}>ניהול עסק גינון</div>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: -1,
            maxWidth: 1000,
          }}
        >
          תפסיק לנהל לקוחות.
          <br />
          תתחיל לנהל עסק.
        </div>

        {/* Sub */}
        <div
          style={{
            fontSize: 26,
            opacity: 0.9,
            marginTop: 32,
            textAlign: "center",
            display: "flex",
            gap: 24,
          }}
        >
          <span>📅 לוח זמנים</span>
          <span>•</span>
          <span>💰 פיננסים</span>
          <span>•</span>
          <span>📲 הצעות מחיר ב-WhatsApp</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
