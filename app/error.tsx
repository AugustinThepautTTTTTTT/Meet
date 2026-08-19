"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="matter-shell"><div className="matter-error">
    <h1>Une erreur est survenue</h1>
    <p>Vos informations n’ont pas été perdues. Vous pouvez réessayer.</p>
    <button className="primary-button compact" onClick={reset}>Réessayer</button>
  </div></main>;
}
