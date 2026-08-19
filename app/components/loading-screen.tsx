export default function LoadingScreen({ compact = false }: { compact?: boolean }) {
  return (
    <main className={`repere-loader ${compact ? "compact" : ""}`} aria-label="Chargement" aria-busy="true">
      <div className="repere-loader-brand">
        <span className="brand-mark" aria-hidden="true" />
        <strong>repere</strong>
      </div>
      <div className="repere-loader-content" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
