import { ImageResponse } from "next/og";

export const alt = "Repere — Trouvez le bon avocat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "70px 78px", background: "#f7f8fa", color: "#172033", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 58, height: 58, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", background: "#172033", position: "relative" }}>
          <div style={{ width: 27, height: 27, borderLeft: "5px solid white", borderBottom: "5px solid white", borderBottomLeftRadius: 12 }} />
          <div style={{ position: "absolute", width: 15, height: 16, right: 13, top: 12, borderTop: "5px solid #6d8bf0", borderRight: "5px solid #6d8bf0", borderTopRightRadius: 9 }} />
        </div>
        <span style={{ fontSize: 42, fontWeight: 700, letterSpacing: "-1.5px" }}>repere</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 920, gap: 24 }}>
        <span style={{ color: "#3157d5", fontSize: 22, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" }}>Mise en relation juridique</span>
        <div style={{ fontSize: 76, lineHeight: 1.05, fontWeight: 700, letterSpacing: "-4px" }}>Comprenez votre situation. Trouvez le bon avocat.</div>
        <div style={{ fontSize: 28, lineHeight: 1.4, color: "#596275" }}>Une orientation claire, fondée sur votre dossier.</div>
      </div>
    </div>,
    size,
  );
}
