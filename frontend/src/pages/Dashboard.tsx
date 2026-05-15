import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStats } from '../api';
import { Shell, Page } from '../components/Shell';
import { Spinner } from '../components/ui';

interface StatTileProps {
  label: string;
  value: number | undefined;
  sublabel?: string;
  path: string;
}

function StatTile({ label, value, sublabel, path }: StatTileProps) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(path)}
      style={{
        background: 'var(--bg-0)',
        border: '1px solid var(--border-dim)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-5)',
        cursor: 'pointer',
        transition: 'var(--t-fast)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dim)')}
    >
      <span style={{
        fontSize: 32,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-primary)',
        lineHeight: 1,
      }}>
        {value ?? '—'}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>
        {label}
      </span>
      {sublabel && (
        <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          {sublabel}
        </span>
      )}
    </div>
  );
}

const WORKFLOW_STEPS = [
  { n: 1, label: 'Add a source',           desc: 'Upload a PDF and declare its type (case report, empirical study, review, or theoretical). Source type gates all downstream processing.',                              path: '/sources'      },
  { n: 2, label: 'Extract records',         desc: 'Run AI ingestion. Case report sources produce structured Case drafts; all other sources produce Observation drafts for the review queue.',                        path: '/review'       },
  { n: 3, label: 'Review drafts',           desc: 'Accept or reject AI-extracted records. Edit any field before accepting. Only reviewed records enter the corpus.',                                                  path: '/review'       },
  { n: 4, label: 'Browse and export',       desc: 'Filter and inspect cases. Export to CSV for external analysis (R, Python). Results can be re-entered as corpus-derived observations with full provenance.',       path: '/cases'        },
  { n: 5, label: 'Build hypotheses',        desc: 'Link supporting and anomalous observations to a hypothesis. Each hypothesis must declare what it cannot explain — anomalous entries are required.',              path: '/hypotheses'   },
  { n: 6, label: 'Combine into frameworks', desc: 'Combine hypotheses into an explanatory framework — a specific account of the AAE built from one or more building-block hypotheses, all sharing an assumed ontology.',    path: '/frameworks'   },
  { n: 7, label: 'Visualise',               desc: 'Explore concept relationships in the knowledge graph. Anomalous_given edges are rendered in red to make structural tensions immediately visible.',                path: '/graph'        },
];

function WorkflowRow({ n, label, desc, path }: { n: number; label: string; desc: string; path: string }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(path)}
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 180px 1fr',
        alignItems: 'start',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-0)',
        border: '1px solid var(--border-dim)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'var(--t-fast)',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dim)')}
    >
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--accent)', fontWeight: 600, paddingTop: 1,
      }}>
        {String(n).padStart(2, '0')}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {desc}
      </span>
    </div>
  );
}

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    staleTime: 60_000,
  });

  return (
    <Shell>
      <Page
        title="Dashboard"
        subtitle="Global UFO Abduction Research Database"
      >
        {/* Corpus counts */}
        <section style={{ marginBottom: 'var(--space-7)' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 'var(--space-3)',
          }}>
            Corpus
          </div>
          {isLoading ? <Spinner /> : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 'var(--space-3)',
            }}>
              <StatTile label="Sources"      value={stats?.sources}      sublabel={`incl. ${stats?.case_reports ?? '—'} case reports`} path="/sources"      />
              <StatTile label="Cases"        value={stats?.cases}        sublabel="structured accounts"   path="/cases"        />
              <StatTile label="Observations" value={stats?.observations} sublabel="literature & derived"  path="/observations" />
              <StatTile label="Hypotheses"   value={stats?.hypotheses}   sublabel="under investigation"   path="/hypotheses"   />
              <StatTile label="Frameworks"   value={stats?.frameworks}   sublabel="theoretical groupings" path="/frameworks"   />
            </div>
          )}
        </section>

        {/* Workflow */}
        <section style={{ marginBottom: 'var(--space-7)' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 'var(--space-3)',
          }}>
            Workflow
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {WORKFLOW_STEPS.map(step => (
              <WorkflowRow key={step.n} {...step} />
            ))}
          </div>
        </section>

        {/* Tagline */}
        <div style={{
          borderTop: '1px solid var(--border-dim)',
          paddingTop: 'var(--space-4)',
          fontSize: 12,
          color: 'var(--text-dim)',
          fontStyle: 'italic',
          lineHeight: 1.7,
          maxWidth: 600,
        }}>
          Neither credulous nor dismissive. First-person accounts are treated as primary empirical data.
          Anomalies are signals, not noise. Confirmation bias is countered at the schema level.
        </div>
      </Page>
    </Shell>
  );
}
