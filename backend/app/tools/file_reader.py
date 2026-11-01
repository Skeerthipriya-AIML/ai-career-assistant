import os

def run_file_reader(filename: str) -> str:
    """Reads local file content securely (argument is filename)"""
    file_path = os.path.basename(filename.strip().strip('"').strip("'"))
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()[:1000] + "\n[Content truncated after 1000 chars]"
        except Exception as e:
            return f"Error reading file '{file_path}': {e}"
    return f"Error: File '{file_path}' does not exist in workspace."
