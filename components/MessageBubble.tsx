'use client';

import { GraduationCap, User } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'tutor';
  content: string;
}

export default function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-500' : 'bg-green-500'
        }`}
      >
        {isUser ? (
          <User className="w-6 h-6 text-white" />
        ) : (
          <GraduationCap className="w-6 h-6 text-white" />
        )}
      </div>
      <div
        className={`flex-1 max-w-[70%] ${isUser ? 'items-end' : 'items-start'}`}
      >
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-blue-500 text-white rounded-tr-none'
              : 'bg-gray-200 text-gray-900 rounded-tl-none'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
