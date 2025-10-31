import React, { useState, useEffect } from 'react';
import {
  FiMail,
  FiGlobe,
  FiMessageSquare,
  FiFile,
  FiCpu,
  FiUser,
  FiRefreshCw,
  FiZap,
  FiTrendingUp,
  FiShield,
  FiStar,
} from 'react-icons/fi';
import { Button } from '@extension/ui';
import ContextPills, {
  type ContextPill,
  type ContextSuggestion,
} from '../../../side-panel/src/components/ContextPills';

interface ContextWindowSettingsProps {
  isDarkMode?: boolean;
}

export const ContextWindowSettings = ({ isDarkMode = false }: ContextWindowSettingsProps) => {
  const [selectedWorkspace, setSelectedWorkspace] = useState('work-workspace');
  const [loading, setLoading] = useState(false);
  const [contextPills, setContextPills] = useState<ContextPill[]>([]);
  const [contextSuggestions, setContextSuggestions] = useState<ContextSuggestion[]>([]);

  // Gemini Nano has 4096 token limit
  const GEMINI_NANO_TOKEN_LIMIT = 4096;

  // Load context pills on component mount
  useEffect(() => {
    loadContextPills();
  }, [selectedWorkspace]);

  // Context pill management
  const handlePillRemove = async (pillId: string) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REMOVE_CONTEXT_ITEM',
        payload: {
          workspaceId: selectedWorkspace,
          itemId: pillId,
        },
      });

      if (response.ok) {
        setContextPills(prev => prev.filter(pill => pill.id !== pillId));
      } else {
        console.error('Failed to remove context item:', response.error);
      }
    } catch (error) {
      console.error('Error removing context item:', error);
    }
  };

  const handlePillsReorder = async (newOrder: ContextPill[]) => {
    setContextPills(newOrder);

    try {
      const priorities = newOrder.map((pill, index) => ({
        id: pill.id,
        priority: newOrder.length - index, // Higher index = higher priority
      }));

      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_PILL_PRIORITIES',
        payload: {
          workspaceId: selectedWorkspace,
          priorities,
        },
      });

      if (!response.ok) {
        console.error('Failed to update pill priorities:', response.error);
      }
    } catch (error) {
      console.error('Error updating pill priorities:', error);
    }
  };

  const handleSuggestionAccept = async (suggestion: ContextSuggestion) => {
    // Convert suggestion to pill
    const newPill: ContextPill = {
      id: suggestion.id,
      type: suggestion.type,
      label: suggestion.label,
      tokens: suggestion.tokens,
      removable: true,
      priority: 3,
      agentId: suggestion.agentId,
      sourceType: suggestion.agentId ? 'subagent' : 'main',
      preview: suggestion.preview,
    };

    setContextPills(prev => [...prev, newPill]);
    setContextSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

    // Persist to backend
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ACCEPT_CONTEXT_SUGGESTION',
        payload: {
          workspaceId: selectedWorkspace,
          suggestion: newPill,
        },
      });

      if (!response.ok) {
        console.error('Failed to accept suggestion:', response.error);
      }
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    }
  };

  const handleSuggestionDismiss = (suggestionId: string) => {
    setContextSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const loadContextPills = async () => {
    setLoading(true);
    try {
      // Load active context pills
      const pillsResponse = await chrome.runtime.sendMessage({
        type: 'GET_CONTEXT_PILLS',
        payload: { workspaceId: selectedWorkspace },
      });

      if (pillsResponse.ok) {
        setContextPills(pillsResponse.pills || []);
      }

      // Load context suggestions
      const suggestionsResponse = await chrome.runtime.sendMessage({
        type: 'GET_CONTEXT_SUGGESTIONS',
        payload: { workspaceId: selectedWorkspace },
      });

      if (suggestionsResponse.ok) {
        setContextSuggestions(suggestionsResponse.suggestions || []);
      }
    } catch (error) {
      console.error('Error loading context pills:', error);

      // Fallback to demo data for development
      setContextPills([
        {
          id: 'demo-gmail-1',
          type: 'gmail',
          label: 'Email: Project Update',
          tokens: 245,
          removable: true,
          priority: 4,
          agentId: 'gmail-agent',
          sourceType: 'subagent',
          preview: 'From: team@company.com - Subject: Weekly project status update with key metrics...',
        },
        {
          id: 'demo-page-1',
          type: 'page',
          label: 'Current Tab: Documentation',
          tokens: 380,
          removable: true,
          priority: 5,
          agentId: 'main-agent',
          sourceType: 'main',
          preview: 'API documentation for context management system with examples...',
        },
        {
          id: 'demo-memory-1',
          type: 'memory',
          label: 'User Preferences',
          tokens: 120,
          removable: true,
          priority: 3,
          agentId: 'memory-agent',
          sourceType: 'subagent',
          preview: 'Learned preferences: prefers concise responses, works in TypeScript...',
        },
      ]);

      setContextSuggestions([
        {
          id: 'suggestion-research',
          type: 'message',
          label: '@agent:research',
          tokens: 290,
          reason: 'Research agent found relevant documentation',
          confidence: 0.85,
          preview: 'Research findings about context window optimization techniques...',
          agentId: 'research-agent',
        },
        {
          id: 'suggestion-history',
          type: 'history',
          label: '@history',
          tokens: 180,
          reason: 'Recent conversation contains relevant context',
          confidence: 0.72,
          preview: 'Previous discussion about token limits and compression strategies...',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const totalTokens = contextPills.reduce((sum, pill) => sum + pill.tokens, 0);
  const tokenUsagePercent = Math.min((totalTokens / GEMINI_NANO_TOKEN_LIMIT) * 100, 100);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className={`p-3 rounded-full ${isDarkMode ? 'bg-teal-500/20' : 'bg-teal-100'}`}>
            <FiZap className="h-8 w-8 text-teal-500" />
          </div>
        </div>
        <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>AI Context Manager</h1>
        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
          Control what your AI knows. Drag to prioritize, remove what's not needed, and see exactly how your context
          budget is used.
        </p>

        {/* Token Usage Hero */}
        <div
          className={`inline-flex items-center gap-4 px-6 py-3 rounded-full ${
            isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/80 border border-gray-200'
          } backdrop-blur-sm`}>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                tokenUsagePercent > 90 ? 'bg-red-500' : tokenUsagePercent > 70 ? 'bg-yellow-500' : 'bg-teal-500'
              }`}
            />
            <span className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              {totalTokens.toLocaleString()} / {GEMINI_NANO_TOKEN_LIMIT.toLocaleString()}
            </span>
          </div>
          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>tokens used</span>
        </div>
      </div>

      {/* Workspace Selector - Simplified */}
      <div className="flex items-center justify-center gap-4">
        <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Workspace:</label>
        <select
          value={selectedWorkspace}
          onChange={e => setSelectedWorkspace(e.target.value)}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode ? 'bg-slate-700 border-slate-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'
          } focus:ring-2 focus:ring-teal-500 focus:border-transparent`}>
          <option value="work-workspace">🏢 Work</option>
          <option value="personal-workspace">🏠 Personal</option>
          <option value="test-workspace">🧪 Testing</option>
        </select>

        <Button
          onClick={loadContextPills}
          disabled={loading}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg">
          <FiRefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Context Pills Interface */}
      <div
        className={`rounded-2xl p-8 ${isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white/80 border border-gray-200'} backdrop-blur-sm shadow-xl`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            Your AI's Context
          </h2>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {contextPills.length} items
            </span>
            {contextPills.length > 0 && (
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  tokenUsagePercent > 90
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : tokenUsagePercent > 70
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                }`}>
                {tokenUsagePercent.toFixed(0)}% used
              </div>
            )}
          </div>
        </div>

        <ContextPills
          workspaceId={selectedWorkspace}
          pills={contextPills}
          suggestions={contextSuggestions}
          onPillRemove={handlePillRemove}
          onPillsReorder={handlePillsReorder}
          onSuggestionAccept={handleSuggestionAccept}
          onSuggestionDismiss={handleSuggestionDismiss}
          maxTokens={GEMINI_NANO_TOKEN_LIMIT}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* How It Works - Simple Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800/30 border border-slate-700' : 'bg-white/60 border border-gray-200'} backdrop-blur-sm`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-teal-500/20' : 'bg-teal-100'}`}>
              <FiTrendingUp className="h-5 w-5 text-teal-500" />
            </div>
            <h3 className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Drag to Prioritize</h3>
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Most important context goes first. Your AI pays more attention to items at the top of the list.
          </p>
        </div>

        <div
          className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800/30 border border-slate-700' : 'bg-white/60 border border-gray-200'} backdrop-blur-sm`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <FiShield className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Stay Under Budget</h3>
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Gemini Nano has a 4,096 token limit. Remove items you don't need to make room for what matters.
          </p>
        </div>

        <div
          className={`p-6 rounded-xl ${isDarkMode ? 'bg-slate-800/30 border border-slate-700' : 'bg-white/60 border border-gray-200'} backdrop-blur-sm`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
              <FiStar className="h-5 w-5 text-purple-500" />
            </div>
            <h3 className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Smart Suggestions</h3>
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Your AI suggests relevant context based on what you're working on. Accept what's useful, dismiss the rest.
          </p>
        </div>
      </div>

      {/* Context Types Legend */}
      <div
        className={`rounded-xl p-6 ${isDarkMode ? 'bg-slate-800/30 border border-slate-700' : 'bg-white/60 border border-gray-200'} backdrop-blur-sm`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          Context Types
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-2">
            <FiMail className="h-4 w-4 text-red-500" />
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Gmail</span>
          </div>
          <div className="flex items-center gap-2">
            <FiGlobe className="h-4 w-4 text-blue-500" />
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Web Pages</span>
          </div>
          <div className="flex items-center gap-2">
            <FiMessageSquare className="h-4 w-4 text-green-500" />
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Messages</span>
          </div>
          <div className="flex items-center gap-2">
            <FiCpu className="h-4 w-4 text-purple-500" />
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Memory</span>
          </div>
          <div className="flex items-center gap-2">
            <FiFile className="h-4 w-4 text-orange-500" />
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Files</span>
          </div>
        </div>
      </div>
    </div>
  );
};
