// ui-foundry specimen page — a living render of the design system (tokens + every library component).
// ui-verify screenshots this route in light/dark across viewports. Hidden in production builds.
import { notFound } from 'next/navigation';
import { tokenList, tokensHash } from '__TOKENS_IMPORT__';
import { specimens } from '__SPECIMENS_IMPORT__';
import { ThemeToggle } from './theme-toggle';
import './design-system.css';

export const metadata = { title: 'Design system' };

type Token = (typeof tokenList)[number];
const by = (group: string) => (tokenList as readonly Token[]).filter((t) => t.group === group);

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production' && !process.env.SHOW_DESIGN_SYSTEM) notFound();
  const colors = by('color');
  const surfaces = colors.filter((c) => !c.name.endsWith('foreground') && colors.some((f) => f.name === `${c.name}-foreground`));
  const others = colors.filter((c) => !c.name.endsWith('foreground') && !surfaces.includes(c));
  return (
    <main className="ufs-page">
      <header className="ufs-header">
        <div>
          <p className="ufs-eyebrow">Design system · tokens {tokensHash}</p>
          <h1 className="ufs-h1">Specimen</h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="ufs-section" aria-labelledby="colors">
        <h2 id="colors" className="ufs-h2">Color roles</h2>
        <div className="ufs-swatches">
          {surfaces.map((c) => (
            <figure key={c.name} className="ufs-swatch" style={{ background: `var(${c.cssVar})`, color: `var(--color-${c.name}-foreground)` }}>
              <span className="ufs-sample">Aa</span>
              <figcaption>
                <strong>{c.name}</strong>
                <code>{c.cssVar}</code>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="ufs-chips">
          {others.map((c) => (
            <div key={c.name} className="ufs-chip">
              <span className="ufs-dot" style={{ background: `var(${c.cssVar})` }} />
              <code>{c.name}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="ufs-section" aria-labelledby="type">
        <h2 id="type" className="ufs-h2">Type scale</h2>
        <div className="ufs-ladder">
          {[...by('text')].reverse().map((t) => (
            <div key={t.name} className="ufs-step">
              <code className="ufs-meta">{t.name} · {t.light}</code>
              <p style={{ fontSize: `var(${t.cssVar})`, lineHeight: `var(${t.cssVar}--line-height, 1.4)`, letterSpacing: `var(${t.cssVar}--letter-spacing, normal)`, fontFamily: ['2xl', '3xl', '4xl', '5xl', '6xl'].includes(t.name) ? 'var(--font-display)' : 'var(--font-sans)' }}>
                Quietly confident interfaces
              </p>
            </div>
          ))}
        </div>
        <div className="ufs-fonts">
          {by('font').map((f) => (
            <p key={f.name} style={{ fontFamily: `var(${f.cssVar})` }}>
              <code className="ufs-meta">{f.name}</code> The quick brown fox jumps over the lazy dog 0123456789
            </p>
          ))}
        </div>
      </section>

      <section className="ufs-section" aria-labelledby="shape">
        <h2 id="shape" className="ufs-h2">Shape &amp; elevation</h2>
        <div className="ufs-shapes">
          {by('radius').map((r) => (
            <div key={r.name} className="ufs-shape" style={{ borderRadius: `var(${r.cssVar})` }}>
              <code>radius-{r.name}</code>
            </div>
          ))}
          {by('shadow').map((s) => (
            <div key={s.name} className="ufs-shape" style={{ boxShadow: `var(${s.cssVar})` }}>
              <code>shadow-{s.name}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="ufs-section" aria-labelledby="components">
        <h2 id="components" className="ufs-h2">Components</h2>
        {specimens.map((s) => (
          <article key={s.name} className="ufs-specimen" aria-labelledby={`spec-${s.name}`}>
            <header className="ufs-specimen-head">
              <h3 id={`spec-${s.name}`} className="ufs-h3">{s.name}</h3>
              {s.description && <p className="ufs-meta">{s.description}</p>}
            </header>
            <div className="ufs-stage">{s.render()}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
