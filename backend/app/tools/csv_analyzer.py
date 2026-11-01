import os
import io
import pandas as pd

def run_csv_analyzer(filename: str) -> str:
    """Loads a CSV file and outputs columns and statistical metadata summaries"""
    csv_path = os.path.basename(filename.strip().strip('"').strip("'"))
    if os.path.exists(csv_path):
        try:
            df = pd.read_csv(csv_path)
            buffer = io.StringIO()
            df.info(buf=buffer)
            info = buffer.getvalue()
            return f"CSV Columns & Info:\n{info}\n\nFirst 3 Rows:\n{df.head(3).to_string()}"
        except Exception as e:
            return f"Error analyzing CSV '{csv_path}': {e}"
    return f"Error: CSV file '{csv_path}' not found."
