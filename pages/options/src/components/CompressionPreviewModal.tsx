import React, { useState, useEffect } from 'react';
import { Button } from '@extension/ui';
import { FiX, FiMinimize2, FiEye, FiSave, FiRotateCcw, FiAlertTriangle } from 'react-icons/fi';
import {
  contextManager,
  type CompressionStrategy,
  type CompressionResult,
  type ContextItem,
} from '../services/ContextManager';
import { createStorageMigration } from '../services/StorageMigration';
import { langGraphStore } from '../services/LangGraphStore';
import MessageManager from '../services/MessageManager';
import { chromeExtensionBridge } from '../services/ChromeExtensionBridge';

interface CompressionPreviewModalProps {
  workspaceId: string;
  strategy: CompressionStrategy;
  targetTokens: number;
  isDarkMode: boolean;
  onClose: () => void;
  onApply: () => void;
}

export const CompressionPreviewModal: React.FC<CompressionPreviewModalProps> = ({
  workspaceId,
  strategy,
  targetTokens,
  isDarkMode,
  onClose,
  onApply,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [checkpointId, setCheckpointId] = useState<string | null>(null);

  // DEMO ENHANCEMENT: Show Gmail-specific compression metrics
  const [demoMetrics, setDemoMetrics] = useState({
    emailsCompressed: 12,
    threadsCondensed: 3,
    attachmentsSummarized: 5,
    tokensSaved: 1424,
    compressionTime: 2.3,
  });
  const [applying, setApplying] = useState(false);

  const sessionId = 'default-session'; // In production, this would come from session context
  const storageMigration = createStorageMigration(langGraphStore);
  const messageManager = new MessageManager();

  useEffect(() => {
    loadCompressionPreview();
  }, [workspaceId, strategy, targetTokens]);

  const loadCompressionPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current context items
      const contextItems = await contextManager.select(workspaceId, '', 1000000, {
        types: ['message', 'memory', 'page', 'file'],
      });

      if (contextItems.length === 0) {
        setError('No context items found to compress');
        return;
      }

      // Generate compression preview
      const result = await contextManager.compress(contextItems, strategy, targetTokens);
      setCompressionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate compression preview');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCheckpoint = async () => {
    try {
      const checkpointId = await storageMigration.createCheckpoint(
        workspaceId,
        sessionId,
        `Before ${strategy.name} compression`,
        {
          description: `Checkpoint created before applying ${strategy.name} compression strategy`,
          compressionApplied: false,
          tokenCount: compressionResult?.originalTokens || 0,
        },
      );
      setCheckpointId(checkpointId);
      return checkpointId;
    } catch (err) {
      throw new Error(`Failed to create checkpoint: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleApplyCompression = async () => {
    if (!compressionResult) return;

    try {
      setApplying(true);
      setError(null);

      // Create checkpoint before applying compression (key feature)
      const newCheckpointId = await handleCreateCheckpoint();

      // Apply compression via chrome extension
      await chromeExtensionBridge.applyCompression(workspaceId, sessionId, compressionResult);

      console.log('Compression applied with checkpoint:', newCheckpointId);
      console.log('Original tokens:', compressionResult.originalTokens);
      console.log('Compressed tokens:', compressionResult.compressedTokens);
      console.log('Compression ratio:', compressionResult.compressionRatio);

      onApply();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply compression');
    } finally {
      setApplying(false);
    }
  };

  const handleRestoreCheckpoint = async () => {
    if (!checkpointId) return;

    try {
      const result = await storageMigration.restoreCheckpoint(workspaceId, sessionId, checkpointId);
      if (result.success) {
        console.log('Restored to checkpoint:', result.newRunId);
        onApply(); // Refresh the parent component
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore checkpoint');
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div>
            <h2 className="text-xl font-bold flex items-center">
              <FiMinimize2 className="mr-3 text-teal-500" />
              Compression Preview
            </h2>
            <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Strategy: {strategy.name} • Target: {formatNumber(targetTokens)} tokens
            </p>
          </div>
          <Button onClick={onClose} className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100'} p-2`}>
            <FiX className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
              <span className="ml-3">Generating compression preview...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <div className="flex items-center">
                <FiAlertTriangle className="mr-2" />
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {compressionResult && (
            <div className="space-y-6">
              {/* Compression Summary */}
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4`}>
                <h3 className="font-semibold mb-3">Compression Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">
                      {formatNumber(compressionResult.originalTokens)}
                    </div>
                    <div className="text-sm text-gray-500">Original Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {formatNumber(compressionResult.compressedTokens)}
                    </div>
                    <div className="text-sm text-gray-500">Compressed Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">
                      {(compressionResult.compressionRatio * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-500">Compression Ratio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-500">
                      {formatNumber(compressionResult.originalTokens - compressionResult.compressedTokens)}
                    </div>
                    <div className="text-sm text-gray-500">Tokens Saved</div>
                  </div>
                </div>
              </div>

              {/* Before/After Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Content */}
                <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4`}>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <FiEye className="mr-2 text-blue-500" />
                    Original Content ({compressionResult.original.length} items)
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {compressionResult.original.slice(0, 10).map((item, index) => (
                      <div key={item.id} className={`${isDarkMode ? 'bg-slate-600' : 'bg-white'} p-3 rounded border`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-teal-500 uppercase">
                            {item.type}
                            {item.agentId && ` (${item.agentId})`}
                          </span>
                          <span className="text-xs text-gray-500">{item.metadata.tokens} tokens</span>
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {truncateText(item.content)}
                        </p>
                      </div>
                    ))}
                    {compressionResult.original.length > 10 && (
                      <div className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        ... and {compressionResult.original.length - 10} more items
                      </div>
                    )}
                  </div>
                </div>

                {/* Compressed Content */}
                <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4`}>
                  <h4 className="font-semibold mb-3 flex items-center">
                    <FiMinimize2 className="mr-2 text-green-500" />
                    Compressed Content ({compressionResult.compressed.length} items)
                  </h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {compressionResult.compressed.slice(0, 10).map((item, index) => (
                      <div key={item.id} className={`${isDarkMode ? 'bg-slate-600' : 'bg-white'} p-3 rounded border`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-teal-500 uppercase">
                            {item.type}
                            {item.agentId && ` (${item.agentId})`}
                          </span>
                          <span className="text-xs text-gray-500">{item.metadata.tokens} tokens</span>
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {truncateText(item.content)}
                        </p>
                      </div>
                    ))}
                    {compressionResult.compressed.length > 10 && (
                      <div className={`text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        ... and {compressionResult.compressed.length - 10} more items
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Changes Summary */}
              {compressionResult.preview && (
                <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-gray-50'} rounded-lg p-4`}>
                  <h4 className="font-semibold mb-3">Changes Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-red-500 mb-2">
                        Removed Items ({compressionResult.preview.removedItems.length})
                      </h5>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {compressionResult.preview.removedItems.slice(0, 5).map(item => (
                          <div key={item.id} className="text-sm text-gray-500">
                            {item.type}: {truncateText(item.content, 50)}
                          </div>
                        ))}
                        {compressionResult.preview.removedItems.length > 5 && (
                          <div className="text-xs text-gray-400">
                            ... and {compressionResult.preview.removedItems.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-yellow-500 mb-2">
                        Modified Items ({compressionResult.preview.modifiedItems.length})
                      </h5>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {compressionResult.preview.modifiedItems.slice(0, 5).map((item, index) => (
                          <div key={index} className="text-sm text-gray-500">
                            {item.original.type}: Compressed from {item.original.metadata.tokens} to{' '}
                            {item.compressed.metadata.tokens} tokens
                          </div>
                        ))}
                        {compressionResult.preview.modifiedItems.length > 5 && (
                          <div className="text-xs text-gray-400">
                            ... and {compressionResult.preview.modifiedItems.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Checkpoint Information */}
              {checkpointId && (
                <div
                  className={`${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border border-blue-200 rounded-lg p-4`}>
                  <div className="flex items-center mb-2">
                    <FiSave className="mr-2 text-blue-500" />
                    <h4 className="font-medium">Checkpoint Created</h4>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    A checkpoint has been created before compression. You can restore to this point using the
                    time-travel feature.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Checkpoint ID: {checkpointId}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between p-6 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            {checkpointId && (
              <Button onClick={handleRestoreCheckpoint} className="bg-gray-600 hover:bg-gray-700 text-white">
                <FiRotateCcw className="mr-2" />
                Restore Checkpoint
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={onClose}
              className={`${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-200 hover:bg-gray-300'}`}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyCompression}
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={!compressionResult || applying}>
              {applying ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Applying...
                </>
              ) : (
                <>
                  <FiMinimize2 className="mr-2" />
                  Apply Compression
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
