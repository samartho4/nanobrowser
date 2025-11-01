import React, { useState, useCallback } from 'react';
import { ResponsiveSunburst } from '@nivo/sunburst';
import { FiX, FiUser, FiFile, FiMail, FiClock, FiGlobe, FiDatabase, FiTrash2, FiZoomIn } from 'react-icons/fi';
import { contextManager } from '../../../../chrome-extension/src/services/context/ContextManager';
import { Draggable, DropResult } from '@hello-pangea/dnd';

export interface ContextPill {
  id: string;
  type: 'page' | 'gmail' | 'memory' | 'file' | 'history' | 'message';
  label: string;
  tokens: number;
  removable: boolean;
  priority: number;
  agentId?: string;
  sourceType?: 'main' | 'subagent';
  preview?: string;
  memoryType?: 'episodic' | 'semantic' | 'procedural'; // For Gmail context
}

export interface ContextSuggestion {
  id: string;
  type: ContextPill['type'];
  label: string;
  tokens: number;
  reason: string; // Why this is suggested
  confidence: number; // 0-1
  preview?: string;
  agentId?: string;
}

interface ContextPillsProps {
  workspaceId: string;
  pills: ContextPill[];
  suggestions?: ContextSuggestion[];
  onPillRemove: (pillId: string) => void;
  onPillsReorder: (newOrder: ContextPill[]) => void;
  onSuggestionAccept: (suggestion: ContextSuggestion) => void;
  onSuggestionDismiss: (suggestionId: string) => void;
  maxTokens?: number;
  isDarkMode?: boolean;
}

const PILL_ICONS = {
  page: FiGlobe,
  gmail: FiMail,
  memory: FiDatabase,
  file: FiFile,
  history: FiClock,
  message: FiUser,
};

const AGENT_COLORS = {
  'main-agent': 'bg-blue-500',
  'research-agent': 'bg-green-500',
  'writer-agent': 'bg-purple-500',
  'calendar-agent': 'bg-orange-500',
  'synthesis-agent': 'bg-teal-500',
  compressor: 'bg-gray-500',
};

