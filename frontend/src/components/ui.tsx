import React from 'react';
import type {
  SourceType, ProvenanceQuality, IngestionStatus,
  ObservationEpistemicStatus, ContentType, CollectionMethod,
  HypothesisType, HypothesisStatus, ConfidenceLevel, FrameworkStatus,
} from '../types';

// ── Badge ─────────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string;
  color?: string;
  bg?: string;
  style?: React.CSSProperties;
}

export function Badge({ label, color, bg, style }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 11, fontWeight: 500,
      fontFamily: 'var(--font-sans)',
      letterSpacing: '0.01em',
      border: `1px solid ${color ? `${color}55` : 'var(--border-dim)'}`,
      color: color ?? 'var(--text-secondary)',
      background: bg ?? (color ? `${color}12` : 'var(--bg-2)'),
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {label}
    </span>
  );
}

// ── Observation epistemic status ──────────────────────────────────────────────

const OBS_EP_COLORS: Record<ObservationEpistemicStatus, { color: string; bg: string }> = {
  reported:     { color: 'var(--text-secondary)', bg: 'var(--bg-2)' },
  corroborated: { color: 'var(--status-ok)',      bg: 'var(--status-ok-bg)' },
  contested:    { color: 'var(--status-warn)',    bg: 'var(--status-warn-bg)' },
  artefactual:  { color: '#f97316',               bg: 'rgba(249,115,22,0.08)' },
  retracted:    { color: 'var(--status-error)',   bg: 'var(--status-error-bg)' },
};

export function ObservationEpistemicBadge({ status }: { status: ObservationEpistemicStatus }) {
  const { color, bg } = OBS_EP_COLORS[status];
  const label = status === 'retracted'
    ? status  // would render with strikethrough via style below
    : status;
  return (
    <Badge
      label={label}
      color={color}
      bg={bg}
      style={status === 'retracted' ? { textDecoration: 'line-through', opacity: 0.7 } : undefined}
    />
  );
}

// ── Content type ──────────────────────────────────────────────────────────────

const CT_COLORS: Record<ContentType, { color: string; bg: string }> = {
  experiential:       { color: 'var(--status-info)',  bg: 'var(--status-info-bg)' },
  behavioral:         { color: 'var(--ep-inferred)',  bg: 'var(--status-ok-bg)' },
  physiological:      { color: '#a78bfa',             bg: 'rgba(167,139,250,0.08)' },
  environmental:      { color: '#fbbf24',             bg: 'rgba(251,191,36,0.08)' },
  testimonial:        { color: 'var(--text-secondary)', bg: 'var(--bg-2)' },
  documentary_trace:  { color: '#60a5fa',             bg: 'rgba(96,165,250,0.08)' },
};

export function ContentTypeBadge({ type }: { type: ContentType }) {
  const { color, bg } = CT_COLORS[type];
  return <Badge label={type.replace(/_/g, ' ')} color={color} bg={bg} />;
}

// ── Collection method ─────────────────────────────────────────────────────────

const CM_COLORS: Record<CollectionMethod, { color: string; bg: string }> = {
  spontaneous_report:   { color: 'var(--text-secondary)', bg: 'var(--bg-2)' },
  structured_interview: { color: 'var(--status-info)',    bg: 'var(--status-info-bg)' },
  hypnotic_regression:  { color: '#d97706',               bg: 'rgba(217,119,6,0.12)' }, // amber — reliability concern
  questionnaire:        { color: 'var(--status-ok)',      bg: 'var(--status-ok-bg)' },
  clinical_assessment:  { color: '#a78bfa',               bg: 'rgba(167,139,250,0.08)' },
  passive_recording:    { color: '#60a5fa',               bg: 'rgba(96,165,250,0.08)' },
  investigator_inference:{ color: 'var(--status-warn)',   bg: 'var(--status-warn-bg)' },
};

export function CollectionMethodBadge({ method }: { method: CollectionMethod }) {
  const { color, bg } = CM_COLORS[method];
  return <Badge label={method.replace(/_/g, ' ')} color={color} bg={bg} />;
}

// ── Hypothesis type ───────────────────────────────────────────────────────────

