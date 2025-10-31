import React, { useState, useEffect } from 'react';

interface ApprovalModalProps {
  isDarkMode?: boolean;
}

interface ApprovalRequest {
  id: string;
  workspaceId: string;
  autonomyLevel: number;
  plannedActions: string[];
  riskLevel: 'low' | 'medium' | 'high';
  context: string;
  timestamp: number;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ isDarkMode = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<ApprovalRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Listen for approval requests from the background script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'AGENT_APPROVAL_REQUIRED') {
        const request: ApprovalRequest = {
          id: message.requestId || `req_${Date.now()}`,
          workspaceId: message.workspaceId || 'default',
          autonomyLevel: message.autonomyLevel || 3,
          plannedActions: message.plannedActions || [],
          riskLevel: message.riskLevel || 'medium',
          context: message.context || '',
          timestamp: Date.now(),
        };

        setCurrentRequest(request);
        setIsOpen(true);
      }
    };

    // Setup connection to background script
    let port: chrome.runtime.Port | null = null;

    try {
      port = chrome.runtime.connect({ name: 'approval-modal-connection' });
      port.onMessage.addListener(handleMessage);

      port.onDisconnect.addListener(() => {
        console.log('ApprovalModal: Connection disconnected');
        port = null;
      });
    } catch (error) {
      console.error('ApprovalModal: Failed to connect to background script:', error);
    }

    return () => {
      if (port) {
        port.disconnect();
      }
    };
  }, []);

  const handleApprove = async () => {
    if (!currentRequest) return;

    setIsProcessing(true);

    try {
      // Send approval response to background script
      const port = chrome.runtime.connect({ name: 'approval-response-connection' });
      port.postMessage({
        type: 'AGENT_APPROVAL_GRANTED',
        requestId: currentRequest.id,
        workspaceId: currentRequest.workspaceId,
        timestamp: Date.now(),
      });
      port.disconnect();

      console.log('ApprovalModal: Approval granted for request:', currentRequest.id);
    } catch (error) {
      console.error('ApprovalModal: Failed to send approval response:', error);
    } finally {
      setIsProcessing(false);
      setIsOpen(false);
      setCurrentRequest(null);
    }
  };

  const handleReject = async () => {
    if (!currentRequest) return;

    setIsProcessing(true);

    try {
      // Send rejection response to background script
      const port = chrome.runtime.connect({ name: 'approval-response-connection' });
      port.postMessage({
        type: 'AGENT_APPROVAL_REJECTED',
        requestId: currentRequest.id,
        workspaceId: currentRequest.workspaceId,
        timestamp: Date.now(),
      });
      port.disconnect();

      console.log('ApprovalModal: Approval rejected for request:', currentRequest.id);
    } catch (error) {
      console.error('ApprovalModal: Failed to send rejection response:', error);
    } finally {
      setIsProcessing(false);
      setIsOpen(false);
      setCurrentRequest(null);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setIsOpen(false);
      setCurrentRequest(null);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return isDarkMode ? 'text-green-400' : 'text-green-600';
      case 'medium':
        return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
      case 'high':
        return isDarkMode ? 'text-red-400' : 'text-red-600';
      default:
        return isDarkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const getAutonomyLevelInfo = (level: number) => {
    switch (level) {
      case 1:
        return { label: 'Ask First', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
      case 2:
        return { label: 'Cautious', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
      case 3:
        return { label: 'Balanced', color: 'text-teal-400', bgColor: 'bg-teal-500/20' };
      case 4:
        return { label: 'Confident', color: 'text-teal-400', bgColor: 'bg-teal-500/20' };
      case 5:
        return { label: 'Autonomous', color: 'text-green-400', bgColor: 'bg-green-500/20' };
      default:
        return { label: 'Unknown', color: 'text-gray-400', bgColor: 'bg-gray-500/20' };
    }
  };

  if (!isOpen || !currentRequest) {
    return null;
  }

  const autonomyInfo = getAutonomyLevelInfo(currentRequest.autonomyLevel);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Agent Approval Required
              </h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'} disabled:opacity-50`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Workspace and Autonomy Info */}
          <div className={`p-3 rounded-lg ${autonomyInfo.bgColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Workspace: {currentRequest.workspaceId}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`text-sm font-medium ${autonomyInfo.color}`}>
                    {autonomyInfo.label} (Level {currentRequest.autonomyLevel})
                  </span>
                  <div className="w-2 h-2 rounded-full bg-current opacity-60" />
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Risk Level</p>
                <p className={`text-sm font-medium ${getRiskColor(currentRequest.riskLevel)}`}>
                  {currentRequest.riskLevel.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {/* Context */}
          {currentRequest.context && (
            <div>
              <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Context</h3>
              <p
                className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} bg-gray-100 dark:bg-gray-700 p-3 rounded-md`}>
                {currentRequest.context}
              </p>
            </div>
          )}

          {/* Planned Actions */}
          <div>
            <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              Planned Actions ({currentRequest.plannedActions.length})
            </h3>
            <div className="space-y-2">
              {currentRequest.plannedActions.map((action, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-3 p-3 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full ${isDarkMode ? 'bg-teal-600' : 'bg-teal-500'} flex items-center justify-center`}>
                    <span className="text-xs font-medium text-white">{index + 1}</span>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} flex-1`}>{action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Notice */}
          <div
            className={`p-3 rounded-lg ${currentRequest.riskLevel === 'high' ? 'bg-red-500/20' : currentRequest.riskLevel === 'medium' ? 'bg-yellow-500/20' : 'bg-green-500/20'}`}>
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                {currentRequest.riskLevel === 'high' ? (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                ) : currentRequest.riskLevel === 'medium' ? (
                  <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${getRiskColor(currentRequest.riskLevel)}`}>
                  {currentRequest.riskLevel === 'high'
                    ? 'High Risk Actions Detected'
                    : currentRequest.riskLevel === 'medium'
                      ? 'Moderate Risk Actions'
                      : 'Low Risk Actions'}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  {currentRequest.riskLevel === 'high'
                    ? 'These actions may have significant impact. Please review carefully.'
                    : currentRequest.riskLevel === 'medium'
                      ? 'These actions require your approval based on workspace autonomy settings.'
                      : 'These actions are considered safe but require approval due to low autonomy level.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`flex space-x-3 p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className={`flex-1 px-4 py-2 rounded-md transition-colors font-medium ${
              isDarkMode
                ? 'bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white'
                : 'bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700'
            } disabled:opacity-50`}>
            {isProcessing ? 'Processing...' : 'Reject'}
          </button>
          <button
            onClick={handleApprove}
            disabled={isProcessing}
            className={`flex-1 px-4 py-2 rounded-md transition-colors font-medium ${
              currentRequest.riskLevel === 'high'
                ? isDarkMode
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
                : isDarkMode
                  ? 'bg-teal-600 hover:bg-teal-500 text-white'
                  : 'bg-teal-500 hover:bg-teal-600 text-white'
            } disabled:opacity-50 flex items-center justify-center`}>
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Approve & Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
