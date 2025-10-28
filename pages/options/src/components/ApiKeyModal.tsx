import { useState } from 'react';
import { Tool, ConfigField } from '../types/tools';
import { FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface ApiKeyModalProps {
  tool: Tool;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Record<string, string>) => Promise<void>;
  initialConfig?: Record<string, string>;
  isDarkMode?: boolean;
}

export const ApiKeyModal = ({
  tool,
  isOpen,
  onClose,
  onSave,
  initialConfig = {},
  isDarkMode = false,
}: ApiKeyModalProps) => {
  const [config, setConfig] = useState<Record<string, string>>(initialConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isOAuthFlow, setIsOAuthFlow] = useState(false);

  if (!isOpen) return null;

  const isGmail = tool.id === 'gmail';

  const handleOAuthClick = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsOAuthFlow(true);

      // Send message to background to initiate OAuth authentication
      chrome.runtime.sendMessage(
        {
          type: 'TOOL_REQUEST',
          tool: 'gmail',
          action: 'AUTHENTICATE', // Changed from INITIALIZE to AUTHENTICATE
        },
        response => {
          if (response?.success) {
            // OAuth flow completed successfully
            // Save empty config to mark tool as configured
            handleSave();
          } else {
            setError(response?.error || 'Failed to authenticate. Please try again.');
            setLoading(false);
            setIsOAuthFlow(false);
          }
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate authentication');
      setLoading(false);
      setIsOAuthFlow(false);
    }
  };

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    // Show fallback emoji
    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
    if (fallback) fallback.style.display = 'block';
  };

  const handleInputChange = (fieldId: string, value: string) => {
    setConfig(prev => ({ ...prev, [fieldId]: value }));
    setError(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      const emptyFields = tool.configFields
        .filter(field => field.required && !config[field.id]?.trim())
        .map(field => field.label);

      if (emptyFields.length > 0) {
        setError(`Missing required fields: ${emptyFields.join(', ')}`);
        return;
      }

      await onSave(config);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: ConfigField) => {
    const baseInputClass = `w-full rounded-lg border ${
      isDarkMode
        ? 'border-slate-600 bg-slate-700 text-gray-200 placeholder-gray-400'
        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
    } px-4 py-2 text-sm transition-colors focus:border-blue-500 focus:outline-none`;

    return (
      <div key={field.id} className="space-y-2">
        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          {field.label}
          {field.required && <span className="ml-1 text-red-500">*</span>}
        </label>

        {field.type === 'textarea' ? (
          <textarea
            value={config[field.id] || ''}
            onChange={e => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={baseInputClass}
          />
        ) : field.type === 'select' && field.options ? (
          <select
            value={config[field.id] || ''}
            onChange={e => handleInputChange(field.id, e.target.value)}
            className={baseInputClass}>
            <option value="">Select an option</option>
            {field.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type}
            value={config[field.id] || ''}
            onChange={e => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        )}

        {field.helpText && (
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{field.helpText}</p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`w-full max-w-md rounded-lg shadow-lg ${
          isDarkMode ? 'bg-slate-800 text-gray-100' : 'bg-white text-gray-900'
        }`}>
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b ${
            isDarkMode ? 'border-slate-700' : 'border-gray-200'
          } px-6 py-4`}>
          <div className="flex items-center gap-3">
            <div
              className="relative h-14 w-14 flex-shrink-0 rounded-lg p-1.5 flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: 'transparent' }}>
              {/* Logo Image */}
              <img src={tool.logo} alt={tool.name} className="h-full w-full object-contain" onError={handleLogoError} />
              {/* Fallback Emoji */}
              <span className="text-3xl" style={{ display: 'none' }}>
                {tool.icon || '🔧'}
              </span>
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                Configure {tool.name}
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{tool.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className={`rounded-lg p-2 transition-colors ${
              isDarkMode ? 'hover:bg-slate-700 disabled:opacity-50' : 'hover:bg-gray-100 disabled:opacity-50'
            }`}>
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 px-6 py-4">
          {/* Error Message */}
          {error && (
            <div
              className={`flex items-start gap-3 rounded-lg border ${
                isDarkMode ? 'border-red-600 bg-red-950/30 text-red-200' : 'border-red-300 bg-red-50 text-red-700'
              } p-3`}>
              <FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div
              className={`flex items-start gap-3 rounded-lg border ${
                isDarkMode
                  ? 'border-green-600 bg-green-950/30 text-green-200'
                  : 'border-green-300 bg-green-50 text-green-700'
              } p-3`}>
              <FiCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="text-sm">
                {isGmail ? 'Gmail authenticated successfully!' : 'Configuration saved successfully!'}
              </p>
            </div>
          )}

          {/* Gmail OAuth Info */}
          {isGmail && !success && (
            <div
              className={`rounded-lg border ${
                isDarkMode ? 'border-blue-700 bg-blue-950/30 text-blue-200' : 'border-blue-300 bg-blue-50 text-blue-700'
              } p-3`}>
              <p className="text-xs font-medium">📧 Gmail Authentication</p>
              <p className="text-xs leading-relaxed">
                Click the button below to securely authenticate with your Google account. We'll only access your email
                with your permission.
              </p>
            </div>
          )}

          {/* Form Fields (hidden for Gmail) */}
          {!isGmail && <div className="space-y-4">{tool.configFields.map(field => renderField(field))}</div>}

          {/* Security Note */}
          <div
            className={`rounded-lg border ${
              isDarkMode ? 'border-blue-700 bg-blue-950/30 text-blue-200' : 'border-blue-300 bg-blue-50 text-blue-700'
            } p-3`}>
            <p className="text-xs font-medium">🔒 Security</p>
            <p className="text-xs leading-relaxed">
              {isGmail
                ? 'Your authentication tokens are stored securely in your browser and never shared externally.'
                : "Your API keys are stored securely in your browser's local storage and never sent to external servers except when making authorized API calls."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex gap-3 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'} px-6 py-4`}>
          <button
            onClick={onClose}
            disabled={loading}
            className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              isDarkMode
                ? 'border-slate-600 hover:bg-slate-700 disabled:opacity-50'
                : 'border-gray-300 hover:bg-gray-50 disabled:opacity-50'
            }`}>
            Cancel
          </button>

          {isGmail ? (
            <button
              onClick={handleOAuthClick}
              disabled={loading || success}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                success
                  ? 'bg-green-600'
                  : isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                    : 'bg-blue-500 hover:bg-blue-600 disabled:opacity-50'
              }`}>
              {loading
                ? isOAuthFlow
                  ? 'Authenticating...'
                  : 'Saving...'
                : success
                  ? '✅ Connected!'
                  : 'Authenticate with Google'}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading || success}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                success
                  ? 'bg-green-600'
                  : isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
                    : 'bg-blue-500 hover:bg-blue-600 disabled:opacity-50'
              }`}>
              {loading ? 'Saving...' : success ? 'Saved!' : 'Save Configuration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
