import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { FiTrash2, FiInfo, FiRefreshCw, FiUser, FiFile, FiMail, FiClock, FiGlobe, FiDatabase } from 'react-icons/fi';

interface ContextItem {
  id: string;
  type: 'message' | 'page' | 'gmail' | 'memory' | 'file' | 'history';
  content: string;
  metadata: {
    source: string;
    timestamp: number;
    tokens: number;
    priority: number;
    workspaceId: string;
    relevanceScore?: number;
  };
}

interface ContextSunburstChartProps {
  workspaceId: string;
  isDarkMode: boolean;
  onContextRemoved: () => void;
}

interface SunburstDataNode {
  name: string;
  value: number;
  itemId?: string;
  itemType?: string;
  children?: SunburstDataNode[];
  itemStyle?: {
    color?: string;
    borderColor?: string;
    borderWidth?: number;
  };
}

export const ContextSunburstChart: React.FC<ContextSunburstChartProps> = ({
  workspaceId,
  isDarkMode,
  onContextRemoved,
}) => {
  const [contextData, setContextData] = useState<ContextItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ContextItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const chartRef = useRef<ReactECharts>(null);

  // Load context data on mount
  useEffect(() => {
    loadContextData();
  }, [workspaceId]);

  const loadContextData = async () => {
    try {
      setIsLoading(true);

      // Get REAL context pills data (same as side panel uses)
      const pillsResponse = await chrome.runtime.sendMessage({
        type: 'GET_CONTEXT_PILLS',
        payload: { workspaceId },
      });

      if (pillsResponse?.ok && pillsResponse.pills && pillsResponse.pills.length > 0) {
        // Convert pills to ContextItem format
        const realContextItems: ContextItem[] = pillsResponse.pills.map((pill: any) => ({
          id: pill.id,
          type: pill.type,
          content: pill.preview || pill.label,
          metadata: {
            source: pill.agentId || 'main-agent',
            timestamp: Date.now(),
            tokens: pill.tokens,
            priority: pill.priority,
            workspaceId,
            relevanceScore: 0.8,
          },
        }));

        setContextData(realContextItems);
        console.log(`Loaded ${realContextItems.length} real context items`);
      } else {
        // Try alternative method - direct context select
        const selectResponse = await chrome.runtime.sendMessage({
          type: 'TEST_CONTEXT_SELECT',
          payload: {
            workspaceId,
            query: '',
            tokenLimit: 50000,
            options: {},
          },
        });

        if (selectResponse?.ok && selectResponse.items && selectResponse.items.length > 0) {
          setContextData(selectResponse.items);
          console.log(`Loaded ${selectResponse.items.length} context items via select`);
        } else {
          console.log('No real context data found - showing empty state');
          setContextData([]);
        }
      }
    } catch (error) {
      console.error('Error loading context data:', error);
      setContextData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get type icon for context items
  const getTypeIcon = (type: string) => {
    const icons = {
      message: FiUser,
      page: FiGlobe,
      gmail: FiMail,
      memory: FiDatabase,
      file: FiFile,
      history: FiClock,
    };
    return icons[type as keyof typeof icons] || FiDatabase;
  };

  // Transform context data into ECharts sunburst format
  const transformToSunburstData = (): SunburstDataNode => {
    if (contextData.length === 0) {
      return {
        name: 'No Context Data',
        value: 0,
        children: [],
      };
    }

    const typeGroups = contextData.reduce(
      (acc, item) => {
        if (!acc[item.type]) {
          acc[item.type] = [];
        }
        acc[item.type].push(item);
        return acc;
      },
      {} as Record<string, ContextItem[]>,
    );

    // Beautiful gradient color schemes
    const typeColors = {
      message: {
        base: isDarkMode ? '#3b82f6' : '#2563eb',
        gradient: isDarkMode ? ['#1e40af', '#3b82f6', '#60a5fa'] : ['#1d4ed8', '#2563eb', '#3b82f6'],
      },
      page: {
        base: isDarkMode ? '#10b981' : '#059669',
        gradient: isDarkMode ? ['#047857', '#10b981', '#34d399'] : ['#065f46', '#059669', '#10b981'],
      },
      gmail: {
        base: isDarkMode ? '#f59e0b' : '#d97706',
        gradient: isDarkMode ? ['#d97706', '#f59e0b', '#fbbf24'] : ['#b45309', '#d97706', '#f59e0b'],
      },
      memory: {
        base: isDarkMode ? '#8b5cf6' : '#7c3aed',
        gradient: isDarkMode ? ['#7c3aed', '#8b5cf6', '#a78bfa'] : ['#6d28d9', '#7c3aed', '#8b5cf6'],
      },
      file: {
        base: isDarkMode ? '#ef4444' : '#dc2626',
        gradient: isDarkMode ? ['#dc2626', '#ef4444', '#f87171'] : ['#b91c1c', '#dc2626', '#ef4444'],
      },
      history: {
        base: isDarkMode ? '#6b7280' : '#4b5563',
        gradient: isDarkMode ? ['#4b5563', '#6b7280', '#9ca3af'] : ['#374151', '#4b5563', '#6b7280'],
      },
      // Additional types that might come from real data
      email: {
        base: isDarkMode ? '#f59e0b' : '#d97706',
        gradient: isDarkMode ? ['#d97706', '#f59e0b', '#fbbf24'] : ['#b45309', '#d97706', '#f59e0b'],
      },
      document: {
        base: isDarkMode ? '#10b981' : '#059669',
        gradient: isDarkMode ? ['#047857', '#10b981', '#34d399'] : ['#065f46', '#059669', '#10b981'],
      },
      chat: {
        base: isDarkMode ? '#3b82f6' : '#2563eb',
        gradient: isDarkMode ? ['#1e40af', '#3b82f6', '#60a5fa'] : ['#1d4ed8', '#2563eb', '#3b82f6'],
      },
      web: {
        base: isDarkMode ? '#10b981' : '#059669',
        gradient: isDarkMode ? ['#047857', '#10b981', '#34d399'] : ['#065f46', '#059669', '#10b981'],
      },
    };

    // Default fallback color scheme for unknown types
    const defaultColorScheme = {
      base: isDarkMode ? '#6b7280' : '#4b5563',
      gradient: isDarkMode ? ['#4b5563', '#6b7280', '#9ca3af'] : ['#374151', '#4b5563', '#6b7280'],
    };

    const children: SunburstDataNode[] = Object.entries(typeGroups).map(([type, items], typeIndex) => {
      const colorScheme = typeColors[type as keyof typeof typeColors] || defaultColorScheme;

      return {
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} (${items.length})`,
        value: items.reduce((sum, item) => sum + item.metadata.tokens, 0),
        itemStyle: {
          color: colorScheme.base,
          borderColor: isDarkMode ? '#1f2937' : '#ffffff',
          borderWidth: 3,
          shadowBlur: 8,
          shadowColor: colorScheme.base + '40',
        },
        children: items.map((item, itemIndex) => ({
          name: item.content.substring(0, 35) + (item.content.length > 35 ? '...' : ''),
          value: item.metadata.tokens,
          itemId: item.id,
          itemType: type,
          itemStyle: {
            color: colorScheme.gradient[itemIndex % colorScheme.gradient.length],
            borderColor: isDarkMode ? '#374151' : '#f3f4f6',
            borderWidth: 1,
            shadowBlur: 4,
            shadowColor: colorScheme.base + '20',
          },
        })),
      };
    });

    return {
      name: `Context Map (${contextData.length} items)`,
      value: contextData.reduce((sum, item) => sum + item.metadata.tokens, 0),
      children,
      itemStyle: {
        color: isDarkMode ? '#1f2937' : '#f9fafb',
        borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
        borderWidth: 2,
      },
    };
  };

  // Handle context item deletion
  const handleDeleteContext = async (itemId: string) => {
    try {
      console.log(`Attempting to delete context item: ${itemId}`);

      // Optimistically update UI first for better UX
      const itemToDelete = contextData.find(item => item.id === itemId);
      if (!itemToDelete) {
        console.warn(`Context item ${itemId} not found in local state`);
        return;
      }

      // Remove from local state immediately
      setContextData(prev => {
        const filtered = prev.filter(item => item.id !== itemId);
        console.log(`Removed item from UI. Remaining items: ${filtered.length}`);
        return filtered;
      });

      // Force chart re-render
      setRefreshKey(prev => prev + 1);

      // Clear selection and modal
      setSelectedItem(null);
      setShowDeleteConfirm(false);

      // Try to delete from backend
      const response = await chrome.runtime.sendMessage({
        type: 'REMOVE_CONTEXT_ITEM',
        payload: { workspaceId, itemId },
      });

      if (response?.ok) {
        console.log(`Context item ${itemId} deleted successfully from backend`);
        onContextRemoved(); // Refresh parent component
      } else {
        console.error('Backend deletion failed:', response?.error);
        // If backend fails, we could revert the UI change here
        // But for now, we'll keep the optimistic update
      }
    } catch (error) {
      console.error('Error deleting context item:', error);
      // If there's an error, we could revert the UI change here
    }
  };

  // ECharts configuration
  const getChartOption = () => {
    const sunburstData = transformToSunburstData();

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.data.itemId) {
            const item = contextData.find(ctx => ctx.id === params.data.itemId);
            const TypeIcon = getTypeIcon(params.data.itemType);
            return `
              <div style="max-width: 320px; padding: 12px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <div style="margin-right: 8px; color: ${params.color};">●</div>
                  <strong style="color: ${isDarkMode ? '#f3f4f6' : '#1f2937'};">${params.data.name}</strong>
                </div>
                <div style="margin-bottom: 8px;">
                  <span style="color: #6b7280;">Type:</span> 
                  <span style="color: ${params.color}; font-weight: 500;">${params.data.itemType}</span>
                  <span style="margin-left: 12px; color: #6b7280;">Tokens:</span> 
                  <span style="color: ${isDarkMode ? '#f3f4f6' : '#1f2937'}; font-weight: 500;">${params.data.value}</span>
                </div>
                <div style="margin-bottom: 8px;">
                  <span style="color: #6b7280;">Source:</span> 
                  <span style="color: ${isDarkMode ? '#d1d5db' : '#4b5563'};">${item?.metadata.source || 'Unknown'}</span>
                </div>
                <div style="margin: 12px 0; padding: 10px; background: ${isDarkMode ? '#374151' : '#f3f4f6'}; border-radius: 6px; font-size: 12px; line-height: 1.4;">
                  ${item?.content.substring(0, 180)}${(item?.content?.length || 0) > 180 ? '...' : ''}
                </div>
                <div style="text-align: center; color: #ef4444; font-size: 11px; font-weight: 500;">
                  🗑️ Click to delete • Double-click for quick delete
                </div>
              </div>
            `;
          }
          return `
            <div style="padding: 8px;">
              <strong style="color: ${isDarkMode ? '#f3f4f6' : '#1f2937'};">${params.data.name}</strong><br/>
              <span style="color: #6b7280;">Total: ${params.data.value} tokens</span>
            </div>
          `;
        },
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
        borderWidth: 1,
        shadowBlur: 10,
        shadowColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
        textStyle: {
          color: isDarkMode ? '#f3f4f6' : '#1f2937',
        },
      },
      series: [
        {
          type: 'sunburst',
          data: [sunburstData],
          radius: [25, '88%'],
          center: ['50%', '50%'],
          sort: null,
          emphasis: {
            focus: 'ancestor',
            itemStyle: {
              shadowBlur: 15,
              shadowOffsetX: 0,
              shadowOffsetY: 0,
              shadowColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
            },
            label: {
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          blur: {
            itemStyle: {
              opacity: 0.2,
            },
            label: {
              opacity: 0.3,
            },
          },
          select: {
            itemStyle: {
              shadowBlur: 20,
              shadowColor: '#3b82f6',
            },
          },
          levels: [
            {
              // Root level
              itemStyle: {
                color: 'transparent',
                borderColor: isDarkMode ? '#4b5563' : '#d1d5db',
                borderWidth: 2,
              },
              label: {
                show: false,
              },
            },
            {
              // Type level (message, page, gmail, etc.)
              r0: '20%',
              r: '45%',
              itemStyle: {
                borderWidth: 4,
                borderColor: isDarkMode ? '#111827' : '#ffffff',
                shadowBlur: 6,
                shadowColor: 'rgba(0,0,0,0.1)',
              },
              label: {
                fontSize: 13,
                fontWeight: 'bold',
                rotate: 'tangential',
                color: isDarkMode ? '#ffffff' : '#000000',
                distance: 5,
              },
            },
            {
              // Individual context items level
              r0: '45%',
              r: '88%',
              label: {
                fontSize: 9,
                rotate: 'tangential',
                color: isDarkMode ? '#e5e7eb' : '#374151',
                distance: 3,
                overflow: 'truncate',
              },
              itemStyle: {
                borderWidth: 1,
                borderColor: isDarkMode ? '#374151' : '#f9fafb',
                shadowBlur: 3,
                shadowColor: 'rgba(0,0,0,0.05)',
              },
            },
          ],
          animationType: 'expansion',
          animationEasing: 'cubicOut',
          animationDuration: 1000,
          animationDelay: (idx: number) => idx * 50,
        },
      ],
    };
  };

  // Handle chart click events
  const handleChartClick = (params: any) => {
    if (params.data.itemId) {
      const item = contextData.find(ctx => ctx.id === params.data.itemId);
      if (item) {
        setSelectedItem(item);
        setShowDeleteConfirm(true);
      }
    }
  };

  // Handle drag and drop deletion
  const handleChartMouseDown = (params: any) => {
    if (params.data.itemId) {
      setDraggedItem(params.data.itemId);
    }
  };

  const handleChartMouseUp = () => {
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem) {
      handleDeleteContext(draggedItem);
      setDraggedItem(null);
    }
  };

  // Handle chart double-click for quick delete
  const handleChartDoubleClick = (params: any) => {
    if (params.data.itemId) {
      // Double-click should delete immediately without confirmation
      handleDeleteContext(params.data.itemId);
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="flex items-center justify-center space-x-2">
          <FiRefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading context visualization...</span>
        </div>
      </div>
    );
  }

  // Add sample context data for testing
  const addSampleContextData = async () => {
    try {
      const sampleItems = [
        {
          type: 'message',
          content: 'User discussion about implementing interactive context visualization with sunburst charts',
          metadata: {
            source: 'chat-session',
            priority: 5,
            sessionId: 'demo-session',
          },
        },
        {
          type: 'page',
          content: 'ECharts documentation for sunburst charts - comprehensive guide to interactive data visualization',
          metadata: {
            source: 'web-documentation',
            priority: 4,
            sessionId: 'demo-session',
          },
        },
        {
          type: 'memory',
          content: 'Previous implementation notes about context management system and user interface requirements',
          metadata: {
            source: 'memory-system',
            priority: 4,
            sessionId: 'demo-session',
          },
        },
        {
          type: 'gmail',
          content:
            'Email thread discussing project specifications and technical requirements for context visualization features',
          metadata: {
            source: 'gmail-integration',
            priority: 3,
            sessionId: 'demo-session',
          },
        },
        {
          type: 'file',
          content: 'TypeScript interface definitions and component structure for ContextSunburstChart implementation',
          metadata: {
            source: 'code-repository',
            priority: 3,
            sessionId: 'demo-session',
          },
        },
        {
          type: 'history',
          content: 'Browser history showing research on data visualization libraries and interactive chart components',
          metadata: {
            source: 'browser-history',
            priority: 2,
            sessionId: 'demo-session',
          },
        },
      ];

      for (const item of sampleItems) {
        await chrome.runtime.sendMessage({
          type: 'TEST_CONTEXT_WRITE',
          payload: {
            workspaceId,
            contextItem: item,
          },
        });
      }

      // Reload context data after adding samples
      await loadContextData();
    } catch (error) {
      console.error('Failed to add sample context data:', error);
    }
  };

  if (contextData.length === 0) {
    return (
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="text-center space-y-4">
          <FiInfo className="w-12 h-12 mx-auto text-gray-400" />
          <div>
            <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              No Context Data Available
            </p>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This workspace doesn't have any context items yet
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={addSampleContextData}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}>
              Add Sample Context Data
            </button>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              This will create sample context items to demonstrate the visualization
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Context Visualization
        </h3>
        <div className="flex items-center space-x-3">
          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {contextData.length} items • {contextData.reduce((sum, item) => sum + item.metadata.tokens, 0)} tokens
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={addSampleContextData}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              title="Add sample context data">
              Add Sample Data
            </button>
            <button
              onClick={() => {
                console.log('Current context data:', contextData);
                loadContextData();
              }}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              title="Refresh context data">
              <FiRefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Sunburst Chart */}
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="relative">
          <ReactECharts
            key={refreshKey}
            ref={chartRef}
            option={getChartOption()}
            style={{ height: '500px', width: '100%' }}
            onEvents={{
              click: handleChartClick,
              dblclick: handleChartDoubleClick,
              mousedown: handleChartMouseDown,
              mouseup: handleChartMouseUp,
            }}
            theme={isDarkMode ? 'dark' : 'light'}
            notMerge={true}
            lazyUpdate={false}
          />

          {/* Enhanced Drag & Drop Delete Zone */}
          <div
            className={`absolute top-4 right-4 p-4 rounded-xl border-2 border-dashed transition-all duration-300 ${
              draggedItem
                ? 'border-red-500 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 scale-110 shadow-lg'
                : 'border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/30 hover:scale-105'
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}>
            <div className="flex flex-col items-center space-y-2">
              <div
                className={`p-2 rounded-full transition-all ${
                  draggedItem
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                }`}>
                <FiTrash2 className="w-5 h-5" />
              </div>
              <p
                className={`text-xs font-medium text-center ${
                  draggedItem ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                }`}>
                {draggedItem ? 'Drop to Delete' : 'Delete Zone'}
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Legend with Icons */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(
            contextData.reduce(
              (acc, item) => {
                if (!acc[item.type]) {
                  acc[item.type] = [];
                }
                acc[item.type].push(item);
                return acc;
              },
              {} as Record<string, ContextItem[]>,
            ),
          ).map(([type, items]) => {
            const count = items.length;
            const tokens = items.reduce((sum, item) => sum + item.metadata.tokens, 0);

            // Get color and icon for this type
            const typeConfig = {
              message: { color: isDarkMode ? '#3b82f6' : '#2563eb', label: 'Messages', icon: FiUser },
              page: { color: isDarkMode ? '#10b981' : '#059669', label: 'Pages', icon: FiGlobe },
              gmail: { color: isDarkMode ? '#f59e0b' : '#d97706', label: 'Gmail', icon: FiMail },
              memory: { color: isDarkMode ? '#8b5cf6' : '#7c3aed', label: 'Memory', icon: FiDatabase },
              file: { color: isDarkMode ? '#ef4444' : '#dc2626', label: 'Files', icon: FiFile },
              history: { color: isDarkMode ? '#6b7280' : '#4b5563', label: 'History', icon: FiClock },
              email: { color: isDarkMode ? '#f59e0b' : '#d97706', label: 'Email', icon: FiMail },
              document: { color: isDarkMode ? '#10b981' : '#059669', label: 'Documents', icon: FiFile },
              chat: { color: isDarkMode ? '#3b82f6' : '#2563eb', label: 'Chat', icon: FiUser },
              web: { color: isDarkMode ? '#10b981' : '#059669', label: 'Web', icon: FiGlobe },
            };

            const config = typeConfig[type as keyof typeof typeConfig] || {
              color: isDarkMode ? '#6b7280' : '#4b5563',
              label: type.charAt(0).toUpperCase() + type.slice(1),
              icon: FiDatabase,
            };

            const IconComponent = config.icon;

            return (
              <div
                key={type}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all hover:scale-105 ${
                  isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-white/50 hover:bg-white'
                }`}
                style={{
                  borderLeft: `4px solid ${config.color}`,
                  boxShadow: `0 2px 8px ${config.color}20`,
                }}>
                <div className="p-2 rounded-lg" style={{ backgroundColor: config.color + '20' }}>
                  <IconComponent className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {config.label}
                  </div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {count} items • {tokens} tokens
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Instructions */}
        <div
          className={`mt-6 p-4 rounded-xl ${isDarkMode ? 'bg-gradient-to-r from-gray-700 to-gray-800' : 'bg-gradient-to-r from-gray-50 to-gray-100'}`}>
          <div className="flex items-center space-x-2 mb-3">
            <div className={`p-1 rounded-full ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-500/10'}`}>
              <FiInfo className="w-4 h-4 text-blue-500" />
            </div>
            <p className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Interaction Guide
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-600/50' : 'bg-white/50'}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">👆</span>
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Single Click
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Select and delete context items
              </p>
            </div>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-600/50' : 'bg-white/50'}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">👆👆</span>
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Double Click
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Quick delete without confirmation
              </p>
            </div>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-600/50' : 'bg-white/50'}`}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">🖱️</span>
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Hover</span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                View detailed content preview
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`p-6 rounded-lg max-w-md w-full mx-4 ${
              isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
            }`}>
            <div className="flex items-center space-x-3 mb-4">
              <FiTrash2 className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold">Delete Context Item</h3>
            </div>

            <div className="mb-4">
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                Are you sure you want to delete this context item?
              </p>
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>
                  Type: {selectedItem.type} • Tokens: {selectedItem.metadata.tokens}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {selectedItem.content.substring(0, 150)}
                  {selectedItem.content.length > 150 ? '...' : ''}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedItem(null);
                }}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}>
                Cancel
              </button>
              <button
                onClick={() => selectedItem && handleDeleteContext(selectedItem.id)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
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
