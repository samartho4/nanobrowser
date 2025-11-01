import { useState, useEffect } from 'react';
import '@src/Options.css';
import '@extension/shared/lib/styles/theme.css';
import { Button } from '@extension/ui';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { ThemeProvider, useTheme } from '@extension/shared';
import { t } from '@extension/i18n';
import { FiSettings, FiCpu, FiTool, FiLayers } from 'react-icons/fi';
import { GeneralSettings } from './components/GeneralSettings';
import { ModelSettings } from './components/ModelSettings';
import { ToolsSettings } from './components/ToolsSettings';
import { WorkspaceSettings } from './components/WorkspaceSettings';

type TabTypes = 'general' | 'models' | 'tools' | 'workspaces';

const TABS: { id: TabTypes; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'general', icon: FiSettings, label: 'Agent' },
  { id: 'models', icon: FiCpu, label: 'LLM' },
  { id: 'tools', icon: FiTool, label: 'Tools' },
  { id: 'workspaces', icon: FiLayers, label: 'Workspaces' },
];

const OptionsContent = () => {
  const [activeTab, setActiveTab] = useState<TabTypes>('models');
  const { isDarkMode } = useTheme();

  const handleTabClick = (tabId: TabTypes) => {
    setActiveTab(tabId);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings isDarkMode={isDarkMode} />;
      case 'models':
        return <ModelSettings isDarkMode={isDarkMode} />;
      case 'tools':
        return <ToolsSettings isDarkMode={isDarkMode} />;
      case 'workspaces':
        return <WorkspaceSettings isDarkMode={isDarkMode} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex min-h-screen min-w-[768px] transition-colors duration-200 ${
        isDarkMode ? 'bg-slate-900 text-gray-200' : 'bg-gradient-to-br from-white to-blue-50 text-gray-900'
      }`}>
      {/* Vertical Navigation Bar */}
      <nav
        className={`w-48 border-r transition-colors duration-200 ${
          isDarkMode ? 'border-slate-700 bg-slate-800/80' : 'border-blue-200/50 bg-white/80'
        } backdrop-blur-sm`}>
        <div className="p-4">
          <h1
            className={`mb-6 text-xl font-bold transition-colors duration-200 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
            {t('options_nav_header')}
          </h1>
          <ul className="space-y-2">
            {TABS.map(item => (
              <li key={item.id}>
                <Button
                  onClick={() => handleTabClick(item.id)}
                  className={`flex w-full items-center space-x-2 rounded-lg px-4 py-2 text-left text-base transition-all duration-200
                    ${
                      activeTab !== item.id
                        ? isDarkMode
                          ? 'bg-slate-700/70 text-gray-300 hover:bg-slate-600/70 hover:text-white'
                          : 'bg-blue-50/50 text-gray-700 hover:bg-blue-100/70 hover:text-blue-800'
                        : isDarkMode
                          ? 'bg-sky-800/50 text-white'
                          : 'bg-blue-500 text-white'
                    }`}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Main Content Area */}
      <main
        className={`flex-1 p-8 transition-colors duration-200 ${
          isDarkMode ? 'bg-slate-800/50' : 'bg-white/30'
        } backdrop-blur-sm`}>
        <div className="mx-auto min-w-[512px] max-w-screen-lg">{renderTabContent()}</div>
      </main>
    </div>
  );
};

const Options = () => {
  return (
    <ThemeProvider>
      <OptionsContent />
    </ThemeProvider>
  );
};

export default withErrorBoundary(withSuspense(Options, <div>Loading...</div>), <div>Error Occurred</div>);
