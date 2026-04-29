import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createFramework } from '../api';
import type { HypothesisFramework, FrameworkStatus, ConfidenceLevel } from '../types';
import { Button, Input, Select } from './ui';

interface Props {
  onClose: () => void;
}

const FRAMEWORK_OPTIONS = [
  { value: 'neurological',        label: 'Neurological' },
  { value: 'psychological',       label: 'Psychological' },
  { value: 'sociocultural',       label: 'Sociocultural' },
  { value: 'physical',            label: 'Physical' },
  { value: 'interdimensional',    label: 'Interdimensional' },
  { value: 'information_theoretic', label: 'Information-theoretic' },
  { value: 'psychospiritual',     label: 'Psychospiritual' },
  { value: 'unknown',             label: 'Unknown' },
];

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'dormant',   label: 'Dormant' },
  { value: 'abandoned', label: 'Abandoned' },
  { value: 'merged',    label: 'Merged' },
  { value: 'refuted',   label: 'Refuted' },
];

const CONFIDENCE_OPTIONS = [
  { value: 'speculative', label: 'Speculative' },
  { value: 'plausible',   label: 'Plausible' },
  { value: 'supported',   label: 'Supported' },
  { value: 'contested',   label: 'Contested' },
];

const ONTOLOGY_OPTIONS = [
  'physicalism', 'dualism', 'panpsychism', 'idealism', 'unknown', 'novel',
];

export function AddFrameworkModal({ onClose }: Props) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    label: '',
    framework_type: 'unknown' as HypothesisFramework,
    status: 'active' as FrameworkStatus,
    confidence_level: 'speculative' as ConfidenceLevel,
    description: '',
    notes: '',
  });
  const [selectedOntologies, setSelectedOntologies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function toggleOntology(o: string) {
    setSelectedOntologies(prev =>
      prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) return;
    setLoading(true);
    setError('');
    try {
      const fw = await createFramework({
        label:            form.label.trim(),
        framework_type:   form.framework_type,
        status:           form.status,
        confidence_level: form.confidence_level,
        description:      form.description.trim() || undefined,
        notes:            form.notes.trim() || undefined,
        assumed_ontologies: selectedOntologies.length ? selectedOntologies : undefined,
      });
      onClose();
      navigate(`/frameworks/${fw.id}`);
    } catch {
      setError('Failed to create framework');
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
        width: 560,
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
            New Framework
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}
          >×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Label *"
            value={form.label}
            onChange={e => set('label', e.target.value)}
            required
            autoFocus
            placeholder="e.g. Neurological sleep disorder framework"
          />

          <Select
            label="Framework type *"
            options={FRAMEWORK_OPTIONS}
            value={form.framework_type}
            onChange={e => set('framework_type', e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Select
              label="Status"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={e => set('status', e.target.value)}
            />
            <Select
              label="Confidence"
              options={CONFIDENCE_OPTIONS}
              value={form.confidence_level}
              onChange={e => set('confidence_level', e.target.value)}
            />
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
            }}>Description</span>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="What explanatory approach does this framework take?"
              style={{
                background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                padding: '6px 10px', fontSize: 13, outline: 'none', resize: 'vertical',
              }}
            />
          </label>

          <div>
            <span style={{
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
              display: 'block', marginBottom: 8,
            }}>Assumed ontologies</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ONTOLOGY_OPTIONS.map(o => {
                const active = selectedOntologies.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => toggleOntology(o)}
                    style={{
                      background: active ? 'var(--accent)' : 'var(--bg-0)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-dim)'}`,
                      borderRadius: 20,
                      color: active ? '#000' : 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 11, padding: '3px 10px',
                      fontFamily: 'var(--font-mono)', transition: 'var(--t-fast)',
                    }}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
            }}>Notes</span>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              style={{
                background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                padding: '6px 10px', fontSize: 13, outline: 'none', resize: 'vertical',
              }}
            />
          </label>

          {error && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--status-error)' }}>
              ✗ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <Button type="button" variant="ghost" onClick={onClose}>cancel</Button>
            <Button type="submit" variant="primary" disabled={loading || !form.label.trim()}>
              {loading ? 'creating…' : 'create framework'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
