import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Copy, Check, FileText } from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col max-w-[85%] md:max-w-[75%] gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Attachments (only for User currently) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {message.attachments.map((att, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {att.type === 'image' ? (
                  <img src={att.url} alt="attachment" className="max-w-[200px] max-h-[200px] object-cover block" />
                ) : (
                  <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center p-2">
                    <FileText className="text-slate-400 mb-1" size={24} />
                    <span className="text-[10px] text-slate-500 font-mono truncate w-full text-center">FILE</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser ? 'bg-primary-600 text-white' : 'bg-green-600 text-white'
          }`}>
            {isUser ? <User size={16} /> : <Bot size={16} />}
          </div>

          {/* Bubble */}
          <div className={`relative px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed overflow-hidden ${
            isUser 
              ? 'bg-primary-600 text-white rounded-tr-sm' 
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
          }`}>
            
            {/* Markdown Content */}
            {message.text ? (
                <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'dark:prose-invert prose-slate'}`}>
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                    a: ({ node, ...props }) => <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                    code: ({ node, ...props }) => {
                        const { className, children, ...rest } = props;
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !String(children).includes('\n');
                        return isInline ? (
                            <code className={`${isUser ? 'bg-primary-700' : 'bg-slate-100 dark:bg-slate-700'} px-1 py-0.5 rounded font-mono text-xs`} {...rest}>
                                {children}
                            </code>
                        ) : (
                            <div className="relative my-4 rounded-md overflow-hidden bg-slate-900 text-slate-50 p-3 text-xs font-mono">
                               <code className="block whitespace-pre-wrap break-words" {...rest}>{children}</code>
                            </div>
                        );
                    },
                    ul: ({node, ...props}) => <ul className="list-disc list-outside ml-4 mb-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-4 mb-2" {...props} />,
                    li: ({node, ...props}) => <li className="mb-1" {...props} />
                  }}
                >
                  {message.text}
                </ReactMarkdown>
              </div>
            ) : (
                /* Handle cases where text is empty but attachments exist (rare with current logic but good for safety) */
                <span className="italic opacity-50">Sent an attachment</span>
            )}
            

            {/* Loading Cursor for Bot */}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 align-middle bg-current opacity-70 animate-pulse" />
            )}

            {/* Copy Button (Bot Only) */}
            {!isUser && !message.isStreaming && message.text.length > 0 && (
              <button 
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Copy message"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;