export default function ContextPills({
  workspaceId,
  pills,
  suggestions = [],
  onPillRemove,
  onPillsReorder,
  onSuggestionAccept,
  onSuggestionDismiss,
  maxTokens = 100000,
  isDarkMode = false,
}: ContextPillsProps) {
  const [viewMode, setViewMode] = useState<'sunburst' | 'list'>('sunburst');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [isReordering, setIsReordering] = useState(false);
  const totalTokens = pills.reduce((sum, pill) => sum + pill.tokens, 0);
  const tokenUsagePercent = Math.min((totalTokens / maxTokens) * 100, 100);

  // Transform pills into sunburst data structure
  const sunburstData = React.useMemo(() => {
    if (pills.length === 0) return null;

    // Group by memory type for Gmail context
    const episodic = pills.filter(p => p.memoryType === 'episodic');
    const semantic = pills.filter(p => p.memoryType === 'semantic');
    const procedural = pills.filter(p => p.memoryType === 'procedural');
    const other = pills.filter(p => !p.memoryType);

    const children = [];

    if (episodic.length > 0) {
      children.push({
        name: 'Episodic',
        color: '#3B82F6',
        children: episodic.map(pill => ({
          name: pill.label,
          value: pill.tokens,
          id: pill.id,
          color: '#60A5FA',
          pill,
        })),
      });
    }

    if (semantic.length > 0) {
      children.push({
        name: 'Semantic',
        color: '#10B981',
        children: semantic.map(pill => ({
          name: pill.label,
          value: pill.tokens,
          id: pill.id,
          color: '#34D399',
          pill,
        })),
      });
    }

    if (procedural.length > 0) {
      children.push({
        name: 'Procedural',
        color: '#8B5CF6',
        children: procedural.map(pill => ({
          name: pill.label,
          value: pill.tokens,
          id: pill.id,
          color: '#A78BFA',
          pill,
        })),
      });
    }

    if (other.length > 0) {
      children.push({
        name: 'Other',
        color: '#6B7280',
        children: other.map(pill => ({
          name: pill.label,
          value: pill.tokens,
          id: pill.id,
          color: '#9CA3AF',
          pill,
        })),
      });
    }

    return {
      name: 'Context',
      color: isDarkMode ? '#1F2937' : '#F3F4F6',
      children,
    };
  }, [pills, isDarkMode]);

  // Handle drag end for reordering
  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      setIsReordering(false);

      if (!result.destination) return;

      const items = Array.from(pills);
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);

      // Update priorities based on new order (higher index = higher priority for attention)
      const reorderedWithPriorities = items.map((pill, index) => ({
        ...pill,
        priority: items.length - index, // Reverse order: first item gets highest priority
      }));

      onPillsReorder(reorderedWithPriorities);

      // Persist priority changes back to ContextManager
      try {
        await contextManager.updatePillPriorities?.(
          workspaceId,
          reorderedWithPriorities.map(pill => ({ id: pill.id, priority: pill.priority })),
        );
      } catch (error) {
        console.error('Failed to update pill priorities:', error);
      }
    },
    [pills, onPillsReorder, workspaceId],
  );

  const handleDragStart = useCallback(() => {
    setIsReordering(true);
  }, []);

  // Handle pill removal - optimistic UI update
  const handleRemovePill = useCallback(
    async (pillId: string) => {
      // Immediately update UI (optimistic update)
      onPillRemove(pillId);

      // Then remove from backend
      try {
        await contextManager.removeItem(workspaceId, pillId);
      } catch (error) {
        console.error('Failed to remove context item:', error);
        // Note: In a production app, you'd want to revert the optimistic update on error
      }
    },
    [onPillRemove, workspaceId],
  );

  // Get agent badge color
  const getAgentBadgeColor = (agentId?: string): string => {
    if (!agentId) return AGENT_COLORS['main-agent'];
    return AGENT_COLORS[agentId as keyof typeof AGENT_COLORS] || AGENT_COLORS['main-agent'];
  };

  // Render suggestion pill
  const renderSuggestion = (suggestion: ContextSuggestion) => {
    const IconComponent = PILL_ICONS[suggestion.type];
    const agentBadgeColor = getAgentBadgeColor(suggestion.agentId);

    return (
      <div
        key={suggestion.id}
        className={`
          flex items-center gap-2 rounded-lg px-3 py-2 text-sm border-2 border-dashed transition-all
          ${isDarkMode ? 'border-teal-600 bg-slate-800 text-gray-300' : 'border-teal-300 bg-teal-50 text-gray-700'}
          hover:border-teal-500
        `}
        title={`${suggestion.reason} (${Math.round(suggestion.confidence * 100)}% confidence)`}>
        {/* Type icon */}
        <IconComponent className="w-4 h-4 text-teal-500" />

        {/* Agent badge */}
        {suggestion.agentId && suggestion.agentId !== 'main-agent' && (
          <div className={`w-2 h-2 rounded-full ${agentBadgeColor}`} title={`Suggested by ${suggestion.agentId}`} />
        )}

        {/* Label */}
        <span className="flex-1 truncate max-w-[100px]">{suggestion.label}</span>

        {/* Token count */}
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            isDarkMode ? 'bg-slate-700 text-gray-400' : 'bg-teal-100 text-teal-700'
          }`}>
          {suggestion.tokens}
        </span>

        {/* Accept button */}
        <button
          onClick={() => onSuggestionAccept(suggestion)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            isDarkMode ? 'bg-teal-600 text-white hover:bg-teal-500' : 'bg-teal-500 text-white hover:bg-teal-600'
          }`}
          title="Add to context">
          Add
        </button>

        {/* Dismiss button */}
        <button
          onClick={() => onSuggestionDismiss(suggestion.id)}
          className={`p-1 rounded-sm transition-colors ${
            isDarkMode
              ? 'hover:bg-slate-700 text-gray-500 hover:text-gray-300'
              : 'hover:bg-teal-100 text-gray-500 hover:text-gray-700'
          }`}
          title="Dismiss suggestion">
          <FiX className="w-3 h-3" />
        </button>
      </div>
    );
  };

  // Handle node click for deletion
  const handleNodeClick = useCallback((node: any) => {
    if (node.data.pill) {
      setSelectedNode(node);
    }
  }, []);

  // Handle context deletion - optimistic UI update
  const handleDeleteContext = useCallback(
    async (pillId: string) => {
      try {
        // Immediately update UI (optimistic update)
        onPillRemove(pillId);
        setSelectedNode(null);

        // Then remove from backend
        await contextManager.removeItem(workspaceId, pillId);
      } catch (error) {
        console.error('Failed to delete context:', error);
        // Note: In a production app, you'd want to revert the optimistic update on error
        // For now, we'll just log the error
      }
    },
    [workspaceId, onPillRemove],
  );

  return (
    <div className="space-y-3">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Active Context ({pills.length})
          </h4>
          {pills.length > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <button
                onClick={() => setViewMode('sunburst')}
                className={`px-2 py-1 rounded ${
                  viewMode === 'sunburst'
                    ? isDarkMode
                      ? 'bg-teal-600 text-white'
                      : 'bg-teal-500 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-200 text-gray-600'
                }`}>
                <FiZoomIn className="w-3 h-3" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 rounded ${
                  viewMode === 'list'
                    ? isDarkMode
                      ? 'bg-teal-600 text-white'
                      : 'bg-teal-500 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-200 text-gray-600'
                }`}>
                List
              </button>
            </div>
          )}
        </div>
        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {totalTokens.toLocaleString()} / {maxTokens.toLocaleString()} tokens
        </span>
      </div>

      {/* Token usage indicator */}
      {pills.length > 0 && (
        <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              tokenUsagePercent > 90 ? 'bg-red-500' : tokenUsagePercent > 70 ? 'bg-yellow-500' : 'bg-teal-500'
            }`}
            style={{ width: `${tokenUsagePercent}%` }}
          />
        </div>
      )}

      {/* Sunburst Visualization */}
      {pills.length > 0 && viewMode === 'sunburst' && sunburstData && (
        <div className="relative">
          <div style={{ height: '400px' }} className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <ResponsiveSunburst
              data={sunburstData}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              id="name"
              value="value"
              cornerRadius={2}
              borderWidth={2}
              borderColor={{ theme: 'background' }}
              colors={{ datum: 'data.color' }}
              childColor={{ from: 'color', modifiers: [['brighter', 0.1]] }}
              enableArcLabels={true}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{
                from: 'color',
                modifiers: [['darker', 2]],
              }}
              onClick={handleNodeClick}
              tooltip={({ id, value, color, data }) => {
                const nodeData = data as any;
                return (
                  <div
                    className={`px-3 py-2 rounded-lg shadow-lg ${
                      isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
                    }`}>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{id}</span>
                    </div>
                    <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {value} tokens
                    </div>
                    {nodeData.pill?.preview && (
                      <div
                        className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} max-w-xs truncate`}>
                        {nodeData.pill.preview}
                      </div>
                    )}
                  </div>
                );
              }}
              theme={{
                background: isDarkMode ? '#1F2937' : '#FFFFFF',
                text: {
                  fill: isDarkMode ? '#D1D5DB' : '#374151',
                  fontSize: 11,
                },
                tooltip: {
                  container: {
                    background: isDarkMode ? '#111827' : '#FFFFFF',
                    color: isDarkMode ? '#F3F4F6' : '#111827',
                  },
                },
              }}
            />
          </div>

          {/* Selected node details */}
          {selectedNode && selectedNode.data.pill && (
            <div
              className={`absolute top-0 right-0 p-4 rounded-lg shadow-xl max-w-sm ${
                isDarkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                  <h5 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedNode.data.pill.label}
                  </h5>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800`}>
                  <FiX className="w-4 h-4" />
                </button>
              </div>
              <div className={`text-sm space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <div>Type: {selectedNode.data.pill.type}</div>
                <div>Tokens: {selectedNode.data.pill.tokens}</div>
                <div>Priority: {selectedNode.data.pill.priority}</div>
                {selectedNode.data.pill.memoryType && (
                  <div className="capitalize">Memory: {selectedNode.data.pill.memoryType}</div>
                )}
                {selectedNode.data.pill.preview && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs">{selectedNode.data.pill.preview}</div>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDeleteContext(selectedNode.data.pill.id)}
                className="w-full mt-3 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-center space-x-2">
                <FiTrash2 className="w-4 h-4" />
                <span>Delete Context</span>
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center space-x-4 mt-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Episodic</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Semantic</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Procedural</span>
            </div>
          </div>
        </div>
      )}

      {/* List View (existing implementation) */}
      {pills.length > 0 && viewMode === 'list' && (
        <div className="flex flex-wrap gap-2">
          {pills.map(pill => (
            <div
              key={pill.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                isDarkMode
                  ? 'bg-slate-700 text-gray-200 border border-slate-600'
                  : 'bg-white text-gray-700 border border-gray-200'
              } hover:shadow-md`}>
              <span className="flex-1 truncate max-w-[120px]">{pill.label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  isDarkMode ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                {pill.tokens}
              </span>
              {pill.removable && (
                <button
                  onClick={() => handleDeleteContext(pill.id)}
                  className={`p-1 rounded-sm transition-colors ${
                    isDarkMode
                      ? 'hover:bg-slate-600 text-gray-400 hover:text-gray-200'
                      : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                  }`}>
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Suggested pills */}
      {suggestions.length > 0 && (
        <div>
          <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Suggested Context ({suggestions.length})
          </h4>

          <div className="flex flex-wrap gap-2">{suggestions.map(renderSuggestion)}</div>
        </div>
      )}

      {/* Empty state */}
      {pills.length === 0 && suggestions.length === 0 && (
        <div className={`text-center py-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <FiDatabase className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No context items yet</p>
          <p className="text-xs mt-1">Use @-mentions to add context</p>
        </div>
      )}
    </div>
  );
}
