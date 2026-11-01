import re
import json
import logging
from typing import Dict, Any, List
from app.ai import llm

logger = logging.getLogger(__name__)

class QuestionGenerator:
    CODING_PRESETS = [
        {
            "id": "reverse_string",
            "text": "Write a Python function `reverse_list(s: list)` that reverses a list of characters in-place without returning a new array.",
            "type": "coding",
            "code_boilerplate": "def reverse_list(s: list) -> list:\n    # Write your solution here\n    left, right = 0, len(s) - 1\n    while left < right:\n        s[left], s[right] = s[right], s[left]\n        left += 1\n        right -= 1\n    return s\n",
            "test_cases": [
                {"id": 1, "input": "s = ['h','e','l','l','o']", "expected": "['o', 'l', 'l', 'e', 'h']", "call": "reverse_list(['h','e','l','l','o'])"},
                {"id": 2, "input": "s = ['H','a','n','n','a','h']", "expected": "['h', 'a', 'n', 'n', 'a', 'H']", "call": "reverse_list(['H','a','n','n','a','h'])"},
                {"id": 3, "input": "s = ['A']", "expected": "['A']", "call": "reverse_list(['A'])"}
            ],
            "hints": [
                "Consider the two-pointer technique with left at 0 and right at len(s) - 1.",
                "Swap elements in-place while left < right."
            ]
        },
        {
            "id": "two_sum",
            "text": "Write a Python function `two_sum(nums: list, target: int) -> list` that returns indices of the two numbers such that they add up to `target`.",
            "type": "coding",
            "code_boilerplate": "def two_sum(nums: list, target: int) -> list:\n    # Write your solution here\n    seen = {}\n    for i, n in enumerate(nums):\n        diff = target - n\n        if diff in seen:\n            return [seen[diff], i]\n        seen[n] = i\n    return []\n",
            "test_cases": [
                {"id": 1, "input": "nums = [2, 7, 11, 15], target = 9", "expected": "[0, 1]", "call": "two_sum([2, 7, 11, 15], 9)"},
                {"id": 2, "input": "nums = [3, 2, 4], target = 6", "expected": "[1, 2]", "call": "two_sum([3, 2, 4], 6)"},
                {"id": 3, "input": "nums = [3, 3], target = 6", "expected": "[0, 1]", "call": "two_sum([3, 3], 6)"}
            ],
            "hints": [
                "Can you achieve O(N) time complexity using a Hash Map?",
                "Store the complement (target - current_num) in a dictionary."
            ]
        },
        {
            "id": "is_palindrome",
            "text": "Write a Python function `is_palindrome(s: str) -> bool` that returns True if the alphanumeric characters in `s` read the same forward and backward (case-insensitive).",
            "type": "coding",
            "code_boilerplate": "def is_palindrome(s: str) -> bool:\n    # Write your solution here\n    clean = [c.lower() for c in s if c.isalnum()]\n    return clean == clean[::-1]\n",
            "test_cases": [
                {"id": 1, "input": "s = 'A man, a plan, a canal: Panama'", "expected": "True", "call": "is_palindrome('A man, a plan, a canal: Panama')"},
                {"id": 2, "input": "s = 'race a car'", "expected": "False", "call": "is_palindrome('race a car')"},
                {"id": 3, "input": "s = ' '", "expected": "True", "call": "is_palindrome(' ')"}
            ],
            "hints": [
                "Filter out non-alphanumeric characters using .isalnum().",
                "Convert all characters to lowercase before comparing."
            ]
        }
    ]

    TECHNICAL_PRESETS = [
        {
            "id": "concurrency_python",
            "text": "Explain the difference between Multiprocessing and Multithreading in Python. How does the Global Interpreter Lock (GIL) impact CPU-bound vs. I/O-bound tasks?",
            "type": "technical",
            "code_boilerplate": None,
            "hints": ["Mention the GIL, process memory isolation, threading for I/O, and multiprocessing for compute."]
        },
        {
            "id": "rest_vs_graphql",
            "text": "Compare REST APIs with GraphQL. In what scenarios would you choose GraphQL over traditional REST endpoints in a high-scale React application?",
            "type": "technical",
            "code_boilerplate": None,
            "hints": ["Discuss over-fetching, under-fetching, declarative data fetching, and caching tradeoffs."]
        },
        {
            "id": "rag_architecture",
            "text": "Explain the step-by-step workflow of a Retrieval-Augmented Generation (RAG) system. How do chunking strategies and embedding models affect retrieval precision?",
            "type": "technical",
            "code_boilerplate": None,
            "hints": ["Explain tokenization, chunk overlap, cosine similarity in vector DBs, and reranking."]
        }
    ]

    HR_PRESETS = [
        {
            "id": "leadership_star",
            "text": "Tell me about a challenging technical project you led or contributed to. What obstacles arose, and how did you resolve them using the STAR method?",
            "type": "hr",
            "code_boilerplate": None,
            "hints": ["Structure your answer with Situation, Task, Action, and quantifiable Result."]
        },
        {
            "id": "conflict_resolution",
            "text": "Describe a situation where you had a strong technical disagreement with a teammate or lead regarding architecture or deadlines. How did you handle it?",
            "type": "hr",
            "code_boilerplate": None,
            "hints": ["Emphasize objective data, constructive communication, empathy, and team alignment."]
        }
    ]

    @classmethod
    async def generate_question(
        cls,
        question_type: str,
        company: str = "General",
        target_role: str = "Software Engineer",
        skills: List[str] = None
    ) -> Dict[str, Any]:
        """
        Generates realistic, high-quality technical, coding, or behavioral questions with test cases.
        """
        import random
        
        if question_type == "coding":
            selected = random.choice(cls.CODING_PRESETS)
            return {
                **selected,
                "company": company
            }
        elif question_type == "technical":
            selected = random.choice(cls.TECHNICAL_PRESETS)
            return {
                **selected,
                "company": company
            }
        else:
            selected = random.choice(cls.HR_PRESETS)
            return {
                **selected,
                "company": company
            }
