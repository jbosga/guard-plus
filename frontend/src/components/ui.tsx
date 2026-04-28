import React from 'react';
import type {
  EpistemicStatus, ClaimType, SourceType,
  ProvenanceQuality, IngestionStatus, HypothesisStatus,
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

// ── Epistemic status ──────────────────────────────────────────────────────────

const EP_COLORS: Record<EpistemicStatus, { color: string; bg: string }> = {
  asserted:    { color: 'var(--ep-asserted)',    bg: 'var(--bg-2)' },
  observed:    { color: 'var(--ep-observed)',    bg: 'var(--status-ok-bg)' },
  inferred:    { color: 'var(--ep-inferred)',    bg: 'var(--status-info-bg)' },
  speculative: { color: 'var(--ep-speculative)', bg: '#fbefff' },
  contested:   { color: 'var(--ep-contested)',   bg: 'var(--status-warn-bg)' },
  retracted:   { color: 'var(--ep-retracted)',   bg: 'var(--status-error-bg)' },
};

export function EpistemicBadge({ status }: { status: EpistemicStatus }) {
  const { color, bg } = EP_COLORS[status];
  return <Badge label={status} color={color} bg={bg} />;
}

// ── Claim type ────────────────────────────────────────────────────────────────

const CT_COLORS: Record<ClaimType, { color: string; bg: string }> = {
  phenomenological: { color: 'var(--ct-phenomenological)', bg: 'var(--status-info-bg)' },
  causal:           { color: 'var(--ct-causal)',           bg: 'var(--status-warn-bg)' },
  correlational:    { color: 'var(--ct-correlational)',    bg: 'var(--status-ok-bg)' },
  definitional:     { color: 'var(--ct-definitional)',     bg: '#fbefff' },
  methodological:   { color: 'var(--ct-methodological)',   bg: 'var(--bg-2)' },
};

export function ClaimTypeBadge({ type }: { type: ClaimType }) {
  const { color, bg } = CT_COLORS[type];
  return <Badge label={type} color={color} bg={bg} />;
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
  anecdotal:          { color: 'var(--ep-speculative)', bg: '#fbefff' },
  investigator_report:{ color: 'var(--status-info)',  bg: 'var(--status-info-bg)' },
  self_reported:      { color: 'var(--text-secondary)', bg: 'var(--bg-2)' },
  unknown:            { color: 'var(--text-dim)',     bg: 'var(--bg-2)' },
};

export function ProvenanceBadge({ quality }: { quality: ProvenanceQuality }) {
  const { color, bg } = PROV_META[quality];
  return <Badge label={quality.replace(/_/g, ' ')} color={color} bg={bg} />;
}

// ── Hypothesis status ─────────────────────────────────────────────────────────

const HYP_META: Record<HypothesisStatus, { color: string; bg: string }> = {
  active:     { color: 'var(--status-ok)',    bg: 'var(--status-ok-bg)' },
  abandoned:  { color: 'var(--text-dim)',     bg: 'var(--bg-2)' },
  merged:     { color: 'var(--status-info)',  bg: 'var(--status-info-bg)' },
  speculative:{ color: 'var(--ep-speculative)', bg: '#fbefff' },
};

export function HypothesisStatusBadge({ status }: { status: HypothesisStatus }) {
  const { color, bg } = HYP_META[status];
  return <Badge label={status} color={color} bg={bg} />;
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
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, options, placeholder, style, ...props }: SelectProps) {
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
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
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