const HT_COLORS: Record<HypothesisType, { color: string; bg: string }> = {
  causal:         { color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  correlational:  { color: 'var(--status-ok)',   bg: 'var(--status-ok-bg)' },
  mechanistic:    { color: '#a78bfa',             bg: 'rgba(167,139,250,0.08)' },
  taxonomic:      { color: 'var(--status-info)',  bg: 'var(--status-info-bg)' },
  predictive:     { color: '#fbbf24',             bg: 'rgba(251,191,36,0.08)' },
};

export function HypothesisTypeBadge({ type }: { type: HypothesisType }) {
  const { color, bg } = HT_COLORS[type];
  return <Badge label={type} color={color} bg={bg} />;
}

// ── Hypothesis status ─────────────────────────────────────────────────────────

const HYP_STATUS_COLORS: Record<HypothesisStatus, { color: string; bg: string }> = {
  active:    { color: 'var(--status-ok)',    bg: 'var(--status-ok-bg)' },
  dormant:   { color: 'var(--text-dim)',     bg: 'var(--bg-2)' },
  abandoned: { color: 'var(--text-dim)',     bg: 'var(--bg-2)' },
  merged:    { color: 'var(--status-info)',  bg: 'var(--status-info-bg)' },
  refuted:   { color: 'var(--status-error)', bg: 'var(--status-error-bg)' },
};

export function HypothesisStatusBadge({ status }: { status: HypothesisStatus }) {
  const { color, bg } = HYP_STATUS_COLORS[status];
  return <Badge label={status} color={color} bg={bg} />;
}

// ── Framework status ──────────────────────────────────────────────────────────

const FW_STATUS_COLORS: Record<FrameworkStatus, { color: string; bg: string }> = {
  active:    { color: 'var(--status-ok)',    bg: 'var(--status-ok-bg)' },
  dormant:   { color: 'var(--text-dim)',     bg: 'var(--bg-2)' },
  abandoned: { color: 'var(--text-dim)',     bg: 'var(--bg-2)' },
  merged:    { color: 'var(--status-info)',  bg: 'var(--status-info-bg)' },
  refuted:   { color: 'var(--status-error)', bg: 'var(--status-error-bg)' },
};

export function FrameworkStatusBadge({ status }: { status: FrameworkStatus }) {
  const { color, bg } = FW_STATUS_COLORS[status];
  return <Badge label={status} color={color} bg={bg} />;
}

// ── Confidence level ──────────────────────────────────────────────────────────

const CONF_COLORS: Record<ConfidenceLevel, { color: string; bg: string }> = {
  speculative: { color: 'var(--text-dim)',    bg: 'var(--bg-2)' },
  plausible:   { color: 'var(--text-secondary)', bg: 'var(--bg-2)' },
  supported:   { color: 'var(--status-ok)',   bg: 'var(--status-ok-bg)' },
  contested:   { color: 'var(--status-warn)', bg: 'var(--status-warn-bg)' },
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const { color, bg } = CONF_COLORS[level];
  return <Badge label={level} color={color} bg={bg} />;
}

// ── Ingestion status ──────────────────────────────────────────────────────────

const INGEST_META: Record<IngestionStatus, { color: string; bg: string }> = {
  pending:    { color: 'var(--status-dim)',  bg: 'var(--bg-2)' },
  processing: { color: 'var(--status-info)', bg: 'var(--status-info-bg)' },
  complete:   { color: 'var(--status-ok)',   bg: 'var(--status-ok-bg)' },
  failed:     { color: 'var(--status-error)', bg: 'var(--status-error-bg)' },
};

export function IngestionDot({ status }: { status: IngestionStatus }) {
  const { color, bg } = INGEST_META[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 500,
      color, background: bg,
      border: `1px solid ${color}44`,
    }}>
      <span className="dot" style={{ background: color }} />
      {status}
    </span>
  );
}

// ── Source type ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<SourceType, string> = {
  account: 'account', paper: 'paper', book: 'book',
  interview: 'interview', media: 'media', field_report: 'field report',
};

export function SourceTypeBadge({ type }: { type: SourceType }) {
  return <Badge label={TYPE_LABELS[type]} />;
}

