import logging
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsOwnerOrAdmin
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from embeddings.retrieval import VectorRetrievalService
from embeddings.ai_service import get_ai_provider

logger = logging.getLogger(__name__)

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return Conversation.objects.all().prefetch_related('messages')
        return Conversation.objects.filter(user=user).prefetch_related('messages')

class MessageCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        try:
            conversation = Conversation.objects.select_related('project', 'user').get(id=conversation_id)
        except Conversation.DoesNotExist:
            return Response({"detail": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)

        # Authorization check: only owner or admin can message
        if conversation.user != request.user and not request.user.is_admin:
            return Response({"detail": "You do not have permission to access this conversation."}, status=status.HTTP_403_FORBIDDEN)

        user_content = request.data.get('content', '').strip()
        if not user_content:
            return Response({"detail": "Message content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Save User Message
        user_msg = Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=user_content
        )

        # Auto-update conversation title from first question
        if conversation.messages.count() <= 2 and conversation.title == 'New CodeLens Conversation':
            title_candidate = user_content[:50].strip()
            if len(user_content) > 50:
                title_candidate += "..."
            conversation.title = title_candidate
            conversation.save(update_fields=['title', 'updated_at'])

        # 2. Retrieve Relevant Code Chunks (strictly scoped to project)
        project = conversation.project
        retrieved_chunks = VectorRetrievalService.retrieve_relevant_chunks(
            project=project,
            query=user_content,
            top_k=5
        )

        # 3. Format message history for AI context
        recent_msgs = list(conversation.messages.order_by('created_at')[:8])
        history_for_llm = [
            {"role": m.role, "content": m.content}
            for m in recent_msgs
        ]

        # 4. Generate AI grounded response with citations
        ai_provider = get_ai_provider()
        answer_text, citations = ai_provider.generate_chat_response(
            messages=history_for_llm,
            context_chunks=retrieved_chunks,
            system_prompt=(
                "You are CodeLens, an expert AI Software Repository Intelligence System. "
                "Your objective is to explain the codebase using the actual repository source code as evidence. "
                "Rules:\n"
                "1. Answer ONLY using the provided retrieved context.\n"
                "2. Include file paths and line-number citations whenever possible.\n"
                "3. If the answer cannot be found in the repository, clearly state that instead of hallucinating.\n"
                "4. Be technical, precise, and concise."
            )
        )

        # 5. Save Assistant Message
        assistant_msg = Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            content=answer_text,
            citations=citations,
            metadata={"retrieved_chunk_count": len(retrieved_chunks)}
        )

        conversation.save(update_fields=['updated_at'])

        return Response({
            "success": True,
            "user_message": MessageSerializer(user_msg).data,
            "message": MessageSerializer(assistant_msg).data,
            "citations": citations
        }, status=status.HTTP_201_CREATED)
