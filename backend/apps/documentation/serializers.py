from rest_framework import serializers
from .models import GeneratedDocument

class GeneratedDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedDocument
        fields = ('id', 'doc_type', 'title', 'content', 'metadata', 'created_at', 'updated_at')
