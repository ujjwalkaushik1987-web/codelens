from rest_framework import serializers
from .models import SecurityFinding

class SecurityFindingSerializer(serializers.ModelSerializer):
    file_path = serializers.ReadOnlyField(source='file.path')

    class Meta:
        model = SecurityFinding
        fields = (
            'id', 'file', 'file_path', 'severity', 'category', 'title',
            'description', 'start_line', 'end_line', 'code_snippet',
            'recommendation', 'confidence', 'is_resolved', 'created_at'
        )
