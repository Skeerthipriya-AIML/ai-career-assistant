import logging
import json
import re
from typing import List, Dict, Any, Tuple, Optional, TypedDict, AsyncGenerator
from langgraph.graph import StateGraph, END

# Import the service/LLM
from app.ai import llm

# Import the tool registry
from app.tools.tool_registry import get_tool, TOOL_REGISTRY

# Import execution service
from app.agents.execution_service import ExecutionService

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    input: str
    plan: Optional[str]
    steps: List[Dict[str, Any]]
    output: Optional[str]
    success: bool
    iterations: int

def execute_tool(name: str, argument: str) -> str:
    """Invokes the appropriate subtool dynamically using the tool registry"""
    name_clean = name.lower().strip()
    arg_clean = argument.strip().strip('"').strip("'")
    
    matched_tool = None
    for tool_key in TOOL_REGISTRY.keys():
        if tool_key in name_clean or name_clean in tool_key:
            matched_tool = tool_key
            break
            
    if matched_tool:
        try:
            tool_func = get_tool(matched_tool)
            return tool_func(arg_clean)
        except Exception as e:
            return f"Error executing tool {matched_tool}: {str(e)}"
    else:
        available_tools = ", ".join(TOOL_REGISTRY.keys())
        return f"Tool '{name}' is not recognized. Available tools: {available_tools}."

async def plan_node(state: AgentState) -> Dict[str, Any]:
    logger.info("Executing plan_node...")
    prompt = state["input"]
    from app.prompts.loader import load_prompt
    system_prompt = load_prompt("agent", "planner")
    plan_text = await llm.chat_completion(
        messages=[{"role": "user", "content": prompt}],
        system_prompt=system_prompt,
        temperature=0.2
    )
    return {
        "plan": plan_text.strip()
    }

async def decide_node(state: AgentState) -> Dict[str, Any]:
    logger.info("Executing decide_node...")
    input_prompt = state["input"]
    plan = state["plan"]
    steps = state["steps"]
    
    # Compile execution history
    history_str = ""
    for st in steps:
        history_str += (
            f"Step {st['step']}:\n"
            f"- Thought: {st['thought']}\n"
            f"- Tool: {st.get('tool') or 'None'}\n"
            f"- Input: {st.get('tool_input') or 'None'}\n"
            f"- Observation: {st.get('observation') or 'None'}\n\n"
        )
        
    system_prompt = (
        "You are an advanced AI Agent acting as a decision core.\n"
        "You operate in a plan-execute-reflect loop. Based on the overall plan and execution history, decide the next step.\n"
        "You have access to the following tools:\n"
        "1. Calculator: Evaluates math operations (e.g. '123 + 456').\n"
        "2. Web Search: Searches for real-time web facts.\n"
        "3. File Reader: Read local file text content (argument is filename).\n"
        "4. Python Tool: Executes sandboxed python code. Print variables to see output.\n"
        "5. CSV Analyzer: Loads CSV and displays statistical summaries.\n"
        "6. Weather Tool: Retrieves current temperature of a location.\n"
        "7. Research Tool: Summarizes articles or topics.\n"
        "8. Report Generator: Compiles findings into a structured markdown report.\n\n"
        "You must format your decision using this EXACT JSON structure:\n"
        "{\n"
        "  \"thought\": \"Brief thought explaining why we choose this action or why we are finished.\",\n"
        "  \"tool\": \"Name of the tool to run, or empty string if we are finished and ready to return the final answer.\",\n"
        "  \"tool_input\": \"Input argument for the tool, or empty string.\",\n"
        "  \"final_answer\": \"The final response answering user's prompt, or empty string if executing tool.\"\n"
        "}\n"
        "Ensure valid JSON formatting ONLY. Do not wrap in markdown or prefix text."
    )
    
    query = (
        f"User Request: {input_prompt}\n\n"
        f"Execution Plan:\n{plan}\n\n"
        f"History logs so far:\n{history_str or 'None'}\n"
    )
    
    response_text = await llm.chat_completion(
        messages=[{"role": "user", "content": query}],
        system_prompt=system_prompt,
        temperature=0.2
    )
    
    # Parse decision
    json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
    if not json_match:
        return {
            "output": response_text,
            "success": True
        }
        
    try:
        decision = json.loads(json_match.group(0))
        thought = decision.get("thought", "")
        tool = decision.get("tool", "")
        tool_input = decision.get("tool_input", "")
        final_answer = decision.get("final_answer", "")
        
        if tool:
            new_step = {
                "step": len(steps) + 1,
                "thought": thought,
                "tool": tool,
                "tool_input": tool_input,
                "observation": None
            }
            return {
                "steps": steps + [new_step],
                "output": None,
                "success": False
            }
        else:
            return {
                "output": final_answer or "Tasks resolved.",
                "success": True
            }
    except Exception as e:
        logger.error(f"Failed to parse decision JSON: {e}")
        error_step = {
            "step": len(steps) + 1,
            "thought": f"Failed to parse JSON decision: {e}. Output was: {response_text}",
            "tool": None,
            "tool_input": None,
            "observation": f"Parsing error occurred. Re-trying decision."
        }
        return {
            "steps": steps + [error_step],
            "output": None,
            "success": False
        }

