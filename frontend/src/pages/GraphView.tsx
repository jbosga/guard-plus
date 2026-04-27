import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import cytoscape from 'cytoscape';
import type { Core, NodeSingular, EventObject } from 'cytoscape';
import { getConcepts, getRelationships } from '../api';
import type { ConceptRead, ConceptRelationshipRead, ConceptType, RelationshipType } from '../types';
import { Shell } from '../components/Shell';
import { Page } from '../components/Shell';
import { Badge, Button, Select, Spinner, ErrorState, EmptyState } from '../components/ui';

// ── Colour maps ───────────────────────────────────────────────────────────────

const CONCEPT_TYPE_COLOR: Record<ConceptType, string> = {
  phenomenon:             '#4e9af1',
  mechanism:              '#a78bfa',
  entity:                 '#34d399',
  location:               '#fbbf24',
  process:                '#f87171',
  theoretical_construct:  '#60a5fa',
};

const REL_TYPE_COLOR: Record<RelationshipType, string> = {
  correlates_with:   '#6b7280',
  precedes:          '#4e9af1',
  causes:            '#f87171',
  contradicts:       '#ef4444',
  is_instance_of:    '#a78bfa',
  co_occurs_with:    '#6b7280',
  is_explained_by:   '#34d399',
  anomalous_given:   '#ff2b2b',  // anomaly red — intentionally loud
};

const REL_TYPE_LABEL: Record<RelationshipType, string> = {
  correlates_with:   'correlates',
  precedes:          'precedes',
  causes:            'causes',
  contradicts:       'contradicts',
  is_instance_of:    'instance of',
  co_occurs_with:    'co-occurs',
  is_explained_by:   'explained by',
  anomalous_given:   '⚠ anomalous given',
};

const STRENGTH_WIDTH: Record<string, number> = {
  weak: 1.5, moderate: 2.5, strong: 4,
};

// ── Cytoscape stylesheet ──────────────────────────────────────────────────────

function buildStylesheet() {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'color': '#e2e8f0',
        'font-family': 'IBM Plex Mono, monospace',
        'font-size': '10px',
        'text-valign': 'bottom',
        'text-margin-y': '4px',
        'text-wrap': 'ellipsis',
        'text-max-width': '100px',
        'width': 'data(size)',
        'height': 'data(size)',
        'border-width': 1.5,
        'border-color': '#1e293b',
        'transition-property': 'border-color border-width',
        'transition-duration': '120ms',
      } as cytoscape.Css.Node,
    },
    {
      selector: 'node:selected',
      style: {
        'border-color': '#60a5fa',
        'border-width': 3,
      } as cytoscape.Css.Node,
    },
    {
      selector: 'node.dimmed',
      style: {
        'opacity': 0.25,
      } as cytoscape.Css.Node,
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
        'font-size': '9px',
        'color': '#94a3b8',
        'font-family': 'IBM Plex Mono, monospace',
        'text-rotation': 'autorotate',
        'text-margin-y': '-6px',
        'opacity': 0.85,
        'transition-property': 'opacity',
        'transition-duration': '120ms',
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.anomalous',
      style: {
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
        'opacity': 1,
      } as cytoscape.Css.Edge,
    },
    {
      selector: 'edge.dimmed',
      style: {
        'opacity': 0.08,
      } as cytoscape.Css.Edge,
    },
  ];
}

// ── Filter bar ────────────────────────────────────────────────────────────────

const CONCEPT_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'phenomenon', label: 'Phenomenon' },
  { value: 'mechanism', label: 'Mechanism' },
  { value: 'entity', label: 'Entity' },
  { value: 'location', label: 'Location' },
  { value: 'process', label: 'Process' },
  { value: 'theoretical_construct', label: 'Theoretical construct' },
];

const REL_TYPE_OPTIONS = [
  { value: '', label: 'All edges' },
  { value: 'correlates_with', label: 'Correlates with' },
  { value: 'precedes', label: 'Precedes' },
  { value: 'causes', label: 'Causes' },
  { value: 'contradicts', label: 'Contradicts' },
  { value: 'is_instance_of', label: 'Instance of' },
  { value: 'co_occurs_with', label: 'Co-occurs with' },
  { value: 'is_explained_by', label: 'Explained by' },
  { value: 'anomalous_given', label: '⚠ Anomalous given' },
];

// ── Detail panel ──────────────────────────────────────────────────────────────

interface NodeDetail {
  concept: ConceptRead;
  connectedEdges: ConceptRelationshipRead[];
  allConcepts: Map<string, ConceptRead>;
}

