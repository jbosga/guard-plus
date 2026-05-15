import { Shell, Page } from '../components/Shell';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-7)' }}>
      <div style={{
        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--text-dim)',
        fontFamily: 'var(--font-mono)',
        marginBottom: 'var(--space-4)',
      }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8,
      maxWidth: 680,
      display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
    }}>
      {children}
    </div>
  );
}

function GlossaryRow({ term, definition }: { term: string; definition: string }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '220px 1fr',
      gap: 'var(--space-4)',
      padding: 'var(--space-3) 0',
      borderBottom: '1px solid var(--border-dim)',
      alignItems: 'start',
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--text-primary)', fontWeight: 500,
        paddingTop: 2,
      }}>
        {term}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        {definition}
      </span>
    </div>
  );
}

const GLOSSARY: Array<{ term: string; definition: string }> = [
  {
    term: 'AAE',
    definition: 'Alien Abduction Experience. First-person accounts of apparent contact, examination, or transport by non-human entities. Treated here as primary empirical data — neither accepted at face value nor dismissed as pathology.',
  },
  {
    term: 'Case report',
    definition: 'A source document recording a single AAE account. The epistemic bedrock of the corpus. All structured Case records trace back to a case report source.',
  },
  {
    term: 'Case',
    definition: 'A structured record of a single account, extracted from a case report source. Covers ~100 fields across phenomenology, context, experiencer background, entity characteristics, and corroboration.',
  },
  {
    term: 'Observation',
    definition: 'A derived claim about a pattern. Either extracted from literature (an empirical study, review paper, or theoretical text) or computed externally from the case corpus and re-entered with provenance metadata.',
  },
  {
    term: 'Corpus-derived observation',
    definition: 'An observation produced by running analysis on the exported case dataset. Carries full provenance: query definition, analysis tool, corpus snapshot date, and case count at snapshot. A staleness flag fires when the corpus has grown by >20% since the snapshot.',
  },
  {
    term: 'Epistemic status',
    definition: "The claimed certainty of an observation: reported (stated by authors without strong evidence), asserted (treated as background fact), observed (grounded in authors' own collected data), inferred (load-bearing citation from the literature), speculative (explicitly uncertain), or contested (contradicted elsewhere).",
  },
  {
    term: 'anomalous_given',
    definition: 'A first-class relationship type in the knowledge graph, rendered in red. Marks when one concept is anomalous relative to another — a structural record of where the evidence creates tension rather than resolution.',
  },
  {
    term: 'Hypothesis',
    definition: 'An explanatory candidate, linked to supporting and anomalous observations. Anomalous observation slots are required — a hypothesis with nothing it cannot explain is not falsifiable. Hypotheses also carry a falsification condition.',
  },
  {
    term: 'Explanatory framework',
    definition: 'A specific explanation for the AAE, built from one or more hypotheses. Frameworks share an assumed ontology and must declare at least one anomalous hypothesis — a hypothesis that the framework cannot currently accommodate.',
  },
  {
    term: 'Assumed ontology',
    definition: 'The ontological commitments a hypothesis or framework makes explicit — e.g. materialist, dualist, information-theoretic, interdimensional. Stored as a queryable field so the system can reveal which conclusions depend on which metaphysical priors.',
  },
  {
    term: 'Review queue',
    definition: 'AI-extracted Case and Observation drafts queue here before entering the corpus. A human reviewer accepts (with optional field edits) or rejects each draft. The AI suggests; the human confirms.',
  },
];

