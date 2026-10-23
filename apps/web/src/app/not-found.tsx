import Link from "next/link";

export default function NotFound() {
  return (
    <div className="layout no-right">
      <nav className="side" aria-hidden="true" />
      <main className="main" id="contenu">
        <div className="card empty">
          <h3>Page introuvable</h3>
          <p>Cette page n&apos;existe pas ou a été supprimée.</p>
          <Link className="btn btn-primary" href="/">
            Retour à l&apos;accueil
          </Link>
        </div>
      </main>
    </div>
  );
}
