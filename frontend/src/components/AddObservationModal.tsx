import React, { useState } from 'react';
import { createObservation } from '../api';
import type {
  ObservationEpistemicStatus, ContentType, SourceModality,
  EpistemicDistance, CollectionMethod, SampleSizeTier, SamplingMethod,
} from '../types';
import { Button, Input, Select } from './ui';

interface Props {
  sourceId: string;
  onClose: () => void;
  onCreated: () => void;
}

const EPISTEMIC_OPTIONS = [
  { value: 'reported',     label: 'Reported' },
  { value: 'corroborated', label: 'Corroborated' },
  { value: 'contested',    label: 'Contested' },
  { value: 'artefactual',  label: 'Artefactual' },
  { value: 'retracted',    label: 'Retracted' },
];

const CONTENT_TYPE_OPTIONS = [
  { value: 'experiential',      label: 'Experiential' },
  { value: 'behavioral',        label: 'Behavioral' },
  { value: 'physiological',     label: 'Physiological' },
  { value: 'environmental',     label: 'Environmental' },
  { value: 'testimonial',       label: 'Testimonial' },
  { value: 'documentary_trace', label: 'Documentary trace' },
];

const SOURCE_MODALITY_OPTIONS = [
  { value: 'first_person_verbal',    label: 'First-person verbal' },
  { value: 'investigator_summary',   label: 'Investigator summary' },
  { value: 'physiological',          label: 'Physiological' },
  { value: 'behavioral',             label: 'Behavioral' },
  { value: 'documentary',            label: 'Documentary' },
  { value: 'aggregate_statistical',  label: 'Aggregate / statistical' },
];

const EPISTEMIC_DISTANCE_OPTIONS = [
  { value: 'direct',      label: 'Direct' },
  { value: 'summarized',  label: 'Summarized' },
  { value: 'aggregated',  label: 'Aggregated' },
  { value: 'derived',     label: 'Derived' },
];

const COLLECTION_METHOD_OPTIONS = [
  { value: 'spontaneous_report',    label: 'Spontaneous report' },
  { value: 'structured_interview',  label: 'Structured interview' },
  { value: 'hypnotic_regression',   label: 'Hypnotic regression' },
  { value: 'questionnaire',         label: 'Questionnaire' },
  { value: 'clinical_assessment',   label: 'Clinical assessment' },
  { value: 'passive_recording',     label: 'Passive recording' },
  { value: 'investigator_inference',label: 'Investigator inference' },
];

const SAMPLE_TIER_OPTIONS = [
  { value: 'single_case', label: 'Single case' },
  { value: 'small',       label: 'Small' },
  { value: 'moderate',    label: 'Moderate' },
  { value: 'large',       label: 'Large' },
  { value: 'population',  label: 'Population' },
];

const SAMPLING_METHOD_OPTIONS = [
  { value: 'self_selected',         label: 'Self-selected' },
  { value: 'investigator_referred', label: 'Investigator referred' },
  { value: 'clinical',              label: 'Clinical' },
  { value: 'survey',                label: 'Survey' },
  { value: 'convenience',           label: 'Convenience' },
  { value: 'unknown',               label: 'Unknown' },
];

export function AddObservationModal({ sourceId, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    content: '',
    content_type: 'experiential' as ContentType,
    source_modality: 'first_person_verbal' as SourceModality,
    epistemic_distance: 'direct' as EpistemicDistance,
    collection_method: 'spontaneous_report' as CollectionMethod,
    epistemic_status: 'reported' as ObservationEpistemicStatus,
    verbatim: false,
    page_ref: '',
  });
  const [aggregateForm, setAggregateForm] = useState({
    sample_n: '',
    sample_size_tier: '' as SampleSizeTier | '',
    sampling_method: '' as SamplingMethod | '',
    inclusion_criteria_documented: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAggregate = form.epistemic_distance === 'aggregated';

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.content.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createObservation({
        source_id:          sourceId,
        content:            form.content.trim(),
        content_type:       form.content_type,
        source_modality:    form.source_modality,
        epistemic_distance: form.epistemic_distance,
        collection_method:  form.collection_method,
        epistemic_status:   form.epistemic_status,
        verbatim:           form.verbatim,
        page_ref:           form.page_ref || undefined,
        ...(isAggregate && {
          sample_n: aggregateForm.sample_n ? parseInt(aggregateForm.sample_n, 10) : undefined,
          sample_size_tier: aggregateForm.sample_size_tier || undefined,
          sampling_method: aggregateForm.sampling_method || undefined,
          inclusion_criteria_documented: aggregateForm.inclusion_criteria_documented || undefined,
        }),
      });
      onCreated();
    } catch {
      setError('Failed to create observation');
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
        width: 600,
        maxHeight: '90vh',
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
            Add Observation
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
              Content *
            </span>
            <textarea
              value={form.content}
              onChange={e => set('content', e.target.value)}
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
              label="Content type *"
              options={CONTENT_TYPE_OPTIONS}
              value={form.content_type}
              onChange={e => set('content_type', e.target.value)}
            />
            <Select
              label="Source modality *"
              options={SOURCE_MODALITY_OPTIONS}
              value={form.source_modality}
              onChange={e => set('source_modality', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Select
              label="Epistemic distance *"
              options={EPISTEMIC_DISTANCE_OPTIONS}
              value={form.epistemic_distance}
              onChange={e => set('epistemic_distance', e.target.value)}
            />
            <Select
              label="Collection method *"
              options={COLLECTION_METHOD_OPTIONS}
              value={form.collection_method}
              onChange={e => set('collection_method', e.target.value)}
            />
          </div>

          <Select
            label="Epistemic status"
            options={EPISTEMIC_OPTIONS}
            value={form.epistemic_status}
            onChange={e => set('epistemic_status', e.target.value)}
          />

          {/* Aggregate fields — shown only when epistemic_distance = aggregated */}
          {isAggregate && (
            <div style={{
              padding: 'var(--space-3)',
              border: '1px solid var(--border-dim)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
            }}>
              <span style={{
                fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
              }}>
                Aggregate study metadata
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <Input
                  label="Sample n"
                  type="number"
                  value={aggregateForm.sample_n}
                  onChange={e => setAggregateForm(f => ({ ...f, sample_n: e.target.value }))}
                  placeholder="e.g. 150"
                />
                <Select
                  label="Size tier"
                  options={SAMPLE_TIER_OPTIONS}
                  placeholder="— none —"
                  value={aggregateForm.sample_size_tier}
                  onChange={e => setAggregateForm(f => ({ ...f, sample_size_tier: e.target.value as SampleSizeTier | '' }))}
                />
                <Select
                  label="Sampling method"
                  options={SAMPLING_METHOD_OPTIONS}
                  placeholder="— none —"
                  value={aggregateForm.sampling_method}
                  onChange={e => setAggregateForm(f => ({ ...f, sampling_method: e.target.value as SamplingMethod | '' }))}
                />
              </div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={aggregateForm.inclusion_criteria_documented}
                  onChange={e => setAggregateForm(f => ({ ...f, inclusion_criteria_documented: e.target.checked }))}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--text-secondary)', letterSpacing: '0.04em',
                }}>
                  inclusion criteria documented
                </span>
              </label>
            </div>
          )}

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
            <Button type="submit" variant="primary" disabled={loading || !form.content.trim()}>
              {loading ? 'saving…' : 'add observation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
