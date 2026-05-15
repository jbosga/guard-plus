import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { login, getStats, type CorpusStats } from '../api';
import { Button, Input } from '../components/ui';

function StatPill({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'var(--space-3) var(--space-4)',
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 'var(--radius-md)',
      minWidth: 80,
    }}>
      <span style={{
        fontSize: 24, fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        color: '#fff', lineHeight: 1,
      }}>
        {value ?? '—'}
      </span>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 4, textAlign: 'center' }}>
        {label}
      </span>
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    staleTime: 300_000,
    retry: false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await login(username, password);
      localStorage.setItem('token', token.access_token);
      localStorage.setItem('username', username);
      navigate('/');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 420px',
    }}>
      {/* Left panel */}
      <div style={{
        background: '#1f2328',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center',
        padding: 'var(--space-7) 72px',
        gap: 'var(--space-6)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>GUARD</span>
            <span style={{
              fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 20, padding: '2px 8px',
            }}>Global UFO Abduction Research Database</span>
          </div>
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.8, maxWidth: 480,
          }}>
            A structured research database for rigorous scientific study of the alien abduction experience.
            First-person accounts are treated as primary empirical data. Anomalies are signals, not noise.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <StatPill label="sources"      value={stats?.sources}      />
          <StatPill label="cases"        value={stats?.cases}        />
          <StatPill label="observations" value={stats?.observations} />
          <StatPill label="hypotheses"   value={stats?.hypotheses}   />
        </div>

        <div style={{
          fontSize: 11, fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.25)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: 'var(--space-4)',
          lineHeight: 1.8,
        }}>
          <div>Critical, but open-minded</div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        background: 'var(--bg-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderLeft: '1px solid var(--border-dim)',
      }}>
        <div style={{
          width: 320,
          background: 'var(--bg-0)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-7)',
          boxShadow: '0 4px 24px rgba(31,35,40,0.08)',
        }}>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Sign in
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Research workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Username or email"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && (
              <div style={{
                fontSize: 12, color: 'var(--status-error)',
                background: 'var(--status-error-bg)',
                border: '1px solid var(--status-error)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
              }}>
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading || !username || !password}
              style={{ justifyContent: 'center', marginTop: 'var(--space-1)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
