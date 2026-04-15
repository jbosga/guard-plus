"""
Controlled vocabulary enumerations.

Centralised here so they can be imported by models, Pydantic schemas,
and any migration scripts without circular imports.
"""

import enum


# ---------------------------------------------------------------------------
# Source layer
# ---------------------------------------------------------------------------

class SourceType(str, enum.Enum):
    ACCOUNT = "account"           # First-person abduction account
    PAPER = "paper"               # Academic / peer-reviewed paper
    BOOK = "book"
    INTERVIEW = "interview"
    MEDIA = "media"               # Documentary, podcast, news piece
    FIELD_REPORT = "field_report" # Investigator field report


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
    HYPNAGOGIC = "hypnagogic"         # Sleep/wake boundary
    HYPNOPOMPIC = "hypnopompic"       # Wake/sleep boundary
    ALTERED_STATE = "altered_state"   # Meditation, substances, etc.
    FULL_CONSCIOUSNESS = "full_consciousness"
    UNKNOWN = "unknown"


class CorroborationLevel(str, enum.Enum):
    NONE = "none"
    WITNESS = "witness"               # Other person present
    PHYSICAL_TRACE = "physical_trace" # Physical evidence
    INVESTIGATOR = "investigator"     # Documented by investigator
    MULTIPLE = "multiple"             # Multiple corroboration types


# ---------------------------------------------------------------------------
# Claim layer
# ---------------------------------------------------------------------------

class EpistemicStatus(str, enum.Enum):
    ASSERTED = "asserted"     # Reporter states as fact
    OBSERVED = "observed"     # Directly observed, documented
    INFERRED = "inferred"     # Reasoned from evidence
    SPECULATIVE = "speculative"
    CONTESTED = "contested"   # Contradicted by other sources
    RETRACTED = "retracted"   # Explicitly withdrawn


class ClaimType(str, enum.Enum):
    PHENOMENOLOGICAL = "phenomenological"  # What was experienced
    CAUSAL = "causal"                       # X caused Y
    CORRELATIONAL = "correlational"         # X co-occurs with Y
    DEFINITIONAL = "definitional"           # What X is
    METHODOLOGICAL = "methodological"       # How something was studied


# ---------------------------------------------------------------------------
# PhenomenonTag layer
# ---------------------------------------------------------------------------

class TagCategory(str, enum.Enum):
    PERCEPTUAL = "perceptual"       # Visual, auditory, olfactory phenomena
    SOMATIC = "somatic"             # Body sensations, marks, effects
    COGNITIVE = "cognitive"         # Memory, thought insertion, beliefs
    NARRATIVE = "narrative"         # Story elements, beings, locations
    ENVIRONMENTAL = "environmental" # Location, setting, surroundings
    EMOTIONAL = "emotional"         # Fear, calm, awe, love


# ---------------------------------------------------------------------------
# Concept / knowledge graph layer
# ---------------------------------------------------------------------------

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
    ANOMALOUS_GIVEN = "anomalous_given"  # Key: flags unexplained tensions


class RelationshipStrength(str, enum.Enum):
    WEAK = "weak"
    MODERATE = "moderate"
    STRONG = "strong"


# ---------------------------------------------------------------------------
# Hypothesis layer
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# EpistemicNote layer
# ---------------------------------------------------------------------------

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
