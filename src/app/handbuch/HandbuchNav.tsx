import { Fragment } from 'react';
import { NavLink } from 'react-router-dom';
import { childPagesOf, handbuchPages, type HandbuchPage } from './registry';
import { handbuchHref } from './blocks';

function NavNode({ page }: { page: HandbuchPage }) {
  const children = childPagesOf(page.key);
  return (
    <li>
      <NavLink to={handbuchHref(page.key)} end className={({ isActive }) => (isActive ? 'active' : '')}>
        {page.title}
      </NavLink>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <NavNode key={child.key} page={child} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Eigene, feste Navigation für Handbuch-Seiten – ersetzt die normale App-Sidebar unter /handbuch. */
export function HandbuchNav() {
  const main = handbuchPages.find((p) => p.parent === null);
  const topLevel = childPagesOf(main?.key ?? '');
  return (
    <nav className="handbuch-nav" aria-label="Handbuch">
      <NavLink to="/handbuch" end className={({ isActive }) => `handbuch-nav-home${isActive ? ' active' : ''}`}>
        {main?.title ?? 'Handbuch'}
      </NavLink>
      {topLevel.length > 0 && (
        <ul>
          {topLevel.map((page, i) => (
            <Fragment key={page.key}>
              {page.section && page.section !== topLevel[i - 1]?.section && <li className="handbuch-nav-section">{page.section}</li>}
              <NavNode page={page} />
            </Fragment>
          ))}
        </ul>
      )}
    </nav>
  );
}
