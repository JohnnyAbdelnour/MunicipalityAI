import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Mic, StopCircle, Paperclip, X } from 'lucide-react';
import { Attachment } from '../types';

interface ChatInputProps {
  onSend: (message: string, attachments: Attachment[]) => void;
  isLoading: boolean;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSend = () => {
    if ((input.trim() || attachments.length > 0) && !isLoading) {
      onSend(input.trim(), attachments);
      setInput('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift) OR Ctrl+Enter
    if (e.key === 'Enter' && (!e.shiftKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Capture the current input value before starting recording
    const currentInputBase = input;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      
      // Determine if we need a space between the existing text and the new transcript
      const spacer = (currentInputBase && !currentInputBase.endsWith(' ') && !transcript.startsWith(' ')) ? ' ' : '';
      setInput(currentInputBase + spacer + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Only support images and PDFs for now as they are most common for multimodal
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert(`Unsupported file type: ${file.type}. Please upload images or PDFs.`);
        continue;
      }

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Strip the data:image/png;base64, part
        const base64Content = base64Data.split(',')[1];

        newAttachments.push({
          type: file.type.startsWith('image/') ? 'image' : 'file',
          mimeType: file.type,
          url: base64Data, // Keep full URL for preview
          data: base64Content
        });
      } catch (error) {
        console.error("Error reading file:", error);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    // Reset file input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-6 pt-2">
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto py-2 px-1">
          {attachments.map((att, index) => (
            <div key={index} className="relative group flex-shrink-0">
              <div className="w-20 h-20 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {att.type === 'image' ? (
                  <img src={att.url} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-500 font-medium p-1 text-center truncate w-full">PDF</span>
                )}
              </div>
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-white dark:bg-slate-800 p-2 rounded-3xl shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-700">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple
          accept="image/*,application/pdf"
        />
        
        {/* Attachment Button */}
        <button
          onClick={handleFileClick}
          disabled={isLoading}
          className="flex-shrink-0 w-10 h-10 mb-1 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Attach images or files"
        >
          <Paperclip size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening..." : "Message Zan..."}
          className="flex-1 max-h-[120px] min-h-[44px] py-3 px-2 bg-transparent border-none outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none overflow-y-auto custom-scrollbar"
          rows={1}
          disabled={isLoading}
        />
        
        {/* Voice Input Button */}
        <button
          onClick={toggleListening}
          disabled={isLoading}
          className={`flex-shrink-0 w-10 h-10 mb-1 rounded-full flex items-center justify-center transition-all duration-200 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          title={isListening ? "Stop Recording" : "Start Recording"}
        >
          {isListening ? <StopCircle size={20} /> : <Mic size={20} />}
        </button>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!input.trim() && attachments.length === 0) || isLoading}
          className={`flex-shrink-0 w-10 h-10 mb-1 rounded-full flex items-center justify-center transition-all duration-200 ${
            (input.trim() || attachments.length > 0) && !isLoading
              ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md transform hover:scale-105'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <SendHorizontal size={20} />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;