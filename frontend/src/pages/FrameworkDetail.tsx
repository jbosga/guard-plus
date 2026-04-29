import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFramework, updateFramework, deleteFramework, getHypotheses } from '../api';
import type { HypothesisFramework, FrameworkStatus, ConfidenceLevel, HypothesisList } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState,
  Badge, FrameworkStatusBadge, ConfidenceBadge,
  HypothesisTypeBadge, HypothesisStatusBadge,
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

type HypSlot = 'core_hypotheses' | 'anomalous_hypotheses';

// ── Hypothesis row ────────────────────────────────────────────────────────────

function HypRow({
  hyp, onRemove, anomalous = false,
}: {
  hyp: HypothesisList;
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
        <Link
          to={`/hypotheses/${hyp.id}`}
          style={{
            fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
            textDecoration: 'none', display: 'block', marginBottom: 6,
          }}
        >
          {hyp.label}
        </Link>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <HypothesisTypeBadge type={hyp.hypothesis_type} />
          <HypothesisStatusBadge status={hyp.status} />
          <ConfidenceBadge level={hyp.confidence_level} />
        </div>
      </div>
      <button
        onClick={() => onRemove(hyp.id)}
        title="Remove from this framework"
        style={{
          background: 'none', border: 'none',
          color: 'var(--text-dim)', cursor: 'pointer',
          fontSize: 14, lineHeight: 1, flexShrink: 0,
          padding: '2px 4px', borderRadius: 'var(--radius-sm)',
        }}
      >×</button>
    </div>
  );
}

// ── Hypothesis adder ──────────────────────────────────────────────────────────

