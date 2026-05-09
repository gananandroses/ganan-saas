// Branded link preview — what shows up when /landing is shared on WhatsApp,
// Facebook, Telegram, etc. Standard OpenGraph dimensions.
//
// IMPORTANT: next/og is strict — every <div> with children must declare
// display: flex (or display: none). This is enforced at build time, so a
// missing one fails the whole Vercel deploy. Hence the explicit
// `display: "flex"` on every container below.

import { ImageResponse } from "next/og";

export const alt = "גנן Pro — תפסיק לנהל לקוחות. תתחיל לנהל עסק.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: 1200,
          height: 630,
          background: "linear-gradient(135deg, #16a34a 0%, #047857 100%)",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          padding: 80,
        }}
      >
        {/* Logo + brand row */}
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
              display: "flex",
              width: 130,
              height: 130,
              borderRadius: 32,
              background: "white",
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
            display: "flex",
            fontSize: 68,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: -1,
            maxWidth: 1000,
          }}
        >
          תפסיק לנהל לקוחות. תתחיל לנהל עסק.
        </div>

        {/* Sub-bullets */}
        <div
          style={{
            display: "flex",
            fontSize: 26,
            opacity: 0.9,
            marginTop: 32,
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
