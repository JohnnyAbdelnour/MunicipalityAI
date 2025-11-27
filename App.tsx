import React, { useState, useRef, useEffect, useCallback } from 'react';
import { geminiService } from './services/gemini';
import { Message, ChatState, Attachment, KBDocument } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { Trash2, Sun, Moon, Building2, Database, X, RefreshCw, CheckCircle2, FileText, Github, DownloadCloud, AlertCircle } from 'lucide-react';
import { fetchGitHubRepoContents } from './services/github';

const INITIAL_MESSAGE: Message = {
    id: 'welcome-msg',
    role: 'model',
    text: 'أنا اسمي زان روبوت البلدية. كيف فيي ساعدك؟',
    timestamp: Date.now()
};

// Robust Logo Component
const LogoImage = ({ className }: { className: string }) => {
    const [error, setError] = useState(false);
    // Use thumbnail endpoint for better reliability than export=view
    const src = "https://drive.google.com/thumbnail?id=1skMXh8fVb3H6aI5FKsVAK1TzxqlyvXLR&sz=s400";
    
    if (error) {
        return (
            <div className={`${className} bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center`}>
                <Building2 className="text-emerald-500 w-1/2 h-1/2" />
            </div>
        );
    }
    
    return (
        <img 
            src={src} 
            alt="Logo" 
            className={className} 
            onError={() => setError(true)}
        />
    );
};

