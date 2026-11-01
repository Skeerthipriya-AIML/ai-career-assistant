import asyncio
from app.ai import llm

def run_report_generator(findings: str) -> str:
    """Generates a structured, professional Markdown report based on research findings"""
    prompt = (
        "You are an expert technical report generator. Given the following compilation of research and data points, "
        "synthesize them into a beautifully formatted, comprehensive Markdown report with sections, "
        "bullet points, and key recommendations. Ensure a highly professional tone.\n\n"
        f"--- FINDINGS AND DATA POINTS ---\n{findings}\n\n"
        "Generate the markdown report below:"
    )
    try:
        report = asyncio.run(llm.chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        ))
        return report
    except Exception as e:
        return f"Error executing report generator: {e}"
