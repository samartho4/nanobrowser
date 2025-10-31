import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FaMicrophone } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { FiGlobe, FiMail, FiDatabase, FiFile, FiClock, FiUser, FiChevronDown } from 'react-icons/fi';
import { t } from '@extension/i18n';
import { contextManager } from '../../../../chrome-extension/src/services/context/ContextManager';

interface ChatInputProps {
  onSendMessage: (text: string, displayText?: string) => void;
  onStopTask: () => void;
  onMicClick?: () => void;
  isRecording?: boolean;
  isProcessingSpeech?: boolean;
  disabled: boolean;
  showStopButton: boolean;
  setContent?: (setter: (text: string) => void) => void;
  isDarkMode?: boolean;
  // Historical session ID - if provided, shows replay button instead of send button
  historicalSessionId?: string | null;
  onReplay?: (sessionId: string) => void;
}

// @-mention suggestion interface
interface AtMentionSuggestion {
  id: string;
  mention: string;
  type: 'tab' | 'page' | 'gmail' | 'memory' | 'history' | 'agent';
  description: string;
  preview?: string;
  tokens?: number;
  agentId?: string;
  icon: React.ComponentType<{ className?: string }>;
}

// File attachment interface
interface AttachedFile {
  name: string;
  content: string;
  type: string;
}