const App: React.FC = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [INITIAL_MESSAGE],
    isLoading: false,
    error: null,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showRepo, setShowRepo] = useState(false);
  
  // Repo State - Strictly GitHub
  const [githubRepoUrl, setGithubRepoUrl] = useState('JohnnyAbdelnour/zan_knowledge_base');
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  
  // Widget Mode Detection
  const [isWidget, setIsWidget] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsWidget(params.get('mode') === 'widget');
  }, []);

  // Initialize Theme
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleClearChat = useCallback(() => {
    geminiService.reset();
    setChatState({
      messages: [INITIAL_MESSAGE],
      isLoading: false,
      error: null,
    });
  }, []);

  const handleGitHubSync = useCallback(async (repoUrl: string) => {
    if (!repoUrl.trim()) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
        const docs = await fetchGitHubRepoContents(repoUrl);
        if (docs.length === 0) {
            setSyncError("No valid text files found in this repo.");
            setDocuments([]);
        } else {
            setDocuments(docs);
            geminiService.updateContext(docs, `GitHub Repo: ${repoUrl}`);
            geminiService.reset();
             setChatState(prev => ({
                ...prev,
                messages: prev.messages.length > 1 ? prev.messages : [INITIAL_MESSAGE],
                isLoading: false,
                error: null
            }));
        }
    } catch (err: any) {
        setSyncError(err.message || "Failed to fetch GitHub repo.");
        setDocuments([]);
    } finally {
        setIsSyncing(false);
    }
  }, []);

  // Initial Sync Logic - Auto load GitHub on mount
  useEffect(() => {
    if (githubRepoUrl) {
        handleGitHubSync(githubRepoUrl);
    }
  }, []); 

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
        const next = !prev;
        if (next) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        return next;
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages.length, chatState.messages[chatState.messages.length - 1]?.text]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClearChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme, handleClearChat]);

  const sendMessage = useCallback(async (text: string, attachments: Attachment[] = []) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      attachments: attachments,
      timestamp: Date.now(),
    };

    const botMessageId = (Date.now() + 1).toString();
    const initialBotMessage: Message = {
      id: botMessageId,
      role: 'model',
      text: '',
      isStreaming: true,
      timestamp: Date.now(),
    };

    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage, initialBotMessage],
      isLoading: true,
      error: null,
    }));

    try {
      await geminiService.sendMessageStream(text, attachments, (chunk) => {
        setChatState((prev) => {
          const newMessages = [...prev.messages];
          const lastMsgIndex = newMessages.findIndex(m => m.id === botMessageId);
          if (lastMsgIndex !== -1) {
            newMessages[lastMsgIndex] = {
              ...newMessages[lastMsgIndex],
              text: newMessages[lastMsgIndex].text + chunk,
            };
          }
          return { ...prev, messages: newMessages };
        });
      });

      setChatState((prev) => {
        const newMessages = [...prev.messages];
        const lastMsgIndex = newMessages.findIndex(m => m.id === botMessageId);
        if (lastMsgIndex !== -1) {
          newMessages[lastMsgIndex] = {
            ...newMessages[lastMsgIndex],
            isStreaming: false,
          };
        }
        return { ...prev, isLoading: false, messages: newMessages };
      });

    } catch (error) {
      console.error(error);
      setChatState((prev) => {
          const msgs = prev.messages.filter(m => m.id !== botMessageId);
          return {
              ...prev,
              messages: msgs,
              isLoading: false,
              error: "Something went wrong. Please try again."
          }
      });
    }
  }, []);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="text-red-500" size={20} />;
      case 'xlsx': return <Database className="text-green-500" size={20} />;
      case 'docx': return <FileText className="text-blue-500" size={20} />;
      case 'md': return <FileText className="text-slate-700 dark:text-slate-300" size={20} />;
      case 'json': return <Database className="text-amber-500" size={20} />;
      default: return <FileText className="text-slate-400" size={20} />;
    }
  };

  return (
    <div className={`flex h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-900' : 'bg-gray-50'}`}>
      
      {/* Repository Sidebar - Hide completely in Widget Mode */}
      {!isWidget && (
          <div 
            className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-800 shadow-2xl transform transition-transform duration-300 z-50 border-l border-slate-200 dark:border-slate-700 flex flex-col ${
              showRepo ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-none">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded flex items-center justify-center text-white bg-slate-800">
                    <Github size={18} />
                </div>
                <div className="flex flex-col">
                    <h2 className="font-semibold text-slate-800 dark:text-white text-sm">
                        GitHub Repo
                    </h2>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Knowledge Base Source</span>
                </div>
              </div>
              <button 
                onClick={() => setShowRepo(false)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
              {/* Source Selection / Config Area */}
              <div className="mb-6 space-y-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                        <label className="block text-xs text-slate-500 mb-1">Public Repo Name (owner/repo)</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="e.g. facebook/react"
                                value={githubRepoUrl}
                                onChange={(e) => setGithubRepoUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGitHubSync(githubRepoUrl)}
                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                            />
                            <button 
                                onClick={() => handleGitHubSync(githubRepoUrl)}
                                disabled={isSyncing || !githubRepoUrl}
                                className="bg-slate-800 dark:bg-slate-700 text-white p-2 rounded hover:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50"
                            >
                                {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            Supported: .md, .txt, .json, .csv. <br/>Files are fetched directly from GitHub API.
                        </p>
                    </div>
              </div>

              {/* Status Bar */}
              <div className={`mb-4 p-3 rounded-lg border text-xs transition-all duration-500 ${
                syncError
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-800 dark:text-red-200'
                    : isSyncing 
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-800 dark:text-amber-200' 
                        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              }`}>
                 {syncError ? (
                     <div className="flex items-start gap-2">
                         <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                         <p>{syncError}</p>
                     </div>
                 ) : isSyncing ? (
                     <div className="flex items-center gap-2">
                         <RefreshCw size={14} className="animate-spin" />
                         <p className="font-medium">Syncing Knowledge Base...</p>
                     </div>
                 ) : (
                    <>
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 size={12} />
                            <p className="font-medium">Context Active</p>
                        </div>
                        <p className="opacity-80 truncate">
                            Repo: {githubRepoUrl}
                        </p>
                    </>
                 )}
              </div>

              {/* File List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3 px-1">
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Documents</h3>
                     <span className="text-[10px] text-slate-400">{documents.length} items</span>
                </div>
                
                {documents.length === 0 && !isSyncing && !syncError && (
                    <div className="text-center py-8 text-slate-400 text-xs">
                        No compatible documents found.
                    </div>
                )}

                {documents.map((file, idx) => (
                  <div 
                    key={file.id} 
                    className="group p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-default"
                    style={{ opacity: isSyncing ? 0.5 : 1, transitionDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getFileIcon(file.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate pr-2" title={file.name}>
                            {file.name}
                            </p>
                            {file.url && (
                                <a href={file.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DownloadCloud size={12} />
                                </a>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-600 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300">
                            {file.type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      )}

      {/* Main App Content */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        {/* Overlay when Repo is open on small screens - Only if not Widget */}
        {showRepo && !isWidget && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setShowRepo(false)}
          />
        )}

        {/* Header */}
        <header className={`flex-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-30 sticky top-0 ${isWidget ? 'h-14' : 'h-16 lg:px-8'}`}>
          <div className="flex items-center gap-2">
            <div className={`${isWidget ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg overflow-hidden shadow-lg shadow-emerald-500/20`}>
                <LogoImage className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h1 className={`font-semibold leading-tight tracking-tight text-slate-800 dark:text-white ${isWidget ? 'text-base' : 'text-lg'}`}>Zan<span className="text-emerald-500">Municipality</span></h1>
              {/* Show Status only if NOT in Widget Mode to keep header clean, OR if syncing */}
              {(!isWidget || isSyncing) && (
                  isSyncing ? (
                     <span className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
                        <RefreshCw size={10} className="animate-spin" />
                        Syncing...
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        Connected
                    </span>
                  )
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            
            {/* Repo Button - Hide in Widget Mode */}
            {!isWidget && (
                <>
                <button
                  onClick={() => setShowRepo(!showRepo)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    showRepo 
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Github size={14} />
                  <span className="hidden sm:inline">Knowledge Base</span>
                  {isSyncing ? (
                    <div className="w-4 h-4 rounded-full bg-slate-300 animate-pulse"></div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center">
                        {documents.length}
                    </div>
                  )}
                </button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                </>
            )}

            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button 
              onClick={handleClearChat} 
              className="p-2 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </header>

        {/* Main Chat Area */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth">
          <div className={`mx-auto px-4 py-8 min-h-full flex flex-col ${isWidget ? 'max-w-full' : 'max-w-4xl'}`}>
            
            {/* Empty State / Welcome Area */}
            {chatState.messages.length <= 1 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] mb-8">
                <div className="w-20 h-20 rounded-2xl overflow-hidden mb-6 shadow-xl shadow-emerald-500/20">
                     <LogoImage className="w-full h-full object-cover" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Zan Assistant</h2>
                
                <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6 text-sm">
                  {isSyncing ? (
                      <span className="flex items-center justify-center gap-2">
                          <RefreshCw size={14} className="animate-spin" /> Establishing secure connection to Archive...
                      </span>
                  ) : (
                       <>Synced with GitHub Repo: <span className="font-semibold text-blue-600 dark:text-blue-400 block sm:inline">{githubRepoUrl}</span>.</>
                  )}
                </p>

                {!isSyncing && !syncError && (
                    <div className="flex items-center gap-2 mb-8 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-100 dark:border-blue-800">
                    <CheckCircle2 size={14} />
                    <span>{documents.length} Documents Indexed</span>
                    </div>
                )}
                
                {/* Hide detailed suggestions in widget mode to save space, or show less */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl transition-opacity duration-500 ${isSyncing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                  {[
                    "What is the waste collection schedule?",
                    "How much is the business license fee?",
                    !isWidget && "What are the zoning regulations?",
                    !isWidget && "Summarize the latest public transport changes."
                  ].filter(Boolean).map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(prompt as string)}
                      className="text-left p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-md transition-all duration-200 group"
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {chatState.messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Error Message */}
            {chatState.error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-300 text-sm text-center mb-6">
                {chatState.error}
              </div>
            )}
            
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* Input Area */}
        <footer className="flex-none bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900 pt-10 pb-2 z-10">
          <ChatInput onSend={sendMessage} isLoading={chatState.isLoading} />
        </footer>
      </div>
    </div>
  );
};

export default App;