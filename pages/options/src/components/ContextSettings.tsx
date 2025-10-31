import React, { useState, useEffect } from 'react';
import { Button } from '@extension/ui';
import { FiGrid, FiSettings, FiMinimize2, FiEye, FiRefreshCw, FiInfo, FiBarChart2 } from 'react-icons/fi';
import {
  contextManager,
  type ContextStats,
  COMPRESSION_STRATEGIES,
  type CompressionStrategy,
} from '../services/ContextManager';
import { CompressionPreviewModal } from './CompressionPreviewModal';

interface ContextSettingsProps {
  isDarkMode: boolean;
}

export const ContextSettings: React.FC<ContextSettingsProps> = ({ isDarkMode }) => {
  const [contextStats, setContextStats] = useState<
    | (ContextStats & {
        currentTokens: number;
        estimatedCompressed: number;
        messages: { tokens: number };
        memories: { tokens: number };
        pages: { tokens: number };
        files: { tokens: number };
      })
    | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<CompressionStrategy>(COMPRESSION_STRATEGIES.balanced);
  const [showCompressionPreview, setShowCompressionPreview] = useState(false);
  const [tokenBudget, setTokenBudget] = useState(100000);

  // Mock workspace ID - in production this would come from workspace context
  const workspaceId = 'default-workspace';

  useEffect(() => {
    loadContextStats();
  }, []);

  const loadContextStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const stats = await contextManager.getContextStats(workspaceId);
      setContextStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load context stats');
    } finally {
      setLoading(false);
    }
  };

  const handleCompressionPreview = () => {
    setShowCompressionPreview(true);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getTokenUsageColor = (current: number, budget: number) => {
    const ratio = current / budget;
    if (ratio >= 0.9) return 'text-red-500';
    if (ratio >= 0.7) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getTokenUsageWidth = (current: number, budget: number) => {
    const ratio = Math.min(current / budget, 1);
    return `${ratio * 100}%`;
  };

  if (loading) {
    return (
      <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          <span className="ml-3">Loading context data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
        <Button onClick={loadContextStats} className="bg-teal-600 hover:bg-teal-700 text-white">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <FiGrid className="mr-3 text-teal-500" />
            Context Engineering
          </h2>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage context selection, compression, and token budget controls
          </p>
        </div>
        <Button onClick={loadContextStats} className="bg-teal-600 hover:bg-teal-700 text-white">
          <FiRefreshCw className="mr-2" />
          Refresh
        </Button>
      </div>

      {/* Context Engineering Pillars */}
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FiInfo className="mr-2 text-teal-500" />
          Four Pillars of Context Engineering
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border`}>
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <h4 className="font-medium">WRITE</h4>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Persist context items into workspace-scoped store with agent attribution
            </p>
          </div>
          <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border`}>
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <h4 className="font-medium">SELECT</h4>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Pull only relevant content under token budget with visual controls
            </p>
          </div>
          <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border`}>
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <h4 className="font-medium">COMPRESS</h4>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              User-controlled strategies with transparency and preview
            </p>
          </div>
          <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border`}>
            <div className="flex items-center mb-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
              <h4 className="font-medium">ISOLATE</h4>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Workspace-scoped snapshots with cross-workspace synthesis
            </p>
          </div>
        </div>
      </div>

      {/* Token Budget Controls */}
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FiBarChart2 className="mr-2 text-teal-500" />
          Token Budget Management
        </h3>

        {/* Token Budget Slider */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="font-medium">Token Budget</label>
            <span className="text-sm text-gray-500">{formatNumber(tokenBudget)} tokens</span>
          </div>
          <input
            type="range"
            min="10000"
            max="200000"
            step="5000"
            value={tokenBudget}
            onChange={e => setTokenBudget(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>10K</span>
            <span>50K</span>
            <span>100K</span>
            <span>150K</span>
            <span>200K</span>
          </div>
        </div>

        {/* Current Usage */}
        {contextStats && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Current Usage</span>
                <span className={`font-mono ${getTokenUsageColor(contextStats.currentTokens, tokenBudget)}`}>
                  {formatNumber(contextStats.currentTokens)} / {formatNumber(tokenBudget)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    contextStats.currentTokens / tokenBudget >= 0.9
                      ? 'bg-red-500'
                      : contextStats.currentTokens / tokenBudget >= 0.7
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: getTokenUsageWidth(contextStats.currentTokens, tokenBudget) }}></div>
              </div>
            </div>

            {/* Usage Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-3 rounded-lg text-center`}>
                <div className="text-lg font-bold text-blue-500">{formatNumber(contextStats.messages.tokens)}</div>
                <div className="text-xs text-gray-500">Messages</div>
              </div>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-3 rounded-lg text-center`}>
                <div className="text-lg font-bold text-green-500">{formatNumber(contextStats.memories.tokens)}</div>
                <div className="text-xs text-gray-500">Memories</div>
              </div>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-3 rounded-lg text-center`}>
                <div className="text-lg font-bold text-yellow-500">{formatNumber(contextStats.pages.tokens)}</div>
                <div className="text-xs text-gray-500">Pages</div>
              </div>
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-3 rounded-lg text-center`}>
                <div className="text-lg font-bold text-purple-500">{formatNumber(contextStats.files.tokens)}</div>
                <div className="text-xs text-gray-500">Files</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compression Controls */}
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FiMinimize2 className="mr-2 text-teal-500" />
          Compression Controls
        </h3>

        {/* Strategy Selection */}
        <div className="mb-6">
          <label className="block font-medium mb-3">Compression Strategy</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(COMPRESSION_STRATEGIES).map(strategy => (
              <div
                key={strategy.name}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedStrategy.name === strategy.name
                    ? `${isDarkMode ? 'bg-teal-800 border-teal-500' : 'bg-teal-50 border-teal-500'}`
                    : `${isDarkMode ? 'bg-slate-700 border-slate-600 hover:border-slate-500' : 'bg-white border-gray-200 hover:border-gray-300'}`
                }`}
                onClick={() => setSelectedStrategy(strategy)}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium capitalize">{strategy.name}</h4>
                  <span className="text-sm text-gray-500">{Math.round(strategy.targetRatio * 100)}%</span>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{strategy.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Compression Preview */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Compression Preview</h4>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Preview compression results before applying changes
            </p>
          </div>
          <Button
            onClick={handleCompressionPreview}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!contextStats || contextStats.totalItems === 0}>
            <FiEye className="mr-2" />
            Preview Compression
          </Button>
        </div>

        {/* Estimated Results */}
        {contextStats && (
          <div className={`mt-4 p-4 ${isDarkMode ? 'bg-slate-700' : 'bg-white'} rounded-lg border`}>
            <h5 className="font-medium mb-2">Estimated Results</h5>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Current Tokens:</span>
                <span className="ml-2 font-mono">{formatNumber(contextStats.currentTokens)}</span>
              </div>
              <div>
                <span className="text-gray-500">After Compression:</span>
                <span className="ml-2 font-mono text-green-500">
                  {formatNumber(Math.round(contextStats.currentTokens * selectedStrategy.targetRatio))}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Space Saved:</span>
                <span className="ml-2 font-mono text-blue-500">
                  {formatNumber(
                    contextStats.currentTokens - Math.round(contextStats.currentTokens * selectedStrategy.targetRatio),
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Compression Ratio:</span>
                <span className="ml-2 font-mono">{Math.round(selectedStrategy.targetRatio * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context Statistics */}
      {contextStats && (
        <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'} rounded-lg p-6`}>
          <h3 className="text-lg font-semibold mb-4">Context Statistics</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg text-center`}>
              <div className="text-2xl font-bold text-teal-500">{contextStats.totalItems}</div>
              <div className="text-sm text-gray-500">Total Items</div>
            </div>
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg text-center`}>
              <div className="text-2xl font-bold text-teal-500">{formatNumber(contextStats.totalTokens)}</div>
              <div className="text-sm text-gray-500">Total Tokens</div>
            </div>
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg text-center`}>
              <div className="text-2xl font-bold text-teal-500">
                {(contextStats.averageRelevance * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Avg Relevance</div>
            </div>
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg text-center`}>
              <div className="text-2xl font-bold text-teal-500">{Object.keys(contextStats.itemsByType).length}</div>
              <div className="text-sm text-gray-500">Context Types</div>
            </div>
          </div>

          {/* Items by Type */}
          <div className="space-y-2">
            <h4 className="font-medium">Items by Type</h4>
            {Object.entries(contextStats.itemsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="capitalize">{type}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{count} items</span>
                  <span className="text-sm text-gray-500">
                    ({formatNumber(contextStats.tokensByType[type] || 0)} tokens)
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Items by Agent */}
          {Object.keys(contextStats.itemsByAgent).length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium">Items by Agent</h4>
              {Object.entries(contextStats.itemsByAgent).map(([agent, count]) => (
                <div key={agent} className="flex items-center justify-between">
                  <span className="capitalize">{agent}</span>
                  <span className="text-sm text-gray-500">{count} items</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Compression Preview Modal */}
      {showCompressionPreview && (
        <CompressionPreviewModal
          workspaceId={workspaceId}
          strategy={selectedStrategy}
          targetTokens={Math.round((contextStats?.currentTokens || 0) * selectedStrategy.targetRatio)}
          isDarkMode={isDarkMode}
          onClose={() => setShowCompressionPreview(false)}
          onApply={() => {
            setShowCompressionPreview(false);
            loadContextStats(); // Refresh stats after compression
          }}
        />
      )}
    </div>
  );
};
