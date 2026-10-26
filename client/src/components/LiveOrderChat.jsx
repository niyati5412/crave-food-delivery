import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { playMessagePop } from '../utils/audio';
import { MessageSquare, Send, User, Bike, ChevronDown, ChevronUp } from 'lucide-react';

export default function LiveOrderChat({ orderId, partnerName = 'Courier Partner' }) {
  const { user } = useSelector((state) => state.auth);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    fetchMessages();

    const socket = getSocket();
    if (socket) {
      socket.on('chat:new_message', (msg) => {
        setMessages((prev) => [...prev, msg]);
        if (msg.senderId !== user?._id) {
          playMessagePop();
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('chat:new_message');
      }
    };
  }, [orderId, user]);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/${orderId}`);
      if (res.data.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.warn('Failed to load chat history:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    try {
      setSending(true);
      const text = inputText.trim();
      setInputText('');

      const res = await api.post(`/chat/${orderId}`, { message: text });
      if (res.data.success) {
        // Appended via socket broadcast or fallback local push
        if (!messages.find(m => m._id === res.data.chatMsg._id)) {
          setMessages(prev => [...prev, res.data.chatMsg]);
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const quickReplies = user?.role === 'customer'
    ? ['Please ring bell twice', 'Leave at door', 'Gate code is 402', 'Thank you!']
    : ['On my way now', 'Arrived outside building', 'Thermal package verified', 'Have a great meal!'];

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
      
      {/* Header bar with toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-stone-50 border-b border-stone-100 flex items-center justify-between cursor-pointer hover:bg-stone-100/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-citrus-100 text-citrus-700 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-charcoal-900">
              Live Courier Contact Channel
            </h4>
            <p className="text-[10px] text-stone-500">
              Direct telemetry chat with {partnerName}
            </p>
          </div>
        </div>

        <button className="text-stone-400">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 space-y-3">
          
          {/* Scrollable messages viewport */}
          <div className="h-44 overflow-y-auto space-y-2.5 pr-1">
            {messages.length === 0 ? (
              <p className="text-[11px] text-stone-400 text-center py-8 italic">
                No messages yet. Send a note to coordinate drop-off details.
              </p>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.senderId === user?._id || msg.senderRole === user?.role;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[9px] font-semibold text-stone-400 mb-0.5 px-1">
                      {msg.senderName}
                    </span>
                    <div
                      className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-xs font-medium ${
                        isMe
                          ? 'bg-citrus-600 text-white rounded-br-xs'
                          : 'bg-stone-100 text-charcoal-900 rounded-bl-xs'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {quickReplies.map((reply, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(reply)}
                className="px-2.5 py-1 rounded-full bg-ivory-200 hover:bg-ivory-300 text-charcoal-900 text-[10px] font-semibold whitespace-nowrap transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={handleSendMessage} className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Type message to courier..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-grow px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
            />
            <button
              type="submit"
              disabled={sending || !inputText.trim()}
              className="px-4 py-2 rounded-xl bg-charcoal-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center justify-center shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
