import os
import shutil
import time
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from typing import Optional, List
from pydantic import BaseModel
from app.core.security import get_current_user
from app.rag.pipeline.ingestion_pipeline import IngestionPipeline
from app.rag.pipeline.retrieval_pipeline import RetrievalPipeline
from app.rag.pipeline.generation_pipeline import GenerationPipeline
from app.rag.vector_store.chroma_store import ChromaStore
from app.rag.knowledge.graph_service import GraphService
from app.notifications.notification_service import NotificationService
from app.ai import llm
from app.services.admin_service import AdminService
from app.schemas.schemas import ChatSessionResponse, ChatMessage, Citation
from app.repositories.document_repo import document_repo
from app.repositories.chat_repo import chat_repo
from fastapi.responses import StreamingResponse
from bson import ObjectId
import json

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class DocumentUpdatePayload(BaseModel):
    filename: Optional[str] = None
    is_favorite: Optional[bool] = None
    tags: Optional[List[str]] = None
    collection_name: Optional[str] = None

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Uploads file, runs virus check, checks duplicates, indexes vectors, and generates AI metadata.
    """
    file_path = os.path.join(UPLOAD_DIR, f"{int(time.time())}_{file.filename}")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Error saving uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Error occurred while saving file on server.")
        
    try:
        await NotificationService.create_notification(
            user_id=current_user["id"],
            text=f"File '{file.filename}' uploaded successfully.",
            notification_type="upload completed"
        )
        
        index_result = await IngestionPipeline.run(
            user_id=current_user["id"],
            filename=file.filename,
            file_path=file_path
        )
        
        await NotificationService.create_notification(
            user_id=current_user["id"],
            text=f"Document '{file.filename}' vector indexing completed successfully.",
            notification_type="indexing finished"
        )
        
        await AdminService.log_telemetry(
            endpoint="/chatbot/upload",
            tokens=0,
            latency_ms=100.0,
            user_id=current_user["id"]
        )
        
        return {
            "id": index_result["id"],
            "filename": index_result["filename"],
            "chunks_count": index_result["chunks_count"],
            "version": index_result["version"],
            "success": True
        }
    except Exception as e:
        logger.error(f"Error indexing uploaded document {file.filename}: {e}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/documents")
async def list_documents(current_user: dict = Depends(get_current_user)):
    """
    Lists uploaded documents belonging to the authenticated user.
    """
    return await document_repo.list_by_user(current_user["id"])

@router.patch("/documents/{doc_id}")
async def update_document_metadata(
    doc_id: str,
    payload: DocumentUpdatePayload,
    current_user: dict = Depends(get_current_user)
):
    """
    Updates document tags, collection folder, favorite flag, or renames.
    """
    doc = await document_repo.find_by_id(doc_id, current_user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    update_data = {k: v for k, v in payload.dict().items() if v is not None}
    if not update_data:
        return doc
        
    await document_repo.update_metadata(doc_id, current_user["id"], update_data)
    updated = await document_repo.find_by_id(doc_id, current_user["id"])
    return updated

@router.post("/reindex/{doc_id}")
async def reindex_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Re-chunks and re-embeds document vectors.
    """
    doc = await document_repo.find_by_id(doc_id, current_user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    # Purge vectors and graph relations
    await ChromaStore.delete_document(current_user["id"], doc_id)
    await GraphService.delete_by_document(doc_id)
    
    # Reindex
    index_result = await IngestionPipeline.run(
        user_id=current_user["id"],
        filename=doc["filename"],
        file_path=doc["filepath"]
    )
    await NotificationService.create_notification(
        user_id=current_user["id"],
        text=f"Document '{doc['filename']}' re-indexing finished.",
        notification_type="indexing finished"
    )
    return {"message": "Document reindexed successfully.", "chunks": index_result["chunks_count"]}

@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Deletes document record and clears its indexes from segregated Chroma database.
    """
    doc = await document_repo.find_by_id(doc_id, current_user["id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or access denied.")
        
    if os.path.exists(doc["filepath"]):
        try:
            os.remove(doc["filepath"])
        except Exception as e:
            logger.warning(f"Error removing local document file: {e}")
            
    await ChromaStore.delete_document(current_user["id"], doc_id)
    await GraphService.delete_by_document(doc_id)
    await document_repo.delete(doc_id, current_user["id"])
    return {"message": "Document deleted successfully."}

@router.post("/chat")
async def send_chat_message(
    prompt: str = Form(...),
    session_id: Optional[str] = Form(None),
    document_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Decoupled streaming endpoint representing retrieval, reranking, and generation status milestones.
    """
    start_time = time.time()
    
    doc_ids = []
    if document_id:
        doc_ids = [d.strip() for d in document_id.split(",") if d.strip()]
        
    db = chat_repo.collection.database
    
    async def response_generator():
        nonlocal session_id
        is_new = False
        if not session_id:
            is_new = True
            session_record = {
                "user_id": current_user["id"],
                "name": prompt[:40] + ("..." if len(prompt) > 40 else ""),
                "created_at": datetime.utcnow(),
                "messages": []
            }
            session_id = await chat_repo.create(session_record)
            
        # 1. Emit retrieval started
        yield json.dumps({"type": "retrieval_started"}) + "\n"
        
        # Run Retrieval Pipeline
        retrieved_results, retrieval_metrics, rewritten_query = await RetrievalPipeline.run(
            user_id=current_user["id"],
            query=prompt,
            document_ids=doc_ids,
            top_k=4
        )
        
        # 2. Emit documents found
        doc_names = list(set([r.document_name for r in retrieved_results]))
        yield json.dumps({
            "type": "documents_found",
            "documents": doc_names
        }) + "\n"
        
        # 3. Emit generation started
        yield json.dumps({"type": "generation_started"}) + "\n"
        
        # Run Generation Pipeline
        gen_start_time = time.time()
        system_prompt, token_stream, citations = await GenerationPipeline.run(
            user_id=current_user["id"],
            query=prompt,
            retrieved_results=retrieved_results
        )
        
        full_answer = ""
        async for token in token_stream:
            full_answer += token
            yield json.dumps({"type": "content", "delta": token}) + "\n"
            
        generation_latency_ms = (time.time() - gen_start_time) * 1000
        
        # 4. Emit citations
        yield json.dumps({
            "type": "citations",
            "citations": citations
        }) + "\n"
        
        # 5. Emit completed with performance metrics
        total_latency_ms = (time.time() - start_time) * 1000
        final_metrics = retrieval_metrics.copy()
        final_metrics.update({
            "generation_latency_ms": generation_latency_ms,
            "total_latency_ms": total_latency_ms
        })
        
        yield json.dumps({
            "type": "completed",
            "session_id": session_id,
            "query_rewrite": rewritten_query,
            "metrics": final_metrics
        }) + "\n"
        
        # Save messages to database
        chat_message_record = {
            "role": "user",
            "content": prompt,
            "timestamp": datetime.utcnow()
        }
        
        assistant_message_record = {
            "role": "assistant",
            "content": full_answer,
            "timestamp": datetime.utcnow(),
            "citations": citations,
            "query_rewrite": rewritten_query
        }
        
        if is_new:
            await db["chats"].update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {"messages": [chat_message_record, assistant_message_record]}}
            )
        else:
            await chat_repo.append_messages(session_id, current_user["id"], chat_message_record, assistant_message_record)
            
        # Telemetry
        tokens_estimated = len(prompt.split()) + len(full_answer.split()) + len(system_prompt.split())
        await AdminService.log_telemetry(
            endpoint="/chatbot/chat",
            tokens=tokens_estimated,
            latency_ms=total_latency_ms,
            user_id=current_user["id"]
        )
        
        yield json.dumps({"type": "done"}) + "\n"
        
    return StreamingResponse(response_generator(), media_type="text/event-stream")

@router.get("/history")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    """
    Lists past chat session titles for the authenticated user.
    """
    return await chat_repo.list_by_user(current_user["id"])

@router.get("/history/{session_id}")
async def get_session_by_id(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Idempotent fetch of specific chat logs detail.
    """
    session = await chat_repo.find_by_id(session_id, current_user["id"])
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found.")
    
    session["id"] = str(session["_id"])
    del session["_id"]
    return session

class RenameSessionPayload(BaseModel):
    name: str

@router.patch("/history/{session_id}")
async def rename_session(
    session_id: str,
    payload: RenameSessionPayload,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    res = await chat_repo.collection.update_one(
        {"_id": ObjectId(session_id), "user_id": current_user["id"]},
        {"$set": {"name": payload.name}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found or access denied.")
    return {"message": "Session renamed successfully."}

@router.delete("/history/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    res = await chat_repo.collection.delete_one(
        {"_id": ObjectId(session_id), "user_id": current_user["id"]}
    )
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found or access denied.")
    return {"message": "Session deleted successfully."}
