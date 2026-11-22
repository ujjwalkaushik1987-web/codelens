from rest_framework import serializers
from .models import Conversation, Message

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ('id', 'conversation', 'role', 'content', 'citations', 'metadata', 'created_at')
        read_only_fields = ('id', 'conversation', 'role', 'citations', 'metadata', 'created_at')

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    message_count = serializers.IntegerField(source='messages.count', read_only=True)

    class Meta:
        model = Conversation
        fields = ('id', 'project', 'user', 'title', 'created_at', 'updated_at', 'messages', 'message_count')
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')
