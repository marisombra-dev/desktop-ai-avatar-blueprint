/**
 * Small provider-neutral illustration of source-backed temporal memory.
 * A record represents a claim, not verified truth. Source IDs are opaque
 * identifiers, never raw conversations, credentials or private file paths.
 */
export interface SourceEvidence {
  sourceId: string;
  kind: 'user' | 'document' | 'tool' | 'import' | 'inference';
  observedAt: string;
  withdrawnAt?: string;
}

export interface TemporalFact {
  id: string;
  text: string;
  learnedAt: string;
  validFrom?: string;
  validTo?: string;
  supersededById?: string;
  /** Missing means legacy provenance is unknown; [] means unsupported. */
  evidence?: SourceEvidence[];
}

function parsedTime(value: string): number {
  const n = Date.parse(value);
  if (!Number.isFinite(n)) throw new Error('Invalid timestamp');
  return n;
}

/** Returns true only when temporal bounds and explicit supporting evidence permit. */
export function supportedAt(fact: TemporalFact, asOf: string): boolean {
  const at = parsedTime(asOf);
  if (at < parsedTime(fact.validFrom ?? fact.learnedAt)) return false;
  if (fact.validTo && at >= parsedTime(fact.validTo)) return false;
  if (fact.evidence === undefined) return true; // Backward-compatible, not provenance proof.
  return fact.evidence.some((source) =>
    parsedTime(source.observedAt) <= at
    && (!source.withdrawnAt || at < parsedTime(source.withdrawnAt))
  );
}

/** Withdraw one source while preserving immutable historical evidence. */
export function withdrawSource(
  fact: TemporalFact,
  sourceId: string,
  withdrawnAt: string,
): TemporalFact {
  const withdrawn = parsedTime(withdrawnAt);
  if (!fact.evidence?.some((source) => source.sourceId === sourceId)) {
    throw new Error('Evidence source was not found.');
  }
  return {
    ...fact,
    evidence: fact.evidence.map((source) => {
      if (source.sourceId !== sourceId) return { ...source };
      if (withdrawn < parsedTime(source.observedAt)) {
        throw new Error('Withdrawal predates source observation.');
      }
      return {
        ...source,
        withdrawnAt: source.withdrawnAt
          && parsedTime(source.withdrawnAt) <= withdrawn
          ? source.withdrawnAt : withdrawnAt,
      };
    }),
  };
}

/**
 * Normalize untrusted imports with explicit allowlisted fields and bounds.
 * Never silently strip validity intervals, supersession or provenance.
 */
export function normalizePortableFact(value: unknown): TemporalFact {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw Error('Expected a memory record.');
  }
  const raw = value as Record<string, unknown>;
  function id(v: unknown): string {
    if (typeof v !== 'string' || !v.trim() || v.length > 128 ||
        /[\u0000-\u001f]/.test(v)) throw Error('Invalid opaque ID.');
    return v;
  }
  function timestamp(v: unknown): string {
    if (typeof v !== 'string') throw Error('Invalid timestamp.');
    parsedTime(v);
    return v;
  }
  const recordId = id(raw.id);
  if (typeof raw.text !== 'string' || !raw.text.trim() || raw.text.length > 5_000) {
    throw Error('Invalid memory text.');
  }
  const learnedAt = timestamp(raw.learnedAt);
  const validFrom = raw.validFrom === undefined ? undefined : timestamp(raw.validFrom);
  const validTo = raw.validTo === undefined ? undefined : timestamp(raw.validTo);
  if (validFrom && validTo && parsedTime(validFrom) > parsedTime(validTo)) {
    throw Error('Inverted validity interval.');
  }
  const supersededById = raw.supersededById === undefined
    ? undefined : id(raw.supersededById);
  if (supersededById === recordId) throw Error('A fact cannot supersede itself.');
  let evidence: SourceEvidence[] | undefined;
  if (raw.evidence !== undefined) {
    if (!Array.isArray(raw.evidence) || raw.evidence.length > 16) {
      throw Error('Invalid evidence collection.');
    }
    const kinds = new Set<SourceEvidence['kind']>([
      'user', 'document', 'tool', 'import', 'inference',
    ]);
    evidence = raw.evidence.map((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        throw Error('Invalid evidence entry.');
      }
      const source = entry as Record<string, unknown>;
      if (!kinds.has(source.kind as SourceEvidence['kind'])) {
        throw Error('Unsupported evidence kind.');
      }
      const observedAt = timestamp(source.observedAt);
      const withdrawnAt = source.withdrawnAt === undefined
        ? undefined : timestamp(source.withdrawnAt);
      if (withdrawnAt && parsedTime(withdrawnAt) < parsedTime(observedAt)) {
        throw Error('Withdrawal predates observation.');
      }
      return {
        sourceId: id(source.sourceId),
        kind: source.kind as SourceEvidence['kind'],
        observedAt,
        ...(withdrawnAt ? { withdrawnAt } : {}),
      };
    });
  }
  return {
    id: recordId,
    text: raw.text,
    learnedAt,
    ...(validFrom ? { validFrom } : {}),
    ...(validTo ? { validTo } : {}),
    ...(supersededById ? { supersededById } : {}),
    ...(evidence ? { evidence } : {}),
  };
}
