import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getObservation, updateObservation, reviewObservation, deleteObservation } from '../api';
import type { ObservationUpdate, ObservationEpistemicStatus, ObservationClaimType, ObservationPolarity, ObservationSampleSizeTier, ObservationSamplingMethod, ObservationMeasurementType, CasesIncluded, PhenomenonTagRead } from '../types';
import {
  Page, Spinner, ErrorState, Card, SectionHeader,
  ObservationEpistemicBadge, ClaimTypeBadge, PolarityBadge,
  Button,
} from '../components/ui';
import { Shell } from '../components/Shell';
import { useCurrentUser } from '../hooks/useCurrentUser';

// ── Style helpers ─────────────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  background: 'var(--bg-0)',
  border: '1px solid var(--border-dim)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  padding: '4px 8px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)', fontSize: 9,
  color: 'var(--text-dim)', textTransform: 'uppercase',
  letterSpacing: '0.07em', marginBottom: 3,
  display: 'block',
};

// ── Enum option arrays ────────────────────────────────────────────────────────

const EP_OPTIONS: [string, string][] = [
  ['reported','Reported'], ['corroborated','Corroborated'], ['contested','Contested'],
  ['artefactual','Artefactual'], ['retracted','Retracted'],
];
const CLAIM_TYPE_OPTIONS: [string, string][] = [
  ['phenomenological','Phenomenological'], ['physiological','Physiological'],
  ['psychological','Psychological'], ['behavioural','Behavioural'],
  ['demographic','Demographic'], ['methodological','Methodological'],
  ['theoretical','Theoretical'],
];
const POLARITY_OPTIONS: [string, string][] = [
  ['positive','Positive'], ['negative','Negative'],
  ['null_result','Null result'], ['mixed','Mixed'],
];
const SAMPLE_SIZE_OPTIONS: [string, string][] = [
  ['single_case','Single case'], ['small','Small (2–20)'],
  ['medium','Medium (21–100)'], ['large','Large (100+)'], ['unspecified','Unspecified'],
];
const SAMPLING_METHOD_OPTIONS: [string, string][] = [
  ['convenience','Convenience'], ['purposive','Purposive'],
  ['snowball','Snowball'], ['registry','Registry'], ['unspecified','Unspecified'],
];
const MEASUREMENT_TYPE_OPTIONS: [string, string][] = [
  ['self_report','Self-report'], ['clinical_assessment','Clinical assessment'],
  ['physiological_measurement','Physiological measurement'],
  ['document_analysis','Document analysis'], ['observation','Observation'],
  ['computational','Computational'], ['unspecified','Unspecified'],
];
const CASES_INCLUDED_OPTIONS: [string, string][] = [
  ['all','All cases'], ['filtered_subset','Filtered subset'],
];

// ── Field helpers ─────────────────────────────────────────────────────────────

function FieldRow({ label, value, editing, children }: {
  label: string; value: React.ReactNode; editing: boolean; children?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      <span style={labelStyle}>{label}</span>
      {editing && children ? children : (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: value ? 'var(--text-primary)' : 'var(--text-dim)',
          padding: '3px 0',
        }}>
          {value ?? '—'}
        </div>
      )}
    </div>
  );
}