export function About() {
  return (
    <Shell>
      <Page title="About" subtitle="Project background and usage guide">

        <Section title="What this is">
          <Prose>
            <p>
              This system supports a rigorous scientific study of the alien abduction experience (AAE) —
              first-person accounts of apparent contact with non-human entities. The project's epistemological
              stance is critical, but open-minded: accounts are treated as primary empirical data worthy
              of systematic study, not as testimony to be accepted or pathology to be explained away.
            </p>
            <p>
              The working assumption is that adequate explanation may require frameworks that go beyond strict
              materialism while remaining scientifically rigorous. Ontological assumptions are made explicit and
              queryable rather than encoded invisibly into the data model. 
            </p>
            <p>
              Concretely, this means: hypotheses connect to both supporting and anomalous observations;{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>anomalous_given</code> is
              a first-class relationship type in the knowledge graph, rendered visually distinct; and assumed
              ontologies are stored as queryable fields so conclusions can be traced back to their metaphysical
              priors.
            </p>
          </Prose>
        </Section>

        <Section title="Data model">
          <Prose>
            <p>
              The corpus is organised in four layers.{' '}
              <strong style={{ color: 'var(--text-primary)' }}>Sources</strong> are
              the input documents — case reports, empirical studies, review papers, and theoretical texts. Source
              type is declared upfront and gates all downstream processing.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Cases</strong> are structured records of individual
              AAE accounts, extracted from case report sources via AI-assisted ingestion and human review. They
              form the empirical bedrock: ~100 structured fields covering phenomenology, context, experiencer
              background, entity characteristics, and corroboration. Cases can be exported to CSV for external
              analysis.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Observations</strong> are derived claims about
              patterns — extracted from literature sources, or computed from the case corpus externally and
              re-entered with provenance metadata. They are the connective tissue between raw data and
              interpretation.
            </p>
            <p>
              <strong style={{ color: 'var(--text-primary)' }}>Hypotheses</strong> are the building blocks of the
              synthesis layer — individual explanatory proposals, each linked to supporting and anomalous
              observations.{' '}
              <strong style={{ color: 'var(--text-primary)' }}>Explanatory Frameworks</strong> combine one or more
              hypotheses into a coherent account of the AAE. The knowledge graph visualises concept relationships
              across all layers.
            </p>
          </Prose>
        </Section>

        <Section title="Workflow">
          <Prose>
            <p>
              The intended sequence is linear but not rigid. Steps 1–3 populate the corpus; steps 4–7 build
              interpretation on top of it.
            </p>
          </Prose>
          <div style={{ marginTop: 'var(--space-4)', maxWidth: 720 }}>
            {[
              ['01 — Add a source',           'Go to Sources → New source. Declare the source type upfront — this determines what gets extracted downstream. Upload the PDF if you have one.'],
              ['02 — Extract records',         'From the source detail page, trigger ingestion. Case report sources produce Case drafts; all other source types produce Observation drafts. AI extraction runs in the background; poll the source status until complete.'],
              ['03 — Review drafts',           'Go to Review (or Cases → Review queue for case reports). Each draft shows all extracted fields. Accept with optional edits, or reject. Only accepted records enter the corpus.'],
              ['04 — Browse and export',       'Cases can be filtered by a wide range of fields and exported to CSV. Run external analysis (R, Python, etc.) on the export and re-enter computed results as corpus-derived observations, with full provenance.'],
              ['05 — Build hypotheses',        'Go to Hypotheses → New hypothesis. Link supporting observations and — critically — anomalous observations. The system warns when a hypothesis has no anomalous entries. Set a falsification condition.'],
              ['06 — Combine into frameworks', 'Go to Frameworks → New framework. Select an assumed ontology, then link core hypotheses (the building blocks of the explanation) and anomalous hypotheses (those the framework cannot currently accommodate).'],
              ['07 — Visualise',               'The Graph view shows concept relationships across the corpus. Filter by concept type, relationship type, or anomalous-only. Click any node to highlight its neighbourhood and open the detail panel.'],
            ].map(([step, desc]) => (
              <div key={step} style={{
                display: 'grid', gridTemplateColumns: '200px 1fr',
                gap: 'var(--space-4)',
                padding: 'var(--space-3) 0',
                borderBottom: '1px solid var(--border-dim)',
                alignItems: 'start',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11,
                  color: 'var(--accent)', fontWeight: 500, paddingTop: 2,
                }}>
                  {step}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {desc}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Glossary">
          <div style={{ maxWidth: 720 }}>
            {GLOSSARY.map(g => <GlossaryRow key={g.term} {...g} />)}
          </div>
        </Section>

      </Page>
    </Shell>
  );
}
