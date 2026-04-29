import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getHypothesis, updateHypothesis, deleteHypothesis, getObservations,
} from '../api';
import type {
  ObservationRead, HypothesisFramework, HypothesisStatus,
  HypothesisType, ConfidenceLevel,
} from '../types';
import {
  Page, Spinner, ErrorState, EmptyState,
  Badge, ObservationEpistemicBadge, ContentTypeBadge, CollectionMethodBadge,
  HypothesisStatusBadge, HypothesisTypeBadge, ConfidenceBadge,
  Button, Card, SectionHeader, Select, Input,
} from '../components/ui';
import { Shell } from '../components/Shell';

// ── Constants ─────────────────────────────────────────────────────────────────

const FRAMEWORK_OPTIONS = [
  { value: 'neurological',          label: 'Neurological' },
  { value: 'psychological',         label: 'Psychological' },
  { value: 'sociocultural',         label: 'Sociocultural' },
  { value: 'physical',              label: 'Physical' },
  { value: 'interdimensional',      label: 'Interdimensional' },
  { value: 'information_theoretic', label: 'Information-theoretic' },
  { value: 'psychospiritual',       label: 'Psychospiritual' },
  { value: 'unknown',               label: 'Unknown' },
];

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'dormant',   label: 'Dormant' },
  { value: 'abandoned', label: 'Abandoned' },
  { value: 'merged',    label: 'Merged' },
  { value: 'refuted',   label: 'Refuted' },
];

const TYPE_OPTIONS = [
  { value: 'causal',         label: 'Causal' },
  { value: 'correlational',  label: 'Correlational' },
  { value: 'mechanistic',    label: 'Mechanistic' },
  { value: 'taxonomic',      label: 'Taxonomic' },
  { value: 'predictive',     label: 'Predictive' },
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

const FRAMEWORK_COLORS: Record<string, string> = {
  neurological:         'var(--ct-phenomenological)',
  psychological:        'var(--ep-inferred)',
  sociocultural:        'var(--ep-asserted)',
  physical:             'var(--status-warn)',
  interdimensional:     'var(--ep-speculative)',
  information_theoretic:'var(--status-info)',
  psychospiritual:      'var(--ep-contested)',
  unknown:              'var(--text-dim)',
};

type ObsSlot = 'supporting_observations' | 'anomalous_observations';

// ── Observation row ───────────────────────────────────────────────────────────

function ObsRow({
  obs, onRemove, anomalous = false,
}: {
  obs: ObservationRead;
  onRemove: (id: string) => void;
  anomalous?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      background: anomalous ? 'rgba(255,43,43,0.04)' : 'var(--bg-1)',
      border: `1px solid ${anomalous ? 'rgba(255,43,43,0.2)' : 'var(--border-dim)'}`,
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5,
          marginBottom: 6,
        }}>
          {obs.content}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <ObservationEpistemicBadge status={obs.epistemic_status} />
          <ContentTypeBadge type={obs.content_type} />
          <CollectionMethodBadge method={obs.collection_method} />
          {obs.source_title && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {obs.source_title}
            </span>
          )}
          {obs.page_ref && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              p. {obs.page_ref}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(obs.id)}
        title="Remove from this hypothesis"
        style={{
          background: 'none', border: 'none',
          color: 'var(--text-dim)', cursor: 'pointer',
          fontSize: 14, lineHeight: 1, flexShrink: 0,
          padding: '2px 4px',
          borderRadius: 'var(--radius-sm)',
        }}
      >×</button>
    </div>
  );
}

// ── Observation search / add panel ────────────────────────────────────────────

