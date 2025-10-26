import { useEffect, useState } from 'react';
import './StatusChip.css';

interface AIStatus {
  provider: 'nano' | 'cloud' | 'unknown';
  nano: {
    availability: 'available' | 'readily' | 'downloading' | 'unavailable';
  };
  lastError?: string;
}

interface ProviderPreference {
  userPreference: 'nano' | 'cloud';
  nanoAvailable: boolean;
}

const StatusChip = () => {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [preference, setPreference] = useState<ProviderPreference | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Request status from background service worker
    const requestStatus = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'get_ai_status' });
        if (response?.status) {
          setStatus(response.status);
        }

        // Get user's provider preference
        const prefResponse = await chrome.runtime.sendMessage({ type: 'get_provider_preference' });
        if (prefResponse?.preference) {
          setPreference(prefResponse.preference);
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

  const handleProviderChange = async (selectedProvider: 'nano' | 'cloud') => {
    try {
      // Check if Nano is available when user selects it
      if (selectedProvider === 'nano' && status?.nano.availability === 'unavailable') {
        console.warn('[StatusChip] Nano is not available, keeping cloud preference');
        return;
      }

      // Send preference to background service worker
      await chrome.runtime.sendMessage({
        type: 'set_provider_preference',
        payload: { userPreference: selectedProvider },
      });

      // Update local state
      setPreference(prev =>
        prev
          ? { ...prev, userPreference: selectedProvider }
          : { userPreference: selectedProvider, nanoAvailable: false },
      );

      console.log('[StatusChip] Provider preference set to:', selectedProvider);
      setIsExpanded(false);
    } catch (error) {
      console.error('[StatusChip] Failed to set provider preference:', error);
    }
  };

  if (!status || !preference) {
    return null;
  }

  // Nano is available if it's in 'available' or 'readily' state
  const nanoAvailable = status.nano.availability === 'available' || status.nano.availability === 'readily';
  const isNanoSelected = preference.userPreference === 'nano';
  const isCloudSelected = preference.userPreference === 'cloud';

  return (
    <div className="status-chip-container">
      {/* Main Toggle Button */}
      <button
        className={`status-chip-toggle ${isNanoSelected ? 'status-chip-nano' : 'status-chip-cloud'}`}
        onClick={() => setIsExpanded(!isExpanded)}
        title={`Current: ${isNanoSelected ? 'Nano (local)' : 'Cloud (Firebase)'}`}>
        <span className="status-indicator"></span>
        <span className="status-text">{isNanoSelected ? 'Nano: ready' : 'Cloud via Firebase'}</span>
        <span className="status-chip-dropdown-icon">⌄</span>
      </button>

      {/* Dropdown Menu */}
      {isExpanded && (
        <div className="status-chip-menu">
          {/* Nano Option */}
          <button
            className={`status-chip-menu-item ${isNanoSelected ? 'selected' : ''} ${!nanoAvailable ? 'disabled' : ''}`}
            onClick={() => handleProviderChange('nano')}
            disabled={!nanoAvailable}
            title={nanoAvailable ? 'Use local Gemini Nano model' : 'Nano model not available'}>
            <span className="menu-indicator nano"></span>
            <span className="menu-label">Nano: ready</span>
            {isNanoSelected && <span className="menu-checkmark">✓</span>}
            {!nanoAvailable && <span className="menu-unavailable">Unavailable</span>}
          </button>

          {/* Cloud Option */}
          <button
            className={`status-chip-menu-item ${isCloudSelected ? 'selected' : ''}`}
            onClick={() => handleProviderChange('cloud')}
            title="Use Firebase cloud model">
            <span className="menu-indicator cloud"></span>
            <span className="menu-label">Cloud via Firebase</span>
            {isCloudSelected && <span className="menu-checkmark">✓</span>}
          </button>
        </div>
      )}

      {/* Error message if any */}
      {status.lastError && <div className="status-chip-error-hint">{status.lastError}</div>}
    </div>
  );
};

export default StatusChip;
