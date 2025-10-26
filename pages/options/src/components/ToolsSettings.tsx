import { useState, useEffect } from 'react';
import { Tool } from '../types/tools';
import { AVAILABLE_TOOLS } from '../types/tools';
import { getToolConfigurations, saveToolConfig, deleteToolConfig } from '../utils/toolsManager';
import { ToolCard } from './ToolCard';
import { ApiKeyModal } from './ApiKeyModal';
import { FiSearch } from 'react-icons/fi';

interface ToolsSettingsProps {
  isDarkMode?: boolean;
}

export const ToolsSettings = ({ isDarkMode = false }: ToolsSettingsProps) => {
  const [tools, setTools] = useState<Tool[]>(AVAILABLE_TOOLS);
  const [configurations, setConfigurations] = useState<Record<string, boolean>>({});
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Load configurations on mount
  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const configs = await getToolConfigurations();
      const configured = Object.keys(configs).reduce(
        (acc, toolId) => {
          acc[toolId] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );
      setConfigurations(configured);
    } catch (error) {
      console.error('[ToolsSettings] Failed to load configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = (tool: Tool) => {
    setSelectedTool(tool);
    setIsModalOpen(true);
  };

  const handleSaveConfig = async (config: Record<string, string>) => {
    if (!selectedTool) return;

    try {
      await saveToolConfig(selectedTool.id, config);
      setConfigurations(prev => ({
        ...prev,
        [selectedTool.id]: true,
      }));
    } catch (error) {
      console.error('[ToolsSettings] Failed to save config:', error);
      throw error;
    }
  };

  const handleDeleteConfig = async (toolId: string) => {
    if (!confirm(`Are you sure you want to remove the ${toolId} configuration?`)) {
      return;
    }

    try {
      await deleteToolConfig(toolId);
      setConfigurations(prev => {
        const updated = { ...prev };
        delete updated[toolId];
        return updated;
      });
    } catch (error) {
      console.error('[ToolsSettings] Failed to delete config:', error);
    }
  };

  // Filter tools based on search and category
  const filteredTools = tools.filter(tool => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['all', ...new Set(tools.map(t => t.category))];

  return (
    <section className="space-y-6">
      {/* Header */}
      <div
        className={`rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-blue-100 bg-white'} p-6 shadow-sm`}>
        <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>Integration Tools</h2>
      </div>

      {/* Search and Filter Bar */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <FiSearch className={`absolute left-3 top-3 h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Search tools..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={`w-full rounded-lg border pl-10 pr-4 py-2 text-sm ${
              isDarkMode
                ? 'border-slate-600 bg-slate-700 text-gray-100 placeholder-gray-400'
                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
            } focus:border-blue-500 focus:outline-none`}
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors capitalize ${
                selectedCategory === category
                  ? isDarkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : isDarkMode
                    ? 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Grid */}
      {loading ? (
        <div
          className={`rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} p-8 text-center`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading tools...</p>
        </div>
      ) : filteredTools.length === 0 ? (
        <div
          className={`rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} p-8 text-center`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No tools found matching your search
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTools.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isConfigured={configurations[tool.id] || false}
              onConfigure={() => handleConfigure(tool)}
              onDelete={() => handleDeleteConfig(tool.id)}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      )}

      {/* Stats */}
      {filteredTools.length > 0 && (
        <div
          className={`rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-gray-200 bg-gray-50'} p-4`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <strong>{Object.keys(configurations).length}</strong> of <strong>{tools.length}</strong> tools configured
          </p>
        </div>
      )}

      {/* API Key Modal */}
      {selectedTool && (
        <ApiKeyModal
          tool={selectedTool}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveConfig}
          isDarkMode={isDarkMode}
        />
      )}
    </section>
  );
};

export default ToolsSettings;
