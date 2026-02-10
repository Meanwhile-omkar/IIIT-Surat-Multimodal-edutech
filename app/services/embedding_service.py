"""Handles chunking, embedding, and ChromaDB storage."""

# Import config first to set ANONYMIZED_TELEMETRY env var before chromadb loads
from app.core.config import CHROMA_DIR, EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Lazy-loaded singletons
_chroma_client = None
_embed_model = None
_splitter = None


def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=CHROMA_DIR,
            settings=Settings(anonymized_telemetry=False),
        )
    return _chroma_client


def get_embed_model():
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer(EMBEDDING_MODEL)
    return _embed_model


def get_splitter():
    global _splitter
    if _splitter is None:
        _splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
    return _splitter


def chunk_text(text: str) -> list[str]:
    """Split text into chunks."""
    return get_splitter().split_text(text)


def embed_and_store(
    chunks: list[str],
    doc_id: int,
    course_id: str,
    source_type: str,
    source_name: str,
) -> int:
    """Embed chunks and store in ChromaDB. Returns number of chunks stored."""
    if not chunks:
        return 0

    model = get_embed_model()
    client = get_chroma_client()

    collection = client.get_or_create_collection(
        name="study_materials",
        metadata={"hnsw:space": "cosine"},
    )

    embeddings = model.encode(chunks).tolist()

    ids = [f"doc{doc_id}_chunk{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "doc_id": doc_id,
            "course_id": course_id,
            "source_type": source_type,
            "source_name": source_name,
            "chunk_index": i,
        }
        for i in range(len(chunks))
    ]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )

    return len(chunks)


def query_chunks(query: str, course_id: str, n_results: int = 5) -> list[dict]:
    """Semantic search over stored chunks."""
    model = get_embed_model()
    client = get_chroma_client()

    collection = client.get_or_create_collection(name="study_materials")

    query_embedding = model.encode([query]).tolist()

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=n_results,
        where={"course_id": course_id},
    )

    out = []
    for i in range(len(results["ids"][0])):
        out.append({
            "id": results["ids"][0][i],
            "text": results["documents"][0][i],
            "metadata": results["metadatas"][0][i],
            "distance": results["distances"][0][i] if results.get("distances") else None,
        })
    return out


def get_all_chunks_for_course(course_id: str) -> list[dict]:
    """Get all chunks for a course (for concept extraction)."""
    client = get_chroma_client()
    collection = client.get_or_create_collection(name="study_materials")

    results = collection.get(
        where={"course_id": course_id},
        include=["documents", "metadatas"],
    )

    out = []
    for i in range(len(results["ids"])):
        out.append({
            "id": results["ids"][i],
            "text": results["documents"][i],
            "metadata": results["metadatas"][i],
        })
    return out