export default function ChatInput({
  onSendMessage,
  onStopTask,
  onMicClick,
  isRecording = false,
  isProcessingSpeech = false,
  disabled,
  showStopButton,
  setContent,
  isDarkMode = false,
  historicalSessionId,
  onReplay,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showAtMentions, setShowAtMentions] = useState(false);
  const [atMentionSuggestions, setAtMentionSuggestions] = useState<AtMentionSuggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [atMentionQuery, setAtMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  const isSendButtonDisabled = useMemo(
    () => disabled || (text.trim() === '' && attachedFiles.length === 0),
    [disabled, text, attachedFiles],
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Generate @-mention suggestions
  const generateAtMentionSuggestions = useCallback(async (query: string): Promise<AtMentionSuggestion[]> => {
    const suggestions: AtMentionSuggestion[] = [];
    const lowerQuery = query.toLowerCase();

    // Tab suggestions
    if ('tab'.includes(lowerQuery) || 'active'.includes(lowerQuery)) {
      suggestions.push({
        id: 'tab-active',
        mention: '@active',
        type: 'tab',
        description: 'Current active tab content',
        preview: 'Include content from the currently active browser tab',
        tokens: 500,
        icon: FiGlobe,
      });

      for (let i = 0; i < 5; i++) {
        suggestions.push({
          id: `tab-${i}`,
          mention: `@tab:${i}`,
          type: 'tab',
          description: `Tab ${i} content`,
          preview: `Include content from browser tab ${i}`,
          tokens: 400,
          icon: FiGlobe,
        });
      }
    }

    // Page suggestions
    if ('page'.includes(lowerQuery)) {
      suggestions.push({
        id: 'page-current',
        mention: '@page',
        type: 'page',
        description: 'Current page content',
        preview: 'Include visible content from current page',
        tokens: 600,
        icon: FiGlobe,
      });
    }

    // Gmail suggestions
    if ('gmail'.includes(lowerQuery) || 'email'.includes(lowerQuery)) {
      suggestions.push({
        id: 'gmail-recent',
        mention: '@gmail',
        type: 'gmail',
        description: 'Recent Gmail messages',
        preview: 'Include recent email messages from Gmail',
        tokens: 800,
        icon: FiMail,
      });
    }

    // Memory suggestions
    if ('memory'.includes(lowerQuery)) {
      suggestions.push({
        id: 'memory-facts',
        mention: '@memory[facts]',
        type: 'memory',
        description: 'Stored facts and preferences',
        preview: 'Include semantic memory facts',
        tokens: 300,
        icon: FiDatabase,
      });

      suggestions.push({
        id: 'memory-patterns',
        mention: '@memory[patterns]',
        type: 'memory',
        description: 'Learned workflow patterns',
        preview: 'Include procedural memory patterns',
        tokens: 400,
        icon: FiDatabase,
      });
    }

    // History suggestions
    if ('history'.includes(lowerQuery)) {
      suggestions.push({
        id: 'history-recent',
        mention: '@history',
        type: 'history',
        description: 'Recent conversation history',
        preview: 'Include recent chat messages',
        tokens: 700,
        icon: FiClock,
      });
    }

    // Agent suggestions (subagent results)
    if ('agent'.includes(lowerQuery) || 'research'.includes(lowerQuery)) {
      suggestions.push({
        id: 'agent-research',
        mention: '@agent:research',
        type: 'agent',
        description: 'Research agent results',
        preview: 'Include results from research subagent',
        tokens: 600,
        agentId: 'research-agent',
        icon: FiUser,
      });
    }

    if ('agent'.includes(lowerQuery) || 'writer'.includes(lowerQuery)) {
      suggestions.push({
        id: 'agent-writer',
        mention: '@agent:writer',
        type: 'agent',
        description: 'Writer agent results',
        preview: 'Include results from writer subagent',
        tokens: 500,
        agentId: 'writer-agent',
        icon: FiUser,
      });
    }

    // Filter and sort by relevance
    return suggestions
      .filter(s => s.mention.toLowerCase().includes(lowerQuery) || s.description.toLowerCase().includes(lowerQuery))
      .slice(0, 8); // Limit to 8 suggestions
  }, []);

  // Handle text changes and @-mention detection
  const handleTextChange = useCallback(
    async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      const cursorPos = e.target.selectionStart;
      setText(newText);
      setCursorPosition(cursorPos);

      // Resize textarea
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
      }

      // Check for @-mention
      const textBeforeCursor = newText.slice(0, cursorPos);
      const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9:[\]]*?)$/);

      if (atMatch) {
        const query = atMatch[1];
        setAtMentionQuery(query);
        const suggestions = await generateAtMentionSuggestions(query);
        setAtMentionSuggestions(suggestions);
        setShowAtMentions(suggestions.length > 0);
        setSelectedSuggestionIndex(0);
      } else {
        setShowAtMentions(false);
        setAtMentionSuggestions([]);
        setAtMentionQuery('');
      }
    },
    [generateAtMentionSuggestions],
  );

  // Expose a method to set content from outside
  useEffect(() => {
    if (setContent) {
      setContent(setText);
    }
  }, [setContent]);

  // Initial resize when component mounts
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
    }
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedText = text.trim();

      if (trimmedText || attachedFiles.length > 0) {
        let messageContent = trimmedText;
        let displayContent = trimmedText;

        // Security: Clearly separate user input from file content
        // The background service will sanitize file content using guardrails
        if (attachedFiles.length > 0) {
          const fileContents = attachedFiles
            .map(file => {
              // Tag file content for background service to identify and sanitize
              return `\n\n<nano_file_content type="file" name="${file.name}">\n${file.content}\n</nano_file_content>`;
            })
            .join('\n');

          // Combine user message with tagged file content (for background service)
          messageContent = trimmedText
            ? `${trimmedText}\n\n<nano_attached_files>${fileContents}</nano_attached_files>`
            : `<nano_attached_files>${fileContents}</nano_attached_files>`;

          // Create display version with only filenames (for UI)
          const fileList = attachedFiles.map(file => `📎 ${file.name}`).join('\n');
          displayContent = trimmedText ? `${trimmedText}\n\n${fileList}` : fileList;
        }

        onSendMessage(messageContent, displayContent);
        setText('');
        setAttachedFiles([]);
      }
    },
    [text, attachedFiles, onSendMessage],
  );

  // Handle @-mention selection
  const selectAtMention = useCallback(
    async (suggestion: AtMentionSuggestion) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Replace the @query with the selected mention
      const textBeforeCursor = text.slice(0, cursorPosition);
      const textAfterCursor = text.slice(cursorPosition);
      const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9:[\]]*?)$/);

      if (atMatch) {
        const beforeAt = textBeforeCursor.slice(0, atMatch.index);
        const newText = beforeAt + suggestion.mention + ' ' + textAfterCursor;
        setText(newText);

        // Set cursor position after the mention
        const newCursorPos = beforeAt.length + suggestion.mention.length + 1;
        setTimeout(() => {
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);

        // TODO: Create context pill when @agent:* options are selected
        // This will be handled by the ContextManager in the options page
      }

      setShowAtMentions(false);
      setAtMentionSuggestions([]);
    },
    [text, cursorPosition],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle @-mention navigation
      if (showAtMentions && atMentionSuggestions.length > 0) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedSuggestionIndex(prev => (prev < atMentionSuggestions.length - 1 ? prev + 1 : 0));
            return;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : atMentionSuggestions.length - 1));
            return;
          case 'Tab':
          case 'Enter':
            if (!e.shiftKey) {
              e.preventDefault();
              selectAtMention(atMentionSuggestions[selectedSuggestionIndex]);
              return;
            }
            break;
          case 'Escape':
            e.preventDefault();
            setShowAtMentions(false);
            setAtMentionSuggestions([]);
            return;
        }
      }

      // Regular enter handling
      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !showAtMentions) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit, showAtMentions, atMentionSuggestions, selectedSuggestionIndex, selectAtMention],
  );

  const handleReplay = useCallback(() => {
    if (historicalSessionId && onReplay) {
      onReplay(historicalSessionId);
    }
  }, [historicalSessionId, onReplay]);

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: AttachedFile[] = [];
    const allowedTypes = ['.txt', '.md', '.markdown', '.json', '.csv', '.log', '.xml', '.yaml', '.yml'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

      // Check if file type is allowed
      if (!allowedTypes.includes(fileExt)) {
        console.warn(`File type ${fileExt} not supported. Only text-based files are allowed.`);
        continue;
      }

      // Check file size (limit to 1MB)
      if (file.size > 1024 * 1024) {
        console.warn(`File ${file.name} is too large. Maximum size is 1MB.`);
        continue;
      }

      try {
        const content = await file.text();
        newFiles.push({
          name: file.name,
          content,
          type: file.type || 'text/plain',
        });
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
    }

    if (newFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="relative">
      {/* @-mention dropdown */}
      {showAtMentions && atMentionSuggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className={`absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-lg border shadow-lg z-50 ${
            isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
          }`}>
          <div
            className={`px-3 py-2 text-xs font-medium border-b ${
              isDarkMode ? 'text-gray-400 border-slate-600' : 'text-gray-600 border-gray-200'
            }`}>
            @-mentions ({atMentionSuggestions.length})
          </div>

          {atMentionSuggestions.map((suggestion, index) => {
            const IconComponent = suggestion.icon;
            const isSelected = index === selectedSuggestionIndex;

            return (
              <div
                key={suggestion.id}
                onClick={() => selectAtMention(suggestion)}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? isDarkMode
                      ? 'bg-slate-700 text-white'
                      : 'bg-teal-50 text-teal-900'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-slate-700'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}>
                <IconComponent className={`w-4 h-4 ${isSelected ? 'text-teal-500' : 'text-gray-400'}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{suggestion.mention}</span>

                    {suggestion.agentId && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          isDarkMode ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {suggestion.agentId.replace('-agent', '')}
                      </span>
                    )}

                    {suggestion.tokens && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          isDarkMode ? 'bg-slate-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {suggestion.tokens}
                      </span>
                    )}
                  </div>

                  <div className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {suggestion.description}
                  </div>

                  {suggestion.preview && (
                    <div className={`text-xs truncate mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {suggestion.preview}
                    </div>
                  )}
                </div>

                <FiChevronDown
                  className={`w-3 h-3 transform transition-transform ${
                    isSelected ? 'rotate-180' : ''
                  } ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                />
              </div>
            );
          })}

          <div
            className={`px-3 py-2 text-xs border-t ${
              isDarkMode ? 'text-gray-500 border-slate-600' : 'text-gray-400 border-gray-200'
            }`}>
            Use ↑↓ to navigate, Enter/Tab to select, Esc to close
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`overflow-hidden rounded-lg border transition-colors ${disabled ? 'cursor-not-allowed' : 'focus-within:border-sky-400 hover:border-sky-400'} ${isDarkMode ? 'border-slate-700' : ''}`}
        aria-label={t('chat_input_form')}>
        <div className="flex flex-col">
          {/* File attachments display */}
          {attachedFiles.length > 0 && (
            <div
              className={`flex flex-wrap gap-2 border-b p-2 ${
                isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'
              }`}>
              {attachedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                    isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  }`}>
                  <span className="text-xs">📎</span>
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className={`ml-1 rounded-sm transition-colors ${
                      isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-gray-300'
                    }`}
                    aria-label={`Remove ${file.name}`}>
                    <span className="text-xs">✕</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            aria-disabled={disabled}
            rows={5}
            className={`w-full resize-none border-none p-2 focus:outline-none ${
              disabled
                ? isDarkMode
                  ? 'cursor-not-allowed bg-slate-800 text-gray-400'
                  : 'cursor-not-allowed bg-gray-100 text-gray-500'
                : isDarkMode
                  ? 'bg-slate-800 text-gray-200'
                  : 'bg-white'
            }`}
            placeholder={attachedFiles.length > 0 ? 'Add a message (optional)...' : t('chat_input_placeholder')}
            aria-label={t('chat_input_editor')}
          />

          <div
            className={`flex items-center justify-between px-2 py-1.5 ${
              disabled ? (isDarkMode ? 'bg-slate-800' : 'bg-gray-100') : isDarkMode ? 'bg-slate-800' : 'bg-white'
            }`}>
            <div className="flex gap-2 text-gray-500">
              {/* File attachment button */}
              <button
                type="button"
                onClick={handleFileSelect}
                disabled={disabled}
                aria-label="Attach files"
                title="Attach text files (txt, md, json, csv, etc.)"
                className={`rounded-md p-1.5 transition-colors ${
                  disabled
                    ? 'cursor-not-allowed opacity-50'
                    : isDarkMode
                      ? 'text-gray-400 hover:bg-slate-700 hover:text-gray-200'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}>
                <span className="text-lg">📎</span>
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.markdown,.json,.csv,.log,.xml,.yaml,.yml"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden="true"
              />

              {onMicClick && (
                <button
                  type="button"
                  onClick={onMicClick}
                  disabled={disabled || isProcessingSpeech}
                  aria-label={
                    isProcessingSpeech
                      ? t('chat_stt_processing')
                      : isRecording
                        ? t('chat_stt_recording_stop')
                        : t('chat_stt_input_start')
                  }
                  className={`rounded-md p-1.5 transition-colors ${
                    disabled || isProcessingSpeech
                      ? 'cursor-not-allowed opacity-50'
                      : isRecording
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : isDarkMode
                          ? 'text-gray-400 hover:bg-slate-700 hover:text-gray-200'
                          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}>
                  {isProcessingSpeech ? (
                    <AiOutlineLoading3Quarters className="size-4 animate-spin" />
                  ) : (
                    <FaMicrophone className={`size-4 ${isRecording ? 'animate-pulse' : ''}`} />
                  )}
                </button>
              )}
            </div>

            {showStopButton ? (
              <button
                type="button"
                onClick={onStopTask}
                className="rounded-md bg-red-500 px-3 py-1 text-white transition-colors hover:bg-red-600">
                {t('chat_buttons_stop')}
              </button>
            ) : historicalSessionId ? (
              <button
                type="button"
                onClick={handleReplay}
                disabled={!historicalSessionId}
                aria-disabled={!historicalSessionId}
                className={`rounded-md bg-green-500 px-3 py-1 text-white transition-colors hover:enabled:bg-green-600 ${!historicalSessionId ? 'cursor-not-allowed opacity-50' : ''}`}>
                {t('chat_buttons_replay')}
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSendButtonDisabled}
                aria-disabled={isSendButtonDisabled}
                className={`rounded-md bg-[#19C2FF] px-3 py-1 text-white transition-colors hover:enabled:bg-[#0073DC] ${isSendButtonDisabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                {t('chat_buttons_send')}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
