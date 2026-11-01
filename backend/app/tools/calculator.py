import re

def run_calculator(argument: str) -> str:
    """Safe evaluate arithmetic expressions (e.g. '123 + 456')"""
    try:
        clean_expr = re.sub(r"[^0-9\+\-\*\/\(\)\. ]", "", argument)
        if not clean_expr.strip():
            return "Error: Empty expression."
        return str(eval(clean_expr, {"__builtins__": None}))
    except Exception as e:
        return f"Error executing calculator tool: {e}"
