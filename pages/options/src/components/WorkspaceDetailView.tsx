import React, { useState, useEffect } from 'react';
import {
  FiArrowLeft,
  FiDatabase,
  FiClock,
  FiCpu,
  FiTrash2,
  FiSettings,
  FiActivity,
  FiRefreshCw,
  FiMail,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiTool,
  FiChevronDown,
  FiChevronRight,
} from 'react-icons/fi';
import { workspaceManager, type WorkspaceInfo } from '@extension/storage';
import { GmailIntegrationDebugger } from './GmailIntegrationDebugger';
import ContextSunburstChart from './ContextSunburstChart';
import ContextCompressionControls from './ContextCompressionControls';

interface MemoryStats {
  totalItems: number;
  totalTokens: number;
  efficiency: number;
  estimatedSize: string;
  episodic: {
    episodes: number;
    successRate: number;
    avgTokens: number;
    sessions: number;
  };
  semantic: {
    facts: number;
    avgConfidence: number;
    categories: number;
    oldest: string;
  };
  procedural: {
    patterns: number;
    avgSuccess: number;
    categories: number;
    oldest: string;
  };
  lastUpdated: number;
  gmailIntegration: {
    enabled: boolean;
    lastSync: number;
    totalEmailsProcessed: number;
    syncStatus: 'idle' | 'syncing' | 'error';
  };
}

interface WorkspaceDetailViewProps {
  workspace: WorkspaceInfo;
  isDarkMode: boolean;
  onBack: () => void;
  onWorkspaceUpdated: () => void;
}