function DetailPanel({ detail, onClose }: {
  detail: NodeDetail;
  onClose: () => void;
}) {
  const { concept, connectedEdges, allConcepts } = detail;
  const color = CONCEPT_TYPE_COLOR[concept.concept_type] ?? '#6b7280';

  return (
    <div style={{
      width: 300,
      flexShrink: 0,
      background: 'var(--bg-0)',
      borderLeft: '1px solid var(--border-dim)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              display: 'inline-block',
              width: 8, height: 8, borderRadius: '50%',
              background: color, flexShrink: 0,
            }} />
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)', textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {concept.concept_type.replace(/_/g, ' ')}
            </span>
          </div>
          <h3 style={{
            fontSize: 14, fontWeight: 600,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.3,
            wordBreak: 'break-word',
          }}>
            {concept.label}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer',
            fontSize: 16, lineHeight: 1, padding: 2, flexShrink: 0,
          }}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      {/* Panel body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {concept.description && (
          <p style={{
            fontSize: 12, color: 'var(--text-secondary)',
            lineHeight: 1.6, marginBottom: 16,
          }}>
            {concept.description}
          </p>
        )}

        {concept.epistemic_status && (
          <div style={{ marginBottom: 16 }}>
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)', textTransform: 'uppercase',
              letterSpacing: '0.06em', display: 'block', marginBottom: 4,
            }}>
              Epistemic status
            </span>
            <Badge label={concept.epistemic_status} color="var(--ep-inferred)" />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <span style={{
            fontSize: 10, fontFamily: 'var(--font-mono)',
            color: 'var(--text-dim)', textTransform: 'uppercase',
            letterSpacing: '0.06em', display: 'block', marginBottom: 4,
          }}>
            Supporting claims
          </span>
          <span style={{
            fontSize: 20, fontWeight: 600,
            color: concept.supporting_claim_ids.length > 0 ? 'var(--accent)' : 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
          }}>
            {concept.supporting_claim_ids.length}
          </span>
        </div>

        {/* Connections */}
        {connectedEdges.length > 0 && (
          <div>
            <span style={{
              fontSize: 10, fontFamily: 'var(--font-mono)',
              color: 'var(--text-dim)', textTransform: 'uppercase',
              letterSpacing: '0.06em', display: 'block', marginBottom: 8,
            }}>
              Connections ({connectedEdges.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {connectedEdges.map(edge => {
                const isSource = edge.source_concept_id === concept.id;
                const otherId = isSource ? edge.target_concept_id : edge.source_concept_id;
                const other = allConcepts.get(otherId);
                const isAnomalous = edge.relationship_type === 'anomalous_given';
                const edgeColor = REL_TYPE_COLOR[edge.relationship_type] ?? '#6b7280';

                return (
                  <div key={edge.id} style={{
                    padding: '6px 8px',
                    background: 'var(--bg-1)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `3px solid ${edgeColor}`,
                  }}>
                    <div style={{
                      fontSize: 10, fontFamily: 'var(--font-mono)',
                      color: isAnomalous ? '#ff2b2b' : 'var(--text-secondary)',
                      marginBottom: 2,
                    }}>
                      {isSource ? '→' : '←'} {REL_TYPE_LABEL[edge.relationship_type]}
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--text-primary)',
                      fontWeight: 500,
                    }}>
                      {other?.label ?? otherId.slice(0, 8) + '…'}
                    </div>
                    {edge.notes && (
                      <div style={{
                        fontSize: 10, color: 'var(--text-dim)',
                        marginTop: 2, lineHeight: 1.5,
                      }}>
                        {edge.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'var(--bg-0)', border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
          fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer',
          padding: '4px 10px',
        }}
      >
        {open ? '▾ legend' : '▸ legend'}
      </button>
      {open && (
        <div style={{
          marginTop: 6,
          background: 'var(--bg-0)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          fontSize: 11, fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)',
          minWidth: 180,
        }}>
          <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--text-primary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Node type
          </div>
          {Object.entries(CONCEPT_TYPE_COLOR).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
              <span>{type.replace(/_/g, ' ')}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border-dim)', margin: '8px 0', paddingTop: 8, fontWeight: 600, color: 'var(--text-primary)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Edge type
          </div>
          {Object.entries(REL_TYPE_COLOR).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 16, height: 2, background: color, flexShrink: 0, display: 'inline-block', borderRadius: 1 }} />
              <span style={{ color: type === 'anomalous_given' ? '#ff2b2b' : 'var(--text-secondary)' }}>
                {REL_TYPE_LABEL[type as RelationshipType]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  const [filterConceptType, setFilterConceptType] = useState('');
  const [filterRelType, setFilterRelType] = useState('');
  const [anomalousOnly, setAnomalousOnly] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);

  // Fetch all concepts (up to 200 — graph view only makes sense for this scale)
  const { data: conceptData, isLoading: loadingConcepts, isError: errorConcepts } = useQuery({
    queryKey: ['concepts', 'graph'],
    queryFn: () => getConcepts({ page_size: 200 }),
  });

  // Fetch all relationships
  const { data: relData, isLoading: loadingRels, isError: errorRels } = useQuery({
    queryKey: ['relationships', 'graph'],
    queryFn: () => getRelationships({ page_size: 500 }),
  });

  const isLoading = loadingConcepts || loadingRels;
  const isError = errorConcepts || errorRels;

  // Build concept map for detail panel lookups
  const conceptMap = new Map<string, ConceptRead>(
    (conceptData?.items ?? []).map(c => [c.id, c])
  );

  // ── Build Cytoscape elements ──────────────────────────────────────────────

  const buildElements = useCallback(() => {
    const concepts = conceptData?.items ?? [];
    const rels = relData?.items ?? [];

    const filteredConcepts = filterConceptType
      ? concepts.filter(c => c.concept_type === filterConceptType)
      : concepts;

    const filteredConceptIds = new Set(filteredConcepts.map(c => c.id));

    let filteredRels = rels.filter(
      r => filteredConceptIds.has(r.source_concept_id) && filteredConceptIds.has(r.target_concept_id)
    );

    if (anomalousOnly) {
      filteredRels = filteredRels.filter(r => r.relationship_type === 'anomalous_given');
    } else if (filterRelType) {
      filteredRels = filteredRels.filter(r => r.relationship_type === filterRelType);
    }

    const nodes: cytoscape.ElementDefinition[] = filteredConcepts.map(concept => ({
      data: {
        id: concept.id,
        label: concept.label,
        color: CONCEPT_TYPE_COLOR[concept.concept_type] ?? '#6b7280',
        // Node size scales with claim count (clamped 20–48)
        size: Math.min(48, Math.max(20, 20 + concept.supporting_claim_ids.length * 2)),
      },
    }));

    const edges: cytoscape.ElementDefinition[] = filteredRels.map(rel => ({
      data: {
        id: rel.id,
        source: rel.source_concept_id,
        target: rel.target_concept_id,
        color: REL_TYPE_COLOR[rel.relationship_type] ?? '#6b7280',
        label: REL_TYPE_LABEL[rel.relationship_type] ?? rel.relationship_type,
        width: STRENGTH_WIDTH[rel.strength] ?? 2,
      },
      classes: rel.relationship_type === 'anomalous_given' ? 'anomalous' : '',
    }));

    return [...nodes, ...edges];
  }, [conceptData, relData, filterConceptType, filterRelType, anomalousOnly]);

  // ── Initialise / update Cytoscape ─────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || isLoading || isError) return;

    const elements = buildElements();

    if (!cyRef.current) {
      // First mount
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: buildStylesheet(),
        layout: {
          name: 'cose',
          animate: true,
          animationDuration: 500,
          idealEdgeLength: () => 120,
          nodeOverlap: 20,
          refresh: 20,
          fit: true,
          padding: 40,
          randomize: false,
          componentSpacing: 100,
          nodeRepulsion: () => 400000,
          edgeElasticity: () => 100,
          nestingFactor: 5,
          gravity: 80,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
        } as cytoscape.LayoutOptions,
        userZoomingEnabled: true,
        userPanningEnabled: true,
        boxSelectionEnabled: false,
      });

      // Click handler — open detail panel
      cyRef.current.on('tap', 'node', (evt: EventObject) => {
        const node = evt.target as NodeSingular;
        const conceptId = node.id();
        const concept = conceptMap.get(conceptId);
        if (!concept) return;

        // Dim everything except selected node's neighbourhood
        cyRef.current!.elements().addClass('dimmed');
        node.removeClass('dimmed');
        node.connectedEdges().removeClass('dimmed');
        node.connectedEdges().connectedNodes().removeClass('dimmed');

        const connectedEdgeIds = new Set(node.connectedEdges().map(e => e.id()));
        const connectedEdges = (relData?.items ?? []).filter(r => connectedEdgeIds.has(r.id));

        setSelectedNode({ concept, connectedEdges, allConcepts: conceptMap });
      });

      // Click on background — deselect
      cyRef.current.on('tap', (evt: EventObject) => {
        if (evt.target === cyRef.current) {
          cyRef.current!.elements().removeClass('dimmed');
          setSelectedNode(null);
        }
      });
    } else {
      // Update existing instance — replace elements and re-run layout
      cyRef.current.elements().remove();
      cyRef.current.add(elements);
      cyRef.current.layout({
        name: 'cose',
        animate: true,
        animationDuration: 400,
        idealEdgeLength: () => 120,
        nodeOverlap: 20,
        fit: true,
        padding: 40,
        randomize: false,
        nodeRepulsion: () => 400000,
        gravity: 80,
        numIter: 800,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      } as cytoscape.LayoutOptions).run();
    }
  }, [isLoading, isError, buildElements]);

  // Destroy on unmount
  useEffect(() => {
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  // ── Toolbar actions ───────────────────────────────────────────────────────

  function handleFit() {
    cyRef.current?.fit(undefined, 40);
  }

  function handleCenter() {
    if (selectedNode) {
      const node = cyRef.current?.getElementById(selectedNode.concept.id);
      if (node) cyRef.current?.animate({ center: { eles: node }, zoom: 1.5 }, { duration: 300 });
    } else {
      cyRef.current?.fit(undefined, 40);
    }
  }

  const nodeCount = conceptData?.items.length ?? 0;
  const edgeCount = relData?.items.length ?? 0;
  const anomalousCount = (relData?.items ?? []).filter(r => r.relationship_type === 'anomalous_given').length;

  return (
    <Shell>
      <Page
        title="Knowledge Graph"
        subtitle={`${nodeCount} concepts · ${edgeCount} relationships${anomalousCount > 0 ? ` · ${anomalousCount} anomalous` : ''}`}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Button size="sm" onClick={handleFit}>Fit</Button>
            <Button size="sm" onClick={handleCenter}>Center</Button>
          </div>
        }
      >
        {/* Filter bar */}
        <div style={{
          display: 'flex', gap: 'var(--space-2)', alignItems: 'center',
          marginBottom: 'var(--space-4)', flexWrap: 'wrap',
        }}>
          <Select
            value={filterConceptType}
            onChange={e => { setFilterConceptType(e.target.value); setSelectedNode(null); }}
            style={{ width: 180 }}
          >
            {CONCEPT_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>

          <Select
            value={filterRelType}
            onChange={e => {
              setFilterRelType(e.target.value);
              setAnomalousOnly(false);
              setSelectedNode(null);
            }}
            disabled={anomalousOnly}
            style={{ width: 200 }}
          >
            {REL_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>

          <button
            onClick={() => {
              setAnomalousOnly(o => !o);
              setFilterRelType('');
              setSelectedNode(null);
            }}
            style={{
              padding: '4px 12px',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              border: '1px solid',
              borderColor: anomalousOnly ? '#ff2b2b' : 'var(--border-dim)',
              borderRadius: 'var(--radius-md)',
              background: anomalousOnly ? 'rgba(255,43,43,0.12)' : 'var(--bg-0)',
              color: anomalousOnly ? '#ff2b2b' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 120ms',
              fontWeight: anomalousOnly ? 600 : 400,
            }}
          >
            ⚠ anomalous only
          </button>

          {(filterConceptType || filterRelType || anomalousOnly) && (
            <Button
              size="sm"
              onClick={() => {
                setFilterConceptType('');
                setFilterRelType('');
                setAnomalousOnly(false);
                setSelectedNode(null);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Graph area + detail panel */}
        <div style={{
          display: 'flex',
          height: 'calc(100vh - 220px)',
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

          {!isLoading && !isError && nodeCount === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState message="No concepts yet. Add concepts via the API or the Hypothesis workspace (Chat 8) to populate the graph." />
            </div>
          )}

          {/* Cytoscape container */}
          <div
            ref={containerRef}
            style={{
              flex: 1,
              minWidth: 0,
              // Hide until loaded to avoid flash
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 300ms',
            }}
          />

          {/* Detail panel */}
          {selectedNode && (
            <DetailPanel
              detail={selectedNode}
              onClose={() => {
                setSelectedNode(null);
                cyRef.current?.elements().removeClass('dimmed');
              }}
            />
          )}

          {/* Legend */}
          {!isLoading && !isError && nodeCount > 0 && <Legend />}

          {/* Zoom hint */}
          {!isLoading && !isError && nodeCount > 0 && (
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
