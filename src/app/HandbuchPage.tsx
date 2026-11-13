import { useEffect } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ancestorsOf, getHandbuchPage, neighboursOf, pageIds } from './handbuch/registry';
import { handbuchHref } from './handbuch/blocks';
import { HandbuchNav } from './handbuch/HandbuchNav';
import { HandbuchContent } from './handbuch/HandbuchContent';
import { createNote } from './actions';
import { Icon } from '@/ui/Icon';

/**
 * `/handbuch` und `/handbuch/:key`: statische, schreibgeschützte Hilfeseiten – bewusst keine echten
 * Notizen (siehe `handbuch/registry.ts`). „Als eigene Notiz öffnen“ legt bei Bedarf eine echte,
 * editierbare Kopie in der Notizliste des Nutzers an.
 */
export function HandbuchPage() {
  const { key = 'main' } = useParams<{ key: string }>();
  const page = getHandbuchPage(key);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = page ? `${page.title} – Mitschrift` : 'Handbuch – Mitschrift';
  }, [page]);

  if (!page) return <Navigate to="/handbuch" replace />;

  const crumbs = ancestorsOf(page.key);
  const { prev, next } = neighboursOf(page.key);
  const hrefOf = (key: string, parent: string | null) => (parent === null ? '/handbuch' : handbuchHref(key));

  async function openAsOwnNote() {
    if (!page) return;
    const note = await createNote({ title: page.title, content: JSON.stringify(page.doc(pageIds)) });
    navigate(`/n/${note.id}`);
  }

  return (
    <div className="handbuch-screen">
      <HandbuchNav />
      <div className="handbuch-main">
        <header className="handbuch-bar">
          {crumbs.length > 0 && (
            <nav className="note-crumbs" aria-label="Pfad">
              {crumbs.map((c) => (
                <span key={c.key} className="note-crumb">
                  <Link to={handbuchHref(c.key)}>{c.title}</Link>
                  <Icon name="chevron" />
                </span>
              ))}
            </nav>
          )}
          <button type="button" className="b-btn" onClick={openAsOwnNote}>
            Als eigene Notiz öffnen
          </button>
        </header>
        <main className="handbuch-page">
          <h1 className="note-title handbuch-title">{page.title}</h1>
          <HandbuchContent key={page.key} doc={page.doc(pageIds)} />
          {(prev || next) && (
            <nav className="handbuch-pager" aria-label="Weiterblättern">
              {prev ? (
                <Link className="handbuch-pager-link is-prev" to={hrefOf(prev.key, prev.parent)}>
                  <small>Zurück</small>
                  {prev.title}
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link className="handbuch-pager-link is-next" to={hrefOf(next.key, next.parent)}>
                  <small>Weiter</small>
                  {next.title}
                </Link>
              )}
            </nav>
          )}
        </main>
      </div>
    </div>
  );
}
