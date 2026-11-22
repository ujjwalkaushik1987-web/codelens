from rest_framework import serializers
from .models import RepositoryFile, CodeSymbol, CodeRelationship

class CodeSymbolSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeSymbol
        fields = ('id', 'symbol_type', 'name', 'start_line', 'end_line', 'signature', 'docstring', 'metadata')

class RepositoryFileListSerializer(serializers.ModelSerializer):
    symbol_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = RepositoryFile
        fields = ('id', 'path', 'language', 'size', 'line_count', 'created_at', 'symbol_count')

class RepositoryFileDetailSerializer(serializers.ModelSerializer):
    symbols = CodeSymbolSerializer(many=True, read_only=True)

    class Meta:
        model = RepositoryFile
        fields = ('id', 'path', 'language', 'size', 'content_hash', 'line_count', 'content', 'symbols', 'created_at')
