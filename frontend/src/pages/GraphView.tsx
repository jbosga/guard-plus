import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import cytoscape from 'cytoscape';
import type { Core, NodeSingular, EventObject } from 'cytoscape';
import {
  getFrameworks,
  getHypotheses,
  getHypothesis,
  getObservations,
} from '../api';
import type {
  TheoreticalFrameworkList,
  HypothesisList,
  HypothesisRead,
  ObservationRead,
  HypothesisFramework,
} from '../types';
import { Shell } from '../components/Shell';
import { Page } from '../components/Shell';
import {
  Badge, Button, Select, Spinner, ErrorState, EmptyState,
  HypothesisTypeBadge, HypothesisStatusBadge, ConfidenceBadge,
  FrameworkStatusBadge, ObservationEpistemicBadge, ContentTypeBadge,
} from '../components/ui';

// ── Node type colours ─────────────────────────────────────────────────────────

const NODE_COLORS = {
  framework:   '#0969da',   // GitHub blue — top-level
  hypothesis:  '#a78bfa',   // violet — mid layer
  observation_supporting: '#22c55e',  // green — supports
  observation_anomalous:  '#ff2b2b',  // anomaly red — challenges
};

// Framework type → hue tint on framework nodes
const FRAMEWORK_TYPE_BORDER: Record<HypothesisFramework, string> = {
  neurological:          '#4e9af1',
  psychological:         '#34d399',
  sociocultural:         '#fbbf24',
  physical:              '#f87171',
  interdimensional:      '#c084fc',
  information_theoretic: '#60a5fa',
  psychospiritual:       '#fb923c',
  unknown:               '#6b7280',
};

// ── Edge colours ──────────────────────────────────────────────────────────────

const EDGE_COLORS = {
  obs_supports:   '#22c55e',   // green
  obs_challenges: '#ff2b2b',   // anomaly red
  hyp_core:       '#a78bfa',   // violet
  hyp_anomalous:  '#ff2b2b',   // red
  hyp_competitor: '#f97316',   // orange
};

// ── Graph data types ──────────────────────────────────────────────────────────

interface GraphData {
  frameworks: TheoreticalFrameworkList[];
  hypotheses: HypothesisRead[];
  // observations are embedded in hypothesisReads
}

// ── Detail panel types ────────────────────────────────────────────────────────

type SelectedNodeKind =
  | { kind: 'framework'; fw: TheoreticalFrameworkList }
  | { kind: 'hypothesis'; hyp: HypothesisRead }
  | { kind: 'observation'; obs: ObservationRead; role: 'supporting' | 'anomalous' };

// ── Build Cytoscape elements ──────────────────────────────────────────────────

