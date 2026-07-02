import { ImageResponse } from "next/og";

export const alt = "Rook & Roll — Play Chess";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0e1117",
          backgroundImage: "radial-gradient(1000px 500px at 60% -10%, #2a2410, #0e1117)",
          color: "#e8ecf3",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 44 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 92,
              height: 92,
              borderRadius: 24,
              marginRight: 26,
              background: "linear-gradient(150deg, #f4b451, #c07d1f)",
              color: "#241a08",
              fontSize: 58,
              fontWeight: 800,
            }}
          >
            R
          </div>
          <div style={{ display: "flex", fontSize: 50, fontWeight: 800, color: "#e9a23b" }}>
            Rook & Roll
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 82, fontWeight: 800, letterSpacing: "-2px" }}>
          Chess, without the clutter.
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#9aa6b8", marginTop: 34 }}>
          Play online · Stockfish bots · Puzzles · Original board
        </div>
      </div>
    ),
    { ...size },
  );
}
