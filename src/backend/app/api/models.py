from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Agent Execution Models
class AgentRequest(BaseModel):
    """Request model for agent execution"""
    message: str = Field(..., description="User message to send to the agent")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID for context")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Create a strategy for ikf.co.in",
                "conversation_id": None
            }
        }


class ToolCall(BaseModel):
    """Represents a tool call made by the agent"""
    tool_name: str
    arguments: Dict[str, Any]
    status: str = "pending"  # pending, running, completed, failed


class AgentThinkingStep(BaseModel):
    """Represents an agent's thinking or tool use step"""
    step_type: str  # "thinking", "tool_use", "tool_result"
    content: str
    tool_calls: Optional[List[ToolCall]] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class AgentResponse(BaseModel):
    """Response model for agent execution"""
    message: str = Field(..., description="Agent's response message")
    thinking_steps: Optional[List[AgentThinkingStep]] = Field(None, description="Agent's thinking process")
    conversation_id: Optional[str] = Field(None, description="Conversation ID")
    status: str = Field("success", description="Response status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "I've analyzed your request...",
                "thinking_steps": [],
                "conversation_id": "conv_123",
                "status": "success"
            }
        }


# Skills Models
class SkillInfo(BaseModel):
    """Information about a skill"""
    name: str
    domain: str
    description: Optional[str] = None
    has_references: bool = False
    reference_files: List[str] = []


class SkillsListResponse(BaseModel):
    """Response containing list of skills"""
    skills: List[SkillInfo]
    total: int


# Conversation Models (stubs for future)
class ConversationMessage(BaseModel):
    """A single message in a conversation"""
    id: str
    role: str  # "user" or "agent"
    content: str
    thinking_steps: Optional[List[AgentThinkingStep]] = None
    timestamp: datetime


class Conversation(BaseModel):
    """A conversation thread"""
    id: str
    title: str
    messages: List[ConversationMessage]
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    """Response containing list of conversations"""
    conversations: List[Conversation]
    total: int


# Auth Models (stubs for future)
class UserCreate(BaseModel):
    """User registration model"""
    email: str
    password: str
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    """User login model"""
    email: str
    password: str


class Token(BaseModel):
    """Authentication token"""
    access_token: str
    token_type: str = "bearer"


# Error Models
class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    detail: Optional[str] = None
    status_code: int