export const WorkspaceDetailView: React.FC<WorkspaceDetailViewProps> = ({
  workspace,
  isDarkMode,
  onBack,
  onWorkspaceUpdated,
}) => {
  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    totalItems: 0,
    totalTokens: 0,
    efficiency: 0.0,
    estimatedSize: '0 B',
    episodic: {
      episodes: 0,
      successRate: 0,
      avgTokens: 0,
      sessions: 0,
    },
    semantic: {
      facts: 0,
      avgConfidence: 0.0,
      categories: 0,
      oldest: 'Never',
    },
    procedural: {
      patterns: 0,
      avgSuccess: 0.0,
      categories: 0,
      oldest: 'Never',
    },
    lastUpdated: 0,
    gmailIntegration: {
      enabled: false,
      lastSync: 0,
      totalEmailsProcessed: 0,
      syncStatus: 'idle',
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showDebugger, setShowDebugger] = useState(false);
  const [emailsByType, setEmailsByType] = useState<{
    episodic: any[];
    semantic: any[];
    procedural: any[];
  }>({
    episodic: [],
    semantic: [],
    procedural: [],
  });
  const [expandedMemoryType, setExpandedMemoryType] = useState<'episodic' | 'semantic' | 'procedural' | null>(null);
  const [loadingEmails, setLoadingEmails] = useState<string | null>(null);

  useEffect(() => {
    loadMemoryStats();
  }, [workspace.id]);

  const loadMemoryStats = async () => {
    try {
      setIsLoading(true);
      setSyncError(null);

      console.log('Loading memory stats for workspace:', workspace.id);

      // Start the memory stats task
      const response = await chrome.runtime.sendMessage({
        type: 'GET_WORKSPACE_MEMORY_STATS',
        payload: { workspaceId: workspace.id },
      });

      console.log('Memory stats response:', response);

      if (response && response.success && response.taskId) {
        // Poll for task completion
        const result = await pollTaskCompletion(response.taskId);
        if (result) {
          setMemoryStats(result);
        } else {
          throw new Error('Task completed but no result received');
        }
      } else {
        throw new Error(response?.error || 'Failed to start memory stats task');
      }
    } catch (error) {
      console.error('Failed to load memory stats:', error);
      setSyncError(error instanceof Error ? error.message : 'Failed to load memory statistics');

      // Set fallback stats on error
      const fallbackStats: MemoryStats = {
        totalItems: 0,
        totalTokens: 0,
        efficiency: 0,
        estimatedSize: '0 B',
        episodic: { episodes: 0, successRate: 0, avgTokens: 0, sessions: 0 },
        semantic: { facts: 0, avgConfidence: 0, categories: 0, oldest: 'Never' },
        procedural: { patterns: 0, avgSuccess: 0, categories: 0, oldest: 'Never' },
        lastUpdated: Date.now(),
        gmailIntegration: { enabled: false, lastSync: 0, totalEmailsProcessed: 0, syncStatus: 'idle' },
      };
      setMemoryStats(fallbackStats);
    } finally {
      setIsLoading(false);
    }
  };

  const pollTaskCompletion = async (taskId: string): Promise<MemoryStats | null> => {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;

    setLoadingMessage('Initializing Gmail memory analysis...');
    setLoadingProgress(0);

    while (attempts < maxAttempts) {
      try {
        const taskResponse = await chrome.runtime.sendMessage({
          type: 'GET_TASK_STATUS',
          payload: { taskId },
        });

        if (taskResponse && taskResponse.success) {
          const task = taskResponse.task;

          console.log(`Task ${taskId} status: ${task.status} (${task.progress}%)`);

          // Update progress and message
          setLoadingProgress(task.progress);

          if (task.progress < 10) {
            setLoadingMessage('Authenticating with Gmail...');
          } else if (task.progress < 30) {
            setLoadingMessage('Fetching emails from Gmail API...');
          } else if (task.progress < 80) {
            setLoadingMessage('Analyzing emails with AI...');
          } else if (task.progress < 90) {
            setLoadingMessage('Categorizing into memory types...');
          } else {
            setLoadingMessage('Finalizing results...');
          }

          if (task.status === 'completed') {
            setLoadingMessage('Complete!');
            setLoadingProgress(100);
            return task.result;
          } else if (task.status === 'failed') {
            throw new Error(task.error || 'Task failed');
          }
          // Still running, continue polling
        } else {
          throw new Error('Failed to get task status');
        }

        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        console.error('Error polling task:', error);
        throw error;
      }
    }

    throw new Error('Task timeout - operation took too long');
  };

  const handleClearMemory = async (type: 'episodic' | 'semantic' | 'procedural') => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CLEAR_WORKSPACE_MEMORY',
        payload: { workspaceId: workspace.id, memoryType: type },
      });

      if (response.success) {
        await loadMemoryStats(); // Reload stats
      } else {
        console.error(`Failed to clear ${type} memory:`, response.error);
        setSyncError(`Failed to clear ${type} memory: ${response.error}`);
      }
    } catch (error) {
      console.error(`Failed to clear ${type} memory:`, error);
      setSyncError(`Failed to clear ${type} memory`);
    }
  };

  const handleSyncGmail = async () => {
    try {
      setIsSyncing(true);
      setSyncError(null);

      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_GMAIL_MEMORY',
        payload: {
          workspaceId: workspace.id,
          maxMessages: 50,
          daysBack: 7,
          forceRefresh: true,
        },
      });

      if (response.success) {
        await loadMemoryStats(); // Reload stats to show updated data
      } else {
        setSyncError(`Gmail sync failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Failed to sync Gmail:', error);
      setSyncError('Failed to sync Gmail data');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAuthenticateGmail = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AUTHENTICATE_GMAIL',
      });

      if (response.success) {
        await loadMemoryStats(); // Reload to show updated auth status
      } else {
        setSyncError(`Gmail authentication failed: ${response.error}`);
      }
    } catch (error) {
      console.error('Failed to authenticate Gmail:', error);
      setSyncError('Failed to authenticate with Gmail');
    }
  };

  const handleToggleEmailView = async (memoryType: 'episodic' | 'semantic' | 'procedural') => {
    if (expandedMemoryType === memoryType) {
      setExpandedMemoryType(null);
      return;
    }

    try {
      setLoadingEmails(memoryType);
      setExpandedMemoryType(memoryType);

      const response = await chrome.runtime.sendMessage({
        type: 'GET_EMAILS_BY_MEMORY_TYPE',
        payload: {
          workspaceId: workspace.id,
          memoryType,
        },
      });

      if (response.success && response.taskId) {
        // Poll for task completion
        const result = await pollEmailTaskCompletion(response.taskId);
        if (result && Array.isArray(result)) {
          setEmailsByType(prev => ({
            ...prev,
            [memoryType]: result,
          }));
        } else {
          // Set empty array as fallback
          setEmailsByType(prev => ({
            ...prev,
            [memoryType]: [],
          }));
        }
      } else {
        throw new Error(response?.error || `Failed to start ${memoryType} email fetch task`);
      }
    } catch (error) {
      console.error(`Failed to load ${memoryType} emails:`, error);
      setSyncError(`Failed to load ${memoryType} emails: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Set empty array as fallback to prevent undefined errors
      setEmailsByType(prev => ({
        ...prev,
        [memoryType]: [],
      }));
    } finally {
      setLoadingEmails(null);
    }
  };

  const pollEmailTaskCompletion = async (taskId: string): Promise<any[] | null> => {
    const maxAttempts = 30; // 2.5 minutes max (5 second intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const taskResponse = await chrome.runtime.sendMessage({
          type: 'GET_TASK_STATUS',
          payload: { taskId },
        });

        if (taskResponse && taskResponse.success) {
          const task = taskResponse.task;

          console.log(`Email task ${taskId} status: ${task.status} (${task.progress}%)`);

          if (task.status === 'completed') {
            return task.result || [];
          } else if (task.status === 'failed') {
            throw new Error(task.error || 'Email fetch task failed');
          }
          // Still running, continue polling
        } else {
          throw new Error('Failed to get email task status');
        }

        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        console.error('Error polling email task:', error);
        throw error;
      }
    }

    throw new Error('Email fetch timeout - operation took too long');
  };

  const getAutonomyBadgeColor = (level: number): string => {
    switch (level) {
      case 1:
      case 2:
        return isDarkMode ? 'bg-yellow-600' : 'bg-yellow-500';
      case 3:
      case 4:
        return isDarkMode ? 'bg-teal-600' : 'bg-teal-500';
      case 5:
        return isDarkMode ? 'bg-green-600' : 'bg-green-500';
      default:
        return isDarkMode ? 'bg-gray-600' : 'bg-gray-500';
    }
  };

  const getAutonomyLabel = (level: number): string => {
    switch (level) {
      case 1:
      case 2:
        return 'Ask First';
      case 3:
      case 4:
        return 'Balanced';
      case 5:
        return 'Autonomous';
      default:
        return 'Unknown';
    }
  };

  const formatLastActivity = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="flex items-center space-x-2">
          <div
            className={`w-6 h-6 border-2 ${isDarkMode ? 'border-gray-400' : 'border-gray-600'} border-t-transparent rounded-full animate-spin`}
          />
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Loading workspace details...</span>
        </div>

        {loadingProgress > 0 && (
          <div className="w-full max-w-md space-y-2">
            <div className={`w-full bg-gray-200 rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className={`text-sm text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {loadingMessage} ({loadingProgress}%)
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode
              ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}>
          <FiArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: workspace.color }} />
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{workspace.name}</h2>
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getAutonomyBadgeColor(workspace.autonomyLevel)}`} />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {getAutonomyLabel(workspace.autonomyLevel)}
                </span>
              </div>
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <FiActivity className="inline w-3 h-3 mr-1" />
                {formatLastActivity(workspace.lastActivity)}
              </span>
              {workspace.isActive && (
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isDarkMode ? 'bg-teal-800 text-teal-200' : 'bg-teal-100 text-teal-800'
                  }`}>
                  Active
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Memory Statistics Header */}
      <div className="text-center">
        <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Memory Statistics</h3>
      </div>

      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div className={`text-3xl font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>
            {memoryStats.totalItems}
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Items</div>
        </div>
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div className={`text-3xl font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>
            {memoryStats.totalTokens}
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Tokens</div>
        </div>
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div className={`text-3xl font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>
            {memoryStats.efficiency.toFixed(1)}%
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Efficiency</div>
        </div>
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div className={`text-3xl font-bold ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>
            {memoryStats.estimatedSize}
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Est. Size</div>
        </div>
      </div>

      {/* Gmail Integration Status */}
      <div
        className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FiMail className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Gmail Integration
            </h4>
            <div
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                memoryStats.gmailIntegration.enabled
                  ? isDarkMode
                    ? 'bg-green-800 text-green-200'
                    : 'bg-green-100 text-green-800'
                  : isDarkMode
                    ? 'bg-red-800 text-red-200'
                    : 'bg-red-100 text-red-800'
              }`}>
              {memoryStats.gmailIntegration.enabled ? (
                <>
                  <FiCheck className="w-3 h-3" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <FiX className="w-3 h-3" />
                  <span>Disconnected</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDebugger(!showDebugger)}
              className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                showDebugger
                  ? isDarkMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}>
              <FiTool className="w-3 h-3" />
              <span>{showDebugger ? 'Hide Debug' : 'Debug'}</span>
            </button>

            {memoryStats.gmailIntegration.enabled && (
              <button
                onClick={handleSyncGmail}
                disabled={isSyncing || memoryStats.gmailIntegration.syncStatus === 'syncing'}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                  isSyncing || memoryStats.gmailIntegration.syncStatus === 'syncing'
                    ? isDarkMode
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-200 text-gray-500'
                    : isDarkMode
                      ? 'bg-teal-600 hover:bg-teal-500 text-white'
                      : 'bg-teal-500 hover:bg-teal-600 text-white'
                }`}>
                <FiRefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            )}

            {!memoryStats.gmailIntegration.enabled && (
              <button
                onClick={handleAuthenticateGmail}
                className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                  isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}>
                <FiMail className="w-3 h-3" />
                <span>Connect Gmail</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Last Sync:</span>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              {memoryStats.gmailIntegration.lastSync > 0
                ? new Date(memoryStats.gmailIntegration.lastSync).toLocaleString()
                : 'Never'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Emails Processed:</span>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              {memoryStats.gmailIntegration.totalEmailsProcessed.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Status:</span>
            <span
              className={`flex items-center space-x-1 ${
                memoryStats.gmailIntegration.syncStatus === 'syncing'
                  ? isDarkMode
                    ? 'text-yellow-400'
                    : 'text-yellow-600'
                  : memoryStats.gmailIntegration.syncStatus === 'error'
                    ? isDarkMode
                      ? 'text-red-400'
                      : 'text-red-600'
                    : isDarkMode
                      ? 'text-green-400'
                      : 'text-green-600'
              }`}>
              {memoryStats.gmailIntegration.syncStatus === 'syncing' && (
                <FiRefreshCw className="w-3 h-3 animate-spin" />
              )}
              {memoryStats.gmailIntegration.syncStatus === 'error' && <FiAlertCircle className="w-3 h-3" />}
              {memoryStats.gmailIntegration.syncStatus === 'idle' && <FiCheck className="w-3 h-3" />}
              <span className="capitalize">{memoryStats.gmailIntegration.syncStatus}</span>
            </span>
          </div>
        </div>

        {syncError && (
          <div
            className={`mt-3 p-2 rounded-lg ${isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center space-x-2">
              <FiAlertCircle className={`w-4 h-4 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
              <span className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>{syncError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel */}
      {showDebugger && <GmailIntegrationDebugger workspaceId={workspace.id} isDarkMode={isDarkMode} />}

      {/* Context Visualization */}
      <ContextSunburstChart
        workspaceId={workspace.id}
        isDarkMode={isDarkMode}
        onContextRemoved={() => {
          // Refresh memory stats when context is removed
          loadMemoryStats();
        }}
      />

      {/* Context Compression Controls */}
      <ContextCompressionControls
        workspaceId={workspace.id}
        isDarkMode={isDarkMode}
        contextItemCount={memoryStats.episodic.episodes + memoryStats.semantic.facts + memoryStats.procedural.patterns}
        totalTokens={memoryStats.totalTokens}
        onCompressionComplete={() => {
          // Refresh memory stats and context visualization after compression
          loadMemoryStats();
        }}
      />

      {/* Memory Type Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Episodic Memory */}
        <div
          className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FiClock className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Episodic Memory
              </h4>
            </div>
            <button
              onClick={() => handleToggleEmailView('episodic')}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                loadingEmails === 'episodic' ? 'animate-spin' : ''
              }`}
              disabled={loadingEmails === 'episodic'}>
              {expandedMemoryType === 'episodic' ? (
                <FiChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              ) : (
                <FiChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Episodes:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {memoryStats.episodic.episodes}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Success Rate:</span>
              <span className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                {memoryStats.episodic.successRate.toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Avg Tokens:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {memoryStats.episodic.avgTokens}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Sessions:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {memoryStats.episodic.sessions}
              </span>
            </div>
          </div>

          {/* Email Content Dropdown */}
          {expandedMemoryType === 'episodic' && (
            <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h5 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Recent Email Interactions ({emailsByType.episodic?.length || 0})
              </h5>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {emailsByType.episodic?.length > 0 ? (
                  emailsByType.episodic?.map((email, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between mb-1">
                        <h6
                          className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate flex-1 mr-2`}>
                          {email.subject || 'No Subject'}
                        </h6>
                        <span
                          className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                            email.priority === 'urgent'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : email.priority === 'important'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                          {email.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} truncate flex-1 mr-2`}>
                          From: {email.from || 'Unknown'}
                        </p>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`}>
                          {email.timestamp ? new Date(email.timestamp).toLocaleDateString() : 'No Date'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center py-4`}>
                    No episodic emails found
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => handleClearMemory('episodic')}
            className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-center space-x-2">
            <FiTrash2 className="w-4 h-4" />
            <span>Clear Episodic</span>
          </button>
        </div>

        {/* Semantic Memory */}
        <div
          className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FiDatabase className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Semantic Memory
              </h4>
            </div>
            <button
              onClick={() => handleToggleEmailView('semantic')}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                loadingEmails === 'semantic' ? 'animate-spin' : ''
              }`}
              disabled={loadingEmails === 'semantic'}>
              {expandedMemoryType === 'semantic' ? (
                <FiChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              ) : (
                <FiChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Facts:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {memoryStats.semantic.facts}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Avg Confidence:</span>
              <span className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                {memoryStats.semantic.avgConfidence.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Categories:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {memoryStats.semantic.categories}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Oldest:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {memoryStats.semantic.oldest}
              </span>
            </div>
          </div>

          {/* Email Content Dropdown */}
          {expandedMemoryType === 'semantic' && (
            <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h5 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Long-term Facts & Preferences ({emailsByType.semantic?.length || 0})
              </h5>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {emailsByType.semantic?.length > 0 ? (
                  emailsByType.semantic?.map((email, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between mb-1">
                        <h6
                          className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate flex-1 mr-2`}>
                          {email.subject || 'No Subject'}
                        </h6>
                        <span
                          className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                            email.sentiment === 'positive'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : email.sentiment === 'negative'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                          {email.sentiment}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} truncate flex-1 mr-2`}>
                          From: {email.from || 'Unknown'}
                        </p>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`}>
                          {email.timestamp ? new Date(email.timestamp).toLocaleDateString() : 'No Date'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center py-4`}>
                    No semantic emails found
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => handleClearMemory('semantic')}
            className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-center space-x-2">
            <FiTrash2 className="w-4 h-4" />
            <span>Clear Semantic</span>
          </button>
        </div>

        {/* Procedural Memory */}
        <div
          className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FiCpu className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Procedural Memory
              </h4>
            </div>
            <button
              onClick={() => handleToggleEmailView('procedural')}
              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                loadingEmails === 'procedural' ? 'animate-spin' : ''
              }`}
              disabled={loadingEmails === 'procedural'}>
              {expandedMemoryType === 'procedural' ? (
                <FiChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              ) : (
                <FiChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              )}
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Patterns:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {memoryStats.procedural.patterns}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Avg Success:</span>
              <span className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                {memoryStats.procedural.avgSuccess.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Categories:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {memoryStats.procedural.categories}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Oldest:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {memoryStats.procedural.oldest}
              </span>
            </div>
          </div>

          {/* Email Content Dropdown */}
          {expandedMemoryType === 'procedural' && (
            <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h5 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Workflow Patterns & Processes ({emailsByType.procedural?.length || 0})
              </h5>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {emailsByType.procedural?.length > 0 ? (
                  emailsByType.procedural?.map((email, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-start justify-between mb-1">
                        <h6
                          className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate flex-1 mr-2`}>
                          {email.subject || 'No Subject'}
                        </h6>
                        <span
                          className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                            email.actionRequired
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                          {email.actionRequired ? 'Action' : 'Info'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} truncate flex-1 mr-2`}>
                          From: {email.from || 'Unknown'}
                        </p>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`}>
                          {email.timestamp ? new Date(email.timestamp).toLocaleDateString() : 'No Date'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center py-4`}>
                    No procedural emails found
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => handleClearMemory('procedural')}
            className="w-full mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-center space-x-2">
            <FiTrash2 className="w-4 h-4" />
            <span>Clear Procedural</span>
          </button>
        </div>
      </div>

      {/* Workspace Settings */}
      <div
        className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center space-x-2 mb-4">
          <FiSettings className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          <h4 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Workspace Configuration
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Basic Information</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>ID:</span>
                <span className={`font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{workspace.id}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Sessions:</span>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{workspace.sessionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Current Run ID:</span>
                <span className={`font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {workspace.currentRunId ? workspace.currentRunId.slice(-8) : 'None'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Approval Policies</h5>
            <div className="space-y-2">
              {Object.entries(workspace.approvalPolicies).map(([tool, enabled]) => (
                <div key={tool} className="flex justify-between items-center">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{tool}:</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      enabled
                        ? isDarkMode
                          ? 'bg-green-800 text-green-200'
                          : 'bg-green-100 text-green-800'
                        : isDarkMode
                          ? 'bg-red-800 text-red-200'
                          : 'bg-red-100 text-red-800'
                    }`}>
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
