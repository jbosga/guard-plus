import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/sources',    label: 'Sources',       icon: '📄' },
  { path: '/claims',     label: 'Claims',        icon: '🔖' },
  { path: '/review',     label: 'Review Queue',  icon: '✅' },
  { path: '/hypotheses', label: 'Hypotheses',    icon: '🔬' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gridTemplateRows: '52px 1fr',
      gridTemplateAreas: '"header header" "sidebar main"',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        gridArea: 'header',
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border-dim)',
        background: 'var(--bg-0)',
        padding: '0 var(--space-5)',
        gap: 'var(--space-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 15, fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            AAE Research
          </span>
          <span style={{
            fontSize: 11, fontWeight: 500,
            color: 'var(--text-dim)',
            background: 'var(--bg-1)',
            border: '1px solid var(--border-dim)',
            borderRadius: 20,
            padding: '1px 7px',
          }}>
            KMS
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
            style={{
              background: 'none', border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              padding: '3px 10px',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside style={{
        gridArea: 'sidebar',
        borderRight: '1px solid var(--border-dim)',
        background: 'var(--bg-0)',
        display: 'flex', flexDirection: 'column',
        padding: 'var(--space-3) 0',
        overflowY: 'auto',
      }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 var(--space-2)' }}>
          {NAV_ITEMS.map(item => {
            const active = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-md)',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  textDecoration: 'none',
                  background: active ? 'var(--bg-1)' : 'transparent',
                  fontWeight: active ? 500 : 400,
                  fontSize: 13,
                  transition: 'var(--t-fast)',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
                {item.label}
                {active && (
                  <span style={{
                    marginLeft: 'auto',
                    width: 4, height: 4,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    flexShrink: 0,
                  }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom note */}
        <div style={{
          marginTop: 'auto',
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--border-dim)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Neither credulous nor dismissive.
            Anomalies are signals.
          </p>
        </div>
      </aside>

      {/* Main */}
      <main style={{
        gridArea: 'main',
        overflowY: 'auto',
        background: 'var(--bg-1)',
      }}>
        {children}
      </main>
    </div>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────────────────

interface PageProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function Page({ title, subtitle, actions, children }: PageProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: 'var(--space-4) var(--space-6)',
        borderBottom: '1px solid var(--border-dim)',
        background: 'var(--bg-0)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: 'var(--space-2)' }}>{actions}</div>}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-5) var(--space-6)' }}>
        {children}
      </div>
    </div>
  );
}
