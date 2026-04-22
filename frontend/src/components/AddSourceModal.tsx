import React, { useState } from 'react';
import { createSource } from '../api';
import type { SourceType, DisciplinaryFrame, ProvenanceQuality } from '../types';
import { Button, Input, Select } from './ui';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const TYPE_OPTIONS = [
  { value: 'paper', label: 'Paper' },
  { value: 'account', label: 'Account' },
  { value: 'book', label: 'Book' },
  { value: 'interview', label: 'Interview' },
  { value: 'media', label: 'Media' },
  { value: 'field_report', label: 'Field Report' },
];

const FRAME_OPTIONS = [
  { value: 'neuroscience', label: 'Neuroscience' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'folklore', label: 'Folklore' },
  { value: 'physics', label: 'Physics' },
  { value: 'parapsychology', label: 'Parapsychology' },
  { value: 'sociology', label: 'Sociology' },
  { value: 'anthropology', label: 'Anthropology' },
  { value: 'psychiatry', label: 'Psychiatry' },
  { value: 'ufology', label: 'Ufology' },
  { value: 'philosophy', label: 'Philosophy' },
  { value: 'other', label: 'Other' },
];

const PROV_OPTIONS = [
  { value: 'peer_reviewed', label: 'Peer reviewed' },
  { value: 'grey_literature', label: 'Grey literature' },
  { value: 'anecdotal', label: 'Anecdotal' },
  { value: 'investigator_report', label: 'Investigator report' },
  { value: 'self_reported', label: 'Self-reported' },
  { value: 'unknown', label: 'Unknown' },
];

export function AddSourceModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: '',
    source_type: 'paper' as SourceType,
    authors: '',
    publication_date: '',
    url: '',
    doi: '',
    disciplinary_frame: '' as DisciplinaryFrame | '',
    provenance_quality: 'unknown' as ProvenanceQuality,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createSource({
        title: form.title.trim(),
        source_type: form.source_type,
        authors: form.authors ? form.authors.split(',').map(a => a.trim()).filter(Boolean) : undefined,
        publication_date: form.publication_date || undefined,
        url: form.url || undefined,
        doi: form.doi || undefined,
        disciplinary_frame: (form.disciplinary_frame || undefined) as DisciplinaryFrame | undefined,
        provenance_quality: form.provenance_quality,
        notes: form.notes || undefined,
      });
      onCreated();
    } catch {
      setError('Failed to create source');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
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
            Add Source
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
          }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label="Title *"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            required
            autoFocus
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Select
              label="Type"
              options={TYPE_OPTIONS}
              value={form.source_type}
              onChange={e => set('source_type', e.target.value)}
            />
            <Select
              label="Provenance"
              options={PROV_OPTIONS}
              value={form.provenance_quality}
              onChange={e => set('provenance_quality', e.target.value)}
            />
          </div>

          <Input
            label="Authors (comma-separated)"
            value={form.authors}
            onChange={e => set('authors', e.target.value)}
            placeholder="Smith J, Jones A"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input
              label="Year / date"
              value={form.publication_date}
              onChange={e => set('publication_date', e.target.value)}
              placeholder="1994"
            />
            <Select
              label="Discipline"
              options={FRAME_OPTIONS}
              placeholder="—"
              value={form.disciplinary_frame}
              onChange={e => set('disciplinary_frame', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input label="URL" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…" />
            <Input label="DOI" value={form.doi} onChange={e => set('doi', e.target.value)} placeholder="10.xxxx/…" />
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{
              fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
            }}>Notes</span>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              style={{
                background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '6px 10px',
                fontSize: 13, outline: 'none', resize: 'vertical',
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
            <Button type="submit" variant="primary" disabled={loading || !form.title.trim()}>
              {loading ? 'creating…' : 'create source'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
