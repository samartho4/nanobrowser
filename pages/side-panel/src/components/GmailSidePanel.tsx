import React, { useState } from 'react';

interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  internalDate: string;
}

export function GmailSidePanel() {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
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

  const handleFetchEmails = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = (await sendMessage('LIST_MESSAGES', { maxResults: 10 })) as {
        messages: GmailMessage[];
      };
      setMessages(result.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
      console.error('Fetch emails error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      if (!timestamp) return 'Date N/A';

      const ms = parseInt(timestamp, 10);
      if (isNaN(ms)) return 'Invalid date';

      const date = new Date(ms);
      if (date.toString() === 'Invalid Date') return 'Invalid date';

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  React.useEffect(() => {
    // Auto-fetch emails when panel loads
    handleFetchEmails();
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold mb-3">📧 Gmail Inbox</h2>
        <button
          onClick={handleFetchEmails}
          disabled={loading}
          className="w-full px-3 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition text-sm">
          {loading ? '⏳ Fetching...' : '🔄 Refresh Emails'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Error */}
        {error && (
          <div className="p-4 m-3 bg-red-900/30 border border-red-700 rounded text-red-200 text-sm">
            <p className="font-semibold">❌ Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="p-3 space-y-2">
            {messages.map(msg => {
              const emailMatch = msg.from?.match(/<(.+?)>/) || [msg.from, msg.from];
              const emailAddress = emailMatch[1] || msg.from;
              const senderName = msg.from?.replace(/<.+?>/, '').trim() || emailAddress;

              return (
                <div
                  key={msg.id}
                  className="p-3 bg-gray-800 border border-gray-700 rounded hover:bg-gray-750 hover:border-sky-500 transition cursor-pointer">
                  {/* Sender */}
                  <p className="font-semibold text-gray-100 text-sm truncate">{senderName}</p>
                  <p className="text-xs text-gray-400 truncate">{emailAddress}</p>

                  {/* Subject */}
                  <p className="text-sm text-gray-200 mt-2 line-clamp-1 font-medium">{msg.subject || '(No Subject)'}</p>

                  {/* Preview and Date */}
                  <div className="flex justify-between items-start gap-2 mt-2">
                    <p className="text-xs text-gray-400 line-clamp-2 flex-1">{msg.snippet || '(No preview)'}</p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(msg.internalDate)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && messages.length === 0 && !error && (
          <div className="p-6 text-center text-gray-400">
            <p className="text-sm">Click "Refresh Emails" to load your inbox</p>
          </div>
        )}

        {/* Loading */}
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="mx-auto mb-3 w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-400">Loading emails...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