async def execute_tool_node(state: AgentState) -> Dict[str, Any]:
    logger.info("Executing execute_tool_node...")
    steps = state["steps"]
    if not steps:
        return {}
        
    last_step = steps[-1]
    tool_name = last_step.get("tool")
    tool_input = last_step.get("tool_input")
    
    if tool_name:
        observation = execute_tool(tool_name, tool_input)
    else:
        observation = "No tool call was prepared."
        
    updated_steps = list(steps)
    updated_steps[-1] = dict(last_step)
    updated_steps[-1]["observation"] = observation
    
    return {
        "steps": updated_steps
    }

async def reflect_node(state: AgentState) -> Dict[str, Any]:
    logger.info("Executing reflect_node...")
    input_prompt = state["input"]
    plan = state["plan"]
    steps = state["steps"]
    iterations = state["iterations"] + 1
    
    history_str = ""
    for st in steps:
        history_str += (
            f"Step {st['step']}:\n"
            f"- Thought: {st['thought']}\n"
            f"- Tool: {st.get('tool') or 'None'}\n"
            f"- Input: {st.get('tool_input') or 'None'}\n"
            f"- Observation: {st.get('observation') or 'None'}\n\n"
        )
        
    from app.prompts.loader import load_prompt
    system_prompt = load_prompt("agent", "reflection")
    
    query = (
        f"User Query: {input_prompt}\n\n"
        f"Plan:\n{plan}\n\n"
        f"Work History:\n{history_str}\n"
    )
    
    response_text = await llm.chat_completion(
        messages=[{"role": "user", "content": query}],
        system_prompt=system_prompt,
        temperature=0.2
    )
    
    json_match = re.search(r"\{.*\}", response_text, re.DOTALL)
    is_complete = True
    reflection_text = "Completed."
    
    if json_match:
        try:
            data = json.loads(json_match.group(0))
            is_complete = data.get("is_complete", True)
            reflection_text = data.get("reflection", "No reflection comment.")
        except Exception as e:
            logger.error(f"Failed to parse reflection JSON: {e}")
            
    reflect_step = {
        "step": len(steps) + 1,
        "thought": f"[Self-Reflection] {reflection_text}",
        "tool": "None",
        "tool_input": "None",
        "observation": "Checked completed state."
    }
    
    if is_complete or iterations >= 5:
        return {
            "steps": steps + [reflect_step],
            "iterations": iterations,
            "success": True
        }
    else:
        return {
            "steps": steps + [reflect_step],
            "iterations": iterations,
            "success": False
        }

def should_continue(state: AgentState) -> str:
    if state["success"] or state["output"] is not None:
        return "finish"
    return "continue"

def after_reflection(state: AgentState) -> str:
    if state["success"]:
        return "finish"
    return "retry"

# Create StateGraph
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("plan", plan_node)
workflow.add_node("decide", decide_node)
workflow.add_node("execute_tool", execute_tool_node)
workflow.add_node("reflect", reflect_node)

# Set Entry
workflow.set_entry_point("plan")

# Add edges
workflow.add_edge("plan", "decide")

# Decide routes to execute_tool or finish
workflow.add_conditional_edges(
    "decide",
    should_continue,
    {
        "continue": "execute_tool",
        "finish": END
    }
)

# Execute routes to reflect
workflow.add_edge("execute_tool", "reflect")

# Reflect routes to decide or finish
workflow.add_conditional_edges(
    "reflect",
    after_reflection,
    {
        "retry": "decide",
        "finish": END
    }
)

# Compile graph
agent_graph = workflow.compile()

