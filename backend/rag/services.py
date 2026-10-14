import logging
import threading
import uuid
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.db import close_old_connections, transaction

from core.models import Notification
from rag.models import CourseDocument, DocumentChunk


logger = logging.getLogger(__name__)
MAX_CHUNK_CHARS = 800
CHUNK_OVERLAP_CHARS = 100


def split_page_text(text, max_chars=MAX_CHUNK_CHARS, overlap=CHUNK_OVERLAP_CHARS):
    paragraphs = [part.strip() for part in text.splitlines() if part.strip()]
    chunks = []
    current = ""
    for paragraph in paragraphs:
        if len(paragraph) <= max_chars:
            pieces = [paragraph]
        else:
            pieces = [
                paragraph[start : start + max_chars]
                for start in range(0, len(paragraph), max_chars - overlap)
            ]
        for piece in pieces:
            candidate = f"{current}\n\n{piece}" if current else piece
            if len(candidate) <= max_chars:
                current = candidate
                continue
            if current:
                chunks.append(current)
            carry_length = min(overlap, max(0, max_chars - len(piece) - 2))
            prefix = current[-carry_length:] if carry_length else ""
            current = f"{prefix}\n\n{piece}" if prefix else piece
    if current:
        chunks.append(current)
    return chunks


@lru_cache(maxsize=1)
def _embedding_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.RAG_EMBEDDING_MODEL)


def _embed(texts):
    return _embedding_model().encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
    ).tolist()


def _collection(course_id):
    import chromadb

    persist_path = Path(settings.RAG_VECTORSTORE_PATH)
    persist_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(persist_path))
    return client.get_or_create_collection(
        name=f"course_{course_id}",
        metadata={"hnsw:space": "cosine"},
    )


def _extract_pdf_pages(file_path):
    from pypdf import PdfReader

    reader = PdfReader(file_path)
    pages = [
        (page_number, page.extract_text() or "")
        for page_number, page in enumerate(reader.pages, start=1)
    ]
    if not any(text.strip() for _, text in pages):
        raise ValueError("PDF scanné non supporté : aucun texte n'a pu être extrait.")
    return pages


def index_document(document_id):
    close_old_connections()
    document = None
    try:
        document = CourseDocument.objects.select_related("course", "uploaded_by").get(
            pk=document_id
        )
        document.status = CourseDocument.Status.PROCESSING
        document.error_message = ""
        document.save(update_fields=("status", "error_message"))

        pages = _extract_pdf_pages(document.file.path)
        if not any(text.strip() for _, text in pages):
            raise ValueError(
                "PDF scanné non supporté : aucun texte n'a pu être extrait."
            )
        chunks_to_index = []
        for page_number, text in pages:
            chunks_to_index.extend(
                (page_number, index, content)
                for index, content in enumerate(split_page_text(text))
            )
        if not chunks_to_index:
            raise ValueError("Aucun texte exploitable n'a été trouvé dans ce PDF.")

        embedding_ids = [str(uuid.uuid4()) for _ in chunks_to_index]
        vectors = _embed([content for _, _, content in chunks_to_index])

        collection = _collection(document.course_id)
        previous_ids = list(
            document.chunks.values_list("embedding_id", flat=True)
        )
        if previous_ids:
            collection.delete(ids=previous_ids)

        with transaction.atomic():
            DocumentChunk.objects.filter(document=document).delete()
            DocumentChunk.objects.bulk_create(
                [
                    DocumentChunk(
                        document=document,
                        content=content,
                        page_number=page_number,
                        chunk_index=chunk_index,
                        embedding_id=embedding_id,
                    )
                    for (page_number, chunk_index, content), embedding_id in zip(
                        chunks_to_index,
                        embedding_ids,
                        strict=True,
                    )
                ]
            )

        collection.add(
            ids=embedding_ids,
            embeddings=vectors,
            documents=[content for _, _, content in chunks_to_index],
            metadatas=[
                {
                    "document_id": document.id,
                    "page_number": page_number,
                    "chunk_index": chunk_index,
                }
                for page_number, chunk_index, _ in chunks_to_index
            ],
        )
        document.page_count = len(pages)
        document.status = CourseDocument.Status.READY
        document.error_message = ""
        document.save(update_fields=("page_count", "status", "error_message"))
        Notification.objects.create(
            user=document.uploaded_by,
            title="Document de cours prêt",
            message=f"Le document « {document.title} » est prêt pour la recherche.",
        )
    except Exception as exc:
        logger.exception("Failed to index course document %s.", document_id)
        if document is not None:
            document.status = CourseDocument.Status.FAILED
            document.error_message = str(exc)[:1000]
            document.save(update_fields=("status", "error_message"))
    finally:
        close_old_connections()


def schedule_indexing(document_id):
    thread = threading.Thread(
        target=index_document,
        args=(document_id,),
        name=f"index-course-document-{document_id}",
        daemon=True,
    )
    thread.start()


def delete_document_vectors(document):
    chunk_ids = list(document.chunks.values_list("embedding_id", flat=True))
    if chunk_ids:
        _collection(document.course_id).delete(ids=chunk_ids)


def retrieve(course_id, query, k=5, document_ids=None):
    ready_queryset = CourseDocument.objects.filter(
        course_id=course_id,
        status=CourseDocument.Status.READY,
    )
    if document_ids is not None:
        ready_queryset = ready_queryset.filter(id__in=document_ids)
    ready_documents = ready_queryset.values_list("id", "title")
    titles = dict(ready_documents)
    if not titles or not query.strip():
        return []

    result = _collection(course_id).query(
        query_embeddings=_embed([query]),
        n_results=max(k * 3, k),
        where={"document_id": {"$in": list(titles)}},
        include=["documents", "metadatas", "distances"],
    )
    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]
    chunks = [
        {
            "document_id": metadata["document_id"],
            "document_title": titles[metadata["document_id"]],
            "page_number": metadata["page_number"],
            "chunk_index": metadata["chunk_index"],
            "content": content,
            "score": max(0.0, 1.0 - distance),
        }
        for content, metadata, distance in zip(
            documents,
            metadatas,
            distances,
            strict=True,
        )
    ]
    return chunks[:k]
