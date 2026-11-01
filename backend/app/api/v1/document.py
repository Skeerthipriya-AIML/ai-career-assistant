import logging
from fastapi import APIRouter, Depends, HTTPException, Form
from app.core.security import get_current_user
from app.services.document_service import DocumentService
from app.rag.loaders.file_loader import FileLoader
from app.schemas.schemas import ParagraphExplainRequest, TranslateRequest
from app.repositories.document_repo import document_repo

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_document_text(doc_id: str, user_id: str) -> tuple[str, str]:
    """
    Utility helper to read document and extract text by doc_id using DocumentRepository.
    """
    doc = await document_repo.find_by_id(doc_id, user_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied.")
        
    try:
        text = FileLoader.extract_text(doc["filepath"], doc["filename"])
        return text, doc["filename"]
    except Exception as e:
        logger.error(f"Error reading doc file: {e}")
        raise HTTPException(status_code=500, detail="Could not read text content from document file.")

@router.post("/summarize")
async def summarize_document(
    doc_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves and summarizes a document file.
    """
    text, filename = await get_document_text(doc_id, current_user["id"])
    summary = await DocumentService.summarize_document(text)
    return {"doc_id": doc_id, "filename": filename, "summary": summary}

@router.post("/explain-paragraph")
async def explain_paragraph(
    request: ParagraphExplainRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Explains selected dense paragraph text with specific tone levels.
    """
    explanation = await DocumentService.explain_paragraph(request.paragraph, request.tone)
    return {"paragraph": request.paragraph, "explanation": explanation}

@router.post("/translate")
async def translate_text(
    request: TranslateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Translates selected text content to target language.
    """
    translation = await DocumentService.translate_text(request.text, request.target_language)
    return {"text": request.text, "translation": translation}

@router.post("/extract-tables")
async def extract_tables(
    doc_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Identifies and formats tabular structures into clean Markdown tables.
    """
    text, filename = await get_document_text(doc_id, current_user["id"])
    tables = await DocumentService.extract_tables(text)
    return {"doc_id": doc_id, "tables": tables}

@router.post("/quiz")
async def generate_quiz(
    doc_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Generates Multiple Choice Questions from document content.
    """
    text, filename = await get_document_text(doc_id, current_user["id"])
    quiz = await DocumentService.generate_quiz(text)
    return {"doc_id": doc_id, "quiz": quiz}

@router.post("/flashcards")
async def generate_flashcards(
    doc_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Creates flashcard Q&A items from document keywords.
    """
    text, filename = await get_document_text(doc_id, current_user["id"])
    flashcards = await DocumentService.generate_flashcards(text)
    return {"doc_id": doc_id, "flashcards": flashcards}

@router.post("/compare")
async def compare_documents(
    doc_id_a: str = Form(...),
    doc_id_b: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Executes a side-by-side technical comparison of two documents.
    """
    text_a, name_a = await get_document_text(doc_id_a, current_user["id"])
    text_b, name_b = await get_document_text(doc_id_b, current_user["id"])
    
    comparison = await DocumentService.compare_documents(text_a, text_b, name_a, name_b)
    return {
        "doc_id_a": doc_id_a,
        "doc_id_b": doc_id_b,
        "comparison_report": comparison
    }

@router.post("/mind-map")
async def generate_mind_map(
    doc_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Generates a Mermaid.js diagram graph mapping the document topics hierarchy.
    """
    text, filename = await get_document_text(doc_id, current_user["id"])
    mermaid_code = await DocumentService.generate_mind_map(text)
    return {"doc_id": doc_id, "filename": filename, "mermaid": mermaid_code}

@router.post("/analyze-resume")
async def analyze_resume(
    doc_id: str = Form(...),
    job_description: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Compares resume document against job description to generate match metrics.
    """
    text, filename = await get_document_text(doc_id, current_user["id"])
    analysis = await DocumentService.analyze_resume(text, job_description)
    return {"doc_id": doc_id, "filename": filename, "analysis": analysis}

@router.post("/extract-action-items")
async def extract_action_items(
    doc_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Identifies structured action checklist rows within document text.
    """
    text, filename = await get_document_text(doc_id, current_user["id"])
    action_items = await DocumentService.extract_action_items(text)
    return {"doc_id": doc_id, "filename": filename, "action_items": action_items}

@router.post("/ask")
async def ask_document(
    doc_id: str = Form(...),
    question: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Answers targeted user questions about a specific document context using hybrid retrieval.
    """
    res = await DocumentService.ask_document_question(doc_id, current_user["id"], question)
    return {
        "doc_id": doc_id,
        "answer": res["answer"],
        "citations": res["citations"],
        "metrics": res["metrics"]
    }
