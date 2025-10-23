import { useEffect, useState } from 'react';
import './StatusChip.css';

interface AIStatus {
  provider: 'nano' | 'cloud' | 'unknown';
  nano: {
    availability: 'available' | 'readily' | 'downloading' | 'unavailable';
  };
  lastError?: string;
}

const StatusChip = () => {
  const [status, setStatus] = useState<AIStatus | null>(null);

  useEffect(() => {
    // Request status from background service worker
    const requestStatus = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'get_ai_status' });
        if (response?.status) {
          setStatus(response.status);
        }
      } catch (error) {
        console.error('[StatusChip] Failed to get AI status:', error);
      }
    };

    // Initial status request
    requestStatus();

    // Poll for status updates every 30 seconds
    const interval = setInterval(requestStatus, 30000);

    // Listen for visibility changes to refresh status when panel becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        requestStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!status) {
    return null;
  }

  // Determine display text and style based on status
  const isNanoReady =
    status.provider === 'nano' && (status.nano.availability === 'available' || status.nano.availability === 'readily');

  const displayText = isNanoReady ? 'Nano: ready' : 'Cloud via Firebase';
  const chipClass = isNanoReady ? 'status-chip-nano' : 'status-chip-cloud';

  return (
    <div className={`status-chip ${chipClass}`} title={status.lastError || undefined}>
      <span className="status-indicator"></span>
      <span className="status-text">{displayText}</span>
    </div>
  );
};

export default StatusChip;
