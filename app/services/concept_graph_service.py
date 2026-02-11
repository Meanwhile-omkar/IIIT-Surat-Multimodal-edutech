"""Concept graph: extract concepts & relationships from chunks via LLM, store in DB."""

import json
from sqlalchemy.orm import Session

from app.models.schemas import Concept, ConceptEdge
from app.services.llm_service import llm_json
from app.services.embedding_service import get_all_chunks_for_course, get_embed_model

EXTRACT_SYSTEM = """You are an expert at analyzing educational content.
Extract the key concepts and their relationships from the given text.

Return JSON with this exact structure:
{
  "concepts": ["concept1", "concept2", ...],
  "relationships": [
    {"source": "concept1", "target": "concept2", "relation": "prerequisite"},
    ...
  ]
}

Rules:
- Keep concept names short (1-4 words), lowercase
- relation must be one of: "prerequisite", "related", "part_of"
- "prerequisite" means source must be learned before target
- Extract 3-8 concepts per chunk, only meaningful ones
- Only include relationships you are confident about"""

EXTRACT_USER = """Extract concepts and relationships from this educational text:

{text}"""


def extract_concepts_from_course(course_id: str, db: Session, db_course_id: int) -> dict:
    """
    Extract concepts from all chunks of a course, merge duplicates,
    and store in DB. Returns summary stats.
    """
    chunks = get_all_chunks_for_course(course_id)
    if not chunks:
        return {"num_concepts": 0, "num_edges": 0, "concepts": []}

    # Process chunks in batches (combine small chunks for efficiency)
    all_concepts = set()
    all_relationships = []

    batch_text = ""
    for chunk in chunks:
        batch_text += chunk["text"] + "\n\n"
        # Process every ~1500 chars to keep LLM context reasonable
        if len(batch_text) > 1500:
            _extract_batch(batch_text, all_concepts, all_relationships)
            batch_text = ""

    # Process remaining
    if batch_text.strip():
        _extract_batch(batch_text, all_concepts, all_relationships)

    if not all_concepts:
        return {"num_concepts": 0, "num_edges": 0, "concepts": []}

    # Deduplicate concepts using embedding similarity
    concept_list = _deduplicate_concepts(list(all_concepts))

    # Build canonical name mapping
    canonical_map = {}
    for group in concept_list:
        canon = group[0]  # first = most common
        for name in group:
            canonical_map[name] = canon

    # Store concepts in DB
    concept_db_map = {}  # canonical_name -> Concept row
    for group in concept_list:
        canon = group[0]
        existing = db.query(Concept).filter(
            Concept.course_id == db_course_id,
            Concept.name == canon,
        ).first()
        if not existing:
            c = Concept(
                course_id=db_course_id,
                name=canon,
                importance=min(len(group) / 3.0, 1.0),  # rough importance from frequency
            )
            db.add(c)
            db.flush()
            existing = c
        concept_db_map[canon] = existing

    # Store edges
    edge_count = 0
    seen_edges = set()
    for rel in all_relationships:
        src_canon = canonical_map.get(rel["source"], rel["source"])
        tgt_canon = canonical_map.get(rel["target"], rel["target"])

        if src_canon not in concept_db_map or tgt_canon not in concept_db_map:
            continue
        if src_canon == tgt_canon:
            continue

        edge_key = (src_canon, tgt_canon, rel["relation"])
        if edge_key in seen_edges:
            continue
        seen_edges.add(edge_key)

        existing_edge = db.query(ConceptEdge).filter(
            ConceptEdge.source_id == concept_db_map[src_canon].id,
            ConceptEdge.target_id == concept_db_map[tgt_canon].id,
        ).first()
        if not existing_edge:
            edge = ConceptEdge(
                source_id=concept_db_map[src_canon].id,
                target_id=concept_db_map[tgt_canon].id,
                relation=rel["relation"],
                confidence=0.7,
            )
            db.add(edge)
            edge_count += 1

    db.commit()

    return {
        "num_concepts": len(concept_db_map),
        "num_edges": edge_count,
        "concepts": list(concept_db_map.keys()),
    }


def _extract_batch(text: str, all_concepts: set, all_relationships: list):
    """Extract concepts/relations from a text batch via LLM."""
    try:
        result = llm_json(EXTRACT_SYSTEM, EXTRACT_USER.format(text=text[:3000]))
        concepts = result.get("concepts", [])
        rels = result.get("relationships", [])

        for c in concepts:
            if isinstance(c, str) and len(c) > 1:
                all_concepts.add(c.lower().strip())

        for r in rels:
            if all(k in r for k in ("source", "target", "relation")):
                all_relationships.append({
                    "source": r["source"].lower().strip(),
                    "target": r["target"].lower().strip(),
                    "relation": r["relation"],
                })
    except Exception:
        pass  # Skip failed batches, don't crash the whole pipeline


def _deduplicate_concepts(concepts: list[str]) -> list[list[str]]:
    """Group similar concept names using embedding cosine similarity."""
    if len(concepts) <= 1:
        return [[c] for c in concepts]

    model = get_embed_model()
    embeddings = model.encode(concepts)

    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    sim_matrix = cosine_similarity(embeddings)

    # Simple greedy clustering: threshold = 0.85
    visited = set()
    groups = []
    for i in range(len(concepts)):
        if i in visited:
            continue
        group = [concepts[i]]
        visited.add(i)
        for j in range(i + 1, len(concepts)):
            if j in visited:
                continue
            if sim_matrix[i][j] > 0.85:
                group.append(concepts[j])
                visited.add(j)
        groups.append(group)

    return groups


def get_concept_graph(course_id: int, db: Session) -> dict:
    """Fetch the concept graph for a course from DB with layout coordinates."""
    import networkx as nx

    concepts = db.query(Concept).filter(Concept.course_id == course_id).all()
    if not concepts:
        return {"concepts": [], "edges": []}

    concept_ids = [c.id for c in concepts]
    edges = db.query(ConceptEdge).filter(
        ConceptEdge.source_id.in_(concept_ids)
    ).all()

    # Build networkx graph for layout calculation
    G = nx.DiGraph()
    for c in concepts:
        G.add_node(c.id, name=c.name, importance=c.importance)
    for e in edges:
        G.add_edge(e.source_id, e.target_id, relation=e.relation)

    # Calculate layout using force-directed algorithm
    if len(G.nodes()) > 0:
        # Use spring layout for nice visual spacing
        pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
        # Scale to reasonable pixel coordinates (0-1000 range)
        for node_id in pos:
            pos[node_id] = (pos[node_id][0] * 500 + 500, pos[node_id][1] * 500 + 500)
    else:
        pos = {}

    return {
        "concepts": [
            {
                "id": c.id,
                "name": c.name,
                "importance": c.importance,
                "description": c.description,
                "x": pos.get(c.id, (500, 500))[0],
                "y": pos.get(c.id, (500, 500))[1],
            }
            for c in concepts
        ],
        "edges": [
            {"source": e.source_id, "target": e.target_id, "relation": e.relation, "confidence": e.confidence}
            for e in edges
        ],
    }
