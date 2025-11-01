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

      {/* Firewall Settings Section */}
      <FirewallSettingsSection isDarkMode={isDarkMode} />

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

// Firewall Settings Section Component
const FirewallSettingsSection = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [allowList, setAllowList] = useState<string[]>([]);
  const [denyList, setDenyList] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [activeList, setActiveList] = useState<'allow' | 'deny'>('allow');

  const loadFirewallSettings = async () => {
    const { firewallStore } = await import('@extension/storage');
    const settings = await firewallStore.getFirewall();
    setIsEnabled(settings.enabled);
    setAllowList(settings.allowList);
    setDenyList(settings.denyList);
  };

  useEffect(() => {
    loadFirewallSettings();
  }, []);

  const handleToggleFirewall = async () => {
    const { firewallStore } = await import('@extension/storage');
    await firewallStore.updateFirewall({ enabled: !isEnabled });
    await loadFirewallSettings();
  };

  const handleAddUrl = async () => {
    const { firewallStore } = await import('@extension/storage');
    const cleanUrl = newUrl.trim().replace(/^https?:\/\//, '');
    if (!cleanUrl) return;

    if (activeList === 'allow') {
      await firewallStore.addToAllowList(cleanUrl);
    } else {
      await firewallStore.addToDenyList(cleanUrl);
    }
    await loadFirewallSettings();
    setNewUrl('');
  };

  const handleRemoveUrl = async (url: string, listType: 'allow' | 'deny') => {
    const { firewallStore } = await import('@extension/storage');
    if (listType === 'allow') {
      await firewallStore.removeFromAllowList(url);
    } else {
      await firewallStore.removeFromDenyList(url);
    }
    await loadFirewallSettings();
  };

  return (
    <>
      <div
        className={`rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-blue-100 bg-gray-50'} p-6 text-left shadow-sm`}>
        <h2 className={`mb-4 text-xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          Firewall Settings
        </h2>

        <div className="space-y-6">
          <div
            className={`my-6 rounded-lg border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-700' : 'border-gray-200 bg-gray-100'}`}>
            <div className="flex items-center justify-between">
              <label
                htmlFor="toggle-firewall-tools"
                className={`text-base font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Enable Firewall
              </label>
              <div className="relative inline-block w-12 select-none">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={handleToggleFirewall}
                  className="sr-only"
                  id="toggle-firewall-tools"
                />
                <label
                  htmlFor="toggle-firewall-tools"
                  className={`block h-6 cursor-pointer overflow-hidden rounded-full ${
                    isEnabled ? 'bg-blue-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}>
                  <span className="sr-only">Toggle Firewall</span>
                  <span
                    className={`block size-6 rounded-full bg-white shadow transition-transform ${
                      isEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mb-6 mt-10 flex items-center justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveList('allow')}
                className={`px-4 py-2 text-base rounded ${
                  activeList === 'allow'
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'bg-slate-700 text-gray-200'
                      : 'bg-gray-200 text-gray-700'
                }`}>
                Allow List
              </button>
              <button
                onClick={() => setActiveList('deny')}
                className={`px-4 py-2 text-base rounded ${
                  activeList === 'deny'
                    ? isDarkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'bg-slate-700 text-gray-200'
                      : 'bg-gray-200 text-gray-700'
                }`}>
                Deny List
              </button>
            </div>
          </div>

          <div className="mb-4 flex space-x-2">
            <input
              id="url-input-tools"
              type="text"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleAddUrl();
                }
              }}
              placeholder="Enter domain or URL pattern"
              className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                isDarkMode ? 'border-gray-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-700'
              }`}
            />
            <button
              onClick={handleAddUrl}
              className={`px-4 py-2 text-sm rounded ${
                isDarkMode ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-500 text-white hover:bg-green-600'
              }`}>
              Add
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {activeList === 'allow' ? (
              allowList.length > 0 ? (
                <ul className="space-y-2">
                  {allowList.map(url => (
                    <li
                      key={url}
                      className={`flex items-center justify-between rounded-md p-2 pr-0 ${
                        isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
                      }`}>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{url}</span>
                      <button
                        onClick={() => handleRemoveUrl(url, 'allow')}
                        className={`rounded-l-none px-2 py-1 text-xs ${
                          isDarkMode
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No domains in allow list
                </p>
              )
            ) : denyList.length > 0 ? (
              <ul className="space-y-2">
                {denyList.map(url => (
                  <li
                    key={url}
                    className={`flex items-center justify-between rounded-md p-2 pr-0 ${
                      isDarkMode ? 'bg-slate-700' : 'bg-gray-100'
                    }`}>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{url}</span>
                    <button
                      onClick={() => handleRemoveUrl(url, 'deny')}
                      className={`rounded-l-none px-2 py-1 text-xs ${
                        isDarkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'
                      }`}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                No domains in deny list
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        className={`rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-blue-100 bg-gray-50'} p-6 text-left shadow-sm`}>
        <h2 className={`mb-4 text-xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>How It Works</h2>
        <ul className={`list-disc space-y-2 pl-5 text-left text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <li>When firewall is enabled, the agent can only access domains in the allow list</li>
          <li>Domains in the deny list are always blocked, even if firewall is disabled</li>
          <li>Use wildcards (*) to match multiple subdomains (e.g., *.example.com)</li>
          <li>Leave allow list empty to allow all domains (except those in deny list)</li>
        </ul>
      </div>
    </>
  );
};

export default ToolsSettings;
