import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  BookOpen,
  RotateCw,
  Copy,
  Check,
  Download,
  FileText,
  Sparkles,
  Edit3,
  Eye
} from 'lucide-react';
import { analysisApi } from '../api/client';
import { GeneratedDocument } from '../types';
import { useProject } from '../context/ProjectContext';

export const DocumentationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { setActiveProjectId } = useProject();

  const [docs, setDocs] = useState<GeneratedDocument[]>([]);
  const [activeDocType, setActiveDocType] = useState<string>('overview');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (id) {
      setActiveProjectId(id);
      loadDocs(id);
    }
  }, [id]);

  const loadDocs = async (projectId: string) => {
    setIsLoading(true);
    try {
      const data = await analysisApi.getDocumentation(projectId);
      setDocs(data);
      if (data.length > 0) {
        setActiveDocType(data[0].doc_type);
        setEditedContent(data[0].content);
      }
    } catch (err) {
      console.error('Failed to load documentation', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!id) return;
    setIsGenerating(true);
    try {
      const res = await analysisApi.generateDocumentation(id);
      setDocs(res.documents);
      const curr = res.documents.find((d) => d.doc_type === activeDocType) || res.documents[0];
      if (curr) {
        setEditedContent(curr.content);
      }
    } catch (err) {
      alert('Failed to regenerate documentation');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentDoc = docs.find((d) => d.doc_type === activeDocType);

  const handleSelectDoc = (type: string) => {
    setActiveDocType(type);
    setIsEditing(false);
    const d = docs.find((item) => item.doc_type === type);
    if (d) setEditedContent(d.content);
  };

  const handleCopy = () => {
    const textToCopy = isEditing ? editedContent : (currentDoc?.content || '');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = isEditing ? editedContent : (currentDoc?.content || '');
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDocType}_doc.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const docTabs = [
    { type: 'overview', label: 'System Overview' },
    { type: 'installation', label: 'Installation & Setup' },
    { type: 'api', label: 'API Reference' },
    { type: 'modules', label: 'Module Breakdown' },
    { type: 'onboarding', label: 'Onboarding Walkthrough' },
  ];

  return (
    <div className="h-[calc(100vh-6rem)] flex overflow-hidden bg-[#080c14] text-[#c9d1d9]">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-[#0e1420] border-r border-[#202b3d] flex flex-col justify-between shrink-0">
        <div>
          <div className="p-3 border-b border-[#202b3d] flex items-center justify-between">
            <span className="text-xs font-semibold text-white font-mono flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              Living Docs
            </span>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              title="Regenerate Docs"
              className="p-1 text-gray-400 hover:text-emerald-400 transition"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          <div className="p-2 space-y-1">
            {docTabs.map((t) => {
              const isActive = activeDocType === t.type;
              return (
                <button
                  key={t.type}
                  onClick={() => handleSelectDoc(t.type)}
                  className={`w-full flex items-center gap-2 p-2 rounded-md text-xs font-mono transition text-left ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/30'
                      : 'text-gray-300 hover:bg-[#151d2a] hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-t border-[#202b3d] bg-[#0b1019]">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Generating...' : 'Regenerate Docs'}</span>
          </button>
        </div>
      </div>

      {/* Main Documentation Viewer / Editor */}
      <div className="flex-1 flex flex-col bg-[#0a0e17] overflow-hidden">
        {/* Document Action Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#0e1420] border-b border-[#202b3d] text-xs">
          <div className="flex items-center gap-2 font-mono">
            <span className="font-semibold text-white">{currentDoc?.title || 'Documentation'}</span>
            <span className="text-[11px] text-gray-500">
              {currentDoc?.updated_at ? `Updated ${new Date(currentDoc.updated_at).toLocaleTimeString()}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border transition ${
                isEditing
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#151d2a] text-gray-300 border-[#263447] hover:text-white'
              }`}
            >
              {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{isEditing ? 'Preview' : 'Edit'}</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#151d2a] text-gray-300 border border-[#263447] hover:text-white transition"
              title="Copy Markdown"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#151d2a] text-gray-300 border border-[#263447] hover:text-white transition"
              title="Download Markdown"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Content Surface */}
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-gray-400">
              <RotateCw className="w-5 h-5 animate-spin text-emerald-400 mb-2" />
              Loading documentation...
            </div>
          ) : isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full p-4 bg-[#0a0e17] border border-[#222b38] rounded-lg text-xs font-mono text-gray-200 outline-none focus:border-emerald-500 resize-none"
            />
          ) : (
            <div className="prose prose-invert max-w-none text-xs leading-relaxed font-sans space-y-4">
              <pre className="bg-transparent text-gray-300 font-mono whitespace-pre-wrap leading-relaxed select-text">
                {currentDoc?.content || 'No documentation generated yet.'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
