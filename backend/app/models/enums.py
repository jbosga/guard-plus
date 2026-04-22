import enum

class SourceType(str, enum.Enum):
    ACCOUNT = "account"
    PAPER = "paper"
    BOOK = "book"
    INTERVIEW = "interview"
    MEDIA = "media"
    FIELD_REPORT = "field_report"

class DisciplinaryFrame(str, enum.Enum):
    NEUROSCIENCE = "neuroscience"
    PSYCHOLOGY = "psychology"
    FOLKLORE = "folklore"
    PHYSICS = "physics"
    PARAPSYCHOLOGY = "parapsychology"
    SOCIOLOGY = "sociology"
    ANTHROPOLOGY = "anthropology"
    PSYCHIATRY = "psychiatry"
    UFOLOGY = "ufology"
    PHILOSOPHY = "philosophy"
    OTHER = "other"

class ProvenanceQuality(str, enum.Enum):
    PEER_REVIEWED = "peer_reviewed"
    GREY_LITERATURE = "grey_literature"
    ANECDOTAL = "anecdotal"
    INVESTIGATOR_REPORT = "investigator_report"
    SELF_REPORTED = "self_reported"
    UNKNOWN = "unknown"

class AccountContext(str, enum.Enum):
    SLEEP = "sleep"
    WAKE = "wake"
    HYPNAGOGIC = "hypnagogic"
    HYPNOPOMPIC = "hypnopompic"
    ALTERED_STATE = "altered_state"
    FULL_CONSCIOUSNESS = "full_consciousness"
    UNKNOWN = "unknown"

class CorroborationLevel(str, enum.Enum):
    NONE = "none"
    WITNESS = "witness"
    PHYSICAL_TRACE = "physical_trace"
    INVESTIGATOR = "investigator"
    MULTIPLE = "multiple"

class EpistemicStatus(str, enum.Enum):
    ASSERTED = "asserted"
    OBSERVED = "observed"
    INFERRED = "inferred"
    SPECULATIVE = "speculative"
    CONTESTED = "contested"
    RETRACTED = "retracted"

class ClaimType(str, enum.Enum):
    PHENOMENOLOGICAL = "phenomenological"
    CAUSAL = "causal"
    CORRELATIONAL = "correlational"
    DEFINITIONAL = "definitional"
    METHODOLOGICAL = "methodological"

class TagCategory(str, enum.Enum):
    PERCEPTUAL = "perceptual"
    SOMATIC = "somatic"
    COGNITIVE = "cognitive"
    NARRATIVE = "narrative"
    ENVIRONMENTAL = "environmental"
    EMOTIONAL = "emotional"

class ConceptType(str, enum.Enum):
    PHENOMENON = "phenomenon"
    MECHANISM = "mechanism"
    ENTITY = "entity"
    LOCATION = "location"
    PROCESS = "process"
    THEORETICAL_CONSTRUCT = "theoretical_construct"

class RelationshipType(str, enum.Enum):
    CORRELATES_WITH = "correlates_with"
    PRECEDES = "precedes"
    CAUSES = "causes"
    CONTRADICTS = "contradicts"
    IS_INSTANCE_OF = "is_instance_of"
    CO_OCCURS_WITH = "co_occurs_with"
    IS_EXPLAINED_BY = "is_explained_by"
    ANOMALOUS_GIVEN = "anomalous_given"

class RelationshipStrength(str, enum.Enum):
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"

class HypothesisFramework(str, enum.Enum):
    NEUROLOGICAL = "neurological"
    PSYCHOLOGICAL = "psychological"
    SOCIOCULTURAL = "sociocultural"
    PHYSICAL = "physical"
    INTERDIMENSIONAL = "interdimensional"
    INFORMATION_THEORETIC = "information_theoretic"
    PSYCHOSPIRITUAL = "psychospiritual"
    UNKNOWN = "unknown"

class AssumedOntology(str, enum.Enum):
    PHYSICALISM = "physicalism"
    DUALISM = "dualism"
    PANPSYCHISM = "panpsychism"
    IDEALISM = "idealism"
    UNKNOWN = "unknown"
    NOVEL = "novel"

class HypothesisStatus(str, enum.Enum):
    ACTIVE = "active"
    ABANDONED = "abandoned"
    MERGED = "merged"
    SPECULATIVE = "speculative"

class EpistemicNoteType(str, enum.Enum):
    METHODOLOGICAL_CONCERN = "methodological_concern"
    REPLICATION = "replication"
    CONTRADICTION = "contradiction"
    UPDATE = "update"
    PERSONAL_OBSERVATION = "personal_observation"

class AttachableEntityType(str, enum.Enum):
    CLAIM = "claim"
    CONCEPT = "concept"
    HYPOTHESIS = "hypothesis"
    CONCEPT_RELATIONSHIP = "concept_relationship"
    SOURCE = "source"

# ── Phase 4 additions ─────────────────────────────────────────────────────────

class IngestionStatus(str, enum.Enum):
    PENDING = "pending"       # file uploaded, ingest not yet triggered
    PROCESSING = "processing" # pipeline running
    COMPLETE = "complete"     # claims written, ready for review (AI) or done (manual)
    FAILED = "failed"         # pipeline error; see source.ingestion_error

class IngestionMethod(str, enum.Enum):
    AI = "ai"                 # Claude API extraction → review queue
    MANUAL = "manual"         # researcher enters claims directly
    BULK_IMPORT = "bulk_import"  # Excel import script (retroactively labelled)