// ── Provenance ────────────────────────────────────────────────────────────────

const PROV_META: Record<ProvenanceQuality, { color: string; bg: string }> = {
  peer_reviewed:      { color: 'var(--status-ok)',    bg: 'var(--status-ok-bg)' },
  grey_literature:    { color: 'var(--status-warn)',  bg: 'var(--status-warn-bg)' },
  anecdotal:          { color: '#a78bfa',             bg: 'rgba(167,139,250,0.08)' },
  investigator_report:{ color: 'var(--status-info)',  bg: 'var(--status-info-bg)' },
  self_reported:      { color: 'var(--text-secondary)', bg: 'var(--bg-2)' },
  unknown:            { color: 'var(--text-dim)',     bg: 'var(--bg-2)' },
};

export function ProvenanceBadge({ quality }: { quality: ProvenanceQuality }) {
  const { color, bg } = PROV_META[quality];
  return <Badge label={quality.replace(/_/g, ' ')} color={color} bg={bg} />;
}

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({ variant = 'ghost', size = 'md', children, style, disabled, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-sans)',
    fontWeight: 500,
    fontSize: size === 'sm' ? 12 : 13,
    padding: size === 'sm' ? '3px 10px' : '5px 14px',
    border: '1px solid',
    transition: 'var(--t-fast)',
    outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--accent)',
      borderColor: '#0860ca',
      color: '#ffffff',
    },
    ghost: {
      background: 'var(--bg-0)',
      borderColor: 'var(--border-dim)',
      color: 'var(--text-primary)',
    },
    danger: {
      background: 'var(--bg-0)',
      borderColor: 'var(--status-error)',
      color: 'var(--status-error)',
    },
  };

  return (
    <button disabled={disabled} style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
      <input
        style={{
          background: 'var(--bg-0)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          padding: '5px 10px',
          outline: 'none',
          fontSize: 14,
          transition: 'var(--t-fast)',
          ...style,
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent)', e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border-dim)', e.target.style.boxShadow = 'none')}
        {...props}
      />
    </label>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, options, placeholder, style, children, ...props }: SelectProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
      <select
        style={{
          background: 'var(--bg-0)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          padding: '5px 10px',
          outline: 'none',
          fontSize: 13,
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options
          ? options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
          : children}
      </select>
    </label>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

export function Card({
  children, style, className, onClick,
}: { children: React.ReactNode; style?: React.CSSProperties; className?: string; onClick?: () => void }) {
  return (
    <div className={className} style={{
      background: 'var(--bg-0)',
      border: '1px solid var(--border-dim)',
      borderRadius: 'var(--radius-md)',
      ...style,
    }} onClick={onClick}>
      {children}
    </div>
  );
}

// ── Stat ──────────────────────────────────────────────────────────────────────

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
        {value}
      </span>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

export function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingBottom: 'var(--space-3)',
      borderBottom: '1px solid var(--border-dim)',
      marginBottom: 'var(--space-4)',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {children}
      </span>
      {action}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-7)',
      color: 'var(--text-dim)', fontSize: 13,
    }}>
      Loading…
    </div>
  );
}

// ── Error / Empty ─────────────────────────────────────────────────────────────

export function ErrorState({ message }: { message: string }) {
  return (
    <div style={{
      padding: 'var(--space-4)',
      border: '1px solid var(--status-error)',
      borderRadius: 'var(--radius-md)',
      background: 'var(--status-error-bg)',
      color: 'var(--status-error)',
      fontSize: 13,
    }}>
      {message}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: 'var(--space-7)',
      textAlign: 'center',
      color: 'var(--text-dim)',
      fontSize: 13,
    }}>
      {message}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number; pages: number; total: number; onPage: (p: number) => void;
}

export function Pagination({ page, pages, total, onPage }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: 'var(--space-4) 0',
      fontSize: 13, color: 'var(--text-secondary)',
    }}>
      <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</Button>
      <span>{page} / {pages} — {total} total</span>
      <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</Button>
    </div>
  );
}

// Re-export Page from Shell so pages can import from a single ui module
export { Page } from './Shell';
