def count_tokens(text: str) -> int:
    """
    Estimates token counts (approx 1.3 tokens per word fallback).
    """
    if not text:
        return 0
    words = text.split()
    return int(len(words) * 1.3)
