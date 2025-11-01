import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveSunburst } from '@nivo/sunburst';
import { FiTrash2, FiInfo, FiRefreshCw, FiMail, FiTarget } from 'react-icons/fi';

interface ContextItem {
  id: string;
  type: 'gmail';
  content: string;
  metadata: {
    source: string;
    timestamp: number;
    tokens: number;
    priority: number;
    workspaceId: string;
    relevanceScore?: number;
    memoryType: 'episodic' | 'semantic' | 'procedural';
  };
}

interface ContextSunburstChartProps {
  workspaceId: string;
  isDarkMode: boolean;
  onContextRemoved: () => void;
}

interface SunburstNode {
  name: string;
  value?: number;
  color?: string;
  children?: SunburstNode[];
  itemId?: string;
  itemData?: ContextItem;
}

// Vibrant, distinct color palette - each email gets a unique color
const VIBRANT_COLORS = {
  episodic: [
    '#3B82F6', // Bright Blue
    '#60A5FA', // Sky Blue
    '#2563EB', // Royal Blue
    '#1D4ED8', // Deep Blue
    '#93C5FD', // Light Blue
    '#DBEAFE', // Pale Blue
    '#1E40AF', // Navy Blue
    '#BFDBFE', // Baby Blue
  ],
  semantic: [
    '#10B981', // Emerald
    '#34D399', // Light Green
    '#059669', // Forest Green
    '#047857', // Dark Green
    '#6EE7B7', // Mint
    '#A7F3D0', // Pale Green
    '#065F46', // Deep Forest
    '#D1FAE5', // Light Mint
  ],
  procedural: [
    '#8B5CF6', // Purple
    '#A78BFA', // Light Purple
    '#7C3AED', // Violet
    '#6D28D9', // Deep Purple
    '#C4B5FD', // Lavender
    '#DDD6FE', // Pale Purple
    '#5B21B6', // Dark Violet
    '#EDE9FE', // Light Lavender
  ],
};

