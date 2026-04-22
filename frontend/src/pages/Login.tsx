import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';
import { Button, Input } from '../components/ui';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const token = await login(username, password);
      localStorage.setItem('token', token.access_token);
      navigate('/sources');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-1)',
    }}>
      <div style={{
        width: 360,
        background: 'var(--bg-0)',
        border: '1px solid var(--border-dim)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-7)',
        boxShadow: '0 4px 24px rgba(31,35,40,0.08)',
      }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              AAE Research
            </span>
            <span style={{
              fontSize: 10, fontWeight: 500, color: 'var(--text-dim)',
              background: 'var(--bg-1)', border: '1px solid var(--border-dim)',
              borderRadius: 20, padding: '1px 6px',
            }}>
              KMS
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Sign in to your research workspace
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
  );
}
