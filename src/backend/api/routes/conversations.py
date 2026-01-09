from fastapi import APIRouter, HTTPException
from typing import List

from src.backend.api.models import Conversation, ConversationListResponse, ConversationMessage

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=ConversationListResponse)
async def list_conversations() -> ConversationListResponse:
    """
    List all conversations for the current user.
    
    Currently returns empty list - this is a stub for future implementation.
    
    Future implementation will:
    1. Get user ID from JWT token
    2. Query Firestore for user's conversations
    3. Return paginated list with metadata
    """
    return ConversationListResponse(conversations=[], total=0)


@router.get("/{conversation_id}", response_model=Conversation)
async def get_conversation(conversation_id: str) -> Conversation:
    """
    Get a specific conversation by ID.
    
    Stub for future implementation.
    
    Future implementation will:
    1. Verify user has access to this conversation
    2. Load conversation from Firestore
    3. Return full conversation history
    """
    raise HTTPException(
        status_code=501,
        detail="Conversation retrieval not yet implemented. Coming soon with Firestore integration."
    )


@router.post("", response_model=Conversation)
async def create_conversation() -> Conversation:
    """
    Create a new conversation.
    
    Stub for future implementation.
    
    Future implementation will:
    1. Get user ID from JWT token
    2. Create new conversation in Firestore
    3. Return conversation ID and metadata
    """
    raise HTTPException(
        status_code=501,
        detail="Conversation creation not yet implemented. Coming soon with Firestore integration."
    )


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: str) -> dict:
    """
    Delete a conversation.
    
    Stub for future implementation.
    """
    raise HTTPException(
        status_code=501,
        detail="Conversation deletion not yet implemented. Coming soon with Firestore integration."
    )


# Future endpoints:
# @router.post("/{conversation_id}/messages")  # Add message to conversation
# @router.patch("/{conversation_id}")  # Update conversation metadata (e.g., title)
