import re
import sys
import io
import math

def run_python_code(code_str: str) -> str:
    """Executes Python code in a restricted local environment. Print statements must be used to view results."""
    # Basic security check
    blacklist = ["os", "sys", "subprocess", "eval", "exec", "open", "importlib", "requests", "socket"]
    for keyword in blacklist:
        if re.search(r"\b" + keyword + r"\b", code_str):
            return f"Security Error: Importing or using '{keyword}' is blocked in this sandbox."
            
    old_stdout = sys.stdout
    redirected_output = sys.stdout = io.StringIO()
    
    # Restricted global variables
    safe_globals = {
        "__builtins__": {
            "abs": abs, "all": all, "any": any, "bin": bin, "bool": bool,
            "dict": dict, "dir": dir, "divmod": divmod, "enumerate": enumerate,
            "filter": filter, "float": float, "format": format, "hex": hex,
            "id": id, "int": int, "isinstance": isinstance, "len": len,
            "list": list, "map": map, "max": max, "min": min, "oct": oct,
            "pow": pow, "print": print, "range": range, "reversed": reversed,
            "round": round, "set": set, "sorted": sorted, "str": str,
            "sum": sum, "tuple": tuple, "zip": zip, "math": math
        }
    }
    
    try:
        exec(code_str, safe_globals)
        sys.stdout = old_stdout
        return redirected_output.getvalue() or "Code executed successfully with no print outputs."
    except Exception as e:
        sys.stdout = old_stdout
        return f"Runtime Error: {e}"
