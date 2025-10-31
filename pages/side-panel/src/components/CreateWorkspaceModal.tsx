import React, { useState } from 'react';
import { workspaceManager } from '@extension/storage';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkspaceCreated: (workspaceId: string) => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({ isOpen, onClose, onWorkspaceCreated }) => {
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

  // DEMO ENHANCEMENT: Workspace templates
  const workspaceTemplates = [
    {
      name: 'Email Triage',
      description: 'Gmail + Calendar integration for intelligent email management',
      autonomyLevel: 4,
      color: '#10B981',
      tools: ['gmail', 'calendar'],
      icon: '📧',
    },
    {
      name: 'Research Project',
      description: 'Document analysis and knowledge synthesis',
      autonomyLevel: 3,
      color: '#8B5CF6',
      tools: ['web', 'documents'],
      icon: '🔬',
    },
    {
      name: 'Client Management',
      description: 'CRM integration and communication tracking',
      autonomyLevel: 2,
      color: '#3B82F6',
      tools: ['gmail', 'calendar', 'slack'],
      icon: '👥',
    },
  ];

  const handleTemplateSelect = (template: (typeof workspaceTemplates)[0]) => {
    setName(template.name);
    setDescription(template.description);
    setAutonomyLevel(template.autonomyLevel as any);
    setColor(template.color);
  };

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
      const workspaceId = await workspaceManager.createWorkspace(name.trim(), {
        description: description.trim(),
        autonomyLevel,
        color,
        approvalPolicies: {
          gmail: autonomyLevel <= 3,
          calendar: autonomyLevel <= 2,
          slack: autonomyLevel <= 3,
        },
      });

      onWorkspaceCreated(workspaceId);
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
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Create New Workspace</h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-white disabled:opacity-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Workspace Templates */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Quick Templates</label>
            <div className="grid grid-cols-1 gap-2">
              {workspaceTemplates.map(template => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className="p-3 text-left bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-white">{template.name}</div>
                      <div className="text-xs text-gray-400">{template.description}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: template.color }} />
                        <span className="text-xs text-gray-500">
                          Level {template.autonomyLevel} • {template.tools.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Or Create Custom Workspace</label>
          </div>
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Workspace Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Research Project, Personal Tasks"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
              disabled={isCreating}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this workspace's purpose"
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              disabled={isCreating}
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color Theme</label>
            <div className="grid grid-cols-4 gap-2">
              {colors.map(colorOption => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  disabled={isCreating}
                  className={`w-full h-8 rounded-md border-2 transition-all ${
                    color === colorOption.value ? 'border-white scale-110' : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: colorOption.value }}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          {/* Autonomy Level */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Autonomy Level</label>
            <div className="space-y-2">
              {autonomyLevels.map(level => (
                <label
                  key={level.value}
                  className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                    autonomyLevel === level.value ? 'bg-gray-700 border border-teal-500' : 'hover:bg-gray-700'
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
                    <p className="text-xs text-gray-400">{level.description}</p>
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
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-md transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-md transition-colors flex items-center justify-center">
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
