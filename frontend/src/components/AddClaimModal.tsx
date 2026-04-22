import React, { useState } from 'react';
import { createClaim } from '../api';
import type { EpistemicStatus, ClaimType } from '../types';
import { Button, Input, Select } from './ui';

interface Props {
  sourceId: string;
  onClose: () => void;
  onCreated: () => void;
}

const EPISTEMIC_OPTIONS = [
  { value: 'asserted', label: 'Asserted' },
  { value: 'observed', label: 'Observed' },
  { value: 'inferred', label: 'Inferred' },
  { value: 'speculative', label: 'Speculative' },
  { value: 'contested', label: 'Contested' },
  { value: 'retracted', label: 'Retracted' },
];

const TYPE_OPTIONS = [
  { value: 'phenomenological', label: 'Phenomenological' },
  { value: 'causal', label: 'Causal' },
  { value: 'correlational', label: 'Correlational' },
  { value: 'definitional', label: 'Definitional' },
  { value: 'methodological', label: 'Methodological' },
];

export function AddClaimModal({ sourceId, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    claim_text: '',
    claim_type: 'phenomenological' as ClaimType,
    epistemic_status: 'asserted' as EpistemicStatus,
    verbatim: false,
    page_ref: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.claim_text.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createClaim({
        source_id: sourceId,
        claim_text: form.claim_text.trim(),
        claim_type: form.claim_type,
        epistemic_status: form.epistemic_status,
        verbatim: form.verbatim,
        page_ref: form.page_ref || undefined,
      });
      onCreated();
    } catch {
      setError('Failed to create claim');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border-mid)',
        borderRadius: 4,
        width: 520,
        maxHeight: '85vh',
        overflow: 'auto',
        padding: 'var(--space-5)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 'var(--space-5)',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--text-dim)',
          }}>
            Add Claim
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
            }}>
              Claim text *
            </span>
            <textarea
              value={form.claim_text}
              onChange={e => set('claim_text', e.target.value)}
              rows={4}
              autoFocus
              required
              style={{
                background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '6px 10px',
                fontSize: 13, outline: 'none', resize: 'vertical',
                fontFamily: form.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
              }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Select
              label="Claim type"
              options={TYPE_OPTIONS}
              value={form.claim_type}
              onChange={e => set('claim_type', e.target.value)}
            />
            <Select
              label="Epistemic status"
              options={EPISTEMIC_OPTIONS}
              value={form.epistemic_status}
              onChange={e => set('epistemic_status', e.target.value)}
            />
          </div>

          <Input
            label="Page ref"
            value={form.page_ref}
            onChange={e => set('page_ref', e.target.value)}
            placeholder="42"
          />

          <label style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={form.verbatim}
              onChange={e => set('verbatim', e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-secondary)', letterSpacing: '0.04em',
            }}>
              verbatim quote
            </span>
          </label>

          {error && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--status-error)' }}>
              ✗ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="ghost" onClick={onClose}>cancel</Button>
            <Button type="submit" variant="primary" disabled={loading || !form.claim_text.trim()}>
              {loading ? 'saving…' : 'add claim'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
