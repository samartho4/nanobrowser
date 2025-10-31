import React, { useState, useCallback, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { FiX, FiUser, FiFile, FiMail, FiClock, FiGlobe, FiDatabase } from 'react-icons/fi';
import { contextManager, type ContextItem } from '../../../../chrome-extension/src/services/context/ContextManager';

export interface ContextPill {
  id: string;
  type: 'page' | 'gmail' | 'memory' | 'file' | 'history' | 'message';
  label: string;
  tokens: number;
  removable: boolean;
  priority: number;
  agentId?: string; // Track which subagent contributed this context
  sourceType?: 'main' | 'subagent';
  preview?: string; // Short preview of content
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
  const [isReordering, setIsReordering] = useState(false);
  const totalTokens = pills.reduce((sum, pill) => sum + pill.tokens, 0);
  const tokenUsagePercent = Math.min((totalTokens / maxTokens) * 100, 100);

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

  // Handle pill removal
  const handleRemovePill = useCallback(
    async (pillId: string) => {
      onPillRemove(pillId);

      // Remove from ContextManager
      try {
        await contextManager.removeItem(workspaceId, pillId);
      } catch (error) {
        console.error('Failed to remove context item:', error);
      }
    },
    [onPillRemove, workspaceId],
  );

  // Get agent badge color
  const getAgentBadgeColor = (agentId?: string): string => {
    if (!agentId) return AGENT_COLORS['main-agent'];
    return AGENT_COLORS[agentId as keyof typeof AGENT_COLORS] || AGENT_COLORS['main-agent'];
  };

  // Render individual pill
  const renderPill = (pill: ContextPill, index: number) => {
    const IconComponent = PILL_ICONS[pill.type];
    const agentBadgeColor = getAgentBadgeColor(pill.agentId);

    return (
      <Draggable key={pill.id} draggableId={pill.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`
              flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200
              ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'}
              ${
                isDarkMode
                  ? 'bg-slate-700 text-gray-200 border border-slate-600'
                  : 'bg-white text-gray-700 border border-gray-200'
              }
              ${isReordering ? 'cursor-grabbing' : 'cursor-grab'}
              hover:shadow-md
            `}
            title={pill.preview || pill.label}>
            {/* Type icon */}
            <IconComponent className="w-4 h-4 text-teal-500" />

            {/* Agent badge (if from subagent) */}
            {pill.agentId && pill.agentId !== 'main-agent' && (
              <div className={`w-2 h-2 rounded-full ${agentBadgeColor}`} title={`From ${pill.agentId}`} />
            )}

            {/* Label */}
            <span className="flex-1 truncate max-w-[120px]">{pill.label}</span>

            {/* Token count */}
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                isDarkMode ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
              {pill.tokens}
            </span>

            {/* Remove button */}
            {pill.removable && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleRemovePill(pill.id);
                }}
                className={`p-1 rounded-sm transition-colors ${
                  isDarkMode
                    ? 'hover:bg-slate-600 text-gray-400 hover:text-gray-200'
                    : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                }`}
                title="Remove context">
                <FiX className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </Draggable>
    );
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

  return (
    <div className="space-y-3">
      {/* Token usage indicator */}
      {pills.length > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Context Usage</span>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              {totalTokens.toLocaleString()} / {maxTokens.toLocaleString()} tokens
            </span>
          </div>
          <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                tokenUsagePercent > 90 ? 'bg-red-500' : tokenUsagePercent > 70 ? 'bg-yellow-500' : 'bg-teal-500'
              }`}
              style={{ width: `${tokenUsagePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Context pills */}
      {pills.length > 0 && (
        <div>
          <h4 className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Active Context ({pills.length})
          </h4>

          <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <Droppable droppableId="context-pills" direction="horizontal">
              {provided => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-wrap gap-2">
                  {pills.map((pill, index) => renderPill(pill, index))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
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