function ObservationAdder({
  currentIds, onAdd,
}: {
  currentIds: Set<string>;
  onAdd: (obs: ObservationRead) => void;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleChange = useCallback((v: string) => {
    setQuery(v);
    const t = setTimeout(() => setDebouncedQuery(v), 300);
    return () => clearTimeout(t);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['observations-search', debouncedQuery],
    queryFn: () => getObservations({ search: debouncedQuery || undefined, page_size: 50 }),
  });

  const results = (data?.items ?? []).filter(o => !currentIds.has(o.id));

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <Input
        label=""
        value={query}
        onChange={e => handleChange(e.target.value)}
        placeholder="Search observations to add…"
      />
      <div style={{
        marginTop: 6,
        border: '1px solid var(--border-dim)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-0)',
        maxHeight: 280,
        overflowY: 'auto',
      }}>
        {isLoading && (
          <div style={{ padding: 'var(--space-3)', fontSize: 12, color: 'var(--text-dim)' }}>
            Loading…
          </div>
        )}
        {!isLoading && results.length === 0 && (
          <div style={{ padding: 'var(--space-3)', fontSize: 12, color: 'var(--text-dim)' }}>
            No unlinked observations{debouncedQuery ? ' match.' : ' available.'}
          </div>
        )}
        {results.map(o => (
          <button
            key={o.id}
            onClick={() => { onAdd(o); setQuery(''); setDebouncedQuery(''); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'none', border: 'none', borderBottom: '1px solid var(--border-dim)',
              color: 'var(--text-primary)', cursor: 'pointer',
              padding: 'var(--space-3)',
              fontSize: 12, lineHeight: 1.5,
            }}
          >
            <div style={{ marginBottom: 4 }}>{o.content}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <ObservationEpistemicBadge status={o.epistemic_status} />
              <ContentTypeBadge type={o.content_type} />
              <CollectionMethodBadge method={o.collection_method} />
              {o.source_title && (
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {o.source_title}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function HypothesisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [supportingObs, setSupportingObs] = useState<ObservationRead[] | null>(null);
  const [anomalousObs, setAnomalousObs]   = useState<ObservationRead[] | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    label: string;
    description: string;
    hypothesis_type: HypothesisType;
    falsification_condition: string;
    scope: string;
    framework: HypothesisFramework;
    status: HypothesisStatus;
    confidence_level: ConfidenceLevel;
    notes: string;
    assumed_ontologies: string[];
  } | null>(null);

  const [saveError, setSaveError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: hyp, isLoading, isError } = useQuery({
    queryKey: ['hypothesis', id],
    queryFn: () => getHypothesis(id!),
    enabled: !!id,
    select: (data) => {
      if (supportingObs === null) setSupportingObs(data.supporting_observations);
      if (anomalousObs === null)  setAnomalousObs(data.anomalous_observations);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateHypothesis>[1]) =>
      updateHypothesis(id!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hypothesis', id] });
      qc.invalidateQueries({ queryKey: ['hypotheses'] });
      setEditing(false);
      setSaveError('');
    },
    onError: () => setSaveError('Save failed — check the console.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteHypothesis(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hypotheses'] });
      navigate('/hypotheses');
    },
  });

  // ── Observation slot helpers ─────────────────────────────────────────────────

  function addObs(slot: ObsSlot, obs: ObservationRead) {
    const setter = { supporting_observations: setSupportingObs, anomalous_observations: setAnomalousObs }[slot];
    setter(prev => (prev ? [...prev, obs] : [obs]));
  }

  function removeObs(slot: ObsSlot, obsId: string) {
    const setter = { supporting_observations: setSupportingObs, anomalous_observations: setAnomalousObs }[slot];
    setter(prev => (prev ? prev.filter(o => o.id !== obsId) : []));
  }

  function saveObsLinks() {
    updateMutation.mutate({
      supporting_observation_ids: (supportingObs ?? []).map(o => o.id),
      anomalous_observation_ids:  (anomalousObs  ?? []).map(o => o.id),
    });
  }

  const obsChanged = hyp && (
    JSON.stringify((supportingObs ?? []).map(o => o.id)) !== JSON.stringify(hyp.supporting_observations.map(o => o.id)) ||
    JSON.stringify((anomalousObs  ?? []).map(o => o.id)) !== JSON.stringify(hyp.anomalous_observations.map(o => o.id))
  );

  // ── Scalar edit helpers ──────────────────────────────────────────────────────

  function startEdit() {
    if (!hyp) return;
    setEditForm({
      label:                   hyp.label,
      description:             hyp.description ?? '',
      hypothesis_type:         hyp.hypothesis_type,
      falsification_condition: hyp.falsification_condition ?? '',
      scope:                   hyp.scope ?? '',
      framework:               hyp.framework,
      status:                  hyp.status,
      confidence_level:        hyp.confidence_level,
      notes:                   hyp.notes ?? '',
      assumed_ontologies:      hyp.assumed_ontologies ?? [],
    });
    setEditing(true);
  }

  function toggleOntology(o: string) {
    if (!editForm) return;
    setEditForm(f => f ? ({
      ...f,
      assumed_ontologies: f.assumed_ontologies.includes(o)
        ? f.assumed_ontologies.filter(x => x !== o)
        : [...f.assumed_ontologies, o],
    }) : f);
  }

  function saveScalars() {
    if (!editForm) return;
    updateMutation.mutate({
      label:                   editForm.label.trim(),
      description:             editForm.description.trim() || undefined,
      hypothesis_type:         editForm.hypothesis_type,
      falsification_condition: editForm.falsification_condition.trim() || undefined,
      scope:                   editForm.scope.trim() || undefined,
      framework:               editForm.framework,
      status:                  editForm.status,
      confidence_level:        editForm.confidence_level,
      notes:                   editForm.notes.trim() || undefined,
      assumed_ontologies:      editForm.assumed_ontologies.length ? editForm.assumed_ontologies : undefined,
    });
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const anomalousEmpty = (anomalousObs ?? []).length === 0;
  const falsificationEmpty = hyp && !hyp.falsification_condition;

  const allLinkedIds = new Set([
    ...(supportingObs ?? []).map(o => o.id),
    ...(anomalousObs  ?? []).map(o => o.id),
  ]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError || !hyp) return <Shell><ErrorState message="Failed to load hypothesis." /></Shell>;

  return (
    <Shell>
      <Page
        title={editing && editForm ? editForm.label || '(untitled)' : hyp.label}
        subtitle={`${hyp.framework.replace(/_/g, ' ')} · ${hyp.hypothesis_type} · ${hyp.status}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {obsChanged && (
              <Button variant="primary" size="sm" onClick={saveObsLinks} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'saving…' : 'save changes'}
              </Button>
            )}
            {!editing
              ? <Button variant="ghost" size="sm" onClick={startEdit}>edit</Button>
              : <>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>cancel</Button>
                  <Button variant="primary" size="sm" onClick={saveScalars} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'saving…' : 'save'}
                  </Button>
                </>
            }
            {!deleteConfirm
              ? <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)}>delete</Button>
              : <>
                  <span style={{ fontSize: 12, color: 'var(--status-error)', fontFamily: 'var(--font-mono)' }}>delete?</span>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)}>no</Button>
                  <Button
                    size="sm"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    style={{ background: 'var(--status-error)', color: '#fff', border: 'none' }}
                  >yes</Button>
                </>
            }
          </div>
        }
      >
        {saveError && (
          <div style={{
            marginBottom: 'var(--space-4)',
            padding: 'var(--space-3)',
            background: 'var(--status-error-bg)',
            border: '1px solid var(--status-error)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12, color: 'var(--status-error)', fontFamily: 'var(--font-mono)',
          }}>
            ✗ {saveError}
          </div>
        )}

        {/* ── Metadata card ── */}
        <Card style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          {editing && editForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input
                label="Label *"
                value={editForm.label}
                onChange={e => setEditForm(f => f ? { ...f, label: e.target.value } : f)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <Select
                  label="Hypothesis type"
                  options={TYPE_OPTIONS}
                  value={editForm.hypothesis_type}
                  onChange={e => setEditForm(f => f ? { ...f, hypothesis_type: e.target.value as HypothesisType } : f)}
                />
                <Select
                  label="Framework"
                  options={FRAMEWORK_OPTIONS}
                  value={editForm.framework}
                  onChange={e => setEditForm(f => f ? { ...f, framework: e.target.value as HypothesisFramework } : f)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={editForm.status}
                  onChange={e => setEditForm(f => f ? { ...f, status: e.target.value as HypothesisStatus } : f)}
                />
                <Select
                  label="Confidence"
                  options={CONFIDENCE_OPTIONS}
                  value={editForm.confidence_level}
                  onChange={e => setEditForm(f => f ? { ...f, confidence_level: e.target.value as ConfidenceLevel } : f)}
                />
              </div>
              <Textarea
                label="Description"
                value={editForm.description}
                onChange={e => setEditForm(f => f ? { ...f, description: e.target.value } : f)}
                rows={3}
              />
              <Textarea
                label="Falsification condition"
                value={editForm.falsification_condition}
                onChange={e => setEditForm(f => f ? { ...f, falsification_condition: e.target.value } : f)}
                rows={2}
                placeholder="What evidence would falsify this hypothesis?"
              />
              <Textarea
                label="Scope (free text)"
                value={editForm.scope}
                onChange={e => setEditForm(f => f ? { ...f, scope: e.target.value } : f)}
                rows={2}
                placeholder="What phenomena does this hypothesis purport to explain?"
              />
              <div>
                <span style={{
                  fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
                  display: 'block', marginBottom: 8,
                }}>Assumed ontologies</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ONTOLOGY_OPTIONS.map(o => {
                    const active = editForm.assumed_ontologies.includes(o);
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
                      >{o}</button>
                    );
                  })}
                </div>
              </div>
              <Textarea
                label="Notes"
                value={editForm.notes}
                onChange={e => setEditForm(f => f ? { ...f, notes: e.target.value } : f)}
                rows={2}
              />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                <Badge
                  label={hyp.framework.replace(/_/g, ' ')}
                  color={FRAMEWORK_COLORS[hyp.framework]}
                />
                <HypothesisTypeBadge type={hyp.hypothesis_type} />
                <HypothesisStatusBadge status={hyp.status} />
                <ConfidenceBadge level={hyp.confidence_level} />
                {(hyp.assumed_ontologies ?? []).map(o => (
                  <Badge key={o} label={o} color="var(--text-dim)" />
                ))}
              </div>

              {hyp.description && (
                <p style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  lineHeight: 1.6, marginBottom: 'var(--space-3)',
                }}>
                  {hyp.description}
                </p>
              )}

              {/* Falsification condition — warn if absent */}
              {falsificationEmpty ? (
                <div style={{
                  marginBottom: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  border: '1px solid var(--status-warn)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--status-warn-bg)',
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--status-warn)',
                }}>
                  ⚠ No falsification condition stated. A hypothesis without one is unfalsifiable by construction.
                </div>
              ) : (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <span style={{
                    fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block',
                    marginBottom: 4,
                  }}>
                    Falsification condition
                  </span>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {hyp.falsification_condition}
                  </p>
                </div>
              )}

              {hyp.scope && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <span style={{
                    fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block',
                    marginBottom: 4,
                  }}>
                    Scope
                  </span>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {hyp.scope}
                  </p>
                </div>
              )}

              {hyp.notes && (
                <p style={{
                  fontSize: 12, color: 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)', lineHeight: 1.5,
                  marginBottom: 'var(--space-3)',
                }}>
                  {hyp.notes}
                </p>
              )}

              {/* Parent hypothesis */}
              {hyp.parent_hypothesis_id && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <span style={{
                    fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block',
                    marginBottom: 4,
                  }}>
                    Parent hypothesis
                  </span>
                  <Link
                    to={`/hypotheses/${hyp.parent_hypothesis_id}`}
                    style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
                  >
                    → {hyp.parent_hypothesis_id.slice(0, 8)}…
                  </Link>
                </div>
              )}

              {/* Competing hypotheses */}
              {hyp.competing_hypotheses && hyp.competing_hypotheses.length > 0 && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <span style={{
                    fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase',
                    letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', display: 'block',
                    marginBottom: 4,
                  }}>
                    Competing hypotheses
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {hyp.competing_hypotheses.map(c => (
                      <Link
                        key={c.id}
                        to={`/hypotheses/${c.id}`}
                        style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex', gap: 'var(--space-5)',
                paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-dim)',
              }}>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                    Supporting
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--status-ok)' }}>
                    {(supportingObs ?? hyp.supporting_observations).length}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: anomalousEmpty ? 'var(--status-error)' : 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                    Anomalous
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: anomalousEmpty ? 'var(--status-error)' : 'var(--text-primary)' }}>
                    {(anomalousObs ?? hyp.anomalous_observations).length}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* ── Observation sections ── */}

        <ObsSection
          title="Supporting observations"
          subtitle="Observations that support this hypothesis"
          obs={supportingObs ?? []}
          slot="supporting_observations"
          allLinkedIds={allLinkedIds}
          onAdd={(o) => addObs('supporting_observations', o)}
          onRemove={(oid) => removeObs('supporting_observations', oid)}
        />

        <ObsSection
          title="Anomalous observations"
          subtitle="Observations this hypothesis cannot explain"
          obs={anomalousObs ?? []}
          slot="anomalous_observations"
          allLinkedIds={allLinkedIds}
          anomalous
          onAdd={(o) => addObs('anomalous_observations', o)}
          onRemove={(oid) => removeObs('anomalous_observations', oid)}
        />

        {obsChanged && (
          <div style={{
            marginTop: 'var(--space-5)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--bg-0)',
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Unsaved observation changes
            </span>
            <Button variant="primary" size="sm" onClick={saveObsLinks} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'saving…' : 'save changes'}
            </Button>
          </div>
        )}
      </Page>
    </Shell>
  );
}

// ── Observation section component ─────────────────────────────────────────────

function ObsSection({
  title, subtitle, obs, allLinkedIds, anomalous = false, onAdd, onRemove,
}: {
  title: string;
  subtitle: string;
  obs: ObservationRead[];
  slot: ObsSlot;
  allLinkedIds: Set<string>;
  anomalous?: boolean;
  onAdd: (o: ObservationRead) => void;
  onRemove: (id: string) => void;
}) {
  const [showAdder, setShowAdder] = useState(false);

  return (
    <div style={{
      marginBottom: 'var(--space-5)',
      border: anomalous ? '1px solid rgba(255,43,43,0.25)' : '1px solid var(--border-dim)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        background: anomalous ? 'rgba(255,43,43,0.06)' : 'var(--bg-0)',
        borderBottom: anomalous ? '1px solid rgba(255,43,43,0.2)' : '1px solid var(--border-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: anomalous ? 'var(--status-error)' : 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            fontFamily: 'var(--font-mono)',
          }}>
            {anomalous && '⚠ '}{title}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>
            {subtitle}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginRight: 4 }}>
            {obs.length}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setShowAdder(v => !v)}>
            {showAdder ? 'done' : '+ add'}
          </Button>
        </div>
      </div>

      <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {obs.length === 0 && !showAdder && (
          <EmptyState message={anomalous
            ? 'No anomalous observations — use + add to declare what this hypothesis cannot explain.'
            : 'No observations linked yet.'
          } />
        )}
        {obs.map(o => (
          <ObsRow
            key={o.id}
            obs={o}
            anomalous={anomalous}
            onRemove={onRemove}
          />
        ))}
        {showAdder && (
          <ObservationAdder
            currentIds={allLinkedIds}
            onAdd={(o) => { onAdd(o); }}
          />
        )}
      </div>
    </div>
  );
}

// ── Textarea helper ───────────────────────────────────────────────────────────

function Textarea({ label, value, onChange, rows, placeholder }: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
      }}>{label}</span>
      <textarea
        value={value}
        onChange={onChange}
        rows={rows ?? 3}
        placeholder={placeholder}
        style={{
          background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
          padding: '6px 10px', fontSize: 13, outline: 'none', resize: 'vertical',
        }}
      />
    </label>
  );
}
