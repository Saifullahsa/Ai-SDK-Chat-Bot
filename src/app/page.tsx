"use client";
import { useState, useEffect } from "react";
import { MessageSquare, Plus, Trash2, Menu, X } from "lucide-react";

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([
    { id: 1, title: "New Chat", timestamp: "Just now" }
  ]);
  const [activeConvId, setActiveConvId] = useState<number>(1);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [convMessages, setConvMessages] = useState<{ [key: number]: any[] }>({
    1: []
  });

  // Initialize with first conversation
  useEffect(() => {
    if (conversations.length > 0 && activeConvId !== null) {
      setMessages(convMessages[activeConvId] || []);
    }
  }, [activeConvId, conversations, convMessages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Save user message immediately
    if (activeConvId !== null) {
      setConvMessages(prev => ({
        ...prev,
        [activeConvId]: newMessages
      }));

      // Update conversation title based on first message
      setConversations(prev => prev.map(conv =>
        conv.id === activeConvId
          ? { ...conv, title: userMessage.substring(0, 20) + (userMessage.length > 20 ? "..." : "") }
          : conv
      ));
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let aiReply = "";

      // Add empty assistant message that will be updated
      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        aiReply += decoder.decode(value, { stream: true });

        // Update the last message with accumulated response
        const updatedMessages = [...newMessages, { role: "assistant", content: aiReply }];
        setMessages(updatedMessages);

        // Save to conversation history if activeConvId exists
        if (activeConvId !== null) {
          setConvMessages(prev => ({
            ...prev,
            [activeConvId]: updatedMessages
          }));
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessages = [
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your request. Please try again.",
        },
      ];
      setMessages(errorMessages);

      // Save error message to history
      if (activeConvId !== null) {
        setConvMessages(prev => ({
          ...prev,
          [activeConvId]: errorMessages
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    // Save current chat history before creating new chat
    if (activeConvId !== null && messages.length > 0) {
      setConvMessages(prev => ({
        ...prev,
        [activeConvId]: messages
      }));
    }

    const newId = conversations.length > 0 ? Math.max(...conversations.map((c) => c.id)) + 1 : 1;
    const newConv = {
      id: newId,
      title: "New Chat",
      timestamp: "Just now",
    };

    // Add new conversation to the top
    setConversations([newConv, ...conversations]);
    setActiveConvId(newId);
    setMessages([]);
    setConvMessages(prev => ({
      ...prev,
      [newId]: []
    }));
  };

  const deleteConversation = (id: number) => {
    setConversations(conversations.filter((c) => c.id !== id));
    const remainingConvs = conversations.filter((c) => c.id !== id);

    // Delete messages for this conversation
    setConvMessages(prev => {
      const newConvMessages = { ...prev };
      delete newConvMessages[id];
      return newConvMessages;
    });

    if (activeConvId === id) {
      if (remainingConvs.length > 0) {
        const nextId = remainingConvs[0].id;
        setActiveConvId(nextId);
        setMessages(convMessages[nextId] || []);
      } else {
        setActiveConvId(null as any);
        setMessages([]);
      }
    }
  };

  const switchConversation = (id: number) => {
    setActiveConvId(id);
    setMessages(convMessages[id] || []);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-80" : "w-0"} transition-all duration-300 bg-slate-900/50 backdrop-blur-xl border-r border-purple-500/20 flex flex-col overflow-hidden`}
      >
        <div className="p-6 border-b border-purple-500/20">
          <button
            onClick={startNewChat}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/50"
          >
            <Plus size={20} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => switchConversation(conv.id)}
              className={`group p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                activeConvId === conv.id
                  ? "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/50"
                  : "bg-slate-800/50 hover:bg-slate-800/80 border border-transparent"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare
                      size={16}
                      className={activeConvId === conv.id ? "text-purple-400" : "text-slate-400"}
                    />
                    <h3
                      className={`font-medium truncate ${
                        activeConvId === conv.id ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {conv.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">{conv.timestamp}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded-lg"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-purple-500/20">
          <div className="text-xs text-slate-400 text-center">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900/30 backdrop-blur-xl border-b border-purple-500/20 p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={24} className="text-purple-400" /> : <Menu size={24} className="text-purple-400" />}
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            AI Assistant
          </h1>
          <div className="w-10"></div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto flex items-center justify-center">
                  <MessageSquare size={40} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Start a conversation</h2>
                <p className="text-slate-400 max-w-md">
                  Ask me anything! I'm here to help with your questions, ideas, and projects.
                </p>
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-4 duration-300`}
              >
                <div
                  className={`max-w-[75%] p-4 rounded-2xl ${
                    m.role === "user"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-br-none shadow-lg shadow-purple-500/30"
                      : "bg-slate-800/80 backdrop-blur-sm text-slate-100 rounded-bl-none border border-purple-500/30 shadow-lg"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-slate-800/80 backdrop-blur-sm text-slate-100 rounded-2xl rounded-bl-none border border-purple-500/30 shadow-lg p-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-slate-900/30 backdrop-blur-xl border-t border-purple-500/20 p-6">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input
              className="flex-1 bg-slate-800/50 backdrop-blur-sm border-2 border-purple-500/30 rounded-2xl p-4 text-white placeholder-slate-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
              placeholder="Type your message here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              disabled={isLoading}
            />
            <button
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-4 rounded-2xl font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}