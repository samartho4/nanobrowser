import React, { useState, useEffect } from 'react';
import { workspaceManager, type WorkspaceInfo } from '@extension/storage';
import { FiPlus, FiActivity, FiEye } from 'react-icons/fi';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { WorkspaceDetailView } from './WorkspaceDetailView';

interface WorkspaceSettingsProps {
  isDarkMode: boolean;
}

export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({ isDarkMode }) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceInfo | null>(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeWorkspaces = async () => {
      if (mounted && !isLoadingWorkspaces) {
        await loadWorkspaces();
      }
    };

    initializeWorkspaces();

    return () => {
      mounted = false;
    };
  }, []);

  const loadWorkspaces = async () => {
    // Prevent multiple simultaneous loading calls
    if (isLoadingWorkspaces) {
      console.log('Already loading workspaces, skipping...');
      return;
    }

    try {
      setIsLoadingWorkspaces(true);
      setIsLoading(true);
      console.log('Loading workspaces...');

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Workspace loading timeout')), 10000),
      );

      const workspacePromise = workspaceManager.listWorkspaces();
      const workspaceList = (await Promise.race([workspacePromise, timeoutPromise])) as any;

      console.log('Workspaces loaded:', workspaceList);

      // If no workspaces exist, create a default one
      if (!workspaceList || workspaceList.length === 0) {
        console.log('No workspaces found, creating default workspace...');
        const defaultWorkspace: WorkspaceInfo = {
          id: 'default',
          name: 'Default Workspace',
          description: 'Default workspace for Shannon',
          color: '#10B981',
          autonomyLevel: 3,
          approvalPolicies: {
            gmail: true,
            calendar: true,
            web: false,
          },
          isActive: true,
          sessionCount: 0,
          lastActivity: Date.now(),
          currentRunId: undefined,
          currentSessionId: undefined,
        };
        setWorkspaces([defaultWorkspace]);
      } else {
        setWorkspaces(workspaceList);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      // Create a fallback default workspace
      const fallbackWorkspace: WorkspaceInfo = {
        id: 'default',
        name: 'Default Workspace',
        description: 'Default workspace for Shannon',
        color: '#10B981',
        autonomyLevel: 3,
        approvalPolicies: {
          gmail: true,
          calendar: true,
          web: false,
        },
        isActive: true,
        sessionCount: 0,
        lastActivity: Date.now(),
        currentRunId: undefined,
        currentSessionId: undefined,
      };
      setWorkspaces([fallbackWorkspace]);
    } finally {
      setIsLoading(false);
      setIsLoadingWorkspaces(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      await workspaceManager.deleteWorkspace(workspaceId);
      await loadWorkspaces();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  };

  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      await workspaceManager.switchWorkspace(workspaceId);
      await loadWorkspaces();
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const handleViewWorkspace = (workspace: WorkspaceInfo) => {
    setSelectedWorkspace(workspace);
  };

  const handleBackToList = () => {
    setSelectedWorkspace(null);
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

  // Show workspace detail view if a workspace is selected
  if (selectedWorkspace) {
    return (
      <WorkspaceDetailView
        workspace={selectedWorkspace}
        isDarkMode={isDarkMode}
        onBack={handleBackToList}
        onWorkspaceUpdated={loadWorkspaces}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <div
            className={`w-6 h-6 border-2 ${isDarkMode ? 'border-gray-400' : 'border-gray-600'} border-t-transparent rounded-full animate-spin`}
          />
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Loading workspaces...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Workspaces</h2>
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage workspaces, memory boundaries, and runID branching for Deep Agents
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            isDarkMode ? 'bg-teal-600 hover:bg-teal-500 text-white' : 'bg-teal-500 hover:bg-teal-600 text-white'
          }`}>
          <FiPlus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Workspace Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            className={`p-4 rounded-lg border transition-all ${
              workspace.isActive
                ? isDarkMode
                  ? 'border-teal-500 bg-teal-900/20'
                  : 'border-teal-400 bg-teal-50'
                : isDarkMode
                  ? 'border-gray-700 bg-gray-800/50'
                  : 'border-gray-200 bg-white/50'
            }`}>
            {/* Workspace Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: workspace.color }} />
                <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{workspace.name}</h3>
              </div>
              {workspace.isActive && (
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    isDarkMode ? 'bg-teal-800 text-teal-200' : 'bg-teal-100 text-teal-800'
                  }`}>
                  Active
                </span>
              )}
            </div>

            {/* Autonomy Badge */}
            <div className="flex items-center space-x-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${getAutonomyBadgeColor(workspace.autonomyLevel)}`} />
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {getAutonomyLabel(workspace.autonomyLevel)}
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`text-center p-2 rounded ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {workspace.sessionCount}
                </div>
                <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Sessions</div>
              </div>
              <div className={`text-center p-2 rounded ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {workspace.currentRunId ? workspace.currentRunId.slice(-6) : 'None'}
                </div>
                <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Run ID</div>
              </div>
            </div>

            {/* Approval Policies */}
            <div className="mt-3">
              <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Approval Policies
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(workspace.approvalPolicies).map(([tool, enabled]) => (
                  <span
                    key={tool}
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                      enabled
                        ? isDarkMode
                          ? 'bg-green-800 text-green-200'
                          : 'bg-green-100 text-green-800'
                        : isDarkMode
                          ? 'bg-red-800 text-red-200'
                          : 'bg-red-100 text-red-800'
                    }`}>
                    {tool}: {enabled ? 'On' : 'Off'}
                  </span>
                ))}
              </div>
            </div>

            {/* Last Activity */}
            <div className={`mt-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <FiActivity className="inline w-3 h-3 mr-1" />
              {formatLastActivity(workspace.lastActivity)}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleViewWorkspace(workspace);
                  }}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}>
                  <FiEye className="inline w-3 h-3 mr-1" />
                  View
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleSwitchWorkspace(workspace.id);
                  }}
                  disabled={workspace.isActive}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    workspace.isActive
                      ? isDarkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                      : isDarkMode
                        ? 'text-teal-400 hover:text-teal-300'
                        : 'text-teal-600 hover:text-teal-700'
                  }`}>
                  {workspace.isActive ? 'Active' : 'Switch'}
                </button>
              </div>

              {workspace.id !== 'default' && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    setShowDeleteConfirm(workspace.id);
                  }}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'
                  }`}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className={`p-6 rounded-lg max-w-md w-full mx-4 ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Delete Workspace
            </h3>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Are you sure you want to delete this workspace? This action cannot be undone and will remove all
              associated data.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-gray-600 hover:bg-gray-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}>
                Cancel
              </button>
              <button
                onClick={() => handleDeleteWorkspace(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onWorkspaceCreated={loadWorkspaces}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};
