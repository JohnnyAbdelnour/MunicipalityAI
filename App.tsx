import React, { useState, useRef, useEffect, useCallback } from 'react';
import { geminiService } from './services/gemini';
import { Message, ChatState, Attachment } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { Trash2, Sun, Moon, Building2, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Theme
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
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

  const handleClearChat = useCallback(() => {
    geminiService.reset();
    setChatState({
      messages: [],
      isLoading: false,
      error: null,
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change, but only if we are adding new ones or streaming
  useEffect(() => {
    scrollToBottom();
  }, [chatState.messages.length, chatState.messages[chatState.messages.length - 1]?.text]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Theme: Ctrl+Shift+T
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
      }
      // Clear Chat: Ctrl+Shift+C
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
          // Remove the failed bot message
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

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-900' : 'bg-gray-50'}`}>
      
      {/* Header */}
      <header className="flex-none h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 z-10 sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
            <Building2 size={18} fill="currentColor" />
          </div>
          <div className="flex flex-col">
             <h1 className="font-semibold text-lg leading-tight tracking-tight text-slate-800 dark:text-white">Zane<span className="text-emerald-500">Municipality</span></h1>
             <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                Archive Sync Active
             </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDarkMode ? "Switch to Light Mode (Ctrl+Shift+T)" : "Switch to Dark Mode (Ctrl+Shift+T)"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button 
            onClick={handleClearChat} 
            className="p-2 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Clear Chat (Ctrl+Shift+C)"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth">
        <div className="max-w-4xl mx-auto px-4 py-8 min-h-full flex flex-col">
          
          {/* Empty State */}
          {chatState.messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
              <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/20">
                <Building2 size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Welcome to Zane Municipality</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
                We are synced with the internal municipal archives. We can answer questions about taxes, waste collection, and permits.
              </p>

              <div className="flex items-center gap-2 mb-8 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-100 dark:border-blue-800">
                <CheckCircle2 size={14} />
                <span>Verified Data from Municipal Docs</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {[
                  "When is trash collection for North Zane?",
                  "What is the tax rate for a retail business?",
                  "How much does a building permit cost?",
                  "Are BBQ fires allowed in Central Park?"
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(prompt)}
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
  );
};

export default App;