"""
Conversations API Route

Endpoints for listing, retrieving, and deleting conversations.
"""

import shutil
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.conversations import get_db, ConversationSummary, Conversation, Message
from app.paths import ARTIFACTS_DIR

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


# Pydantic models for API responses
class MessageResponse(BaseModel):
    id: int
    conversation_id: str
    role: str
    content: str
    artifacts: Optional[List[dict]] = None
    timestamp: Optional[str] = None


class ConversationSummaryResponse(BaseModel):
    id: str
    title: str
    preview: str
    message_count: int
    created_at: str
    updated_at: str


class ConversationResponse(BaseModel):
    id: str
    title: str
    messages: List[MessageResponse]
    created_at: str
    updated_at: str
    is_shared: bool = False


class ConversationListResponse(BaseModel):
    conversations: List[ConversationSummaryResponse]
    total: int


@router.get("", response_model=ConversationListResponse)
def list_conversations(limit: int = 50, offset: int = 0):
    """
    List all conversations, most recent first.
    
    Returns conversation summaries with title, preview, and message count.
    Supports pagination via limit and offset parameters.
    """
    db = get_db()
    conversations, total = db.list_conversations(limit=limit, offset=offset)
    
    return ConversationListResponse(
        conversations=[
            ConversationSummaryResponse(
                id=c.id,
                title=c.title,
                preview=c.preview,
                message_count=c.message_count,
                created_at=c.created_at,
                updated_at=c.updated_at
            )
            for c in conversations
        ],
        total=total
    )


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: str):
    """
    Get a conversation with all its messages.
    
    Returns the full conversation including all messages, thinking steps, and artifacts.
    """
    db = get_db()
    conversation = db.get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        messages=[
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                artifacts=m.artifacts,
                timestamp=m.timestamp
            )
            for m in conversation.messages
        ],
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        is_shared=conversation.is_shared
    )


@router.delete("/{conversation_id}")
def delete_conversation(conversation_id: str):
    """
    Delete a conversation and all its messages and artifacts.
    
    This permanently removes:
    - The conversation record
    - All messages in the conversation
    - Any artifacts/files generated during the conversation
    """
    db = get_db()
    
    # Check if exists
    if not db.conversation_exists(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Delete artifacts directory for this conversation
    conv_artifacts_dir = ARTIFACTS_DIR / conversation_id
    if conv_artifacts_dir.exists():
        shutil.rmtree(conv_artifacts_dir)
    
    # Delete from database
    deleted = db.delete_conversation(conversation_id)
    
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete conversation")
    
    return {"status": "deleted", "conversation_id": conversation_id}