function buildElements(
  data: GraphData,
  filterFrameworkId: string,
  anomalousOnly: boolean,
): cytoscape.ElementDefinition[] {
  const elements: cytoscape.ElementDefinition[] = [];
  const obsNodeIds = new Set<string>(); // deduplicate observation nodes

  const frameworks = filterFrameworkId
    ? data.frameworks.filter(f => f.id === filterFrameworkId)
    : data.frameworks;

  const frameworkIdSet = new Set(frameworks.map(f => f.id));

  // Collect hypothesis IDs that belong to selected frameworks
  const visibleHypIds = new Set<string>();
  data.hypotheses.forEach(h => {
    // Always include if no framework filter; otherwise only if its framework node is visible
    // We determine framework membership from the framework's hypothesis lists —
    // but HypothesisList doesn't carry framework_id directly. We use the `framework`
    // field on hypothesis (the framework TYPE enum), not the framework entity ID.
    // Instead we look at which frameworks list this hypothesis.
    if (!filterFrameworkId) {
      visibleHypIds.add(h.id);
    }
  });

  // If filtering by framework, find which hypotheses belong to it via framework read data
  if (filterFrameworkId) {
    data.hypotheses.forEach(h => {
      // We don't have per-hypothesis framework_id, so we rely on framework data
      // The HypothesisList `framework` field is the framework TYPE (neurological etc),
      // not the entity id. Framework membership is tracked in framework join tables.
      // We approximate: show all hypotheses that share the framework TYPE of the selected framework.
      const fw = data.frameworks.find(f => f.id === filterFrameworkId);
      if (fw && h.framework === fw.framework_type) {
        visibleHypIds.add(h.id);
      }
    });
  } else {
    data.hypotheses.forEach(h => visibleHypIds.add(h.id));
  }

  // ── Framework nodes ────────────────────────────────────────────────────────
  frameworks.forEach(fw => {
    elements.push({
      data: {
        id: fw.id,
        label: fw.label.length > 40 ? fw.label.slice(0, 38) + '…' : fw.label,
        nodeKind: 'framework',
        color: NODE_COLORS.framework,
        borderColor: FRAMEWORK_TYPE_BORDER[fw.framework_type] ?? '#6b7280',
        size: 52,
      },
    });
  });

  // ── Hypothesis nodes + edges ───────────────────────────────────────────────
  data.hypotheses.forEach(hyp => {
    if (!visibleHypIds.has(hyp.id)) return;

    elements.push({
      data: {
        id: hyp.id,
        label: hyp.label.length > 40 ? hyp.label.slice(0, 38) + '…' : hyp.label,
        nodeKind: 'hypothesis',
        color: NODE_COLORS.hypothesis,
        borderColor: hyp.status === 'refuted' ? '#ef4444' : '#6d28d9',
        size: 36,
      },
    });

    // Hypothesis → Framework edges (core and anomalous)
    // We derive these from the framework side: frameworks list core/anomalous hypothesis IDs.
    // To avoid N+1 here we reverse-map from framework data.
    // This is done in a second pass below.

    // Observation nodes + obs → hyp edges
    if (!anomalousOnly) {
      hyp.supporting_observations.forEach(obs => {
        if (!obsNodeIds.has(obs.id)) {
          obsNodeIds.add(obs.id);
          elements.push({
            data: {
              id: obs.id,
              label: obs.content.length > 45 ? obs.content.slice(0, 43) + '…' : obs.content,
              nodeKind: 'observation_supporting',
              color: NODE_COLORS.observation_supporting,
              borderColor: '#15803d',
              size: 20,
            },
          });
        }
        elements.push({
          data: {
            id: `sup-${obs.id}-${hyp.id}`,
            source: obs.id,
            target: hyp.id,
            color: EDGE_COLORS.obs_supports,
            label: 'supports',
            width: 1.5,
            edgeKind: 'obs_supports',
          },
        });
      });
    }

    hyp.anomalous_observations.forEach(obs => {
      if (!obsNodeIds.has(obs.id)) {
        obsNodeIds.add(obs.id);
        elements.push({
          data: {
            id: obs.id,
            label: obs.content.length > 45 ? obs.content.slice(0, 43) + '…' : obs.content,
            nodeKind: 'observation_anomalous',
            color: NODE_COLORS.observation_anomalous,
            borderColor: '#991b1b',
            size: 20,
          },
          classes: 'anomalous-obs',
        });
      }
      elements.push({
        data: {
          id: `anom-${obs.id}-${hyp.id}`,
          source: obs.id,
          target: hyp.id,
          color: EDGE_COLORS.obs_challenges,
          label: '⚠ challenges',
          width: 2,
          edgeKind: 'obs_challenges',
        },
        classes: 'anomalous-edge',
      });
    });

    // Competing hypothesis edges
    if (!anomalousOnly) {
      hyp.competing_hypotheses.forEach(comp => {
        if (!visibleHypIds.has(comp.id)) return;
        // Emit only one edge per pair (use sorted IDs)
        const edgeId = [hyp.id, comp.id].sort().join('-comp-');
        const alreadyAdded = elements.some(el => el.data?.id === edgeId);
        if (!alreadyAdded) {
          elements.push({
            data: {
              id: edgeId,
              source: hyp.id,
              target: comp.id,
              color: EDGE_COLORS.hyp_competitor,
              label: 'competes',
              width: 1.5,
              edgeKind: 'hyp_competitor',
            },
          });
        }
      });
    }
  });

  // ── Framework ↔ Hypothesis edges (reverse-map from framework data) ─────────
  // We need TheoreticalFrameworkRead to get core/anomalous hypothesis IDs,
  // but we only have TheoreticalFrameworkList here. We approximate using
  // the hypothesis's `framework` field (framework type enum) to connect
  // each hypothesis to its matching framework node. This is a reasonable
  // approximation — the proper solution is to pass framework reads.
  // For now, mark all as 'core' unless they appear in anomalous_hypotheses
  // (which requires framework read data, passed separately).
  // See note in code: pass `frameworkHypEdges` from caller for precision.

  return elements;
}

// ── Cytoscape stylesheet ──────────────────────────────────────────────────────

