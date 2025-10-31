import React, { useState, useEffect } from 'react';
import { FiMinimize2, FiEye, FiRefreshCw, FiAlertCircle, FiX } from 'react-icons/fi';
import { CompressionPreviewModal } from './CompressionPreviewModal';

interface ContextCompressionControlsProps {
  workspaceId: string;
  isDarkMode: boolean;
  contextItemCount: number;
  totalTokens: number;
  onCompressionComplete: () => void;
}

interface CompressionResult {
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  spaceSaved: number;
}

const ContextCompressionControls: React.FC<ContextCompressionControlsProps> = ({
  workspaceId,
  isDarkMode,
  contextItemCount,
  totalTokens,
  onCompressionComplete,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<'minimal' | 'balanced' | 'aggressive'>('balanced');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [estimatedResults, setEstimatedResults] = useState<CompressionResult>({
    originalTokens: 0,
    compressedTokens: 0,
    compressionRatio: 0,
    spaceSaved: 0,
  });

  // Compression strategies matching the screenshot
  const strategies = [
    {
      id: 'minimal',
      name: 'Minimal',
      percentage: '80%',
      description: 'Keep most detail, remove only redundant content',
      targetReduction: 0.2,
    },
    {
      id: 'balanced',
      name: 'Balanced',
      percentage: '50%',
      description: 'Balance detail with conciseness, focus on key decisions',
      targetReduction: 0.5,
    },
    {
      id: 'aggressive',
      name: 'Aggressive',
      percentage: '30%',
      description: 'Keep only conclusions and critical facts',
      targetReduction: 0.7,
    },
  ];

  // Load compression stats and calculate estimates
  useEffect(() => {
    loadCompressionStats();
    calculateEstimatedResults();
  }, [workspaceId, selectedStrategy, totalTokens]);

  const loadCompressionStats = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_COMPRESSION_STATS',
        payload: { workspaceId },
      });

      if (response?.success) {
        // Update any existing compression stats if needed
      }
    } catch (error) {
      console.error('Failed to load compression stats:', error);
    }
  };

  const calculateEstimatedResults = () => {
    const strategy = strategies.find(s => s.id === selectedStrategy);
    if (!strategy || totalTokens === 0) {
      setEstimatedResults({
        originalTokens: 0,
        compressedTokens: 0,
        compressionRatio: 0,
        spaceSaved: 0,
      });
      return;
    }

    const compressedTokens = Math.floor(totalTokens * (1 - strategy.targetReduction));
    const spaceSaved = totalTokens - compressedTokens;
    const compressionRatio = strategy.targetReduction;

    setEstimatedResults({
      originalTokens: totalTokens,
      compressedTokens,
      compressionRatio,
      spaceSaved,
    });
  };

  const previewCompression = async () => {
    if (contextItemCount === 0) {
      setError('No context items to compress');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Get context items first
      const contextResponse = await chrome.runtime.sendMessage({
        type: 'TEST_CONTEXT_SELECT',
        payload: {
          workspaceId,
          query: '',
          tokenLimit: 50000,
          options: {},
        },
      });

      if (!contextResponse?.ok || !contextResponse.items?.length) {
        throw new Error('No context items found for compression');
      }

      // Perform compression preview
      const compressionResponse = await chrome.runtime.sendMessage({
        type: 'TEST_CONTEXT_COMPRESS',
        payload: {
          items: contextResponse.items,
          strategy: {
            name: selectedStrategy,
            description: strategies.find(s => s.id === selectedStrategy)?.description || '',
            targetRatio: 1 - (strategies.find(s => s.id === selectedStrategy)?.targetReduction || 0.5),
          },
          targetTokens: estimatedResults.compressedTokens,
        },
      });

      if (compressionResponse?.ok) {
        const result = compressionResponse.result;
        setCompressionResult({
          originalTokens: result.originalTokens || 0,
          compressedTokens: result.compressedTokens || 0,
          compressionRatio: result.compressionRatio || 0,
          spaceSaved: (result.originalTokens || 0) - (result.compressedTokens || 0),
        });
        setShowPreview(true);
      } else {
        throw new Error(compressionResponse?.error || 'Compression preview failed');
      }
    } catch (error) {
      console.error('Compression preview failed:', error);
      setError(`Preview failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const executeCompression = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await chrome.runtime.sendMessage({
        type: 'COMPRESS_WORKSPACE_CONTEXT',
        payload: {
          workspaceId,
          strategy: selectedStrategy,
          targetTokens: estimatedResults.compressedTokens,
          preserveRecent: true,
          preserveImportant: true,
        },
      });

      if (response?.success) {
        onCompressionComplete();
        setShowPreview(false);
        setError(null);
      } else {
        throw new Error(response?.error || 'Compression failed');
      }
    } catch (error) {
      console.error('Compression failed:', error);
      setError(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`mt-8 p-8 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-teal-500/20' : 'bg-teal-500/10'}`}>
            <FiMinimize2 className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Compression Controls
            </h3>
          </div>
        </div>
        <button
          onClick={loadCompressionStats}
          className={`p-2 rounded-lg transition-colors ${
            isDarkMode
              ? 'hover:bg-slate-700 text-gray-300 hover:text-white'
              : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
          }`}
          title="Refresh">
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className={`mb-6 p-3 rounded-lg border ${
            isDarkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
          <div className="flex items-center space-x-2">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className={`ml-auto p-1 rounded ${isDarkMode ? 'hover:bg-red-800' : 'hover:bg-red-100'}`}>
              <FiX className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Compression Strategy Section */}
      <div className="mb-8">
        <h4 className={`text-lg font-medium text-center mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Compression Strategy
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {strategies.map(strategy => (
            <button
              key={strategy.id}
              onClick={() => setSelectedStrategy(strategy.id as any)}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                selectedStrategy === strategy.id
                  ? strategy.id === 'aggressive'
                    ? 'border-teal-500 bg-teal-500/10'
                    : isDarkMode
                      ? 'border-slate-600 bg-slate-700/50'
                      : 'border-gray-300 bg-gray-100/50'
                  : isDarkMode
                    ? 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <div className="flex items-center justify-between mb-3">
                <h5
                  className={`text-lg font-semibold ${
                    selectedStrategy === strategy.id && strategy.id === 'aggressive'
                      ? 'text-teal-400'
                      : isDarkMode
                        ? 'text-white'
                        : 'text-gray-900'
                  }`}>
                  {strategy.name}
                </h5>
                <span
                  className={`text-2xl font-bold ${
                    selectedStrategy === strategy.id && strategy.id === 'aggressive'
                      ? 'text-teal-400'
                      : isDarkMode
                        ? 'text-gray-400'
                        : 'text-gray-500'
                  }`}>
                  {strategy.percentage}
                </span>
              </div>
              <p
                className={`text-sm ${
                  selectedStrategy === strategy.id && strategy.id === 'aggressive'
                    ? 'text-teal-300'
                    : isDarkMode
                      ? 'text-gray-400'
                      : 'text-gray-600'
                }`}>
                {strategy.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Compression Preview Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Compression Preview
            </h4>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Preview compression results before applying changes
            </p>
          </div>
          <button
            onClick={previewCompression}
            disabled={isLoading || contextItemCount === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isLoading || contextItemCount === 0
                ? isDarkMode
                  ? 'bg-slate-700 text-gray-500'
                  : 'bg-gray-200 text-gray-400'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}>
            <FiEye className="w-4 h-4" />
            <span>{isLoading ? 'Loading...' : 'Preview Compression'}</span>
          </button>
        </div>

        {/* Estimated Results */}
        <div
          className={`p-6 rounded-xl border-2 ${isDarkMode ? 'border-slate-600 bg-slate-700/30' : 'border-gray-200 bg-white'}`}>
          <h5 className={`text-center text-lg font-medium mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Estimated Results
          </h5>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Current Tokens:
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {estimatedResults.originalTokens.toLocaleString()}
              </div>
            </div>

            <div>
              <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                After Compression:
              </div>
              <div className="text-2xl font-bold text-green-500">
                {estimatedResults.compressedTokens.toLocaleString()}
              </div>
            </div>

            <div>
              <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Space Saved:
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {estimatedResults.spaceSaved.toLocaleString()}
              </div>
            </div>

            <div>
              <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Compression Ratio:
              </div>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {Math.round(estimatedResults.compressionRatio * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compression Preview Modal */}
      {showPreview && compressionResult && (
        <CompressionPreviewModal
          workspaceId={workspaceId}
          strategy={{
            name: selectedStrategy as any,
            description: strategies.find(s => s.id === selectedStrategy)?.description || '',
            targetRatio: 1 - (strategies.find(s => s.id === selectedStrategy)?.targetReduction || 0.5),
          }}
          targetTokens={estimatedResults.compressedTokens}
          isDarkMode={isDarkMode}
          onClose={() => setShowPreview(false)}
          onApply={executeCompression}
        />
      )}
    </div>
  );
};

export default ContextCompressionControls;
