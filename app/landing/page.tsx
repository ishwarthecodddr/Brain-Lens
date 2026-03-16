'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Camera, Zap, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  const [isHovering, setIsHovering] = useState<string | null>(null);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-linear-to-br from-sky-700 via-cyan-600 to-emerald-500">
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-float-slow absolute -left-16 top-12 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        <div className="animate-float-delay absolute right-0 top-1/3 h-64 w-64 rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="animate-float-slow absolute bottom-8 left-1/3 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      <div className="relative container mx-auto max-w-6xl px-4 py-16 md:py-20">
        {/* Header */}
        <header className="reveal-up text-center" style={{ animationDelay: '0.05s' }}>
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="rounded-full bg-white p-3 shadow-xl shadow-black/15">
              <BookOpen className="w-12 h-12 text-blue-600" />
            </div>
          </div>
          <h1 className="mb-4 text-6xl font-bold text-white drop-shadow-lg md:text-7xl">
            Brain Lens
          </h1>
          <p className="mb-2 text-xl text-white md:text-2xl">
            AI-Powered Live Tutor
          </p>
          <p className="mx-auto max-w-2xl text-lg text-white/95">
            Step-by-step problem solving with real-time vision, voice, and personalized feedback
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <a
              href="#features"
              className="rounded-full border border-white/50 bg-white/20 px-5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/30"
            >
              Explore features
            </a>
          </div>
        </header>

        {/* Features Grid */}
        <div id="features" className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Camera,
              title: 'Live Camera',
              description: 'Point at your notebook — AI reads your problem instantly',
            },
            {
              icon: Zap,
              title: 'Real-Time Steps',
              description: 'Get immediate feedback as you write each solution step',
            },
            {
              icon: Mic,
              title: 'Voice Interaction',
              description: 'Speak with your tutor for natural, conversational learning',
            },
            {
              icon: BookOpen,
              title: 'Smart Tutoring',
              description: 'No direct answers — only hints and guidance for understanding',
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="reveal-up cursor-pointer rounded-2xl border border-white/30 bg-white/15 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/20"
              style={{ animationDelay: `${0.12 + idx * 0.08}s` }}
              onMouseEnter={() => setIsHovering(String(idx))}
              onMouseLeave={() => setIsHovering(null)}
            >
              <feature.icon
                className={`w-12 h-12 text-white mb-4 transition-transform ${
                  isHovering === String(idx) ? 'scale-110' : ''
                }`}
              />
              <h3 className="mb-2 text-lg font-bold text-white">{feature.title}</h3>
              <p className="text-sm text-white/90">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="reveal-up mb-16 rounded-3xl border border-white/30 bg-white/15 p-8 backdrop-blur-md md:p-12" style={{ animationDelay: '0.45s' }}>
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="mb-4 text-4xl font-bold text-slate-900">
                How It Works
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-teal-500 font-bold text-white flex items-center justify-center shadow-lg shadow-teal-900/25">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Point Camera</h3>
                    <p className="text-slate-700">Show the tutor your math problem</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-teal-500 font-bold text-white flex items-center justify-center shadow-lg shadow-teal-900/25">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Work Step-by-Step</h3>
                    <p className="text-slate-700">Capture each solution step as you write</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-teal-500 font-bold text-white flex items-center justify-center shadow-lg shadow-teal-900/25">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Get Guidance</h3>
                    <p className="text-slate-700">
                      Receive hints, corrections, and encouragement
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-teal-500 font-bold text-white flex items-center justify-center shadow-lg shadow-teal-900/25">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Learn &amp; Master</h3>
                    <p className="text-slate-700">Understand the reasoning, not just the answer</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="aspect-video rounded-2xl bg-linear-to-br from-cyan-300 to-emerald-300 flex items-center justify-center ring-1 ring-white/35 shadow-2xl shadow-cyan-900/20">
              <div className="text-center">
                <Camera className="w-20 h-20 text-white opacity-50 mx-auto mb-4" />
                <p className="text-white font-semibold opacity-75">
                  Live tutor preview
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="reveal-up mb-16 text-center" style={{ animationDelay: '0.58s' }}>
          <Link href="/tutor">
            <Button
              size="lg"
              className="bg-white px-12 py-6 text-lg font-bold text-cyan-700 shadow-2xl shadow-cyan-900/20 transition-transform duration-300 hover:scale-[1.02] hover:bg-cyan-50"
            >
              Start Learning Now →
            </Button>
          </Link>
          <p className="mt-4 text-white/90">No sign-up required. Start tutoring instantly.</p>
        </div>

        {/* Features Highlight */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            {
              title: '🎯 Personalized',
              description:
                'Each student gets guidance tailored to their specific problem and pace',
            },
            {
              title: '🧠 Educational',
              description:
                'Learn problem-solving skills through active engagement, not memorization',
            },
            {
              title: '⚡ Instant',
              description:
                'Get feedback in real-time as you solve—no waiting for a teacher',
            },
          ].map((item, idx) => (
            <div key={idx} className="reveal-up rounded-2xl border border-white/30 bg-white/10 p-6 text-slate-900 backdrop-blur-sm" style={{ animationDelay: `${0.65 + idx * 0.08}s` }}>
              <h3 className="mb-2 text-2xl font-bold">{item.title}</h3>
              <p className="text-slate-700">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 border-t border-white/25 pt-8 text-center text-white/90">
          <p>Powered by Google Gemini AI • Making tutoring accessible to everyone</p>
          <p className="text-sm mt-2 opacity-75">Perfect for students of all levels learning math and science</p>
        </footer>
      </div>
    </div>
  );
}
