import asyncio
from app.ai import llm

def run_research(text: str) -> str:
    """Summarizes articles, documents, or general topics using the Career AI model"""
    summary_prompt = f"Extract a concise summary from this text and highlight three key findings:\n\n{text.strip()}"
    try:
        summary = asyncio.run(llm.chat_completion(
            messages=[{"role": "user", "content": summary_prompt}],
            temperature=0.3
        ))
        return summary
    except Exception as e:
        return f"Error executing research tool: {e}"