function HypothesisAdder({
  currentIds, onAdd,
}: {
  currentIds: Set<string>;
  onAdd: (hyp: HypothesisList) => void;
}) {
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hypotheses-search-fw', query],
    queryFn: () => getHypotheses({ search: query || undefined, page_size: 50 }),
  });

  const results = (data?.items ?? []).filter(h => !currentIds.has(h.id));

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <Input
        label=""
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search hypotheses to add…"
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
          <div style={{ padding: 'var(--space-3)', fontSize: 12, color: 'var(--text-dim)' }}>Loading…</div>
        )}
        {!isLoading && results.length === 0 && (
          <div style={{ padding: 'var(--space-3)', fontSize: 12, color: 'var(--text-dim)' }}>
            No unlinked hypotheses{query ? ' match.' : ' available.'}
          </div>
        )}
        {results.map(h => (
          <button
            key={h.id}
            onClick={() => { onAdd(h); setQuery(''); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'none', border: 'none', borderBottom: '1px solid var(--border-dim)',
              color: 'var(--text-primary)', cursor: 'pointer',
              padding: 'var(--space-3)', fontSize: 12, lineHeight: 1.5,
            }}
          >
            <div style={{ marginBottom: 4 }}>{h.label}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <HypothesisTypeBadge type={h.hypothesis_type} />
              <HypothesisStatusBadge status={h.status} />
              <ConfidenceBadge level={h.confidence_level} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FrameworkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [coreHyps,     setCoreHyps]     = useState<HypothesisList[] | null>(null);
  const [anomalousHyps, setAnomalousHyps] = useState<HypothesisList[] | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    label: string;
    description: string;
    framework_type: HypothesisFramework;
    status: FrameworkStatus;
    confidence_level: ConfidenceLevel;
    notes: string;
    assumed_ontologies: string[];
  } | null>(null);

  const [saveError, setSaveError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: fw, isLoading, isError } = useQuery({
    queryKey: ['framework', id],
    queryFn: () => getFramework(id!),
    enabled: !!id,
    select: (data) => {
      if (coreHyps === null)     setCoreHyps(data.core_hypotheses);
      if (anomalousHyps === null) setAnomalousHyps(data.anomalous_hypotheses);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateFramework>[1]) =>
      updateFramework(id!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['framework', id] });
      qc.invalidateQueries({ queryKey: ['frameworks'] });
      setEditing(false);
      setSaveError('');
    },
    onError: () => setSaveError('Save failed — check the console.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFramework(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['frameworks'] });
      navigate('/frameworks');
    },
  });

  // ── Hypothesis slot helpers ──────────────────────────────────────────────────

  function addHyp(slot: HypSlot, hyp: HypothesisList) {
    const setter = { core_hypotheses: setCoreHyps, anomalous_hypotheses: setAnomalousHyps }[slot];
    setter(prev => (prev ? [...prev, hyp] : [hyp]));
  }

  function removeHyp(slot: HypSlot, hypId: string) {
    const setter = { core_hypotheses: setCoreHyps, anomalous_hypotheses: setAnomalousHyps }[slot];
    setter(prev => (prev ? prev.filter(h => h.id !== hypId) : []));
  }

  function saveHypLinks() {
    updateMutation.mutate({
      core_hypothesis_ids:      (coreHyps     ?? []).map(h => h.id),
      anomalous_hypothesis_ids: (anomalousHyps ?? []).map(h => h.id),
    });
  }

  const hypsChanged = fw && (
    JSON.stringify((coreHyps     ?? []).map(h => h.id)) !== JSON.stringify(fw.core_hypotheses.map(h => h.id)) ||
    JSON.stringify((anomalousHyps ?? []).map(h => h.id)) !== JSON.stringify(fw.anomalous_hypotheses.map(h => h.id))
  );

  // ── Scalar edit helpers ──────────────────────────────────────────────────────

  function startEdit() {
    if (!fw) return;
    setEditForm({
      label:            fw.label,
      description:      fw.description ?? '',
      framework_type:   fw.framework_type,
      status:           fw.status,
      confidence_level: fw.confidence_level,
      notes:            fw.notes ?? '',
      assumed_ontologies: fw.assumed_ontologies ?? [],
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
      label:            editForm.label.trim(),
      description:      editForm.description.trim() || undefined,
      framework_type:   editForm.framework_type,
      status:           editForm.status,
      confidence_level: editForm.confidence_level,
      notes:            editForm.notes.trim() || undefined,
      assumed_ontologies: editForm.assumed_ontologies.length ? editForm.assumed_ontologies : undefined,
    });
  }

  const anomalousEmpty = (anomalousHyps ?? []).length === 0;
  const allLinkedIds = new Set([
    ...(coreHyps     ?? []).map(h => h.id),
    ...(anomalousHyps ?? []).map(h => h.id),
  ]);

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError || !fw) return <Shell><ErrorState message="Failed to load framework." /></Shell>;

  return (
    <Shell>
      <Page
        title={editing && editForm ? editForm.label || '(untitled)' : fw.label}
        subtitle={`${fw.framework_type.replace(/_/g, ' ')} · ${fw.status}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {hypsChanged && (
              <Button variant="primary" size="sm" onClick={saveHypLinks} disabled={updateMutation.isPending}>
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
              <Select
                label="Framework type"
                options={FRAMEWORK_OPTIONS}
                value={editForm.framework_type}
                onChange={e => setEditForm(f => f ? { ...f, framework_type: e.target.value as HypothesisFramework } : f)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={editForm.status}
                  onChange={e => setEditForm(f => f ? { ...f, status: e.target.value as FrameworkStatus } : f)}
                />
                <Select
                  label="Confidence"
                  options={CONFIDENCE_OPTIONS}
                  value={editForm.confidence_level}
                  onChange={e => setEditForm(f => f ? { ...f, confidence_level: e.target.value as ConfidenceLevel } : f)}
                />
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{
                  fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
                }}>Description</span>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(f => f ? { ...f, description: e.target.value } : f)}
                  rows={3}
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
                    const active = editForm.assumed_ontologies.includes(o);
                    return (
                      <button key={o} type="button" onClick={() => toggleOntology(o)} style={{
                        background: active ? 'var(--accent)' : 'var(--bg-0)',
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-dim)'}`,
                        borderRadius: 20,
                        color: active ? '#000' : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: 11, padding: '3px 10px',
                        fontFamily: 'var(--font-mono)', transition: 'var(--t-fast)',
                      }}>{o}</button>
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
                  value={editForm.notes}
                  onChange={e => setEditForm(f => f ? { ...f, notes: e.target.value } : f)}
                  rows={2}
                  style={{
                    background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                    padding: '6px 10px', fontSize: 13, outline: 'none', resize: 'vertical',
                  }}
                />
              </label>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                <Badge label={fw.framework_type.replace(/_/g, ' ')} color={FRAMEWORK_COLORS[fw.framework_type]} />
                <FrameworkStatusBadge status={fw.status} />
                <ConfidenceBadge level={fw.confidence_level} />
                {(fw.assumed_ontologies ?? []).map(o => (
                  <Badge key={o} label={o} color="var(--text-dim)" />
                ))}
              </div>

              {fw.description && (
                <p style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  lineHeight: 1.6, marginBottom: 'var(--space-3)',
                }}>
                  {fw.description}
                </p>
              )}

              {fw.notes && (
                <p style={{
                  fontSize: 12, color: 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)', lineHeight: 1.5,
                }}>
                  {fw.notes}
                </p>
              )}

              <div style={{
                display: 'flex', gap: 'var(--space-5)',
                paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-dim)',
                marginTop: 'var(--space-3)',
              }}>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                    Core
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--status-ok)' }}>
                    {(coreHyps ?? fw.core_hypotheses).length}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: anomalousEmpty ? 'var(--status-error)' : 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                    Anomalous
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: anomalousEmpty ? 'var(--status-error)' : 'var(--text-primary)' }}>
                    {(anomalousHyps ?? fw.anomalous_hypotheses).length}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* ── Hypothesis sections ── */}

        <HypSection
          title="Core hypotheses"
          subtitle="Hypotheses this framework is built on"
          hyps={coreHyps ?? []}
          slot="core_hypotheses"
          allLinkedIds={allLinkedIds}
          onAdd={(h) => addHyp('core_hypotheses', h)}
          onRemove={(hid) => removeHyp('core_hypotheses', hid)}
        />

        <HypSection
          title="Anomalous hypotheses"
          subtitle="Hypotheses this framework cannot accommodate"
          hyps={anomalousHyps ?? []}
          slot="anomalous_hypotheses"
          allLinkedIds={allLinkedIds}
          anomalous
          onAdd={(h) => addHyp('anomalous_hypotheses', h)}
          onRemove={(hid) => removeHyp('anomalous_hypotheses', hid)}
        />

        {hypsChanged && (
          <div style={{
            marginTop: 'var(--space-5)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--bg-0)',
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Unsaved hypothesis changes
            </span>
            <Button variant="primary" size="sm" onClick={saveHypLinks} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'saving…' : 'save changes'}
            </Button>
          </div>
        )}
      </Page>
    </Shell>
  );
}

// ── Hypothesis section component ──────────────────────────────────────────────

function HypSection({
  title, subtitle, hyps, allLinkedIds, anomalous = false, onAdd, onRemove,
}: {
  title: string;
  subtitle: string;
  hyps: HypothesisList[];
  slot: HypSlot;
  allLinkedIds: Set<string>;
  anomalous?: boolean;
  onAdd: (h: HypothesisList) => void;
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
          <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 8 }}>{subtitle}</span>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginRight: 4 }}>
            {hyps.length}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setShowAdder(v => !v)}>
            {showAdder ? 'done' : '+ add'}
          </Button>
        </div>
      </div>

      <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {hyps.length === 0 && !showAdder && (
          <EmptyState message={anomalous
            ? 'No anomalous hypotheses — use + add to declare what this framework cannot explain.'
            : 'No hypotheses linked yet.'
          } />
        )}
        {hyps.map(h => (
          <HypRow key={h.id} hyp={h} anomalous={anomalous} onRemove={onRemove} />
        ))}
        {showAdder && (
          <HypothesisAdder currentIds={allLinkedIds} onAdd={(h) => { onAdd(h); }} />
        )}
      </div>
    </div>
  );
}
