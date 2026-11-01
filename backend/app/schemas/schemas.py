from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Authentication Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=2)
    username: str = Field(..., min_length=3)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OAuthLogin(BaseModel):
    token: str
    provider: str  # "google" or "github"
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    avatar: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str
    username: Optional[str] = None
    avatar: Optional[str] = None
    role: str = "USER"  # "ADMIN", "USER", "GUEST"
    is_verified: bool = False
    onboarded: bool = False
    career_goal: Optional[str] = None
    skills: List[str] = []
    preferred_companies: List[str] = []
    bio: Optional[str] = None
    education: Optional[str] = None
    github_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    password: str = Field(..., min_length=8)

class EmailVerificationRequest(BaseModel):
    token: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    username: Optional[str] = Field(None, min_length=3)
    avatar: Optional[str] = None
    skills: Optional[List[str]] = None
    bio: Optional[str] = None
    education: Optional[str] = None
    github_link: Optional[str] = None
    linkedin_link: Optional[str] = None
    career_goal: Optional[str] = None
    preferred_companies: Optional[List[str]] = None
    onboarded: Optional[bool] = None

class OnboardingWizardSubmit(BaseModel):
    name: str = Field(..., min_length=2)
    career_goal: str
    skills: List[str]
    preferred_companies: List[str]
    resume_id: Optional[str] = None

# --- Chatbot / RAG Schemas ---
class Citation(BaseModel):
    filename: str
    page: Optional[int] = None
    section: Optional[str] = "General Content"
    content: str
    confidence: float

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    citations: Optional[List[Citation]] = None
    query_rewrite: Optional[str] = None

class ChatSessionCreate(BaseModel):
    name: str

class ChatSessionResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    messages: List[ChatMessage]

# --- AI Agent Schemas ---
class AgentExecuteRequest(BaseModel):
    prompt: str

class AgentStep(BaseModel):
    step: int
    thought: str
    tool: Optional[str] = None
    tool_input: Optional[str] = None
    observation: Optional[str] = None

class AgentExecuteResponse(BaseModel):
    output: str
    steps: List[AgentStep]
    success: bool

# --- Document Assistant Schemas ---
class ParagraphExplainRequest(BaseModel):
    paragraph: str
    tone: Optional[str] = "educational"  # educational, simple, advanced

class TranslateRequest(BaseModel):
    text: str
    target_language: str

class Flashcard(BaseModel):
    front: str
    back: str

class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    answer: str
    explanation: str

# --- Interview Coach Schemas ---
class ATSResponse(BaseModel):
    overall_score: int
    matched_skills: List[str]
    missing_skills: List[str]
    formatting_score: int
    feedback: str
    suggestions: List[str]

class QuestionResponse(BaseModel):
    id: str
    text: str
    type: str  # "hr", "technical", "coding"
    code_boilerplate: Optional[str] = None
    test_cases: Optional[List[Dict[str, Any]]] = None
    hints: Optional[List[str]] = None

class InterviewSessionCreate(BaseModel):
    type: str  # "hr", "technical", "coding"
    company: Optional[str] = "General"

class InterviewAnswerSubmit(BaseModel):
    question_id: str
    answer_text: str
    audio_base64: Optional[str] = None  # Whisper audio data

class FeedbackDetail(BaseModel):
    score: int
    feedback: str
    star_evaluation: Optional[Dict[str, str]] = None  # Situation, Task, Action, Result check
    code_analysis: Optional[Dict[str, str]] = None  # time complexity, bugs
    suggestions: List[str]

# --- Admin Dashboards ---
class TelemetryRecord(BaseModel):
    tokens_used: int
    endpoint: str
    latency_ms: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# --- User Preferences ---
class UserPreferences(BaseModel):
    theme: str = "dark"
    language: str = "en"
    ai_model: str = "gemini-1.5-flash"
    default_interview_type: str = "technical"
    notification_settings: Dict[str, bool] = {"email": True, "browser": True}
