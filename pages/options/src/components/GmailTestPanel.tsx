import React, { useState } from 'react';

interface GmailProfile {
  id: string;
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
}

interface GmailMessagePreview {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  internalDate: string;
}

export function GmailTestPanel() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<GmailProfile | null>(null);
  const [messages, setMessages] = useState<GmailMessagePreview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = (action: string, payload?: any) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: 'TOOL_REQUEST',
          tool: 'gmail',
          action,
          payload: payload || {},
        },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.data);
          }
        },
      );
    });
  };

  const handleGetProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = (await sendMessage('GET_PROFILE')) as GmailProfile;
      console.log('Profile result:', result);
      setProfile(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Get profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleListMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = (await sendMessage('LIST_MESSAGES', { maxResults: 5 })) as {
        messages: GmailMessagePreview[];
      };
      console.log('Messages result:', result);
      setMessages(result.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('List messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      if (!timestamp) return 'Date unavailable';

      // Gmail's internalDate is in milliseconds
      const ms = parseInt(timestamp, 10);
      if (isNaN(ms)) return 'Invalid date';

      const date = new Date(ms);
      if (date.toString() === 'Invalid Date') return 'Invalid date';

      // Format: "Oct 26, 2025 3:45 PM"
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">📧 Gmail Testing Panel</h2>
        <p className="text-gray-600">Test Gmail API operations</p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleGetProfile}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition">
          {loading ? '⏳ Loading...' : '👤 Get Profile'}
        </button>
        <button
          onClick={handleListMessages}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition">
          {loading ? '⏳ Loading...' : '📨 List Emails'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-semibold">❌ Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Profile Display */}
      {profile && (
        <div className="mb-6 p-4 bg-white border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">👤 Profile Information</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium text-gray-700">Email:</span>{' '}
              <span className="text-gray-600">{profile.emailAddress}</span>
            </p>
            <p>
              <span className="font-medium text-gray-700">Total Messages:</span>{' '}
              <span className="text-gray-600">{profile.messagesTotal}</span>
            </p>
            <p>
              <span className="font-medium text-gray-700">Total Threads:</span>{' '}
              <span className="text-gray-600">{profile.threadsTotal}</span>
            </p>
          </div>
        </div>
      )}

      {/* Messages Display */}
      {messages.length > 0 && (
        <div className="p-4 bg-white border border-indigo-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📨 Recent Emails ({messages.length})</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map(msg => {
              // Parse email from header (e.g., "John Doe <john@example.com>" -> "john@example.com")
              const emailMatch = msg.from?.match(/<(.+?)>/) || [msg.from, msg.from];
              const emailAddress = emailMatch[1] || msg.from;
              const senderName = msg.from?.replace(/<.+?>/, '').trim() || emailAddress;

              return (
                <div
                  key={msg.id}
                  className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg hover:shadow-md transition">
                  {/* Header with sender and date */}
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{senderName}</p>
                      <p className="text-xs text-gray-500 truncate">{emailAddress}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(msg.internalDate)}</span>
                  </div>

                  {/* Subject */}
                  <p className="text-sm font-medium text-gray-800 mb-2 line-clamp-2">{msg.subject || '(No Subject)'}</p>

                  {/* Preview */}
                  <p className="text-sm text-gray-600 line-clamp-2">{msg.snippet || '(No preview)'}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!profile && messages.length === 0 && !error && (
        <div className="p-6 text-center bg-white border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Click a button above to fetch Gmail data</p>
        </div>
      )}
    </div>
  );
}
