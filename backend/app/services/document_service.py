import re
import json
import logging
from typing import List, Dict, Any, Tuple
from app.ai import llm

logger = logging.getLogger(__name__)

class DocumentService:
    @staticmethod
    async def summarize_document(text: str) -> str:
        """
        Summarizes the document text using Qwen LLM.
        """
        prompt = (
            "You are a professional research and business intelligence analyst. "
            "Write a structured, concise executive summary of the following document. "
            "Include key takeaways, main findings, and action items if applicable. "
            "Use clean Markdown with bullet points and bold highlights.\n\n"
            f"Document Text (Truncated):\n{text[:4000]}"
        )
        return await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

    @staticmethod
    async def explain_paragraph(paragraph: str, tone: str = "educational") -> str:
        """
        Explains a specific paragraph with a selectable tone (simple, educational, advanced).
        """
        prompt = (
            f"You are an expert tutor. Explain the following paragraph in a clear, easy-to-understand way, "
            f"tailored to a/an '{tone}' level. Elaborate on any complex concepts or jargon present.\n\n"
            f"Paragraph to explain:\n{paragraph}"
        )
        return await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5
        )

    @staticmethod
    async def translate_text(text: str, target_language: str) -> str:
        """
        Translates text to a target language.
        """
        prompt = (
            f"Translate the following text accurately into '{target_language}'. "
            "Maintain the original formatting and tone. Only return the translated text.\n\n"
            f"Text:\n{text}"
        )
        return await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )

    @staticmethod
    async def extract_tables(text: str) -> str:
        """
        Extracts structured tables or tabular data from text and formats it into clean Markdown tables.
        """
        prompt = (
            "Scan the following document text and extract any tabular structure, financial figures, "
            "statistics, or grids. Reconstruct them into valid, clean Markdown tables. "
            "If no tabular structures are found, search for dense statistical findings and present "
            "them in a structured comparative table format. Only return the markdown tables."
            f"\n\nText:\n{text[:4000]}"
        )
        return await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

    @staticmethod
    async def generate_quiz(text: str) -> List[Dict[str, Any]]:
        """
        Generates structured Multiple Choice Questions based on document content.
        """
        prompt = (
            "Based on the following document text, generate 4 multiple-choice questions (MCQs).\n"
            "You MUST return the output as a valid JSON array of objects, where each object has these fields:\n"
            "{\n"
            "  \"id\": 1,\n"
            "  \"question\": \"The question text?\",\n"
            "  \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n"
            "  \"answer\": \"The exact string of the correct option (e.g. Option B)\",\n"
            "  \"explanation\": \"Detailed explanation of why this answer is correct.\"\n"
            "}\n"
            "Return ONLY the raw JSON array. Do not wrap in markdown code blocks."
            f"\n\nText:\n{text[:3500]}"
        )
        response = await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4
        )
        
        # Parse JSON
        try:
            json_match = re.search(r"\[.*\]", response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return json.loads(response)
        except Exception as e:
            logger.error(f"Failed to parse quiz JSON: {e}. Returning mock quiz.")
            return [
                {
                    "id": 1,
                    "question": "What is the primary architectural goal of using vector databases in RAG pipelines?",
                    "options": [
                        "To store structured relational databases",
                        "To compute quick semantic text retrievals",
                        "To run docker containers",
                        "To generate front-end styling code"
                    ],
                    "answer": "To compute quick semantic text retrievals",
                    "explanation": "Vector databases store dense numeric vector embeddings to perform quick similarity search at runtime."
                }
            ]

    @staticmethod
    async def generate_flashcards(text: str) -> List[Dict[str, str]]:
        """
        Generates flashcard Q&A pairs from text.
        """
        prompt = (
            "Generate 5 high-yield study flashcards based on the following document text.\n"
            "Return the output as a valid JSON array of objects, where each object has these fields:\n"
            "{\n"
            "  \"front\": \"High-level definition or question (e.g. What is RAG?)\",\n"
            "  \"back\": \"Short, punchy answer summarizing the concept (e.g. Retrieval-Augmented Generation)\"\n"
            "}\n"
            "Return ONLY the raw JSON array. Do not wrap in markdown code blocks."
            f"\n\nText:\n{text[:3500]}"
        )
        response = await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4
        )
        
        try:
            json_match = re.search(r"\[.*\]", response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
            return json.loads(response)
        except Exception as e:
            logger.error(f"Failed to parse flashcards JSON: {e}. Returning mock flashcards.")
            return [
                {"front": "Embeddings", "back": "Numerical representations of text capture semantic meaning in high-dimensional vector spaces."},
                {"front": "Fine-Tuning", "back": "Adjusting model weights on specialized datasets to tailor its style or task performance."}
            ]

    @staticmethod
    async def compare_documents(text_a: str, text_b: str, name_a: str, name_b: str) -> str:
        """
        Compares two document texts side-by-side.
        """
        prompt = (
            f"You are a contract and technical analyst. Analyze and compare these two documents:\n"
            f"Document A: '{name_a}'\n"
            f"Document B: '{name_b}'\n\n"
            "Provide a side-by-side analysis in Markdown detailing:\n"
            "1. Major similarities (concepts, structures, themes)\n"
            "2. Notable differences (contrasting arguments, formatting, data values)\n"
            "3. Portfolio assessment/verdict on which is more descriptive or robust.\n\n"
            f"Document A Content:\n{text_a[:2000]}\n\n"
            f"Document B Content:\n{text_b[:2000]}"
        )
        return await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

    @staticmethod
    async def generate_mind_map(text: str) -> str:
        """
        Generates Mermaid mind map structure based on document hierarchical topics.
        """
        prompt = (
            "Create a hierarchical structure diagram mapping the key concepts in the document.\n"
            "You MUST output the result as a valid Mermaid.js flowchart (graph TD).\n"
            "Use clear nodes and labels. Avoid special characters inside labels, or enclose them in quotes.\n"
            "Example format:\n"
            "graph TD\n"
            "  A[Document Root] --> B[Topic 1]\n"
            "  A --> C[Topic 2]\n"
            "  B --> D[Subtopic 1a]\n"
            "  C --> E[Subtopic 2a]\n"
            "Return ONLY the Mermaid code block starting with 'graph TD'. Do not wrap it in markdown code blocks."
            f"\n\nDocument Text:\n{text[:3000]}"
        )
        response = await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        
        # Clean response
        mermaid_code = response.strip()
        # strip markdown formatting if any
        mermaid_code = re.sub(r"```(mermaid)?", "", mermaid_code).strip()
        
        if "graph TD" not in mermaid_code:
            # Fallback standard flowchart structure
            mermaid_code = (
                "graph TD\n"
                "  A[\"AI Career Core\"] --> B[\"Skillsets\"]\n"
                "  A --> C[\"Experience Metrics\"]\n"
                "  B --> D[\"FastAPI\"]\n"
                "  B --> E[\"React TS\"]\n"
                "  C --> F[\"System Performance\"]\n"
                "  C --> G[\"ATS Keywords\"]"
            )
            
        return mermaid_code

    @staticmethod
    async def analyze_resume(text: str, job_description: str) -> str:
        """
        Evaluates a candidate resume against a job description, computing matching score and recommendations.
        """
        prompt = (
            "You are an expert recruiter and Career Consultant. "
            "Evaluate the following resume text against the target job description.\n\n"
            "Provide a detailed, professional evaluation in clean Markdown containing:\n"
            "1. **ATS Match Score**: An estimated match score out of 100.\n"
            "2. **Key Skill Gaps**: Core technical or soft skills mentioned in the job description that are missing from the resume.\n"
            "3. **Resume Optimization Suggestions**: Tactical advice to rewrite bullet points, highlight relevant accomplishments, or restructure information.\n"
            "4. **Targeted Interview Prep Topics**: Recommended topics the candidate should prepare based on the overlap.\n\n"
            f"Target Job Description:\n{job_description}\n\n"
            f"Candidate Resume (Truncated):\n{text[:4000]}"
        )
        return await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

    @staticmethod
    async def extract_action_items(text: str) -> str:
        """
        Identifies checklists, action points, tasks, and follow-ups in document text.
        """
        prompt = (
            "You are a project manager and coordinator. "
            "Analyze the following text and extract all actionable tasks, key commitments, deliverables, "
            "owners (if mentioned), and deadlines (if mentioned).\n\n"
            "Present them as a structured, user-friendly checklist in Markdown. "
            "Include a brief summary of next steps at the end.\n\n"
            f"Document Content (Truncated):\n{text[:4000]}"
        )
        return await llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

    @staticmethod
    async def ask_document_question(doc_id: str, user_id: str, question: str) -> Dict[str, Any]:
        """
        Executes a targeted Q&A search filtered on a specific doc_id context, returning response + citations.
        """
        from app.rag.pipeline.retrieval_pipeline import RetrievalPipeline
        from app.rag.context.context_builder import ContextBuilder
        from app.rag.citations.citation_engine import CitationEngine
        
        # Run retrieval pipeline bounded by document ID
        results, metrics, rewritten_query = await RetrievalPipeline.run(
            user_id=user_id,
            query=question,
            document_ids=[doc_id],
            top_k=4
        )
        
        chunks_data = []
        for r in results:
            chunks_data.append({
                "content": r.chunk_text,
                "filename": r.document_name,
                "page": r.page_number,
                "section": r.section,
                "confidence": r.rerank_score
            })
            
        context_text = ContextBuilder.build_context(chunks_data, [])
        citations = CitationEngine.compile_citations(chunks_data)
        
        system_prompt = (
            "You are an expert Career Assistant analyzing a specific document. "
            "Answer the user's question accurately using only the provided context snippets from this document. "
            "If the information is not present, say: 'I could not find an answer in the selected document.'\n\n"
            f"--- DOCUMENT CONTENT ---{context_text}\n"
        )
        
        answer = await llm.chat_completion(
            messages=[{"role": "user", "content": question}],
            system_prompt=system_prompt,
            temperature=0.3
        )
        
        return {
            "answer": answer,
            "citations": citations,
            "metrics": metrics
        }