function buildStylesheet(): cytoscape.Stylesheet[] {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'color': 'var(--text-primary, #1f2328)',
        'font-family': 'JetBrains Mono, IBM Plex Mono, monospace',
        'font-size': '9px',
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 5,
        'text-wrap': 'ellipsis',
        'text-max-width': '110px',
        'width': 'data(size)',
        'height': 'data(size)',
        'border-width': 2.5,
        'border-color': 'data(borderColor)',
        'transition-property': 'border-color border-width opacity',
        'transition-duration': '150ms',
      } as cytoscape.Css.Node,
    },
    {
      selector: 'node[nodeKind="framework"]',
      style: {
        'shape': 'hexagon',
        'font-size': '10px',
        'font-weight': '700',
        'text-max-width': '130px',
        'color': '#0550ae',
      } as cytoscape.Css.Node,
    },
    {
      selector: 'node[nodeKind="hypothesis"]',
      style: {
        'shape': 'round-rectangle',
        'font-size': '9px',
        'color': '#5a2d8f',
      } as cytoscape.Css.Node,
    },
    {
      selector: 'node[nodeKind="observation_supporting"]',
      style: {
        'shape': 'ellipse',
        'font-size': '8px',
        'color': '#15803d',
      } as cytoscape.Css.Node,
    },
    {
      selector: 'node[nodeKind="observation_anomalous"]',
      style: {
        'shape': 'ellipse',
        'font-size': '8px',
        'color': '#991b1b',
      } as cytoscape.Css.Node,
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#0969da',
        'border-width': 4,
      } as cytoscape.Css.Node,
    },
    {
      selector: 'node.dimmed',
      style: { 'opacity': 0.15 } as cytoscape.Css.Node,
    },
    {
      selector: 'edge',
      style: {
        'width': 'data(width)',
        'line-color': 'data(color)',
        'target-arrow-color': 'data(color)',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'label': 'data(label)',
        'font-size': '8px',
        'color': '#6b7280',
        'font-family': 'JetBrains Mono, IBM Plex Mono, monospace',
        'text-rotation': 'autorotate',
        'text-margin-y': -5,
        'opacity': 0.8,
        'transition-property': 'opacity',
        'transition-duration': '150ms',
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.anomalous-edge',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
        'opacity': 0.9,
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.dimmed',
      style: { 'opacity': 0.04 } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge[edgeKind="hyp_competitor"]',
      style: {
        'line-style': 'dotted',
        'target-arrow-shape': 'none',
        'mid-target-arrow-shape': 'none',
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge[edgeKind="hyp_core"]',
      style: {
        'line-color': EDGE_COLORS.hyp_core,
        'target-arrow-color': EDGE_COLORS.hyp_core,
        'width': 2,
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge[edgeKind="hyp_anomalous"]',
      style: {
        'line-color': EDGE_COLORS.hyp_anomalous,
        'target-arrow-color': EDGE_COLORS.hyp_anomalous,
        'line-style': 'dashed',
        'width': 2.5,
      } as cytoscape.Css.Edge,
    },
  ];
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  selected,
  onClose,
}: {
  selected: SelectedNodeKind;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const panelStyle: React.CSSProperties = {
    width: 320,
    flexShrink: 0,
    borderLeft: '1px solid var(--border-dim)',
    background: 'var(--bg-1)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  };

  const headerStyle: React.CSSProperties = {
    padding: '12px 14px 10px',
    borderBottom: '1px solid var(--border-dim)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  };

  const sectionStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-dim)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 4,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
  };

  const kindTag = (
    <span style={{
      fontSize: 9,
      fontFamily: 'var(--font-mono)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: selected.kind === 'framework' ? '#0969da'
           : selected.kind === 'hypothesis' ? '#7c3aed'
           : selected.role === 'anomalous' ? '#dc2626' : '#16a34a',
      background: selected.kind === 'framework' ? '#dbeafe'
                : selected.kind === 'hypothesis' ? '#ede9fe'
                : selected.role === 'anomalous' ? '#fee2e2' : '#dcfce7',
      padding: '2px 7px',
      borderRadius: 10,
      flexShrink: 0,
    }}>
      {selected.kind === 'framework' ? 'framework'
     : selected.kind === 'hypothesis' ? 'hypothesis'
     : selected.role === 'anomalous' ? '⚠ anomalous obs' : 'observation'}
    </span>
  );

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={sectionStyle}>
        <div style={labelStyle}>{label}</div>
        <div style={valueStyle}>{children}</div>
      </div>
    );
  }

  function BadgeRow({ children }: { children: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
        {children}
      </div>
    );
  }

  let content: React.ReactNode;

  if (selected.kind === 'framework') {
    const fw = selected.fw;
    content = (
      <>
        <Field label="Type">
          <Badge label={fw.framework_type.replace(/_/g, ' ')} color="#0969da" bg="#dbeafe" />
        </Field>
        <Field label="Status & confidence">
          <BadgeRow>
            <FrameworkStatusBadge status={fw.status} />
            <ConfidenceBadge level={fw.confidence_level} />
          </BadgeRow>
        </Field>
        <Field label="Hypotheses">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            {fw.core_hypothesis_count} core
            {fw.anomalous_hypothesis_count === 0
              ? <span style={{ color: 'var(--status-error)', marginLeft: 6 }}>· 0 anomalous ⚠</span>
              : <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>· {fw.anomalous_hypothesis_count} anomalous</span>
            }
          </span>
        </Field>
        {fw.assumed_ontologies && fw.assumed_ontologies.length > 0 && (
          <Field label="Assumed ontologies">
            <BadgeRow>
              {fw.assumed_ontologies.map(o => (
                <Badge key={o} label={o} color="var(--text-secondary)" bg="var(--bg-2)" />
              ))}
            </BadgeRow>
          </Field>
        )}
        <div style={{ padding: '10px 14px' }}>
          <button
            onClick={() => navigate(`/frameworks/${fw.id}`)}
            style={{
              width: '100%',
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 0',
              cursor: 'pointer',
            }}
          >
            Open framework →
          </button>
        </div>
      </>
    );
  } else if (selected.kind === 'hypothesis') {
    const hyp = selected.hyp;
    content = (
      <>
        <Field label="Type & framework">
          <BadgeRow>
            <HypothesisTypeBadge type={hyp.hypothesis_type} />
            <Badge label={hyp.framework.replace(/_/g, ' ')} color="var(--text-secondary)" bg="var(--bg-2)" />
          </BadgeRow>
        </Field>
        <Field label="Status & confidence">
          <BadgeRow>
            <HypothesisStatusBadge status={hyp.status} />
            <ConfidenceBadge level={hyp.confidence_level} />
          </BadgeRow>
        </Field>
        <Field label="Observations">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            <span style={{ color: '#16a34a' }}>{hyp.supporting_observations.length} supporting</span>
            {' · '}
            <span style={{ color: hyp.anomalous_observations.length === 0 ? 'var(--status-error)' : '#dc2626' }}>
              {hyp.anomalous_observations.length} anomalous
              {hyp.anomalous_observations.length === 0 && ' ⚠'}
            </span>
          </span>
        </Field>
        {hyp.falsification_condition ? (
          <Field label="Falsification condition">
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {hyp.falsification_condition}
            </span>
          </Field>
        ) : (
          <div style={{ ...sectionStyle }}>
            <span style={{ fontSize: 11, color: 'var(--status-warn)', fontFamily: 'var(--font-mono)' }}>
              ⚠ no falsification condition
            </span>
          </div>
        )}
        {hyp.competing_hypotheses.length > 0 && (
          <Field label="Competes with">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#f97316' }}>
              {hyp.competing_hypotheses.length} hypothes{hyp.competing_hypotheses.length === 1 ? 'is' : 'es'}
            </span>
          </Field>
        )}
        <div style={{ padding: '10px 14px' }}>
          <button
            onClick={() => navigate(`/hypotheses/${hyp.id}`)}
            style={{
              width: '100%',
              background: '#7c3aed',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 0',
              cursor: 'pointer',
            }}
          >
            Open hypothesis →
          </button>
        </div>
      </>
    );
  } else {
    // Observation
    const obs = selected.obs;
    const isAnomalous = selected.role === 'anomalous';
    content = (
      <>
        <Field label="Content">
          <span style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-primary)' }}>
            {obs.content}
          </span>
        </Field>
        <Field label="Classification">
          <BadgeRow>
            <ObservationEpistemicBadge status={obs.epistemic_status} />
            <ContentTypeBadge type={obs.content_type} />
          </BadgeRow>
        </Field>
        <Field label="Role in linked hypothesis">
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: isAnomalous ? '#dc2626' : '#16a34a',
          }}>
            {isAnomalous ? '⚠ challenges hypothesis' : '✓ supports hypothesis'}
          </span>
        </Field>
        {obs.page_ref && (
          <Field label="Page ref">{obs.page_ref}</Field>
        )}
      </>
    );
  }

  const title =
    selected.kind === 'framework' ? selected.fw.label
    : selected.kind === 'hypothesis' ? selected.hyp.label
    : selected.obs.content.slice(0, 60) + (selected.obs.content.length > 60 ? '…' : '');

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {kindTag}
          <div style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
            marginTop: 6, lineHeight: 1.4,
          }}>
            {title}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'var(--text-dim)',
            cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px',
            flexShrink: 0,
          }}
        >×</button>
      </div>
      {content}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const dot = (color: string, label: string, shape: 'circle' | 'hex' | 'rect' = 'circle') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
      <span style={{
        display: 'inline-block',
        width: shape === 'hex' ? 14 : 10,
        height: 10,
        background: color,
        borderRadius: shape === 'circle' ? '50%' : shape === 'rect' ? 2 : 0,
        flexShrink: 0,
        clipPath: shape === 'hex' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : 'none',
      }} />
      {label}
    </div>
  );

  const line = (color: string, label: string, dashed = false) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
      <span style={{
        display: 'inline-block', width: 20, height: 2,
        background: dashed ? `repeating-linear-gradient(90deg, ${color} 0, ${color} 5px, transparent 5px, transparent 8px)` : color,
        flexShrink: 0,
      }} />
      {label}
    </div>
  );

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16,
      background: 'var(--bg-0)',
      border: '1px solid var(--border-dim)',
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      fontSize: 11,
      zIndex: 10,
      minWidth: 180,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', background: 'none', border: 'none',
          fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)',
          cursor: 'pointer', letterSpacing: '0.05em',
        }}
      >
        LEGEND {open ? '▲' : '▼'}
      </button>
      {open && (
        <div style={{ padding: '4px 10px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Nodes</div>
          {dot(NODE_COLORS.framework, 'framework', 'hex')}
          {dot(NODE_COLORS.hypothesis, 'hypothesis', 'rect')}
          {dot(NODE_COLORS.observation_supporting, 'supporting obs')}
          {dot(NODE_COLORS.observation_anomalous, 'anomalous obs')}
          <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4, marginBottom: 2 }}>Edges</div>
          {line(EDGE_COLORS.obs_supports, 'supports')}
          {line(EDGE_COLORS.obs_challenges, '⚠ challenges', true)}
          {line(EDGE_COLORS.hyp_core, 'core of framework')}
          {line(EDGE_COLORS.hyp_anomalous, '⚠ anomalous to fw', true)}
          {line(EDGE_COLORS.hyp_competitor, 'competes with')}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [selectedNode, setSelectedNode] = useState<SelectedNodeKind | null>(null);
  const [filterFrameworkId, setFilterFrameworkId] = useState('');
  const [anomalousOnly, setAnomalousOnly] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: frameworkData } = useQuery({
    queryKey: ['frameworks-graph'],
    queryFn: () => getFrameworks({ page_size: 100 }),
  });

  const { data: hypListData } = useQuery({
    queryKey: ['hypotheses-graph-list'],
    queryFn: () => getHypotheses({ page_size: 200 }),
  });

  // Fetch full HypothesisRead for each hypothesis to get observation/competitor edges.
  // Capped at 50 to avoid excessive parallel requests.
  const hypIds = (hypListData?.items ?? []).slice(0, 50).map(h => h.id);

  const hypReadQueries = useQuery({
    queryKey: ['hypotheses-graph-reads', hypIds],
    queryFn: async () => {
      if (hypIds.length === 0) return [];
      const reads = await Promise.all(hypIds.map(id => getHypothesis(id)));
      return reads;
    },
    enabled: hypIds.length > 0,
  });

  const isLoading = !frameworkData || !hypListData || (hypIds.length > 0 && hypReadQueries.isLoading);
  const isError = hypReadQueries.isError;

  // ── Build graph data ───────────────────────────────────────────────────────

  // Build lookup maps
  const frameworkMap = new Map<string, TheoreticalFrameworkList>(
    (frameworkData?.items ?? []).map(f => [f.id, f])
  );
  const hypReadMap = new Map<string, HypothesisRead>(
    (hypReadQueries.data ?? []).map(h => [h.id, h])
  );
  // obs id → {obs, role, hypothesisId} — for click lookup
  const obsLookup = new Map<string, { obs: ObservationRead; role: 'supporting' | 'anomalous' }>();
  (hypReadQueries.data ?? []).forEach(hyp => {
    hyp.supporting_observations.forEach(obs => {
      if (!obsLookup.has(obs.id)) obsLookup.set(obs.id, { obs, role: 'supporting' });
    });
    hyp.anomalous_observations.forEach(obs => {
      if (!obsLookup.has(obs.id)) obsLookup.set(obs.id, { obs, role: 'anomalous' });
    });
  });

  // ── Build elements ─────────────────────────────────────────────────────────

  const buildElements = useCallback((): cytoscape.ElementDefinition[] => {
    const frameworks = frameworkData?.items ?? [];
    const hypotheses = hypReadQueries.data ?? [];

    if (frameworks.length === 0 && hypotheses.length === 0) return [];

    const elements: cytoscape.ElementDefinition[] = [];
    const obsNodeIds = new Set<string>();

    const visibleFrameworks = filterFrameworkId
      ? frameworks.filter(f => f.id === filterFrameworkId)
      : frameworks;

    // Framework nodes
    visibleFrameworks.forEach(fw => {
      elements.push({
        data: {
          id: fw.id,
          label: fw.label.length > 38 ? fw.label.slice(0, 36) + '…' : fw.label,
          nodeKind: 'framework',
          color: NODE_COLORS.framework,
          borderColor: FRAMEWORK_TYPE_BORDER[fw.framework_type] ?? '#6b7280',
          size: 52,
        },
      });
    });

    const visibleFwIds = new Set(visibleFrameworks.map(f => f.id));

    // Determine which hypotheses to show
    const visibleHyps = filterFrameworkId
      ? hypotheses.filter(h => {
          const fw = visibleFrameworks[0];
          return fw && h.framework === fw.framework_type;
        })
      : hypotheses;

    const visibleHypIds = new Set(visibleHyps.map(h => h.id));

    // Hypothesis → Framework edges
    // We use framework data to know core vs anomalous membership
    // Since we only have TheoreticalFrameworkList (not Read), we don't have
    // individual hypothesis IDs from framework side. We create an edge
    // from each hypothesis to its matching framework using framework_type matching.
    // A hypothesis with 'core' status vs 'anomalous' in a framework can't be
    // distinguished without FrameworkRead. Default to 'core' style.
    // TODO: fetch FrameworkRead to get proper core/anomalous hypothesis sets.
    visibleHyps.forEach(hyp => {
      const matchingFw = visibleFrameworks.find(fw => fw.framework_type === hyp.framework);
      if (matchingFw) {
        elements.push({
          data: {
            id: `fw-hyp-${matchingFw.id}-${hyp.id}`,
            source: hyp.id,
            target: matchingFw.id,
            color: EDGE_COLORS.hyp_core,
            label: 'core of',
            width: 2,
            edgeKind: 'hyp_core',
          },
        });
      }
    });

    // Hypothesis nodes + obs edges
    visibleHyps.forEach(hyp => {
      elements.push({
        data: {
          id: hyp.id,
          label: hyp.label.length > 38 ? hyp.label.slice(0, 36) + '…' : hyp.label,
          nodeKind: 'hypothesis',
          color: NODE_COLORS.hypothesis,
          borderColor: hyp.status === 'refuted' ? '#ef4444' : '#6d28d9',
          size: 36,
        },
      });

      if (!anomalousOnly) {
        hyp.supporting_observations.forEach(obs => {
          if (!obsNodeIds.has(obs.id)) {
            obsNodeIds.add(obs.id);
            elements.push({
              data: {
                id: obs.id,
                label: obs.content.length > 42 ? obs.content.slice(0, 40) + '…' : obs.content,
                nodeKind: 'observation_supporting',
                color: NODE_COLORS.observation_supporting,
                borderColor: '#15803d',
                size: 20,
              },
            });
          }
          elements.push({
            data: {
              id: `sup-${obs.id}-${hyp.id}`,
              source: obs.id,
              target: hyp.id,
              color: EDGE_COLORS.obs_supports,
              label: 'supports',
              width: 1.5,
              edgeKind: 'obs_supports',
            },
          });
        });
      }

      hyp.anomalous_observations.forEach(obs => {
        if (!obsNodeIds.has(obs.id)) {
          obsNodeIds.add(obs.id);
          elements.push({
            data: {
              id: obs.id,
              label: obs.content.length > 42 ? obs.content.slice(0, 40) + '…' : obs.content,
              nodeKind: 'observation_anomalous',
              color: NODE_COLORS.observation_anomalous,
              borderColor: '#991b1b',
              size: 20,
            },
            classes: 'anomalous-obs',
          });
        }
        elements.push({
          data: {
            id: `anom-${obs.id}-${hyp.id}`,
            source: obs.id,
            target: hyp.id,
            color: EDGE_COLORS.obs_challenges,
            label: '⚠ challenges',
            width: 2,
            edgeKind: 'obs_challenges',
          },
          classes: 'anomalous-edge',
        });
      });

      // Competing hypothesis edges
      if (!anomalousOnly) {
        hyp.competing_hypotheses.forEach(comp => {
          if (!visibleHypIds.has(comp.id)) return;
          const edgeId = [hyp.id, comp.id].sort().join('-comp-');
          const already = elements.some(el => el.data?.id === edgeId);
          if (!already) {
            elements.push({
              data: {
                id: edgeId,
                source: hyp.id,
                target: comp.id,
                color: EDGE_COLORS.hyp_competitor,
                label: 'competes',
                width: 1.5,
                edgeKind: 'hyp_competitor',
              },
            });
          }
        });
      }
    });

    return elements;
  }, [frameworkData, hypReadQueries.data, filterFrameworkId, anomalousOnly]);

  // ── Cytoscape init / update ────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || isLoading || isError) return;

    const elements = buildElements();

    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: buildStylesheet(),
        layout: {
          name: 'cose',
          animate: true,
          animationDuration: 600,
          idealEdgeLength: () => 140,
          nodeOverlap: 24,
          refresh: 20,
          fit: true,
          padding: 48,
          randomize: false,
          componentSpacing: 120,
          nodeRepulsion: () => 600000,
          edgeElasticity: () => 100,
          nestingFactor: 5,
          gravity: 60,
          numIter: 1200,
          initialTemp: 250,
          coolingFactor: 0.95,
          minTemp: 1.0,
        } as cytoscape.LayoutOptions,
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
      });

      cyRef.current.on('tap', 'node', (evt: EventObject) => {
        const node = evt.target as NodeSingular;
        const nodeId = node.id();
        const nodeKind = node.data('nodeKind') as string;

        // Highlight neighbourhood
        cyRef.current!.elements().addClass('dimmed');
        node.removeClass('dimmed');
        node.connectedEdges().removeClass('dimmed');
        node.connectedEdges().connectedNodes().removeClass('dimmed');

        // Determine selected node details
        if (nodeKind === 'framework') {
          const fw = frameworkMap.get(nodeId);
          if (fw) setSelectedNode({ kind: 'framework', fw });
        } else if (nodeKind === 'hypothesis') {
          const hyp = hypReadMap.get(nodeId);
          if (hyp) setSelectedNode({ kind: 'hypothesis', hyp });
        } else if (nodeKind === 'observation_supporting' || nodeKind === 'observation_anomalous') {
          const entry = obsLookup.get(nodeId);
          if (entry) setSelectedNode({ kind: 'observation', obs: entry.obs, role: entry.role });
        }
      });

      cyRef.current.on('tap', (evt: EventObject) => {
        if (evt.target === cyRef.current) {
          cyRef.current!.elements().removeClass('dimmed');
          setSelectedNode(null);
        }
      });
    } else {
      cyRef.current.elements().remove();
      cyRef.current.add(elements);
      cyRef.current.layout({
        name: 'cose',
        animate: true,
        animationDuration: 500,
        idealEdgeLength: () => 140,
        nodeOverlap: 24,
        fit: true,
        padding: 48,
        randomize: false,
        nodeRepulsion: () => 600000,
        gravity: 60,
        numIter: 900,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      } as cytoscape.LayoutOptions).run();
    }

    // Re-attach click handlers when lookup maps change
    // (node tap handler uses closures over frameworkMap/hypReadMap/obsLookup)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, buildElements]);

  // Re-attach tap handler when data maps update (after fetches complete)
  useEffect(() => {
    if (!cyRef.current) return;
    cyRef.current.removeListener('tap', 'node');
    cyRef.current.on('tap', 'node', (evt: EventObject) => {
      const node = evt.target as NodeSingular;
      const nodeId = node.id();
      const nodeKind = node.data('nodeKind') as string;

      cyRef.current!.elements().addClass('dimmed');
      node.removeClass('dimmed');
      node.connectedEdges().removeClass('dimmed');
      node.connectedEdges().connectedNodes().removeClass('dimmed');

      if (nodeKind === 'framework') {
        const fw = frameworkMap.get(nodeId);
        if (fw) setSelectedNode({ kind: 'framework', fw });
      } else if (nodeKind === 'hypothesis') {
        const hyp = hypReadMap.get(nodeId);
        if (hyp) setSelectedNode({ kind: 'hypothesis', hyp });
      } else if (nodeKind === 'observation_supporting' || nodeKind === 'observation_anomalous') {
        const entry = obsLookup.get(nodeId);
        if (entry) setSelectedNode({ kind: 'observation', obs: entry.obs, role: entry.role });
      }
    });
  }, [frameworkMap, hypReadMap, obsLookup]);

  useEffect(() => {
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  // ── Toolbar ────────────────────────────────────────────────────────────────

  function handleFit() { cyRef.current?.fit(undefined, 48); }
  function handleCenter() {
    if (selectedNode) {
      const id = selectedNode.kind === 'framework' ? selectedNode.fw.id
               : selectedNode.kind === 'hypothesis' ? selectedNode.hyp.id
               : selectedNode.obs.id;
      const node = cyRef.current?.getElementById(id);
      if (node) cyRef.current?.animate({ center: { eles: node }, zoom: 1.8 }, { duration: 300 });
    } else {
      cyRef.current?.fit(undefined, 48);
    }
  }

  // ── Counts ─────────────────────────────────────────────────────────────────

  const fwCount   = frameworkData?.items.length ?? 0;
  const hypCount  = hypListData?.items.length ?? 0;
  const obsCount  = obsLookup.size;
  const anomCount = (hypReadQueries.data ?? []).reduce((n, h) => n + h.anomalous_observations.length, 0);

  const isEmpty = !isLoading && !isError && fwCount === 0 && hypCount === 0;

  // ── Framework filter options ───────────────────────────────────────────────

  const frameworkOptions = [
    { value: '', label: 'All frameworks' },
    ...(frameworkData?.items ?? []).map(f => ({
      value: f.id,
      label: f.label.length > 40 ? f.label.slice(0, 38) + '…' : f.label,
    })),
  ];

  return (
    <Shell>
      <Page
        title="Knowledge Graph"
        subtitle={
          isLoading ? 'Loading…'
          : `${fwCount} frameworks · ${hypCount} hypotheses · ${obsCount} observations${anomCount > 0 ? ` · ${anomCount} anomalous` : ''}`
        }
      >
        {/* Filter bar */}
        <div style={{
          display: 'flex', gap: 'var(--space-3)', alignItems: 'center',
          marginBottom: 'var(--space-3)', flexWrap: 'wrap',
        }}>
          <Select
            value={filterFrameworkId}
            onChange={e => {
              setFilterFrameworkId(e.target.value);
              setSelectedNode(null);
            }}
            options={frameworkOptions}
            style={{ minWidth: 200, fontSize: 13 }}
          />

          <button
            onClick={() => { setAnomalousOnly(a => !a); setSelectedNode(null); }}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              border: `1px solid ${anomalousOnly ? '#ff2b2b' : 'var(--border-dim)'}`,
              borderRadius: 20,
              background: anomalousOnly ? 'rgba(255,43,43,0.08)' : 'var(--bg-0)',
              color: anomalousOnly ? '#ff2b2b' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 150ms',
              fontWeight: anomalousOnly ? 600 : 400,
            }}
          >
            ⚠ anomalous only
          </button>

          {(filterFrameworkId || anomalousOnly) && (
            <Button
              size="sm"
              onClick={() => {
                setFilterFrameworkId('');
                setAnomalousOnly(false);
                setSelectedNode(null);
              }}
            >
              Clear
            </Button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
            <Button size="sm" onClick={handleFit}>Fit</Button>
            <Button size="sm" onClick={handleCenter}>
              {selectedNode ? 'Center selected' : 'Center'}
            </Button>
          </div>
        </div>

        {/* Graph area */}
        <div style={{
          display: 'flex',
          height: 'calc(100vh - 230px)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          background: 'var(--bg-0)',
          position: 'relative',
        }}>
          {isLoading && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-0)', zIndex: 20,
            }}>
              <Spinner />
            </div>
          )}

          {isError && (
            <div style={{ padding: 'var(--space-5)', flex: 1 }}>
              <ErrorState message="Failed to load graph data" />
            </div>
          )}

          {isEmpty && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState message="No data yet. Add frameworks and hypotheses to populate the graph." />
            </div>
          )}

          {/* Cytoscape container */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              minWidth: 0,
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 300ms',
            }}
          />

          {/* Detail panel */}
          {selectedNode && (
            <DetailPanel
              selected={selectedNode}
              onClose={() => {
                setSelectedNode(null);
                cyRef.current?.elements().removeClass('dimmed');
              }}
            />
          )}

          {/* Legend */}
          {!isLoading && !isError && !isEmpty && (
            <Legend open={legendOpen} onToggle={() => setLegendOpen(o => !o)} />
          )}

          {/* Zoom hint */}
          {!isLoading && !isError && !isEmpty && (
            <div style={{
              position: 'absolute', bottom: 16, right: 16,
              fontSize: 10, fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)',
            }}>
              scroll to zoom · drag to pan · click node for detail
            </div>
          )}
        </div>
      </Page>
    </Shell>
  );
}