function EnumSelect({ value, options, onChange, nullable = true }: {
  value: string | null; options: [string, string][];
  onChange: (v: string | null) => void; nullable?: boolean;
}) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value === '' ? null : e.target.value)}
      style={{ ...fieldStyle, cursor: 'pointer' }}
    >
      {nullable && <option value="">— unset —</option>}
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ObservationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentUser = useCurrentUser();

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [draft, setDraft] = useState<ObservationUpdate>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: obs, isLoading, isError } = useQuery({
    queryKey: ['observation', id],
    queryFn: () => getObservation(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ObservationUpdate) => updateObservation(id!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['observation', id] });
      qc.invalidateQueries({ queryKey: ['observations'] });
      setEditingSection(null);
      setDraft({});
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (accepted: boolean) => reviewObservation(id!, { accepted }),
    onSuccess: (data, accepted) => {
      if (accepted) {
        qc.invalidateQueries({ queryKey: ['observation', id] });
        qc.invalidateQueries({ queryKey: ['review-queue'] });
      } else {
        navigate('/review?tab=observations');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteObservation(id!),
    onSuccess: () => navigate('/observations'),
  });

  function startEdit(section: string) {
    setEditingSection(section);
    setDraft({});
  }

  function cancelEdit() {
    setEditingSection(null);
    setDraft({});
  }

  function saveEdit() {
    updateMutation.mutate(draft);
  }

  function set(field: keyof ObservationUpdate, value: unknown) {
    setDraft(prev => ({ ...prev, [field]: value }));
  }

  function get<T>(field: keyof ObservationUpdate): T | undefined {
    return (draft as Record<string, unknown>)[field] as T | undefined;
  }

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError || !obs) return <Shell><ErrorState message="Observation not found" /></Shell>;

  const isCorpusDerived = obs.observation_source_type === 'corpus_derived';
  const pendingReview = obs.ai_extracted && !obs.reviewed_at;

  const editing = (s: string) => editingSection === s;

  return (
    <Shell>
      <Page
        title={obs.content.length > 80 ? obs.content.slice(0, 80) + '…' : obs.content}
        subtitle={obs.source_title ?? (isCorpusDerived ? 'Corpus-derived observation' : undefined)}
        actions={
          <Link to="/observations" style={{
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--text-dim)', textDecoration: 'none',
          }}>
            ← observations
          </Link>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-6)', alignItems: 'start' }}>
          {/* ── Main content ── */}
          <div>
            {/* Section 1: Core claim */}
            <Section
              title="Core Claim"
              editing={editing('core')}
              onEdit={() => startEdit('core')}
              onSave={saveEdit}
              onCancel={cancelEdit}
              busy={updateMutation.isPending}
            >
              <FieldRow label="Content" value={obs.content} editing={editing('core')}>
                <textarea
                  value={get<string>('content') ?? obs.content}
                  onChange={e => set('content', e.target.value)}
                  rows={5}
                  style={{
                    ...fieldStyle, fontFamily: obs.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
                    fontSize: 13, resize: 'vertical',
                  }}
                />
              </FieldRow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                <FieldRow label="Epistemic status" value={obs.epistemic_status} editing={editing('core')}>
                  <EnumSelect
                    value={get<string>('epistemic_status') ?? obs.epistemic_status}
                    options={EP_OPTIONS} nullable={false}
                    onChange={v => set('epistemic_status', v as ObservationEpistemicStatus)}
                  />
                </FieldRow>
                <FieldRow label="Claim type" value={obs.claim_type} editing={editing('core')}>
                  <EnumSelect
                    value={get<string>('claim_type') ?? obs.claim_type}
                    options={CLAIM_TYPE_OPTIONS}
                    onChange={v => set('claim_type', v as ObservationClaimType | null)}
                  />
                </FieldRow>
                <FieldRow label="Polarity" value={obs.polarity} editing={editing('core')}>
                  <EnumSelect
                    value={get<string>('polarity') ?? obs.polarity}
                    options={POLARITY_OPTIONS}
                    onChange={v => set('polarity', v as ObservationPolarity | null)}
                  />
                </FieldRow>
              </div>
            </Section>

            {/* Section 2: Source & provenance */}
            <Section
              title="Source & Provenance"
              editing={editing('source')}
              onEdit={() => startEdit('source')}
              onSave={saveEdit}
              onCancel={cancelEdit}
              busy={updateMutation.isPending}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <FieldRow
                  label="Source"
                  value={obs.source_id ? (
                    <Link to={`/sources/${obs.source_id}`} style={{ color: 'var(--accent)', fontSize: 12 }}>
                      {obs.source_title ?? obs.source_id}
                    </Link>
                  ) : '—'}
                  editing={editing('source')}
                />
                <FieldRow label="Authored by" value={obs.authored_by} editing={editing('source')}>
                  <input
                    value={get<string>('authored_by') ?? obs.authored_by ?? ''}
                    onChange={e => set('authored_by', e.target.value || null)}
                    style={fieldStyle}
                  />
                </FieldRow>
                <FieldRow label="Page reference" value={obs.page_ref} editing={editing('source')}>
                  <input
                    value={get<string>('page_ref') ?? obs.page_ref ?? ''}
                    onChange={e => set('page_ref', e.target.value || null)}
                    style={fieldStyle}
                  />
                </FieldRow>
                <FieldRow label="Verbatim quote" value={obs.verbatim ? 'Yes' : 'No'} editing={editing('source')}>
                  <select
                    value={(get<boolean>('verbatim') ?? obs.verbatim) ? 'true' : 'false'}
                    onChange={e => set('verbatim', e.target.value === 'true')}
                    style={{ ...fieldStyle, cursor: 'pointer' }}
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </FieldRow>
              </div>
            </Section>

            {/* Section 3: Sample & methodology — literature only */}
            {!isCorpusDerived && (
              <Section
                title="Sample & Methodology"
                editing={editing('sample')}
                onEdit={() => startEdit('sample')}
                onSave={saveEdit}
                onCancel={cancelEdit}
                busy={updateMutation.isPending}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <FieldRow label="Sample n" value={obs.sample_n} editing={editing('sample')}>
                    <input
                      type="number"
                      value={get<number>('sample_n') ?? obs.sample_n ?? ''}
                      onChange={e => set('sample_n', e.target.value ? parseInt(e.target.value) : null)}
                      style={fieldStyle}
                    />
                  </FieldRow>
                  <FieldRow label="Sample size tier" value={obs.sample_size_tier} editing={editing('sample')}>
                    <EnumSelect
                      value={get<string>('sample_size_tier') ?? obs.sample_size_tier}
                      options={SAMPLE_SIZE_OPTIONS}
                      onChange={v => set('sample_size_tier', v as ObservationSampleSizeTier | null)}
                    />
                  </FieldRow>
                  <FieldRow label="Sampling method" value={obs.sampling_method} editing={editing('sample')}>
                    <EnumSelect
                      value={get<string>('sampling_method') ?? obs.sampling_method}
                      options={SAMPLING_METHOD_OPTIONS}
                      onChange={v => set('sampling_method', v as ObservationSamplingMethod | null)}
                    />
                  </FieldRow>
                  <FieldRow label="Measurement type" value={obs.measurement_type} editing={editing('sample')}>
                    <EnumSelect
                      value={get<string>('measurement_type') ?? obs.measurement_type}
                      options={MEASUREMENT_TYPE_OPTIONS}
                      onChange={v => set('measurement_type', v as ObservationMeasurementType | null)}
                    />
                  </FieldRow>
                  <FieldRow label="Control group" value={obs.control_group_present === null ? null : obs.control_group_present ? 'Yes' : 'No'} editing={editing('sample')}>
                    <select
                      value={
                        get<boolean>('control_group_present') === undefined
                          ? (obs.control_group_present === null ? '' : obs.control_group_present ? 'true' : 'false')
                          : (get<boolean>('control_group_present') ? 'true' : 'false')
                      }
                      onChange={e => set('control_group_present', e.target.value === '' ? null : e.target.value === 'true')}
                      style={{ ...fieldStyle, cursor: 'pointer' }}
                    >
                      <option value="">— unset —</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </FieldRow>
                </div>
                <FieldRow label="Population description" value={obs.population_description} editing={editing('sample')}>
                  <textarea
                    value={get<string>('population_description') ?? obs.population_description ?? ''}
                    onChange={e => set('population_description', e.target.value || null)}
                    rows={2}
                    style={{ ...fieldStyle, resize: 'vertical' }}
                  />
                </FieldRow>
              </Section>
            )}

            {/* Section 4: Corpus-derived provenance — corpus_derived only */}
            {isCorpusDerived && (
              <Section
                title="Corpus-Derived Provenance"
                editing={editing('corpus')}
                onEdit={() => startEdit('corpus')}
                onSave={saveEdit}
                onCancel={cancelEdit}
                busy={updateMutation.isPending}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <FieldRow label="Analysis tool" value={obs.analysis_tool} editing={editing('corpus')}>
                    <input
                      value={get<string>('analysis_tool') ?? obs.analysis_tool ?? ''}
                      onChange={e => set('analysis_tool', e.target.value || null)}
                      style={fieldStyle}
                    />
                  </FieldRow>
                  <FieldRow label="Corpus snapshot date" value={obs.corpus_snapshot_date} editing={editing('corpus')}>
                    <input
                      type="date"
                      value={get<string>('corpus_snapshot_date') ?? obs.corpus_snapshot_date ?? ''}
                      onChange={e => set('corpus_snapshot_date', e.target.value || null)}
                      style={fieldStyle}
                    />
                  </FieldRow>
                  <FieldRow label="Case count at snapshot" value={obs.case_count_at_snapshot} editing={editing('corpus')}>
                    <input
                      type="number"
                      value={get<number>('case_count_at_snapshot') ?? obs.case_count_at_snapshot ?? ''}
                      onChange={e => set('case_count_at_snapshot', e.target.value ? parseInt(e.target.value) : null)}
                      style={fieldStyle}
                    />
                  </FieldRow>
                  <FieldRow label="Cases included" value={obs.cases_included} editing={editing('corpus')}>
                    <EnumSelect
                      value={get<string>('cases_included') ?? obs.cases_included}
                      options={CASES_INCLUDED_OPTIONS}
                      onChange={v => set('cases_included', v as CasesIncluded | null)}
                    />
                  </FieldRow>
                </div>
                <FieldRow label="Query definition" value={obs.query_definition} editing={editing('corpus')}>
                  <textarea
                    value={get<string>('query_definition') ?? obs.query_definition ?? ''}
                    onChange={e => set('query_definition', e.target.value || null)}
                    rows={3}
                    style={{ ...fieldStyle, fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                  />
                </FieldRow>
                <FieldRow label="Case filter description" value={obs.case_filter_description} editing={editing('corpus')}>
                  <textarea
                    value={get<string>('case_filter_description') ?? obs.case_filter_description ?? ''}
                    onChange={e => set('case_filter_description', e.target.value || null)}
                    rows={2}
                    style={{ ...fieldStyle, resize: 'vertical' }}
                  />
                </FieldRow>
              </Section>
            )}

            {/* Section 5: Tags */}
            <Section
              title="Tags"
              editing={false}
              onEdit={undefined}
              onSave={saveEdit}
              onCancel={cancelEdit}
              busy={updateMutation.isPending}
            >
              {obs.tags.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  no tags
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                  {obs.tags.map((tag: PhenomenonTagRead) => (
                    <span key={tag.id} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: 'var(--text-dim)', border: '1px solid var(--border-dim)',
                      padding: '2px 7px', borderRadius: 20,
                    }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* ── Sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <ObservationEpistemicBadge status={obs.epistemic_status} />
                {obs.claim_type && <ClaimTypeBadge type={obs.claim_type} />}
                {obs.polarity && <PolarityBadge polarity={obs.polarity} />}
              </div>

              <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <SidebarRow label="Type" value={obs.observation_source_type.replace('_', '-')} />
                {obs.source_id && (
                  <div>
                    <span style={labelStyle}>Source</span>
                    <Link to={`/sources/${obs.source_id}`} style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: 'var(--accent)', display: 'block',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {obs.source_title ?? obs.source_id}
                    </Link>
                  </div>
                )}
                <SidebarRow label="AI extracted" value={obs.ai_extracted ? 'Yes' : 'No'} />
                {obs.reviewed_at ? (
                  <>
                    <SidebarRow label="Reviewed by" value={obs.reviewed_by ?? '—'} />
                    <SidebarRow label="Reviewed at" value={obs.reviewed_at ? new Date(obs.reviewed_at).toLocaleDateString() : '—'} />
                  </>
                ) : obs.ai_extracted ? (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--status-warn)',
                    background: 'var(--status-warn-bg)',
                    border: '1px solid var(--status-warn)44',
                    padding: '2px 8px', borderRadius: 20,
                    alignSelf: 'flex-start',
                  }}>
                    unreviewed
                  </span>
                ) : null}
                <SidebarRow label="Added by" value={obs.created_by ?? '—'} />
              </div>

              {obs.staleness_flag && (
                <div style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--status-warn-bg)',
                  border: '1px solid var(--status-warn)44',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)', fontSize: 10,
                  color: 'var(--status-warn)',
                }}>
                  ⚠ stale — computed against {obs.case_count_at_snapshot} cases; corpus may have grown since {obs.corpus_snapshot_date}
                </div>
              )}

              {/* Review actions */}
              {pendingReview && (
                <div style={{
                  marginTop: 'var(--space-3)',
                  borderTop: '1px solid var(--border-dim)',
                  paddingTop: 'var(--space-3)',
                  display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>
                    review actions
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate(true)}
                  >
                    ✓ accept
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate(false)}
                  >
                    ✗ reject
                  </Button>
                </div>
              )}

              {/* Delete */}
              {currentUser?.is_superuser && (
                <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--border-dim)', paddingTop: 'var(--space-3)' }}>
                  {confirmDelete ? (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--status-error)' }}>delete?</span>
                      <button onClick={() => setConfirmDelete(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>no</button>
                      <button onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--status-error)' }}>yes</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', padding: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--status-error)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                    >
                      delete observation
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </Page>
    </Shell>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, editing, onEdit, onSave, onCancel, busy, children }: {
  title: string;
  editing: boolean;
  onEdit?: () => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <SectionHeader>{title}</SectionHeader>
        {onEdit && !editing && (
          <button
            onClick={onEdit}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-dim)', padding: '2px 6px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
          >
            edit
          </button>
        )}
        {editing && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
            <Button size="sm" variant="primary" disabled={busy} onClick={onSave}>save</Button>
            <Button size="sm" disabled={busy} onClick={onCancel}>cancel</Button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Sidebar row ───────────────────────────────────────────────────────────────

function SidebarRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: value ? 'var(--text-primary)' : 'var(--text-dim)' }}>
        {value ?? '—'}
      </div>
    </div>
  );
}
