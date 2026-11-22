import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Bot,
  User,
  Send,
  Plus,
  Trash2,
  Sparkles,
  RotateCw,
  AlertCircle,
  FileCode,
  MessagesSquare,
  HelpCircle
} from 'lucide-react';
import { conversationsApi } from '../api/client';
import { Conversation, Message } from '../types';
import { CitationCard } from '../components/CitationCard';
import { useProject } from '../context/ProjectContext';

export const ChatPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { setActiveProjectId } = useProject();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (id) {
      setActiveProjectId(id);
      loadConversations(id);
    }
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async (projectId: string) => {
    setIsLoadingHistory(true);
    try {
      const data = await conversationsApi.getConversations(projectId);
      setConversations(data);
      if (data.length > 0) {
        selectConversation(data[0].id);
      } else {
        // Create initial conversation
        createNewConversation(projectId);
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const selectConversation = async (convId: string) => {
    try {
      const conv = await conversationsApi.getConversation(convId);
      setActiveConversation(conv);
      setMessages(conv.messages || []);
    } catch (err) {
      console.error('Failed to load conversation details', err);
    }
  };

  const createNewConversation = async (projectId: string) => {
    try {
      const conv = await conversationsApi.createConversation(projectId, 'New CodeLens Conversation');
      setConversations((prev) => [conv, ...prev]);
      setActiveConversation(conv);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await conversationsApi.deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);
      if (activeConversation?.id === convId) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else if (id) {
          createNewConversation(id);
        }
      }
    } catch (err) {
      console.error('Failed to delete conversation', err);
    }
  };

  const handleSendMessage = async (queryToSend?: string) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || !activeConversation || isSending) return;

    setInputQuery('');
    setIsSending(true);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp_${Date.now()}`,
      conversation: activeConversation.id,
      role: 'user',
      content: q,
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await conversationsApi.sendMessage(activeConversation.id, q);
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), res.user_message, res.message]);

      // Update conversation title in list if updated
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, title: q.slice(0, 40) } : c))
      );
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        conversation: activeConversation.id,
        role: 'assistant',
        content: `Error: ${err.response?.data?.detail || 'Failed to generate response. Please try again.'}`,
        citations: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const suggestedQuestions = [
    'How does user authentication work in this codebase?',
    'What database models and schemas are defined?',
    'Where is the core business logic or payment flow handled?',
    'What potential security vulnerabilities exist in this repository?',
  ];

  return (
    <div className="h-[calc(100vh-6rem)] flex overflow-hidden bg-[#080c14] text-[#c9d1d9]">
      {/* Left Conversation Threads Sidebar */}
      <div className="w-64 bg-[#0e1420] border-r border-[#202b3d] flex flex-col shrink-0">
        <div className="p-3 border-b border-[#202b3d] flex items-center justify-between">
          <span className="text-xs font-semibold text-white font-mono flex items-center gap-1.5">
            <MessagesSquare className="w-3.5 h-3.5 text-emerald-400" />
            Chat History
          </span>
          <button
            onClick={() => id && createNewConversation(id)}
            title="New Chat"
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#16202f] hover:bg-[#202c3e] text-[11px] text-gray-200 border border-[#273549] transition font-mono"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((c) => {
            const isActive = activeConversation?.id === c.id;
            return (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-xs transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/30'
                    : 'text-gray-300 hover:bg-[#151d2a] hover:text-white'
                }`}
              >
                <span className="truncate max-w-[80%] font-mono text-[11px]">{c.title}</span>
                <button
                  onClick={(e) => handleDeleteConversation(e, c.id)}
                  title="Delete Chat"
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-[#080c14]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">CodeLens Repository Intelligence</h3>
              <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                Ask anything about the codebase. Answers are synthesized strictly from retrieved AST chunks and include verifiable file and line citations.
              </p>

              {/* Suggested Questions */}
              <div className="w-full space-y-2 text-left">
                <div className="text-[11px] font-mono text-gray-500 mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  Suggested Repository Inquiries:
                </div>
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSendMessage(q)}
                    className="w-full p-2.5 rounded-lg bg-[#0e1420] border border-[#1f293c] hover:border-emerald-500/50 hover:bg-[#141c2c] text-xs text-gray-300 text-left transition font-mono"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 max-w-3xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`space-y-3 max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-emerald-600 text-white font-mono shadow-sm'
                          : 'bg-[#0e1420] border border-[#202b3d] text-gray-200 shadow-md'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>

                    {/* Citations Grid */}
                    {!isUser && m.citations && m.citations.length > 0 && (
                      <div className="pt-1">
                        <div className="text-[11px] font-mono text-gray-400 mb-1.5 flex items-center gap-1">
                          <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                          Source Evidence ({m.citations.length} cited locations):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {m.citations.map((c, idx) => (
                            <CitationCard key={idx} citation={c} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded bg-[#172131] border border-[#26354b] flex items-center justify-center text-gray-300 shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex gap-3 max-w-3xl mx-auto">
              <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <RotateCw className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 rounded-xl bg-[#0e1420] border border-[#202b3d] text-xs font-mono text-gray-400 flex items-center gap-2">
                <span>Retrieving code chunks and synthesizing citations...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#0c111a] border-t border-[#1c2433]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="max-w-3xl mx-auto flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask a technical question about this repository..."
              disabled={isSending}
              className="flex-1 px-4 py-2.5 bg-[#121824] border border-[#243044] rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !inputQuery.trim()}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition disabled:opacity-40 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
