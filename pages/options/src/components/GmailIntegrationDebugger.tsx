import React, { useState, useEffect } from 'react';
import { FiPlay, FiRefreshCw, FiCheck, FiX, FiEye, FiDatabase, FiClock, FiCpu } from 'react-icons/fi';

interface DebugLog {
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

interface GmailIntegrationDebuggerProps {
  workspaceId: string;
  isDarkMode: boolean;
}

export const GmailIntegrationDebugger: React.FC<GmailIntegrationDebuggerProps> = ({ workspaceId, isDarkMode }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [results, setResults] = useState<any>(null);

  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: Date.now(),
      level,
      message,
      data,
    };
    setLogs(prev => [...prev, log]);
  };

  const runGmailIntegrationTest = async () => {
    setIsRunning(true);
    setLogs([]);
    setResults(null);

    try {
      addLog('info', '🚀 Starting Gmail Memory Integration Test');
      setCurrentStep('Initializing...');

      // Step 1: Check workspace memory service
      addLog('info', '1️⃣ Testing workspace memory service...');
      setCurrentStep('Testing memory service...');

      const statsResponse = await chrome.runtime.sendMessage({
        type: 'GET_WORKSPACE_MEMORY_STATS',
        payload: { workspaceId },
      });

      if (statsResponse.success) {
        addLog('success', '✅ Memory service working', statsResponse.data);
        setCurrentStep('Memory service: OK');
      } else {
        addLog('error', '❌ Memory service failed', statsResponse.error);
        setCurrentStep('Memory service: FAILED');
        return;
      }

      // Step 2: Check Gmail authentication
      addLog('info', '2️⃣ Checking Gmail authentication...');
      setCurrentStep('Checking Gmail auth...');

      const authResponse = await chrome.runtime.sendMessage({
        type: 'AUTHENTICATE_GMAIL',
      });

      if (authResponse.success) {
        addLog('success', '✅ Gmail authenticated', authResponse.data);
        setCurrentStep('Gmail auth: OK');
      } else {
        addLog('warning', '⚠️ Gmail authentication needed', authResponse.error);
        setCurrentStep('Gmail auth: NEEDED');
      }

      // Step 3: Sync Gmail data
      addLog('info', '3️⃣ Syncing Gmail data...');
      setCurrentStep('Syncing Gmail data...');

      const syncResponse = await chrome.runtime.sendMessage({
        type: 'SYNC_GMAIL_MEMORY',
        payload: {
          workspaceId,
          maxMessages: 20,
          daysBack: 7,
          forceRefresh: true,
        },
      });

      if (syncResponse.success) {
        addLog('success', '✅ Gmail sync completed', syncResponse.data);
        setCurrentStep('Gmail sync: COMPLETED');

        // Step 4: Get updated stats
        addLog('info', '4️⃣ Getting updated memory stats...');
        setCurrentStep('Getting updated stats...');

        const updatedStatsResponse = await chrome.runtime.sendMessage({
          type: 'GET_WORKSPACE_MEMORY_STATS',
          payload: { workspaceId },
        });

        if (updatedStatsResponse.success) {
          addLog('success', '✅ Updated stats retrieved', updatedStatsResponse.data);
          setResults(updatedStatsResponse.data);
          setCurrentStep('Test completed successfully!');
        }
      } else {
        addLog('error', '❌ Gmail sync failed', syncResponse.error);
        setCurrentStep('Gmail sync: FAILED');
      }
    } catch (error) {
      addLog('error', '💥 Test failed with exception', error);
      setCurrentStep('Test failed with error');
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setResults(null);
    setCurrentStep('');
  };

  const getLogIcon = (level: DebugLog['level']) => {
    switch (level) {
      case 'success':
        return <FiCheck className="w-4 h-4 text-green-500" />;
      case 'error':
        return <FiX className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <FiRefreshCw className="w-4 h-4 text-yellow-500" />;
      default:
        return <FiEye className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className={`p-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Gmail Integration Debugger
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={runGmailIntegrationTest}
            disabled={isRunning}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isRunning
                ? isDarkMode
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-gray-200 text-gray-500'
                : isDarkMode
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
            }`}>
            {isRunning ? (
              <>
                <FiRefreshCw className="w-4 h-4 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <FiPlay className="w-4 h-4" />
                <span>Run Test</span>
              </>
            )}
          </button>
          <button
            onClick={clearLogs}
            className={`px-3 py-2 rounded-lg transition-colors ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}>
            Clear
          </button>
        </div>
      </div>

      {/* Current Step */}
      {currentStep && (
        <div
          className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex items-center space-x-2">
            {isRunning && <FiRefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
            <span className={`font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              Current Step: {currentStep}
            </span>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {results && (
        <div
          className={`mb-4 p-4 rounded-lg ${isDarkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
          <h4 className={`font-semibold mb-3 ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
            📊 Integration Results
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <FiClock className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Episodic</div>
                <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {results.episodic.episodes} episodes
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FiDatabase className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              <div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Semantic</div>
                <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {results.semantic.facts} facts
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <FiCpu className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              <div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Procedural</div>
                <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {results.procedural.patterns} patterns
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total Items:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{results.totalItems}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total Tokens:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {results.totalTokens.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Emails Processed:</span>
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {results.gmailIntegration.totalEmailsProcessed}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Debug Logs */}
      <div className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div
          className={`px-4 py-2 border-b ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
          <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Debug Logs ({logs.length})</h4>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <div className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No logs yet. Click "Run Test" to start debugging.
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`px-4 py-2 border-b last:border-b-0 ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-100'
                  }`}>
                  <div className="flex items-start space-x-2">
                    {getLogIcon(log.level)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{log.message}</span>
                      </div>
                      {log.data && (
                        <details className="mt-1">
                          <summary
                            className={`text-xs cursor-pointer ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Show data
                          </summary>
                          <pre
                            className={`mt-1 text-xs p-2 rounded ${isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-100 text-gray-700'} overflow-x-auto`}>
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
