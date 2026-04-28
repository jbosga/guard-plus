import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getHypothesis, updateHypothesis, deleteHypothesis, getClaims,
} from '../api';
import type { ClaimRead, HypothesisFramework, HypothesisStatus } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState,
  Badge, EpistemicBadge, ClaimTypeBadge, HypothesisStatusBadge,
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
  { value: 'active',      label: 'Active' },
  { value: 'speculative', label: 'Speculative' },
  { value: 'abandoned',   label: 'Abandoned' },
  { value: 'merged',      label: 'Merged' },
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

type ClaimSlot =  'supporting_claims' | 'anomalous_claims';

// ── Claim row ─────────────────────────────────────────────────────────────────

function ClaimRow({
  claim, onRemove, anomalous = false,
}: {
  claim: ClaimRead;
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
          {claim.claim_text}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <EpistemicBadge status={claim.epistemic_status} />
          <ClaimTypeBadge type={claim.claim_type} />
          {claim.source_title && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {claim.source_title}
            </span>
          )}
          {claim.page_ref && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              p. {claim.page_ref}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(claim.id)}
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

// ── Claim search / add panel ───────────────────────────────────────────────────

function ClaimAdder({
  slot, currentIds, onAdd,
}: {
  slot: ClaimSlot;
  currentIds: Set<string>;
  onAdd: (claim: ClaimRead) => void;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleChange = useCallback((v: string) => {
    setQuery(v);
    const t = setTimeout(() => setDebouncedQuery(v), 300);
    return () => clearTimeout(t);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['claims-search', debouncedQuery],
    queryFn: () => getClaims({ search: debouncedQuery || undefined, page_size: 50 }),
  });

  const results = (data?.items ?? []).filter(c => !currentIds.has(c.id));

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <Input
        label=""
        value={query}
        onChange={e => handleChange(e.target.value)}
        placeholder="Search claims to add…"
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
            No unlinked claims{debouncedQuery ? ' match.' : ' available.'}
          </div>
        )}
        {results.map(c => (
          <button
            key={c.id}
            onClick={() => { onAdd(c); setQuery(''); setDebouncedQuery(''); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'none', border: 'none', borderBottom: '1px solid var(--border-dim)',
              color: 'var(--text-primary)', cursor: 'pointer',
              padding: 'var(--space-3)',
              fontSize: 12, lineHeight: 1.5,
            }}
          >
            <div style={{ marginBottom: 4 }}>{c.claim_text}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <EpistemicBadge status={c.epistemic_status} />
              <ClaimTypeBadge type={c.claim_type} />
              {c.source_title && (
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {c.source_title}
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

  // Local editable copies of claim arrays (managed client-side, flushed on save)
  // const [scopeClaims,      setScopeClaims]      = useState<ClaimRead[] | null>(null);
  const [supportingClaims, setSupportingClaims] = useState<ClaimRead[] | null>(null);
  const [anomalousClaims,  setAnomalousClaims]  = useState<ClaimRead[] | null>(null);

  // Scalar field editing
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    label: string;
    description: string;
    framework: HypothesisFramework;
    status: HypothesisStatus;
    notes: string;
    assumed_ontologies: string[];
  } | null>(null);

  const [saveError, setSaveError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: hyp, isLoading, isError } = useQuery({
    queryKey: ['hypothesis', id],
    queryFn: () => getHypothesis(id!),
    enabled: !!id,
    // Seed local state on first load
    select: (data) => {
      // if (scopeClaims === null)      setScopeClaims(data.scope_claims);
      if (supportingClaims === null) setSupportingClaims(data.supporting_claims);
      if (anomalousClaims === null)  setAnomalousClaims(data.anomalous_claims);
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

  // ── Claim-slot helpers ───────────────────────────────────────────────────────

  function addClaim(slot: ClaimSlot, claim: ClaimRead) {
    const setter = {
      // scope_claims:      setScopeClaims,
      supporting_claims: setSupportingClaims,
      anomalous_claims:  setAnomalousClaims,
    }[slot];
    setter(prev => (prev ? [...prev, claim] : [claim]));
  }

  function removeClaim(slot: ClaimSlot, claimId: string) {
    const setter = {
      // scope_claims:      setScopeClaims,
      supporting_claims: setSupportingClaims,
      anomalous_claims:  setAnomalousClaims,
    }[slot];
    setter(prev => (prev ? prev.filter(c => c.id !== claimId) : []));
  }

  function saveClaimLinks() {
    updateMutation.mutate({
      // scope_claim_ids:      (scopeClaims      ?? []).map(c => c.id),
      supporting_claim_ids: (supportingClaims ?? []).map(c => c.id),
      anomalous_claim_ids:  (anomalousClaims  ?? []).map(c => c.id),
    });
  }

  // Detect unsaved changes
  const claimsChanged = hyp && (
    // JSON.stringify((scopeClaims      ?? []).map(c => c.id)) !== JSON.stringify(hyp.scope_claims.map(c => c.id))      ||
    JSON.stringify((supportingClaims ?? []).map(c => c.id)) !== JSON.stringify(hyp.supporting_claims.map(c => c.id)) ||
    JSON.stringify((anomalousClaims  ?? []).map(c => c.id)) !== JSON.stringify(hyp.anomalous_claims.map(c => c.id))
  );

  // ── Scalar edit helpers ──────────────────────────────────────────────────────

  function startEdit() {
    if (!hyp) return;
    setEditForm({
      label:              hyp.label,
      description:        hyp.description ?? '',
      framework:          hyp.framework,
      status:             hyp.status,
      notes:              hyp.notes ?? '',
      assumed_ontologies: hyp.assumed_ontologies ?? [],
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
      label:              editForm.label.trim(),
      description:        editForm.description.trim() || undefined,
      framework:          editForm.framework,
      status:             editForm.status,
      notes:              editForm.notes.trim() || undefined,
      assumed_ontologies: editForm.assumed_ontologies.length
        ? editForm.assumed_ontologies
        : undefined,
    });
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const anomalousEmpty = (anomalousClaims ?? []).length === 0;

  const allLinkedIds = new Set([
    // ...(scopeClaims      ?? []).map(c => c.id),
    ...(supportingClaims ?? []).map(c => c.id),
    ...(anomalousClaims  ?? []).map(c => c.id),
  ]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError || !hyp) return <Shell><ErrorState message="Failed to load hypothesis." /></Shell>;

  return (
    <Shell>
      <Page
        title={editing && editForm ? editForm.label || '(untitled)' : hyp.label}
        subtitle={`${hyp.framework.replace(/_/g, ' ')} · ${hyp.status}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {claimsChanged && (
              <Button
                variant="primary"
                size="sm"
                onClick={saveClaimLinks}
                disabled={updateMutation.isPending}
              >
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
                  <span style={{ fontSize: 12, color: 'var(--status-error)', fontFamily: 'var(--font-mono)' }}>
                    delete?
                  </span>
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
                  label="Framework"
                  options={FRAMEWORK_OPTIONS}
                  value={editForm.framework}
                  onChange={e => setEditForm(f => f ? { ...f, framework: e.target.value as HypothesisFramework } : f)}
                />
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={editForm.status}
                  onChange={e => setEditForm(f => f ? { ...f, status: e.target.value as HypothesisStatus } : f)}
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
                <Badge
                  label={hyp.framework.replace(/_/g, ' ')}
                  color={FRAMEWORK_COLORS[hyp.framework]}
                />
                <HypothesisStatusBadge status={hyp.status} />
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

              {hyp.notes && (
                <p style={{
                  fontSize: 12, color: 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)', lineHeight: 1.5,
                }}>
                  {hyp.notes}
                </p>
              )}

              <div style={{
                display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-3)',
                paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-dim)',
              }}>
                {/* <div>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                    Scope
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {(scopeClaims ?? hyp.scope_claims).length}
                  </div>
                </div> */}
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                    Supporting
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--status-success)' }}>
                    {(supportingClaims ?? hyp.supporting_claims).length}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: anomalousEmpty ? 'var(--status-error)' : 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
                    Anomalous
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: anomalousEmpty ? 'var(--status-error)' : 'var(--text-primary)' }}>
                    {(anomalousClaims ?? hyp.anomalous_claims).length}
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>

    

        {/* ── Claim sections ── */}

        {/* <ClaimSection
          title="Scope"
          subtitle="What this hypothesis purports to explain"
          claims={scopeClaims ?? []}
          slot="scope_claims"
          allLinkedIds={allLinkedIds}
          onAdd={(c) => addClaim('scope_claims', c)}
          onRemove={(id) => removeClaim('scope_claims', id)}
        /> */}

        <ClaimSection
          title="Supporting evidence"
          subtitle="Claims that support this hypothesis"
          claims={supportingClaims ?? []}
          slot="supporting_claims"
          allLinkedIds={allLinkedIds}
          onAdd={(c) => addClaim('supporting_claims', c)}
          onRemove={(id) => removeClaim('supporting_claims', id)}
        />

        <ClaimSection
          title="Anomalous claims"
          subtitle="Evidence this hypothesis cannot explain"
          claims={anomalousClaims ?? []}
          slot="anomalous_claims"
          allLinkedIds={allLinkedIds}
          anomalous
          onAdd={(c) => addClaim('anomalous_claims', c)}
          onRemove={(id) => removeClaim('anomalous_claims', id)}
        />

        {claimsChanged && (
          <div style={{
            marginTop: 'var(--space-5)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--bg-0)',
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Unsaved claim changes
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={saveClaimLinks}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'saving…' : 'save changes'}
            </Button>
          </div>
        )}
      </Page>
    </Shell>
  );
}

// ── Claim section component ───────────────────────────────────────────────────

function ClaimSection({
  title, subtitle, claims, slot, allLinkedIds, anomalous = false, onAdd, onRemove,
}: {
  title: string;
  subtitle: string;
  claims: ClaimRead[];
  slot: ClaimSlot;
  allLinkedIds: Set<string>;
  anomalous?: boolean;
  onAdd: (c: ClaimRead) => void;
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
      {/* Section header */}
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
          <span style={{
            fontSize: 11, color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)', marginRight: 4,
          }}>
            {claims.length}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAdder(v => !v)}
          >
            {showAdder ? 'done' : '+ add'}
          </Button>
        </div>
      </div>

      {/* Claim list */}
      <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {claims.length === 0 && !showAdder && (
          <EmptyState message={anomalous
            ? 'No anomalous claims — use + add to declare what this hypothesis cannot explain.'
            : 'No claims linked yet.'
          } />
        )}
        {claims.map(c => (
          <ClaimRow
            key={c.id}
            claim={c}
            anomalous={anomalous}
            onRemove={onRemove}
          />
        ))}
        {showAdder && (
          <ClaimAdder
            slot={slot}
            currentIds={allLinkedIds}
            onAdd={(c) => { onAdd(c); }}
          />
        )}
      </div>
    </div>
  );
}
