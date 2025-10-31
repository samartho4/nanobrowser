import React, { useState, useEffect } from 'react';
import { workspaceManager, type WorkspaceInfo } from '@extension/storage';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';

interface WorkspaceSwitcherProps {
  onWorkspaceChange?: (workspaceId: string) => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ onWorkspaceChange }) => {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setIsLoading(true);
      const workspaceList = await workspaceManager.listWorkspaces();
      setWorkspaces(workspaceList);

      const active = workspaceList.find(w => w.isActive);
      setActiveWorkspace(active || null);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    try {
      await workspaceManager.switchWorkspace(workspaceId);
      await loadWorkspaces(); // Refresh the list
      setIsOpen(false);
      onWorkspaceChange?.(workspaceId);
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const getAutonomyBadgeColor = (level: number): string => {
    switch (level) {
      case 1:
      case 2:
        return 'bg-yellow-500'; // Ask First
      case 3:
      case 4:
        return 'bg-teal-500'; // Balanced
      case 5:
        return 'bg-green-500'; // Auto
      default:
        return 'bg-gray-500';
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
        return 'Auto';
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
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-800 rounded-lg">
        <div className="w-3 h-3 bg-gray-600 rounded-full animate-pulse"></div>
        <span className="text-gray-400 text-sm">Loading workspaces...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Current Workspace Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
        <div className="flex items-center space-x-3">
          {/* Workspace Color Indicator */}
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeWorkspace?.color || '#3B82F6' }}></div>

          {/* Workspace Info */}
          <div className="flex flex-col items-start">
            <span className="text-white text-sm font-medium">{activeWorkspace?.name || 'Default Workspace'}</span>
            <div className="flex items-center space-x-2">
              {/* Autonomy Badge */}
              <div className="flex items-center space-x-1">
                <div
                  className={`w-2 h-2 rounded-full ${getAutonomyBadgeColor(activeWorkspace?.autonomyLevel || 3)}`}></div>
                <span className="text-xs text-gray-400">{getAutonomyLabel(activeWorkspace?.autonomyLevel || 3)}</span>
              </div>

              {/* Run ID Indicator */}
              {activeWorkspace?.currentRunId && (
                <span className="text-xs text-teal-400 font-mono">Run: {activeWorkspace.currentRunId.slice(-6)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {workspaces.map(workspace => (
            <button
              key={workspace.id}
              onClick={() => handleWorkspaceSwitch(workspace.id)}
              className={`w-full px-3 py-3 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0 ${
                workspace.isActive ? 'bg-gray-700' : ''
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Workspace Color */}
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: workspace.color }}></div>

                  {/* Workspace Details */}
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">{workspace.name}</span>
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <span>{workspace.sessionCount} sessions</span>
                      <span>•</span>
                      <span>{formatLastActivity(workspace.lastActivity)}</span>
                    </div>
                  </div>
                </div>

                {/* Status Indicators */}
                <div className="flex flex-col items-end space-y-1">
                  {/* Autonomy Badge */}
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${getAutonomyBadgeColor(workspace.autonomyLevel)}`}></div>
                    <span className="text-xs text-gray-400">{getAutonomyLabel(workspace.autonomyLevel)}</span>
                  </div>

                  {/* Current Run ID */}
                  {workspace.currentRunId && (
                    <span className="text-xs text-teal-400 font-mono">{workspace.currentRunId.slice(-6)}</span>
                  )}

                  {/* Active Indicator */}
                  {workspace.isActive && <span className="text-xs text-teal-400 font-medium">Active</span>}
                </div>
              </div>
            </button>
          ))}

          {/* Create New Workspace Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              setShowCreateModal(true);
            }}
            className="w-full px-3 py-3 text-left hover:bg-gray-700 transition-colors border-t border-gray-600 text-teal-400">
            <div className="flex items-center space-x-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm font-medium">Create New Workspace</span>
            </div>
          </button>
        </div>
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onWorkspaceCreated={async workspaceId => {
          await workspaceManager.switchWorkspace(workspaceId);
          await loadWorkspaces();
          onWorkspaceChange?.(workspaceId);
        }}
      />
    </div>
  );
};
