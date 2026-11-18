'use client';

import * as React from 'react';
import './design-system.css';

/** Minimal light/dark switch for the specimen page. Apps usually use next-themes (attribute="class"). */
export function ThemeToggle() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains('dark'));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => mo.disconnect();
  }, []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    setDark(next);
  };
  return (
    <button type="button" className="ufs-toggle" onClick={toggle} aria-pressed={dark}>
      {dark ? 'Dark' : 'Light'} theme
    </button>
  );
}
