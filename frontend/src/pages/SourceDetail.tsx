import React, { useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSource, getSourceObservations, triggerIngest, updateSource, uploadSourceFile } from '../api';
import type { DisciplinaryFrame, ProvenanceQuality, SourceRead } from '../types';
import { AddObservationModal } from '../components/AddObservationModal';
import {
  Page, Spinner, ErrorState, EmptyState,
  SourceTypeBadge, ProvenanceBadge, IngestionDot,
  ObservationEpistemicBadge, ContentTypeBadge, CollectionMethodBadge,
  Button, Card, Stat, SectionHeader, Select, Input,
} from '../components/ui';
import { Shell } from '../components/Shell';

const DISCIPLINE_OPTIONS: { value: DisciplinaryFrame; label: string }[] = [
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

const PROVENANCE_OPTIONS: { value: ProvenanceQuality; label: string }[] = [
  { value: 'peer_reviewed', label: 'Peer reviewed' },
  { value: 'grey_literature', label: 'Grey literature' },
  { value: 'anecdotal', label: 'Anecdotal' },
  { value: 'investigator_report', label: 'Investigator report' },
  { value: 'self_reported', label: 'Self reported' },
  { value: 'unknown', label: 'Unknown' },
];

export function SourceDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [ingestError, setIngestError] = useState('');
  const [showAddObs, setShowAddObs] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: source, isLoading, isError } = useQuery({
    queryKey: ['source', id],
    queryFn: () => getSource(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.ingestion_status;
      return status === 'processing' || status === 'pending' ? 3000 : false;
    },
  });

  const { data: observations, isLoading: obsLoading } = useQuery({
    queryKey: ['source-observations', id],
    queryFn: () => getSourceObservations(id!),
    enabled: !!id,
  });

  const ingestMutation = useMutation({
    mutationFn: (method: 'ai' | 'manual') => triggerIngest(id!, method),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['source', id] });
      setIngestError('');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setIngestError(msg ?? 'Ingestion failed');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadSourceFile(id!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['source', id] });
      setUploadError('');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setUploadError(msg ?? 'Upload failed');
    },
  });

  if (isLoading) return <Shell><Spinner /></Shell>;
  if (isError || !source) return <Shell><ErrorState message="Source not found" /></Shell>;

  const isProcessing = source.ingestion_status === 'processing' || source.ingestion_status === 'pending';

  return (
    <Shell>
      <Page
        title={source.title}
        subtitle={source.authors?.join(', ')}
        actions={
          <Link to="/sources">
            <Button size="sm">← sources</Button>
          </Link>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-5)' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

            {/* Observations */}
            <div>
              <SectionHeader action={
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  {observations?.length ?? 0} observations
                </span>
              }>
                Extracted Observations
              </SectionHeader>

              {obsLoading && <Spinner />}

              {observations && observations.length === 0 && (
                <EmptyState message="no observations extracted yet" />
              )}

              {observations && observations.map(obs => (
                <div
                  key={obs.id}
                  style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--border-dim)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <ObservationEpistemicBadge status={obs.epistemic_status} />
                    <ContentTypeBadge type={obs.content_type} />
                    <CollectionMethodBadge method={obs.collection_method} />
                    {obs.page_ref && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--text-dim)',
                      }}>
                        p.{obs.page_ref}
                      </span>
                    )}
                    {obs.ai_extracted && !obs.reviewed_at && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--status-warn)',
                        background: 'var(--status-warn-bg)',
                        border: '1px solid var(--status-warn)44',
                        padding: '1px 7px', borderRadius: 20,
                      }}>
                        unreviewed
                      </span>
                    )}
                    {obs.epistemic_distance === 'aggregated' && obs.sample_n != null && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: 'var(--text-dim)',
                        border: '1px solid var(--border-dim)',
                        padding: '1px 6px', borderRadius: 20,
                      }}>
                        n={obs.sample_n}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 13,
                    fontFamily: obs.verbatim ? 'var(--font-mono)' : 'var(--font-sans)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.6,
                  }}>
                    {obs.verbatim && (
                      <span style={{ color: 'var(--text-dim)', marginRight: 4 }}>"</span>
                    )}
                    {obs.content}
                    {obs.verbatim && (
                      <span style={{ color: 'var(--text-dim)', marginLeft: 2 }}>"</span>
                    )}
                  </p>
                  {obs.reviewed_by && (
                    <div style={{
                      marginTop: 'var(--space-2)',
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: 'var(--text-dim)',
                    }}>
                      reviewed by {obs.reviewed_by}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            {source.notes && (
              <div>
                <SectionHeader>Notes</SectionHeader>
                <pre style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap', lineHeight: 1.6,
                }}>
                  {source.notes}
                </pre>
              </div>
            )}
          </div>

          {/* Right column — metadata + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Stats */}
            <Card style={{ padding: 'var(--space-4)', display: 'flex', gap: 'var(--space-5)' }}>
              <Stat label="Observations" value={source.observation_count} />
              <Stat label="Year" value={source.publication_date ?? '—'} />
            </Card>

            {/* Metadata */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader action={
                <button
                  onClick={() => setEditing(e => !e)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: editing ? 'var(--accent)' : 'var(--text-dim)',
                    padding: '2px 6px',
                  }}
                >
                  {editing ? 'cancel' : 'edit'}
                </button>
              }>
                Metadata
              </SectionHeader>

              {editing ? (
                <EditMetadataForm
                  source={source}
                  onSaved={() => {
                    setEditing(false);
                    qc.invalidateQueries({ queryKey: ['source', id] });
                    qc.invalidateQueries({ queryKey: ['sources'] });
                  }}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <MetaRow label="Type"><SourceTypeBadge type={source.source_type} /></MetaRow>
                  <MetaRow label="Provenance"><ProvenanceBadge quality={source.provenance_quality} /></MetaRow>
                  {source.disciplinary_frame && (
                    <MetaRow label="Discipline">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        {source.disciplinary_frame.replace(/_/g, ' ')}
                      </span>
                    </MetaRow>
                  )}
                  {source.doi && (
                    <MetaRow label="DOI">
                      <a
                        href={`https://doi.org/${source.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
                      >
                        {source.doi}
                      </a>
                    </MetaRow>
                  )}
                  {source.url && (
                    <MetaRow label="URL">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}
                      >
                        ↗ link
                      </a>
                    </MetaRow>
                  )}
                  {source.file_ref && (
                    <MetaRow label="File">
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        {source.file_ref.split('_').slice(1).join('_')}
                      </span>
                    </MetaRow>
                  )}
                </div>
              )}
            </Card>

            {/* Ingestion */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader>Ingestion</SectionHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {source.ingestion_status && (
                  <IngestionDot status={source.ingestion_status} />
                )}

                {source.ingestion_error && (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--status-error)',
                    padding: 'var(--space-2)',
                    border: '1px solid var(--status-error)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--status-error-bg)',
                  }}>
                    {source.ingestion_error}
                  </div>
                )}

                {ingestError && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--status-error)' }}>
                    ✗ {ingestError}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) uploadMutation.mutate(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  size="sm"
                  disabled={uploadMutation.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadMutation.isPending ? 'uploading…' : source.file_ref ? '↑ replace file' : '↑ upload file'}
                </Button>

                {uploadError && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--status-error)' }}>
                    ✗ {uploadError}
                  </div>
                )}

                {source.file_ref && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isProcessing || ingestMutation.isPending}
                    onClick={() => ingestMutation.mutate('ai')}
                  >
                    {ingestMutation.isPending ? 'queuing…' : isProcessing ? 'processing…' : '⚡ run AI extraction'}
                  </Button>
                )}

                {!source.file_ref && (
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-dim)', lineHeight: 1.5,
                  }}>
                    Upload a file to enable AI observation extraction
                  </p>
                )}

                {isProcessing && (
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--status-info)', lineHeight: 1.6,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span className="dot" style={{ background: 'var(--status-info)', flexShrink: 0 }} />
                    Pipeline running — polling every 3s
                  </p>
                )}

                {source.ingestion_status === 'complete' && (
                  <Link
                    to={`/review?source_id=${source.id}`}
                    style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    → review extracted observations
                  </Link>
                )}
              </div>
            </Card>

            {/* Manual entry */}
            <Card style={{ padding: 'var(--space-4)' }}>
              <SectionHeader>Manual Entry</SectionHeader>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowAddObs(true)}
              >
                + add observation
              </Button>
            </Card>

            {/* ID */}
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              color: 'var(--text-dim)', letterSpacing: '0.04em',
            }}>
              {source.id}
            </div>
          </div>
        </div>
      </Page>

      {showAddObs && (
        <AddObservationModal
          sourceId={source.id}
          onClose={() => setShowAddObs(false)}
          onCreated={() => {
            setShowAddObs(false);
            qc.invalidateQueries({ queryKey: ['source-observations', id] });
            qc.invalidateQueries({ queryKey: ['source', id] });
          }}
        />
      )}
    </Shell>
  );
}

// ── Edit metadata form ────────────────────────────────────────────────────────

function EditMetadataForm({
  source,
  onSaved,
  onCancel,
}: {
  source: SourceRead;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(source.title);
  const [authors, setAuthors] = useState(source.authors?.join(', ') ?? '');
  const [publicationDate, setPublicationDate] = useState(source.publication_date ?? '');
  const [url, setUrl] = useState(source.url ?? '');
  const [doi, setDoi] = useState(source.doi ?? '');
  const [discipline, setDiscipline] = useState<DisciplinaryFrame | ''>(source.disciplinary_frame ?? '');
  const [provenance, setProvenance] = useState<ProvenanceQuality>(source.provenance_quality);
  const [notes, setNotes] = useState(source.notes ?? '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => updateSource(source.id, {
      title: title.trim() || undefined,
      authors: authors.trim() ? authors.split(',').map(a => a.trim()).filter(Boolean) : undefined,
      publication_date: publicationDate.trim() || undefined,
      url: url.trim() || undefined,
      doi: doi.trim() || undefined,
      disciplinary_frame: (discipline as DisciplinaryFrame) || undefined,
      provenance_quality: provenance,
      notes: notes.trim() || undefined,
    }),
    onSuccess: onSaved,
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? 'Save failed');
    },
  });

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title</span>
        <input value={title} onChange={e => setTitle(e.target.value)} style={fieldStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Authors (comma-separated)</span>
        <input value={authors} onChange={e => setAuthors(e.target.value)} style={fieldStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</span>
        <input value={publicationDate} onChange={e => setPublicationDate(e.target.value)} placeholder="e.g. 1987 or 1987-03-15" style={fieldStyle} />
      </label>

      <Select
        label="Discipline"
        options={DISCIPLINE_OPTIONS}
        placeholder="— none —"
        value={discipline}
        onChange={e => setDiscipline(e.target.value as DisciplinaryFrame | '')}
        style={{ fontSize: 11 }}
      />

      <Select
        label="Provenance"
        options={PROVENANCE_OPTIONS}
        value={provenance}
        onChange={e => setProvenance(e.target.value as ProvenanceQuality)}
        style={{ fontSize: 11 }}
      />

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>URL</span>
        <input value={url} onChange={e => setUrl(e.target.value)} style={fieldStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>DOI</span>
        <input value={doi} onChange={e => setDoi(e.target.value)} style={fieldStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</span>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </label>

      {error && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--status-error)' }}>
          ✗ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <Button size="sm" variant="primary" disabled={mutation.isPending || !title.trim()} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'saving…' : 'save'}
        </Button>
        <Button size="sm" disabled={mutation.isPending} onClick={onCancel}>cancel</Button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10,
        color: 'var(--text-dim)', letterSpacing: '0.06em',
        textTransform: 'uppercase', flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{ textAlign: 'right' }}>{children}</span>
    </div>
  );
}