export const ContextSunburstChart: React.FC<ContextSunburstChartProps> = ({
  workspaceId,
  isDarkMode,
  onContextRemoved,
}) => {
  const [contextData, setContextData] = useState<ContextItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);

  useEffect(() => {
    loadContextData();
  }, [workspaceId]);

  const pollTaskStatus = async (taskId: string, maxAttempts = 40): Promise<any> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const statusResponse = await chrome.runtime.sendMessage({
          type: 'GET_TASK_STATUS',
          payload: { taskId },
        });

        if (statusResponse?.success && statusResponse?.task) {
          const task = statusResponse.task;

          if (task.status === 'completed') {
            return task.result || [];
          } else if (task.status === 'failed') {
            return [];
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    return [];
  };

  const loadContextData = async () => {
    try {
      setIsLoading(true);
      console.log(`[ContextSunburst] Loading data for: ${workspaceId}`);

      const tasks = await Promise.all([
        chrome.runtime
          .sendMessage({
            type: 'GET_EMAILS_BY_MEMORY_TYPE',
            payload: { workspaceId, memoryType: 'episodic' },
          })
          .catch(() => ({ success: false })),
        chrome.runtime
          .sendMessage({
            type: 'GET_EMAILS_BY_MEMORY_TYPE',
            payload: { workspaceId, memoryType: 'semantic' },
          })
          .catch(() => ({ success: false })),
        chrome.runtime
          .sendMessage({
            type: 'GET_EMAILS_BY_MEMORY_TYPE',
            payload: { workspaceId, memoryType: 'procedural' },
          })
          .catch(() => ({ success: false })),
      ]);

      const results = await Promise.all([
        tasks[0]?.success && tasks[0]?.taskId ? pollTaskStatus(tasks[0].taskId) : Promise.resolve([]),
        tasks[1]?.success && tasks[1]?.taskId ? pollTaskStatus(tasks[1].taskId) : Promise.resolve([]),
        tasks[2]?.success && tasks[2]?.taskId ? pollTaskStatus(tasks[2].taskId) : Promise.resolve([]),
      ]);

      const allEmails = [
        ...(Array.isArray(results[0]) ? results[0] : []),
        ...(Array.isArray(results[1]) ? results[1] : []),
        ...(Array.isArray(results[2]) ? results[2] : []),
      ];

      if (allEmails.length > 0) {
        const items: ContextItem[] = allEmails.map((email: any) => ({
          id: email.messageId || `email_${Date.now()}_${Math.random()}`,
          type: 'gmail',
          content: `${email.subject || 'No Subject'}\n\nFrom: ${email.from || 'Unknown'}\n\n${email.bodyText || ''}`,
          metadata: {
            source: `gmail-${email.memoryType}`,
            timestamp: email.timestamp || Date.now(),
            tokens: Math.max(10, Math.ceil(((email.subject?.length || 0) + (email.bodyText?.length || 0)) / 4)),
            priority: email.priority === 'urgent' ? 5 : email.priority === 'important' ? 4 : 3,
            workspaceId,
            relevanceScore: email.actionRequired ? 0.9 : 0.6,
            memoryType: email.memoryType,
          },
        }));

        setContextData(items);
        console.log(`[ContextSunburst] Loaded ${items.length} items`);
      } else {
        setContextData([]);
      }
    } catch (error) {
      console.error('[ContextSunburst] Error:', error);
      setContextData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get distinct color for each item
  const getItemColor = (memoryType: string, index: number) => {
    const colors = VIBRANT_COLORS[memoryType as keyof typeof VIBRANT_COLORS] || VIBRANT_COLORS.episodic;
    return colors[index % colors.length];
  };

  const sunburstData = useMemo((): SunburstNode => {
    if (contextData.length === 0) {
      return { name: 'No Data', children: [] };
    }

    const episodicItems = contextData.filter(item => item.metadata.memoryType === 'episodic');
    const semanticItems = contextData.filter(item => item.metadata.memoryType === 'semantic');
    const proceduralItems = contextData.filter(item => item.metadata.memoryType === 'procedural');

    const children: SunburstNode[] = [];

    if (episodicItems.length > 0) {
      children.push({
        name: `Episodic (${episodicItems.length})`,
        color: '#3B82F6',
        children: episodicItems.map((item, idx) => ({
          name: item.content.substring(0, 25) + '...',
          value: item.metadata.tokens,
          color: getItemColor('episodic', idx),
          itemId: item.id,
          itemData: item,
        })),
      });
    }

    if (semanticItems.length > 0) {
      children.push({
        name: `Semantic (${semanticItems.length})`,
        color: '#10B981',
        children: semanticItems.map((item, idx) => ({
          name: item.content.substring(0, 25) + '...',
          value: item.metadata.tokens,
          color: getItemColor('semantic', idx),
          itemId: item.id,
          itemData: item,
        })),
      });
    }

    if (proceduralItems.length > 0) {
      children.push({
        name: `Procedural (${proceduralItems.length})`,
        color: '#8B5CF6',
        children: proceduralItems.map((item, idx) => ({
          name: item.content.substring(0, 25) + '...',
          value: item.metadata.tokens,
          color: getItemColor('procedural', idx),
          itemId: item.id,
          itemData: item,
        })),
      });
    }

    return {
      name: `Context (${contextData.length})`,
      color: isDarkMode ? '#1F2937' : '#F9FAFB',
      children,
    };
  }, [contextData, isDarkMode]);

  const handleDeleteContext = async (itemId: string) => {
    try {
      setContextData(prev => prev.filter(item => item.id !== itemId));
      setSelectedItem(null);
      setShowDeleteConfirm(false);
      setDeleteMode(false);

      await chrome.runtime.sendMessage({
        type: 'REMOVE_CONTEXT_ITEM',
        payload: { workspaceId, itemId },
      });

      onContextRemoved();
    } catch (error) {
      console.error('[ContextSunburst] Delete error:', error);
    }
  };

  const totalTokens = contextData.reduce((sum, item) => sum + item.metadata.tokens, 0);

  if (isLoading) {
    return (
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-center space-x-2">
          <FiRefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Loading Gmail context...</span>
        </div>
      </div>
    );
  }

  if (contextData.length === 0) {
    return (
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="text-center space-y-4">
          <FiInfo className="w-12 h-12 mx-auto text-gray-400" />
          <div>
            <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              No Gmail Context Data
            </p>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Sync Gmail to visualize your email context
            </p>
          </div>
          <button
            onClick={() => {
              chrome.runtime
                .sendMessage({
                  type: 'SYNC_GMAIL_MEMORY',
                  payload: { workspaceId, maxMessages: 50, daysBack: 7, forceRefresh: true },
                })
                .then(() => setTimeout(() => loadContextData(), 3000));
            }}
            className="px-4 py-2 rounded-lg font-medium transition-all transform hover:scale-105 flex items-center space-x-2 mx-auto bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white shadow-lg">
            <FiMail className="w-4 h-4" />
            <span>Sync Gmail Now</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Gmail Context Visualization
        </h3>
        <div className="flex items-center space-x-3">
          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {contextData.length} items • {totalTokens.toLocaleString()} tokens
          </span>
          <button
            onClick={() => setDeleteMode(!deleteMode)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
              deleteMode
                ? 'bg-red-500 text-white shadow-lg'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
            <FiTarget className="w-4 h-4 inline mr-1" />
            {deleteMode ? 'Exit Delete Mode' : 'Delete Mode'}
          </button>
          <button
            onClick={loadContextData}
            className={`p-2 rounded-lg transition-all transform hover:scale-110 ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}>
            <FiRefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Mode Banner */}
      {deleteMode && (
        <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse">
          <div className="flex items-center space-x-2">
            <FiTrash2 className="w-5 h-5" />
            <span className="font-medium">Delete Mode Active - Click any segment to delete it</span>
          </div>
        </div>
      )}

      {/* Sunburst */}
      <div
        className={`p-4 rounded-lg shadow-xl ${isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'}`}
        style={{ height: '600px' }}>
        <ResponsiveSunburst
          data={sunburstData}
          margin={{ top: 30, right: 30, bottom: 30, left: 30 }}
          id="name"
          value="value"
          cornerRadius={4}
          borderWidth={3}
          borderColor={{ theme: 'background' }}
          colors={{ datum: 'data.color' }}
          childColor={{ from: 'color', modifiers: [['brighter', 0.2]] }}
          enableArcLabels={true}
          arcLabelsSkipAngle={15}
          arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
          onClick={node => {
            if (node.data.itemData) {
              if (deleteMode) {
                handleDeleteContext(node.data.itemId!);
              } else {
                setSelectedItem(node.data.itemData);
                setShowDeleteConfirm(true);
              }
            }
          }}
          onMouseEnter={node => {
            if (node.data.itemId) {
              setHoveredItem(node.data.itemId);
            }
          }}
          onMouseLeave={() => setHoveredItem(null)}
          tooltip={({ id, value, color, data }) => (
            <div
              className="px-4 py-3 rounded-xl shadow-2xl backdrop-blur-sm animate-in fade-in duration-200"
              style={{
                background: isDarkMode
                  ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.95))'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.95))',
                border: `2px solid ${color}`,
                maxWidth: '350px',
              }}>
              <div className="flex items-center space-x-2 mb-2">
                <div
                  className="w-4 h-4 rounded-full shadow-lg"
                  style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                />
                <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{id}</span>
              </div>
              {value && (
                <div className="space-y-1">
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="text-blue-500">●</span> {value} tokens
                  </div>
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="text-green-500">●</span> {((value / totalTokens) * 100).toFixed(2)}% of total
                  </div>
                </div>
              )}
              {data.itemData && (
                <div
                  className={`text-xs mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                  <div className="flex items-center space-x-2">
                    <FiTrash2 className="w-3 h-3 text-red-500" />
                    <span>{deleteMode ? 'Click to delete' : 'Click for options'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          theme={{
            background: 'transparent',
            text: { fill: isDarkMode ? '#D1D5DB' : '#374151', fontSize: 11, fontWeight: 600 },
          }}
          animate={true}
          motionConfig="gentle"
        />
      </div>

      {/* Legend with gradient */}
      <div className="flex items-center justify-center space-x-8 mt-6">
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg" />
          <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
            Episodic ({contextData.filter(i => i.metadata.memoryType === 'episodic').length})
          </span>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-lg" />
          <span className={`font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
            Semantic ({contextData.filter(i => i.metadata.memoryType === 'semantic').length})
          </span>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg" />
          <span className={`font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
            Procedural ({contextData.filter(i => i.metadata.memoryType === 'procedural').length})
          </span>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div
            className={`p-6 rounded-2xl max-w-md w-full mx-4 shadow-2xl transform animate-in zoom-in duration-200 ${
              isDarkMode ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-white to-gray-50'
            }`}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-full bg-red-500/20">
                <FiTrash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Delete Context</h3>
            </div>
            <div className="mb-6">
              <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Are you sure you want to delete this context item?
              </p>
              <div
                className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-100 border border-gray-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      selectedItem.metadata.memoryType === 'episodic'
                        ? 'bg-blue-500 text-white'
                        : selectedItem.metadata.memoryType === 'semantic'
                          ? 'bg-green-500 text-white'
                          : 'bg-purple-500 text-white'
                    }`}>
                    {selectedItem.metadata.memoryType}
                  </span>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {selectedItem.metadata.tokens} tokens
                  </span>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {selectedItem.content.substring(0, 150)}...
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedItem(null);
                }}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all transform hover:scale-105 ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}>
                Cancel
              </button>
              <button
                onClick={() => handleDeleteContext(selectedItem.id)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextSunburstChart;