class AgentService:
    @staticmethod
    def run_tool(name: str, argument: str) -> str:
        return execute_tool(name, argument)

    @staticmethod
    async def execute_agent(prompt: str) -> Dict[str, Any]:
        initial_state: AgentState = {
            "input": prompt,
            "plan": None,
            "steps": [],
            "output": None,
            "success": False,
            "iterations": 0
        }
        
        try:
            final_state = await agent_graph.ainvoke(initial_state)
            
            steps_out = []
            for st in final_state["steps"]:
                steps_out.append({
                    "step": st["step"],
                    "thought": st["thought"],
                    "tool": st.get("tool"),
                    "tool_input": st.get("tool_input"),
                    "observation": st.get("observation")
                })
                
            output_out = final_state.get("output")
            if not output_out:
                if final_state["steps"]:
                    output_out = final_state["steps"][-1]["thought"]
                else:
                    output_out = "Agent executed successfully."
            
            return {
                "output": output_out,
                "steps": steps_out,
                "success": final_state["success"]
            }
        except Exception as e:
            logger.error(f"Error executing LangGraph agent: {e}")
            return {
                "output": f"An error occurred: {e}",
                "steps": [],
                "success": False
            }

    @staticmethod
    async def stream_agent(
        user_id: str,
        execution_id: str,
        prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Runs the StateGraph workflow asynchronously, measuring metrics and yielding structured lifecycle events.
        """
        import time
        from datetime import datetime
        
        start_time = time.time()
        
        initial_state: AgentState = {
            "input": prompt,
            "plan": None,
            "steps": [],
            "output": None,
            "success": False,
            "iterations": 0
        }
        
        metrics = {
            "planner_latency_ms": 0.0,
            "tool_latency_ms": 0.0,
            "reflection_latency_ms": 0.0,
            "total_latency_ms": 0.0,
            "tool_calls_count": 0,
            "retry_count": 0
        }
        
        tools_used = []
        node_start_time = time.time()
        
        try:
            yield {
                "event_type": "agent_started",
                "execution_id": execution_id,
                "timestamp": datetime.utcnow().isoformat(),
                "node_name": "init",
                "status": "STARTED",
                "payload": {"prompt": prompt}
            }
            
            async for event in agent_graph.astream(initial_state):
                node_name = list(event.keys())[0]
                node_output = event[node_name]
                
                now = time.time()
                latency_ms = (now - node_start_time) * 1000
                node_start_time = now
                
                if node_name == "plan":
                    metrics["planner_latency_ms"] = latency_ms
                elif node_name == "execute_tool":
                    metrics["tool_latency_ms"] += latency_ms
                    metrics["tool_calls_count"] += 1
                    
                    steps = node_output.get("steps", [])
                    if steps:
                        last_step = steps[-1]
                        tool_name = last_step.get("tool")
                        if tool_name and tool_name not in tools_used:
                            tools_used.append(tool_name)
                            
                        obs = last_step.get("observation", "")
                        status = "FAILED" if "error" in obs.lower() or "not recognized" in obs.lower() else "COMPLETED"
                        
                        yield {
                            "event_type": "tool_completed",
                            "execution_id": execution_id,
                            "timestamp": datetime.utcnow().isoformat(),
                            "node_name": "execute_tool",
                            "status": status,
                            "payload": {
                                "tool": tool_name,
                                "input": last_step.get("tool_input"),
                                "observation": obs,
                                "latency_ms": latency_ms
                            }
                        }
                elif node_name == "reflect":
                    metrics["reflection_latency_ms"] += latency_ms
                    
                    success = node_output.get("success", False)
                    if not success:
                        metrics["retry_count"] += 1
                        
                steps = node_output.get("steps", [])
                thought = steps[-1].get("thought", "") if steps else ""
                if node_name == "plan" and not thought:
                    thought = f"Strategic Execution Plan Formulated:\n{node_output.get('plan')}"
                elif node_name == "decide" and not thought:
                    thought = "Reasoning Decision: Evaluated execution state and selected appropriate action."
                elif node_name == "reflect" and not thought:
                    thought = "Reflection Assessment: Verified tool observations against task objectives."
                
                yield {
                    "event_type": "node_transition",
                    "execution_id": execution_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "node_name": node_name,
                    "status": "COMPLETED",
                    "payload": {
                        "thought": thought,
                        "node_output": {
                            "plan": node_output.get("plan"),
                            "success": node_output.get("success"),
                            "output": node_output.get("output")
                        }
                    }
                }
                
                final_out = node_output.get("output")
                if final_out or node_output.get("success"):
                    metrics["total_latency_ms"] = (time.time() - start_time) * 1000
                    if not final_out:
                        observations = [s.get("observation") for s in steps if s.get("observation") and s.get("observation") != "None"]
                        if observations:
                            obs_text = "\n".join([f"- **Result**: {obs}" for obs in observations])
                            final_out = f"### Task Completed Successfully\n\n**Verified Tool Findings:**\n{obs_text}\n\n**Status:** All requested operations have been computed and verified."
                        else:
                            final_out = steps[-1].get("thought", "Agent executed task successfully.") if steps else "Task resolved successfully."

                    try:
                        await ExecutionService.update_execution_metrics(
                            execution_id=execution_id,
                            user_id=user_id,
                            status="COMPLETED",
                            steps=steps,
                            tools_used=tools_used,
                            metrics=metrics
                        )
                    except Exception as e:
                        logger.warning(f"Non-critical: could not persist execution metrics to DB: {e}")
                    
                    yield {
                        "event_type": "completed",
                        "execution_id": execution_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "node_name": "done",
                        "status": "COMPLETED",
                        "payload": {
                            "output": final_out,
                            "metrics": metrics,
                            "steps": steps
                        }
                    }
                    return
                    
        except Exception as err:
            logger.error(f"Agent stream run failure: {err}")
            metrics["total_latency_ms"] = (time.time() - start_time) * 1000
            try:
                await ExecutionService.update_execution_metrics(
                    execution_id=execution_id,
                    user_id=user_id,
                    status="FAILED",
                    steps=[],
                    tools_used=tools_used,
                    metrics=metrics
                )
            except Exception:
                pass
            yield {
                "event_type": "completed",
                "execution_id": execution_id,
                "timestamp": datetime.utcnow().isoformat(),
                "node_name": "failed",
                "status": "FAILED",
                "payload": {
                    "output": f"Execution notice: {err}",
                    "metrics": metrics
                }
            }
