import React, { useState, useEffect } from 'react';
import { FiDatabase, FiClock, FiCpu, FiSettings, FiTrash2 } from 'react-icons/fi';

interface MemoryItem {
  id: string;
  type: 'episodic' | 'semantic' | 'procedural';
  content: string;
  tokens: number;
  timestamp: number;
  importance: number;
}

interface MemoryBrowserProps {
  workspaceId: string;
  isDarkMode?: boolean;
}

export const MemoryBrowser: React.FC<MemoryBrowserProps> = ({ workspaceId, isDarkMode = false }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | 'episodic' | 'semantic' | 'procedural'>('all');
  const [totalTokens, setTotalTokens] = useState(0);
  const [maxTokens] = useState(4096);

  // Demo data for Gmail Triage showcase
  useEffect(() => {
    const demoMemories: MemoryItem[] = [
      // Episodic Memories (Recent email patterns)
      {
        id: 'ep1',
        type: 'episodic',
        content: 'User responded to client emails within 2 hours on average',
        tokens: 245,
        timestamp: Date.now() - 86400000, // 1 day ago
        importance: 0.9,
      },
      {
        id: 'ep2',
        type: 'episodic',
        content: 'Marked emails from finance@company.com as high priority',
        tokens: 189,
        timestamp: Date.now() - 172800000, // 2 days ago
        importance: 0.8,
      },
      {
        id: 'ep3',
        type: 'episodic',
        content: 'Usually handles urgent emails before 10am',
        tokens: 156,
        timestamp: Date.now() - 259200000, // 3 days ago
        importance: 0.7,
      },

      // Semantic Memories (Contact preferences, facts)
      {
        id: 'sem1',
        type: 'semantic',
        content: 'John Smith (CEO) - Always requires immediate response',
        tokens: 123,
        timestamp: Date.now() - 604800000, // 1 week ago
        importance: 0.95,
      },
      {
        id: 'sem2',
        type: 'semantic',
        content: 'Marketing emails - Low priority, batch process weekly',
        tokens: 98,
        timestamp: Date.now() - 1209600000, // 2 weeks ago
        importance: 0.4,
      },
      {
        id: 'sem3',
        type: 'semantic',
        content: 'Client meetings - Always schedule 1 hour, include agenda',
        tokens: 167,
        timestamp: Date.now() - 1814400000, // 3 weeks ago
        importance: 0.8,
      },

      // Procedural Memories (Successful workflows)
      {
        id: 'proc1',
        type: 'procedural',
        content: 'Email Triage Workflow: Urgent → Client → Internal → Marketing',
        tokens: 234,
        timestamp: Date.now() - 2419200000, // 4 weeks ago
        importance: 0.9,
      },
      {
        id: 'proc2',
        type: 'procedural',
        content: 'Meeting Scheduling: Check calendar → Propose 3 slots → Send invite',
        tokens: 198,
        timestamp: Date.now() - 3024000000, // 5 weeks ago
        importance: 0.85,
      },
    ];

    setMemories(demoMemories);
    setTotalTokens(demoMemories.reduce((sum, mem) => sum + mem.tokens, 0));
  }, [workspaceId]);

  const filteredMemories = selectedType === 'all' ? memories : memories.filter(mem => mem.type === selectedType);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'episodic':
        return <FiClock className="w-4 h-4" />;
      case 'semantic':
        return <FiDatabase className="w-4 h-4" />;
      case 'procedural':
        return <FiCpu className="w-4 h-4" />;
      default:
        return <FiSettings className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'episodic':
        return 'bg-blue-500';
      case 'semantic':
        return 'bg-green-500';
      case 'procedural':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const tokenUsagePercentage = (totalTokens / maxTokens) * 100;

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Memory Browser</h2>
        <div className="text-sm text-gray-500">Workspace: {workspaceId}</div>
      </div>

      {/* Token Usage Visualization */}
      <div className="mb-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Token Usage</span>
          <span className="text-sm">
            {totalTokens.toLocaleString()} / {maxTokens.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              tokenUsagePercentage > 80 ? 'bg-red-500' : tokenUsagePercentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(tokenUsagePercentage, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {tokenUsagePercentage.toFixed(1)}% used
          {tokenUsagePercentage > 80 && <span className="ml-2 text-orange-500">⚠️ Consider compression</span>}
        </div>
      </div>

      {/* Memory Type Filters */}
      <div className="flex space-x-2 mb-6">
        {['all', 'episodic', 'semantic', 'procedural'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedType === type
                ? 'bg-teal-500 text-white'
                : isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Memory Items (DaisyDisk Style) */}
      <div className="space-y-3">
        {filteredMemories.map(memory => (
          <div
            key={memory.id}
            className={`p-4 rounded-lg border transition-all hover:shadow-md ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}
            style={{
              borderLeft: `4px solid`,
              borderLeftColor:
                memory.type === 'episodic' ? '#3B82F6' : memory.type === 'semantic' ? '#10B981' : '#8B5CF6',
            }}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className={`p-2 rounded-lg ${getTypeColor(memory.type)} text-white`}>
                  {getTypeIcon(memory.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium capitalize">{memory.type}</span>
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                      {memory.tokens} tokens
                    </span>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full mr-1 ${
                            i < memory.importance * 5 ? 'bg-yellow-400' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{memory.content}</p>
                  <div className="text-xs text-gray-500">{new Date(memory.timestamp).toLocaleDateString()}</div>
                </div>
              </div>
              <button className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Remove memory">
                <FiTrash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Memory Statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {memories.filter(m => m.type === 'episodic').length}
          </div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Episodic</div>
        </div>
        <div className="text-center p-4 bg-green-100 dark:bg-green-900 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {memories.filter(m => m.type === 'semantic').length}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">Semantic</div>
        </div>
        <div className="text-center p-4 bg-purple-100 dark:bg-purple-900 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {memories.filter(m => m.type === 'procedural').length}
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">Procedural</div>
        </div>
      </div>
    </div>
  );
};
