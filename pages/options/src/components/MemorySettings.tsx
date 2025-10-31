import React, { useState, useEffect } from 'react';
import { Button } from '@extension/ui';
import { FiCpu, FiClock, FiDatabase, FiSettings, FiTrash2, FiDownload, FiUpload, FiInfo } from 'react-icons/fi';
import { memoryService, type MemoryStats, type PatternSummary } from '../services/MemoryService';

interface MemorySettingsProps {
  isDarkMode: boolean;
}

export const MemorySettings: React.FC<MemorySettingsProps> = ({ isDarkMode }) => {
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [patterns, setPatterns] = useState<PatternSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMemoryType, setSelectedMemoryType] = useState<'all' | 'episodic' | 'semantic' | 'procedural'>('all');

  // Mock workspace ID - in production this would come from workspace context
  const workspaceId = 'default-workspace';

  useEffect(() => {
    loadMemoryData();
  }, []);

  const loadMemoryData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [stats, patternList] = await Promise.all([
        memoryService.getMemoryStats(workspaceId),
        memoryService.listPatterns(workspaceId),
      ]);

      setMemoryStats(stats);
      setPatterns(patternList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memory data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearMemory = async (memoryType?: 'episodic' | 'semantic' | 'procedural') => {
    if (!confirm(`Are you sure you want to clear ${memoryType || 'all'} memory? This action cannot be undone.`)) {
      return;
    }

    try {
      await memoryService.clearMemory(workspaceId, memoryType);
      await loadMemoryData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear memory');
    }
  };

  const handleDeleteFact = async (factId: string) => {
    if (!confirm('Are you sure you want to delete this fact?')) {
      return;
    }

    try {
      await memoryService.deleteFact(workspaceId, factId);
      await loadMemoryData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fact');
    }
  };

  const handleExportPatterns = () => {
    if (patterns.length === 0) {
      alert('No patterns to export');
      return;
    }

    const dataStr = JSON.stringify(patterns, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `memory-patterns-${workspaceId}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`p-6 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
          <span className="ml-3">Loading memory data...</span>
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
        <Button onClick={loadMemoryData} className="bg-teal-600 hover:bg-teal-700 text-white">
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
            <FiCpu className="mr-3 text-teal-500" />
            Memory Management
          </h2>
          <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage Shannon's three-tier memory system for Deep Agents
          </p>
        </div>
        <Button onClick={loadMemoryData} className="bg-teal-600 hover:bg-teal-700 text-white">
          Refresh
        </Button>
      </div>

      {/* Memory Type Explanations */}
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FiInfo className="mr-2 text-teal-500" />
          Deep Agents Memory Model
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border`}>
            <div className="flex items-center mb-2">
              <FiClock className="mr-2 text-blue-500" />
              <h4 className="font-medium">Episodic Memory</h4>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Recent conversation steps and task execution patterns. Stores successful workflows as few-shot examples.
            </p>
          </div>
          <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border`}>
            <div className="flex items-center mb-2">
              <FiDatabase className="mr-2 text-green-500" />
              <h4 className="font-medium">Semantic Memory</h4>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Long-term facts and preferences with vector embeddings for semantic search and retrieval.
            </p>
          </div>
          <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border`}>
            <div className="flex items-center mb-2">
              <FiSettings className="mr-2 text-purple-500" />
              <h4 className="font-medium">Procedural Memory</h4>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Reusable workflow patterns and learned skills as templates for one-click invocation.
            </p>
          </div>
        </div>
      </div>

      {/* Memory Statistics */}
      {memoryStats && (
        <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'} rounded-lg p-6`}>
          <h3 className="text-lg font-semibold mb-4">Memory Statistics</h3>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg text-center`}>
              <div className="text-2xl font-bold text-teal-500">{memoryStats.overall.totalItems}</div>
              <div className="text-sm text-gray-500">Total Items</div>
            </div>
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg text-center`}>
              <div className="text-2xl font-bold text-teal-500">{memoryStats.overall.totalTokens.toLocaleString()}</div>
              <div className="text-sm text-gray-500">Total Tokens</div>
            </div>
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg text-center`}>
              <div className="text-2xl font-bold text-teal-500">
                {(memoryStats.overall.memoryEfficiency * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Efficiency</div>
            </div>
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg text-center`}>
              <div className="text-2xl font-bold text-teal-500">{formatBytes(memoryStats.overall.totalTokens * 4)}</div>
              <div className="text-sm text-gray-500">Est. Size</div>
            </div>
          </div>

          {/* Detailed Stats by Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Episodic Memory */}
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border`}>
              <h4 className="font-medium mb-3 flex items-center">
                <FiClock className="mr-2 text-blue-500" />
                Episodic Memory
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Episodes:</span>
                  <span>{memoryStats.episodic.totalEpisodes}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="text-green-500">
                    {memoryStats.episodic.totalEpisodes > 0
                      ? ((memoryStats.episodic.successfulEpisodes / memoryStats.episodic.totalEpisodes) * 100).toFixed(
                          1,
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Tokens:</span>
                  <span>{Math.round(memoryStats.episodic.averageTokensPerEpisode)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sessions:</span>
                  <span>{memoryStats.episodic.sessionCount}</span>
                </div>
              </div>
              <Button
                onClick={() => handleClearMemory('episodic')}
                className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white text-sm">
                <FiTrash2 className="mr-2" />
                Clear Episodic
              </Button>
            </div>

            {/* Semantic Memory */}
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border`}>
              <h4 className="font-medium mb-3 flex items-center">
                <FiDatabase className="mr-2 text-green-500" />
                Semantic Memory
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Facts:</span>
                  <span>{memoryStats.semantic.totalFacts}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Confidence:</span>
                  <span className="text-green-500">{(memoryStats.semantic.averageConfidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Categories:</span>
                  <span>{Object.keys(memoryStats.semantic.categoryCounts).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Oldest:</span>
                  <span>{formatDate(memoryStats.semantic.oldestFact)}</span>
                </div>
              </div>
              <Button
                onClick={() => handleClearMemory('semantic')}
                className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white text-sm">
                <FiTrash2 className="mr-2" />
                Clear Semantic
              </Button>
            </div>

            {/* Procedural Memory */}
            <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border`}>
              <h4 className="font-medium mb-3 flex items-center">
                <FiSettings className="mr-2 text-purple-500" />
                Procedural Memory
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Patterns:</span>
                  <span>{memoryStats.procedural.totalPatterns}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Success:</span>
                  <span className="text-green-500">
                    {(memoryStats.procedural.averageSuccessRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Categories:</span>
                  <span>{Object.keys(memoryStats.procedural.categoryCounts).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Oldest:</span>
                  <span>{formatDate(memoryStats.procedural.oldestPattern)}</span>
                </div>
              </div>
              <Button
                onClick={() => handleClearMemory('procedural')}
                className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white text-sm">
                <FiTrash2 className="mr-2" />
                Clear Procedural
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Patterns */}
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'} rounded-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Workflow Patterns</h3>
          <div className="flex space-x-2">
            <Button
              onClick={handleExportPatterns}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
              disabled={patterns.length === 0}>
              <FiDownload className="mr-2" />
              Export
            </Button>
            <Button
              onClick={() => document.getElementById('import-patterns')?.click()}
              className="bg-green-600 hover:bg-green-700 text-white text-sm">
              <FiUpload className="mr-2" />
              Import
            </Button>
          </div>
        </div>

        {patterns.length === 0 ? (
          <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <FiSettings className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No workflow patterns learned yet</p>
            <p className="text-sm">Patterns will appear as Shannon learns from successful task executions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {patterns.slice(0, 10).map(pattern => (
              <div
                key={pattern.id}
                className={`${isDarkMode ? 'bg-slate-700' : 'bg-white'} p-4 rounded-lg border flex items-center justify-between`}>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <h4 className="font-medium">{pattern.name}</h4>
                    {pattern.category && (
                      <span className="ml-2 px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded">
                        {pattern.category}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
                    {pattern.description}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Success: {(pattern.successRate * 100).toFixed(1)}%</span>
                    <span>Used: {pattern.usageCount} times</span>
                    <span>Last: {formatDate(pattern.lastUsed)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => {
                      /* TODO: Implement pattern invocation */
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-3 py-1">
                    Use
                  </Button>
                  <Button
                    onClick={() => handleDeleteFact(pattern.id)}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1">
                    <FiTrash2 />
                  </Button>
                </div>
              </div>
            ))}
            {patterns.length > 10 && (
              <div className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Showing 10 of {patterns.length} patterns
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cleanup Controls */}
      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'} rounded-lg p-6`}>
        <h3 className="text-lg font-semibold mb-4 text-red-600">Danger Zone</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Clear All Memory</h4>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Permanently delete all episodic, semantic, and procedural memory
              </p>
            </div>
            <Button onClick={() => handleClearMemory()} className="bg-red-600 hover:bg-red-700 text-white">
              <FiTrash2 className="mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden file input for pattern import */}
      <input
        id="import-patterns"
        type="file"
        accept=".json"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = event => {
              try {
                const patterns = JSON.parse(event.target?.result as string);
                console.log('Imported patterns:', patterns);
                // TODO: Implement pattern import
                alert('Pattern import functionality coming soon');
              } catch (err) {
                alert('Invalid JSON file');
              }
            };
            reader.readAsText(file);
          }
        }}
      />
    </div>
  );
};
