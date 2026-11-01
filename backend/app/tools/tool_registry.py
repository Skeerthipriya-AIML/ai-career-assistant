from typing import Dict, Callable, Any, List

# Import tools
from app.tools.calculator import run_calculator
from app.tools.web_search import run_web_search
from app.tools.file_reader import run_file_reader
from app.tools.research_tool import run_research
from app.tools.python_tool import run_python_code
from app.tools.csv_analyzer import run_csv_analyzer
from app.tools.weather_tool import run_weather
from app.tools.report_generator import run_report_generator

# Dynamic Tool Registry Map
TOOL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "calculator": {
        "func": run_calculator,
        "description": "Calculates math equations. Argument: formula string."
    },
    "web_search": {
        "func": run_web_search,
        "description": "Searches the web for current events. Argument: query string."
    },
    "file_reader": {
        "func": run_file_reader,
        "description": "Reads text contents from a local file. Argument: filepath string."
    },
    "research_assistant": {
        "func": run_research,
        "description": "Summarizes documents and extracts three findings. Argument: article text."
    },
    "python_tool": {
        "func": run_python_code,
        "description": "Runs sandboxed python arithmetic evaluations. Argument: code string."
    },
    "csv_analyzer": {
        "func": run_csv_analyzer,
        "description": "Computes statistical metrics on uploaded CSVs. Argument: filepath string."
    },
    "internet_search": {
        "func": run_web_search,
        "description": "Alternative internet crawler utility. Argument: query string."
    },
    "report_generator": {
        "func": run_report_generator,
        "description": "Generates a technical report from raw notes. Argument: findings string."
    },
    "weather_tool": {
        "func": run_weather,
        "description": "Checks the weather for a given city location. Argument: city string."
    }
}

def get_tool(name: str) -> Callable[[str], str]:
    """
    Retrieves execution function for a given tool name.
    """
    tool_info = TOOL_REGISTRY.get(name)
    if not tool_info:
        raise ValueError(f"Tool {name} is not registered in the system.")
    return tool_info["func"]

def get_registered_tools() -> List[Dict[str, str]]:
    """
    Exposes all registered tools and their descriptors.
    """
    return [
        {"name": name, "description": info["description"]}
        for name, info in TOOL_REGISTRY.items()
    ]
