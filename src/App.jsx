import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

function App() {
  const [apiEndpoint, setApiEndpoint] = useState(() => {
    return localStorage.getItem('ollamaEndpoint') || 'http://localhost:11434';
  });
  const [isConnected, setIsConnected] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(() => {
    const saved = localStorage.getItem('streamingEnabled');
    return saved !== null ? saved === 'true' : true; // Default to true
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    const isDark = saved !== null ? saved === 'true' : false;
    // Apply dark mode immediately during initialization
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return isDark;
  });
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Apply dark mode to document when it changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${apiEndpoint}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
        setIsConnected(true);
        if (data.models && data.models.length > 0 && !selectedModel) {
          setSelectedModel(data.models[0].name);
        }
      } else {
        setIsConnected(false);
        setModels([]);
      }
    } catch {
      setIsConnected(false);
      setModels([]);
    }
  };

  // Load models when endpoint changes
  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiEndpoint]);

  const saveEndpoint = () => {
    localStorage.setItem('ollamaEndpoint', apiEndpoint);
    checkConnection();
    setShowSettings(false);
  };

  const toggleStreaming = () => {
    const newValue = !streamingEnabled;
    setStreamingEnabled(newValue);
    localStorage.setItem('streamingEnabled', String(newValue));
  };

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem('darkMode', String(newValue));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedModel || isStreaming) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);

    // Create assistant message placeholder
    const assistantMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`${apiEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: inputMessage,
          stream: streamingEnabled,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (streamingEnabled) {
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                setMessages(prev => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  // Create a new message object instead of mutating
                  if (updated[lastIndex].role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: updated[lastIndex].content + json.response
                    };
                  }
                  return updated;
                });
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }
      } else {
        // Handle non-streaming response
        const data = await response.json();
        if (data.response) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex].role === 'assistant') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: data.response
              };
            }
            return updated;
          });
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error streaming response:', error);
        setMessages(prev => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (updated[lastIndex].role === 'assistant' && !updated[lastIndex].content) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: 'Error: Failed to get response from Ollama server.'
            };
          }
          return updated;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-blue-600 dark:bg-blue-800 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">Ollama Web UI</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-700 rounded transition"
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 border-b shadow-md p-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                  Ollama API Endpoint
                </label>
                <input
                  type="text"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="http://localhost:11434"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                  Select Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={models.length === 0}
                >
                  {models.length === 0 ? (
                    <option>No models available</option>
                  ) : (
                    models.map((model) => (
                      <option key={model.name} value={model.name}>
                        {model.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-medium dark:text-gray-300">Dark Mode</span>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    darkMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={saveEndpoint}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Save & Test Connection
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
              <h2 className="text-3xl font-bold mb-4">Welcome to Ollama Web UI</h2>
              <p className="text-lg">Select a model and start chatting!</p>
              <p className="text-sm mt-2">
                Current model: <span className="font-semibold">{selectedModel || 'None'}</span>
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow'
                }`}
              >
                <div className="font-semibold mb-1">
                  {message.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="prose prose-sm max-w-none">
                  {message.role === 'assistant' ? (
                    <ReactMarkdown>{message.content || '...'}</ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t shadow-lg p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 mb-2">
            <button
              onClick={clearChat}
              className="px-3 py-1 text-sm bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition"
              disabled={messages.length === 0}
            >
              Clear Chat
            </button>
            {isStreaming && (
              <button
                onClick={handleStopGeneration}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Stop Generation
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-700 dark:text-gray-300">Stream responses</span>
                <button
                  onClick={toggleStreaming}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    streamingEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  disabled={isStreaming}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      streamingEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="3"
              disabled={!selectedModel || isStreaming}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !selectedModel || isStreaming}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isStreaming ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
