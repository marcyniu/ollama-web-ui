import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageSquarePlus, History, Settings, ChevronLeft, ChevronRight, X, Pencil, Trash2, Plus, Image, ChevronDown, ChevronUp } from 'lucide-react';
import packageJson from '../package.json';

// Component to render message content with thinking section
function MessageContent({ content, role }) {
  const [isThinkingCollapsed, setIsThinkingCollapsed] = useState(true);
  
  if (role === 'user') {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }
  
  const { thinking, response, isThinkingInProgress } = parseThinkingContent(content);
  
  return (
    <>
      {(thinking || isThinkingInProgress) && (
        <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              THINKING
            </div>
            {thinking && (
              <button
                onClick={() => setIsThinkingCollapsed(!isThinkingCollapsed)}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label={isThinkingCollapsed ? "Expand thinking" : "Collapse thinking"}
              >
                {isThinkingCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                )}
              </button>
            )}
          </div>
          {isThinkingInProgress && !thinking && (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-500 dark:bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
              </span>
            </div>
          )}
          {thinking && !isThinkingCollapsed && (
            <div className="text-sm italic text-gray-600 dark:text-gray-400">
              <ReactMarkdown>{thinking}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
      {response && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
      )}
      {!response && !thinking && !isThinkingInProgress && (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>...</ReactMarkdown>
        </div>
      )}
    </>
  );
}

// Helper function to parse thinking content from response
function parseThinkingContent(content) {
  if (!content) return { thinking: '', response: '', isThinkingInProgress: false };
  
  // Check if there's an unclosed think tag (thinking in progress during streaming)
  const hasOpenTag = /<think(?:ing)?>/.test(content);
  const hasCloseTag = /<\/think(?:ing)?>/.test(content);
  const isThinkingInProgress = hasOpenTag && !hasCloseTag;
  
  // Match both <think> and <thinking> tags (only completed tags)
  const thinkRegex = /<think(?:ing)?>(.*?)<\/think(?:ing)?>/gs;
  let thinking = '';
  let response = content;
  
  const matches = content.matchAll(thinkRegex);
  for (const match of matches) {
    thinking += match[1];
    response = response.replace(match[0], '');
  }
  
  // If thinking is in progress, remove the incomplete tag from response
  if (isThinkingInProgress) {
    response = response.replace(/<think(?:ing)?>.*$/s, '');
  }
  
  return {
    thinking: thinking.trim(),
    response: response.trim(),
    isThinkingInProgress
  };
}

function App() {
  // Endpoint management
  const [endpoints, setEndpoints] = useState(() => {
    const saved = localStorage.getItem('ollamaEndpoints');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: '1', name: 'Local Ollama', url: 'http://localhost:11434', active: true }
    ];
  });
  
  const [apiEndpoint, setApiEndpoint] = useState(() => {
    const saved = localStorage.getItem('ollamaEndpoints');
    if (saved) {
      const endpoints = JSON.parse(saved);
      const activeEndpoint = endpoints.find(e => e.active);
      return activeEndpoint ? activeEndpoint.url : 'http://localhost:11434';
    }
    return 'http://localhost:11434';
  });
  const [isConnected, setIsConnected] = useState(false);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedModelSupportsVision, setSelectedModelSupportsVision] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [menuCollapsed, setMenuCollapsed] = useState(() => {
    const saved = localStorage.getItem('menuCollapsed');
    return saved !== null ? saved === 'true' : false;
  });
  const [activeView, setActiveView] = useState('chat'); // 'chat' | 'history'
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
  
  // Chat history management
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentChatId, setCurrentChatId] = useState(null);
  
  // Endpoint management modal states
  const [showEndpointManager, setShowEndpointManager] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState(null);
  const [endpointName, setEndpointName] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Helper function to detect vision-capable models
  const isVisionModel = (modelName) => {
    if (!modelName) return false;
    const lowerName = modelName.toLowerCase();
    return lowerName.includes('llava') || 
           lowerName.includes('bakllava') || 
           lowerName.includes('vision') || 
           lowerName.includes('minicpm-v') ||  
           lowerName.includes('moondream') ||
           lowerName.includes('gemma2') ||
           lowerName.includes('gemma3');
  };

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

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  // Prune old chats on mount and when starting new chat
  useEffect(() => {
    pruneOldChats();
  }, []);

  const pruneOldChats = () => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    setChatHistory(prev => {
      const filtered = prev.filter(chat => chat.timestamp > thirtyDaysAgo);
      return filtered;
    });
  };

  const saveCurrentChat = useCallback(() => {
    if (messages.length === 0) return;

    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return;

    const title = firstUserMessage.content.length > 200 
      ? firstUserMessage.content.substring(0, 200) + '...'
      : firstUserMessage.content;

    setChatHistory(prev => {
      const existingIndex = prev.findIndex(chat => chat.id === currentChatId);
      const chatData = {
        id: currentChatId || Date.now().toString(),
        title,
        messages: [...messages],
        timestamp: existingIndex >= 0 ? prev[existingIndex].timestamp : Date.now(),
        lastUpdated: Date.now()
      };

      if (!currentChatId) {
        setCurrentChatId(chatData.id);
      }

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = chatData;
        return updated;
      } else {
        return [chatData, ...prev];
      }
    });
  }, [messages, currentChatId]);

  // Save current chat whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveCurrentChat();
    }
  }, [messages, saveCurrentChat]);

  const loadChatFromHistory = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chat.id);
      setActiveView('chat');
    }
  };

  const deleteChatFromHistory = (chatId) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setMessages([]);
      setCurrentChatId(null);
    }
  };

  const checkConnection = async () => {
    try {
      const response = await fetch(`${apiEndpoint}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        // Sort models alphabetically by name
        const sortedModels = (data.models || []).sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        setModels(sortedModels);
        setIsConnected(true);
        // Auto-select first model if models are available
        if (sortedModels.length > 0) {
          const firstModel = sortedModels[0].name;
          setSelectedModel(firstModel);
          setSelectedModelSupportsVision(isVisionModel(firstModel));
        }
      } else {
        setIsConnected(false);
        setModels([]);
        setSelectedModel('');
      }
    } catch {
      setIsConnected(false);
      setModels([]);
      setSelectedModel('');
    }
  };

  // Update vision capability when model changes
  useEffect(() => {
    setSelectedModelSupportsVision(isVisionModel(selectedModel));
    // Clear image when switching models
    setSelectedImage(null);
    setImagePreview(null);
  }, [selectedModel]);

  // Load models when endpoint changes
  useEffect(() => {
    // Clear current selection and reconnect when endpoint changes
    setSelectedModel('');
    setIsConnected(false);
    setModels([]);
    
    // Small delay to ensure state is cleared before reconnecting
    const timer = setTimeout(() => {
      checkConnection();
    }, 100);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiEndpoint]);

  // Endpoint CRUD operations
  const addEndpoint = () => {
    if (!endpointName.trim() || !endpointUrl.trim()) return;
    
    const newEndpoint = {
      id: Date.now().toString(),
      name: endpointName.trim(),
      url: endpointUrl.trim(),
      active: false
    };
    
    const updatedEndpoints = [...endpoints, newEndpoint];
    setEndpoints(updatedEndpoints);
    localStorage.setItem('ollamaEndpoints', JSON.stringify(updatedEndpoints));
    setEndpointName('');
    setEndpointUrl('');
  };
  
  const updateEndpoint = () => {
    if (!editingEndpoint || !endpointName.trim() || !endpointUrl.trim()) return;
    
    const updatedEndpoints = endpoints.map(ep => 
      ep.id === editingEndpoint.id 
        ? { ...ep, name: endpointName.trim(), url: endpointUrl.trim() }
        : ep
    );
    
    setEndpoints(updatedEndpoints);
    localStorage.setItem('ollamaEndpoints', JSON.stringify(updatedEndpoints));
    
    // Update active endpoint if editing the active one
    if (editingEndpoint.active) {
      setApiEndpoint(endpointUrl.trim());
    }
    
    setEditingEndpoint(null);
    setEndpointName('');
    setEndpointUrl('');
  };
  
  const deleteEndpoint = (id) => {
    const endpointToDelete = endpoints.find(ep => ep.id === id);
    if (endpoints.length === 1) {
      alert('Cannot delete the last endpoint');
      return;
    }
    
    const updatedEndpoints = endpoints.filter(ep => ep.id !== id);
    
    // If deleting active endpoint, activate the first remaining one
    if (endpointToDelete.active && updatedEndpoints.length > 0) {
      updatedEndpoints[0].active = true;
      setApiEndpoint(updatedEndpoints[0].url);
    }
    
    setEndpoints(updatedEndpoints);
    localStorage.setItem('ollamaEndpoints', JSON.stringify(updatedEndpoints));
  };
  
  const selectEndpoint = (id) => {
    const updatedEndpoints = endpoints.map(ep => ({
      ...ep,
      active: ep.id === id
    }));
    
    const selectedEndpoint = updatedEndpoints.find(ep => ep.id === id);
    if (selectedEndpoint) {
      setApiEndpoint(selectedEndpoint.url);
      setEndpoints(updatedEndpoints);
      localStorage.setItem('ollamaEndpoints', JSON.stringify(updatedEndpoints));
    }
  };
  
  const startEditEndpoint = (endpoint) => {
    setEditingEndpoint(endpoint);
    setEndpointName(endpoint.name);
    setEndpointUrl(endpoint.url);
  };
  
  const cancelEditEndpoint = () => {
    setEditingEndpoint(null);
    setEndpointName('');
    setEndpointUrl('');
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

  const toggleMenu = () => {
    const newValue = !menuCollapsed;
    setMenuCollapsed(newValue);
    localStorage.setItem('menuCollapsed', String(newValue));
  };

  const handleNewChat = () => {
    pruneOldChats();
    setMessages([]);
    setCurrentChatId(null);
    setActiveView('chat');
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !selectedModel || isStreaming) return;

    const userMessage = { role: 'user', content: inputMessage };
    if (selectedImage) {
      userMessage.image = imagePreview;
    }
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsStreaming(true);

    // Create assistant message placeholder
    const assistantMessage = { role: 'assistant', content: '' };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();
      
      // Build the messages array for the API - include conversation history
      const apiMessages = messages
        .concat([userMessage])
        .map(msg => {
          const apiMsg = {
            role: msg.role,
            content: msg.content
          };
          // Add images for vision models if present
          if (msg.image && selectedModelSupportsVision) {
            // Extract base64 data from data URL
            const base64Data = msg.image.split(',')[1];
            apiMsg.images = [base64Data];
          }
          return apiMsg;
        });
      
      const response = await fetch(`${apiEndpoint}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
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
              // /api/chat uses 'message.content' instead of 'response'
              if (json.message?.content) {
                setMessages(prev => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex].role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: updated[lastIndex].content + json.message.content
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
        // /api/chat returns message object with content
        if (data.message?.content) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex].role === 'assistant') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: data.message.content
              };
            }
            return updated;
          });
        }
      }
      // Clear image after successful send
      clearImage();
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
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Left Sidebar Menu */}
      <div
        className={`${
          menuCollapsed ? 'w-16' : 'w-64'
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 shadow-lg`}
      >
        {/* Menu Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          {!menuCollapsed && (
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Menu</h2>
          )}
          <button
            onClick={toggleMenu}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={menuCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {menuCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav className={`flex-1 p-2 space-y-1 ${menuCollapsed ? '' : 'overflow-y-auto'}`}>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors group relative"
            title={menuCollapsed ? 'New Chat' : ''}
          >
            <MessageSquarePlus className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            {!menuCollapsed && (
              <span className="text-gray-700 dark:text-gray-200 font-medium">New Chat</span>
            )}
            {menuCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                New Chat
              </div>
            )}
          </button>

          {!menuCollapsed && (
            <>
              <div className="pt-4 pb-2">
                <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Chat History
                </h3>
              </div>
              
              <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto chat-history-scrollbar">
                {chatHistory.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No chat history
                  </div>
                ) : (
                  chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors ${
                        currentChatId === chat.id ? 'bg-blue-50 dark:bg-gray-700' : ''
                      }`}
                    >
                      <button
                        onClick={() => loadChatFromHistory(chat.id)}
                        className="flex-1 text-left text-sm text-gray-700 dark:text-gray-200 truncate"
                        title={chat.title}
                      >
                        {chat.title}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatFromHistory(chat.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-opacity"
                        title="Delete chat"
                        aria-label="Delete chat"
                      >
                        <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {menuCollapsed && (
            <button
              onClick={() => setActiveView('history')}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors group relative ${
                activeView === 'history' ? 'bg-blue-50 dark:bg-gray-700' : ''
              }`}
              title="Chat History"
            >
              <History className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                Chat History
              </div>
            </button>
          )}
        </nav>

        {/* Settings at Bottom */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors group relative"
            title={menuCollapsed ? 'Settings' : ''}
          >
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            {!menuCollapsed && (
              <span className="text-gray-700 dark:text-gray-200 font-medium">Settings</span>
            )}
            {menuCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                Settings
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-blue-600 dark:bg-blue-800 text-white p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Ollama Web UI</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500 dark:bg-blue-700 rounded-full">
                v{packageJson.version}
              </span>
            </div>
            
            {/* Current Endpoint Display */}
            <div className="flex items-center gap-2 text-sm bg-blue-700 dark:bg-blue-900 px-3 py-1.5 rounded-lg">
              <span className="opacity-80">Endpoint:</span>
              <span className="font-semibold">{endpoints.find(e => e.active)?.name || 'Unknown'}</span>
            </div>
            
            {/* Model Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="model-select" className="text-sm opacity-80">Model:</label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-3 py-1.5 bg-blue-700 dark:bg-blue-900 text-white rounded-lg border border-blue-500 dark:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                disabled={models.length === 0}
              >
                {models.length === 0 ? (
                  <option>No models</option>
                ) : (
                  models.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </header>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold dark:text-white">Settings</h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Close settings"
                  >
                    <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Endpoint Management */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium dark:text-gray-300">
                        Manage Endpoints
                      </label>
                      <button
                        onClick={() => setShowEndpointManager(!showEndpointManager)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Endpoint
                      </button>
                    </div>
                    
                    {/* Endpoint List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {endpoints.map((endpoint) => (
                        <div
                          key={endpoint.id}
                          className={`p-3 rounded-lg border ${
                            endpoint.active
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-sm dark:text-white truncate">
                                  {endpoint.name}
                                </h4>
                                {endpoint.active && (
                                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                                {endpoint.url}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {!endpoint.active && (
                                <button
                                  onClick={() => selectEndpoint(endpoint.id)}
                                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition"
                                  title="Set as active"
                                >
                                  Use
                                </button>
                              )}
                              <button
                                onClick={() => startEditEndpoint(endpoint)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition"
                                title="Edit endpoint"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteEndpoint(endpoint.id)}
                                className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                                disabled={endpoints.length === 1}
                                title="Delete endpoint"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Add/Edit Endpoint Form */}
                    {(showEndpointManager || editingEndpoint) && (
                      <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                        <h4 className="font-semibold mb-3 dark:text-white">
                          {editingEndpoint ? 'Edit Endpoint' : 'Add New Endpoint'}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium mb-1 dark:text-gray-300">
                              Endpoint Name
                            </label>
                            <input
                              type="text"
                              value={endpointName}
                              onChange={(e) => setEndpointName(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Local Ollama"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 dark:text-gray-300">
                              Endpoint URL
                            </label>
                            <input
                              type="text"
                              value={endpointUrl}
                              onChange={(e) => setEndpointUrl(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="http://localhost:11434"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={editingEndpoint ? updateEndpoint : addEndpoint}
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                              {editingEndpoint ? 'Update' : 'Add'}
                            </button>
                            <button
                              onClick={() => {
                                if (editingEndpoint) {
                                  cancelEditEndpoint();
                                } else {
                                  setShowEndpointManager(false);
                                  setEndpointName('');
                                  setEndpointUrl('');
                                }
                              }}
                              className="px-3 py-1.5 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm font-medium dark:text-gray-300">Dark Mode</span>
                      <button
                        onClick={toggleDarkMode}
                        aria-label="Toggle dark mode"
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
                  
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowSettings(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      Close
                    </button>
                    <div className="flex-1 flex items-center justify-end text-xs text-gray-500 dark:text-gray-400">
                      Version {packageJson.version}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area - Chat or History */}
        {activeView === 'chat' ? (
          <>
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
                      {message.image && (
                        <div className="mb-2">
                          <img 
                            src={message.image} 
                            alt="Uploaded content" 
                            className="max-w-xs rounded-lg"
                          />
                        </div>
                      )}
                      <MessageContent content={message.content} role={message.role} />
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
                        aria-label="Toggle streaming responses"
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
                {/* Image Preview */}
                {imagePreview && (
                  <div className="mb-2 relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Selected" 
                      className="max-h-32 rounded-lg border-2 border-blue-500"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <div className="flex-1 flex flex-col gap-2">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={selectedModelSupportsVision ? "Type your message... (You can attach an image)" : "Type your message... (Press Enter to send, Shift+Enter for new line)"}
                      aria-label="Chat message input"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows="3"
                      disabled={!selectedModel || isStreaming}
                    />
                    {/* Image Upload Button - Only shown for vision models */}
                    {selectedModelSupportsVision && (
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                          disabled={isStreaming}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isStreaming}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Attach image"
                        >
                          <Image className="w-4 h-4" />
                          {selectedImage ? 'Change Image' : 'Attach Image'}
                        </button>
                        {selectedImage && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {selectedImage.name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || !selectedModel || isStreaming}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed h-fit"
                  >
                    {isStreaming ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Chat History View */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Chat History</h2>
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No chat history available yet</p>
                  <p className="text-sm mt-2">Your conversation history will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatHistory.map((chat) => {
                    const date = new Date(chat.timestamp);
                    const formattedDate = date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={chat.id}
                        className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <button
                            onClick={() => loadChatFromHistory(chat.id)}
                            className="flex-1 text-left"
                          >
                            <h3 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                              {chat.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <span>{formattedDate}</span>
                              <span>•</span>
                              <span>{chat.messages.length} messages</span>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this chat?')) {
                                deleteChatFromHistory(chat.id);
                              }
                            }}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete chat"
                            aria-label="Delete chat"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
