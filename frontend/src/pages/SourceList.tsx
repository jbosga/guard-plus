import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSources } from '../api';
import type { DisciplinaryFrame, ProvenanceQuality, SourceType } from '../types';
import {
  Page, Spinner, ErrorState, EmptyState, Pagination,
  SourceTypeBadge, ProvenanceBadge, IngestionDot, Button, Select,
} from '../components/ui';
import { Shell } from '../components/Shell';
import { AddSourceModal } from '../components/AddSourceModal';

const SOURCE_TYPE_OPTIONS = [
  { value: 'account', label: 'Account' },
  { value: 'paper', label: 'Paper' },
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

export function SourceList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sourceType, setSourceType] = useState<SourceType | ''>('');
  const [frame, setFrame] = useState<DisciplinaryFrame | ''>('');
  const [provenance, setProvenance] = useState<ProvenanceQuality | ''>('');
  const [showAdd, setShowAdd] = useState(false);

  const params = {
    page,
    page_size: 25,
    ...(search && { search }),
    ...(sourceType && { source_type: sourceType }),
    ...(frame && { disciplinary_frame: frame }),
    ...(provenance && { provenance_quality: provenance }),
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['sources', params],
    queryFn: () => getSources(params),
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function resetFilters() {
    setSearch(''); setSearchInput('');
    setSourceType(''); setFrame(''); setProvenance('');
    setPage(1);
  }

  const hasFilters = search || sourceType || frame || provenance;

  return (
    <Shell>
      <Page
        title="Sources"
        subtitle={data ? `${data.total} sources in corpus` : undefined}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
            + add source
          </Button>
        }
      >
        {/* Filters */}
        <div style={{
          display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap',
          marginBottom: 'var(--space-4)',
          paddingBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--border-dim)',
        }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="search titles…"
              style={{
                background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '5px 10px',
                fontSize: 13, outline: 'none', width: 200,
              }}
            />
            <Button size="sm" type="submit">search</Button>
          </form>

          <Select
            options={SOURCE_TYPE_OPTIONS}
            placeholder="all types"
            value={sourceType}
            onChange={e => { setSourceType(e.target.value as SourceType | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={FRAME_OPTIONS}
            placeholder="all disciplines"
            value={frame}
            onChange={e => { setFrame(e.target.value as DisciplinaryFrame | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          <Select
            options={PROV_OPTIONS}
            placeholder="all provenance"
            value={provenance}
            onChange={e => { setProvenance(e.target.value as ProvenanceQuality | ''); setPage(1); }}
            style={{ fontSize: 11 }}
          />
          {hasFilters && (
            <Button size="sm" onClick={resetFilters} style={{ color: 'var(--text-dim)' }}>
              × clear
            </Button>
          )}
        </div>

        {isLoading && <Spinner />}
        {isError && <ErrorState message="Failed to load sources" />}

        {data && (
          <>
            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%', borderCollapse: 'collapse',
                fontFamily: 'var(--font-mono)', fontSize: 12,
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    {['Title', 'Type', 'Discipline', 'Provenance', 'Year', 'Obs.', 'Ingestion'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '6px 12px',
                        fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState message="no sources match the current filters" />
                      </td>
                    </tr>
                  )}
                  {data.items.map((source, i) => (
                    <tr
                      key={source.id}
                      className="fade-in"
                      style={{
                        borderBottom: '1px solid var(--border-dim)',
                        animationDelay: `${i * 20}ms`,
                        transition: 'background var(--t-fast)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-1)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '8px 12px', maxWidth: 380 }}>
                        <Link
                          to={`/sources/${source.id}`}
                          style={{
                            color: 'var(--text-primary)', textDecoration: 'none',
                            display: 'block',
                          }}
                        >
                          <div className="truncate" style={{ fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                            {source.title}
                          </div>
                          {source.authors && source.authors.length > 0 && (
                            <div style={{
                              fontSize: 10, color: 'var(--text-dim)',
                              marginTop: 2, fontFamily: 'var(--font-mono)',
                            }}>
                              {source.authors.slice(0, 2).join(', ')}
                              {source.authors.length > 2 && ' et al.'}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <SourceTypeBadge type={source.source_type} />
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {source.disciplinary_frame ? (
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {source.disciplinary_frame.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <ProvenanceBadge quality={source.provenance_quality} />
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {source.publication_date ?? '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontWeight: 500,
                          color: source.observation_count > 0 ? 'var(--accent)' : 'var(--text-dim)',
                        }}>
                          {source.observation_count}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        {source.ingestion_status ? (
                          <IngestionDot status={source.ingestion_status} />
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={data.page}
              pages={data.pages}
              total={data.total}
              onPage={setPage}
            />
          </>
        )}
      </Page>

      {showAdd && (
        <AddSourceModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); refetch(); }}
        />
      )}
    </Shell>
  );
}
