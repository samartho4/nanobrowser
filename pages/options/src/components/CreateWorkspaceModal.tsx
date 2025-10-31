import React, { useState } from 'react';
import { workspaceManager } from '@extension/storage';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceCreated: () => void;
  isDarkMode: boolean;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onWorkspaceCreated,
  isDarkMode,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [autonomyLevel, setAutonomyLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [color, setColor] = useState('#3B82F6');
  const [isCreating, setIsCreating] = useState(false);

  const colors = [
    { value: '#3B82F6', name: 'Blue' },
    { value: '#10B981', name: 'Green' },
    { value: '#F59E0B', name: 'Yellow' },
    { value: '#EF4444', name: 'Red' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#06B6D4', name: 'Cyan' },
    { value: '#F97316', name: 'Orange' },
    { value: '#84CC16', name: 'Lime' },
  ];

  const autonomyLevels = [
    { value: 1, label: 'Ask First', description: 'Always ask before any action', color: 'text-yellow-400' },
    { value: 2, label: 'Cautious', description: 'Ask for most actions', color: 'text-yellow-400' },
    { value: 3, label: 'Balanced', description: 'Ask for sensitive actions', color: 'text-teal-400' },
    { value: 4, label: 'Confident', description: 'Act unless risky', color: 'text-teal-400' },
    { value: 5, label: 'Autonomous', description: 'Act independently', color: 'text-green-400' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsCreating(true);
      await workspaceManager.createWorkspace(name.trim(), {
        description: description.trim(),
        autonomyLevel,
        color,
        approvalPolicies: {
          gmail: autonomyLevel <= 3,
          calendar: autonomyLevel <= 2,
          slack: autonomyLevel <= 3,
        },
      });

      onWorkspaceCreated();
      onClose();

      // Reset form
      setName('');
      setDescription('');
      setAutonomyLevel(3);
      setColor('#3B82F6');
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onClose();
      // Reset form
      setName('');
      setDescription('');
      setAutonomyLevel(3);
      setColor('#3B82F6');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Create New Workspace
          </h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} disabled:opacity-50`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Workspace Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Research Project, Personal Tasks"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              required
              disabled={isCreating}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this workspace's purpose"
              rows={2}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              disabled={isCreating}
            />
          </div>

          {/* Color */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Color Theme
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colors.map(colorOption => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  disabled={isCreating}
                  className={`w-full h-8 rounded-md border-2 transition-all ${
                    color === colorOption.value
                      ? 'border-white scale-110'
                      : isDarkMode
                        ? 'border-gray-600 hover:border-gray-400'
                        : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          {/* Autonomy Level */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Autonomy Level
            </label>
            <div className="space-y-2">
              {autonomyLevels.map(level => (
                <label
                  key={level.value}
                  className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                    autonomyLevel === level.value
                      ? isDarkMode
                        ? 'bg-gray-700 border border-teal-500'
                        : 'bg-gray-50 border border-teal-500'
                      : isDarkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-50'
                  }`}>
                  <input
                    type="radio"
                    name="autonomyLevel"
                    value={level.value}
                    checked={autonomyLevel === level.value}
                    onChange={e => setAutonomyLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                    disabled={isCreating}
                    className="text-teal-500 focus:ring-teal-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${level.color}`}>{level.label}</span>
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: level.value <= 2 ? '#F59E0B' : level.value <= 4 ? '#06B6D4' : '#10B981',
                        }}
                      />
                    </div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{level.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                isDarkMode
                  ? 'bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:opacity-50 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:opacity-50 text-gray-900'
              }`}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className={`flex-1 px-4 py-2 rounded-md transition-colors flex items-center justify-center ${
                isDarkMode
                  ? 'bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:opacity-50 text-white'
                  : 'bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:opacity-50 text-white'
              }`}>
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Workspace'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
