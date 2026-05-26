import Link from 'next/link';
import {
  Github,
  Linkedin,
  Globe,
  Mail,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const metadata = {
  title: 'Credits — VedaAI',
  description: 'About this build and the person who made it.',
};

const LINKS = [
  {
    href: 'https://yashvanth.com',
    label: 'Portfolio',
    sub: 'yashvanth.com',
    icon: Globe,
    accent: 'bg-brand-50 text-brand-600',
  },
  {
    href: 'https://github.com/yashvanthsankar',
    label: 'GitHub',
    sub: 'github.com/yashvanthsankar',
    icon: Github,
    accent: 'bg-ink-100 text-ink-900',
  },
  {
    href: 'https://linkedin.com/in/yashvanths',
    label: 'LinkedIn',
    sub: 'linkedin.com/in/yashvanths',
    icon: Linkedin,
    accent: 'bg-blue-50 text-blue-700',
  },
  {
    href: 'mailto:yashvanthsankar@gmail.com',
    label: 'Email',
    sub: 'yashvanthsankar@gmail.com',
    icon: Mail,
    accent: 'bg-green-50 text-green-700',
  },
];

const STACK = [
  { group: 'Frontend', items: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'Zustand', 'Bricolage Grotesque', 'Lucide icons'] },
  { group: 'Backend', items: ['Node.js', 'Express', 'TypeScript', 'MongoDB + Mongoose', 'Redis', 'BullMQ', 'WebSocket (ws)', 'PDFKit', 'Multer'] },
  { group: 'AI', items: ['Groq', 'llama-3.3-70b-versatile'] },
  { group: 'Tooling', items: ['Docker (Mongo)', 'Playwright (visual checks)', 'tsx watch'] },
];

export default function CreditsPage() {
  return (
    <div className="w-full max-w-[920px] mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6 px-1">
        <div className="w-3 h-3 mt-2 rounded-full bg-accent-green shrink-0" />
        <div>
          <h1 className="text-[22px] lg:text-[28px] font-bold tracking-tight text-ink-950 leading-tight">
            Credits
          </h1>
          <p className="text-[14px] lg:text-[15px] text-ink-500 mt-1">
            About this build and the person who made it.
          </p>
        </div>
      </div>

      {/* About */}
      <div className="bg-warmpaper rounded-3xl shadow-card p-5 lg:p-8 mb-5 lg:mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5" strokeWidth={2} />
          </span>
          <h2 className="text-[18px] lg:text-[20px] font-bold text-ink-950">
            Hi, I&apos;m Yashvanth
          </h2>
        </div>
        <p className="text-[15px] lg:text-[16px] text-ink-700 leading-relaxed">
          I built <span className="font-bold text-ink-950">VedaAI Assessment Creator</span> as
          my submission for the VedaAI Full Stack Engineering hiring assignment. The brief
          asked for a system that lets a teacher describe an assignment in plain language,
          upload reference material, and have an LLM generate a structured question paper
          they can then download as a PDF.
        </p>
        <p className="text-[15px] lg:text-[16px] text-ink-700 leading-relaxed mt-3">
          The whole flow lives here — Next.js frontend, Express + Mongo + Redis + BullMQ
          backend, Groq for generation, WebSocket for live progress, and PDFKit for export.
          The UI is a Figma clone I tried to render as faithfully as I could.
        </p>
      </div>

      {/* Links grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 mb-5 lg:mb-6">
        {LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-4 lg:p-5 hover:shadow-floating transition-shadow group"
            >
              <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${l.accent}`}>
                <Icon className="w-5 h-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-bold text-ink-950">{l.label}</div>
                <div className="text-[12px] lg:text-[13px] text-ink-500 truncate">{l.sub}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-ink-400 group-hover:text-ink-700 shrink-0" strokeWidth={1.8} />
            </a>
          );
        })}
      </div>

      {/* Tech stack */}
      <div className="bg-white rounded-3xl shadow-card p-5 lg:p-8">
        <h2 className="text-[18px] lg:text-[20px] font-bold text-ink-950 mb-1">Tech Stack</h2>
        <p className="text-[13px] lg:text-[14px] text-ink-500 mb-5">
          The pieces that make this work.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
          {STACK.map((group) => (
            <div key={group.group}>
              <div className="text-[12px] font-bold text-ink-700 uppercase tracking-wider mb-2.5">
                {group.group}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <span
                    key={item}
                    className="px-3 py-1.5 rounded-full bg-ink-50 text-ink-900 text-[13px] font-semibold"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pb-12 text-center text-[13px] text-ink-500">
        Made with care for VedaAI&apos;s hiring assignment.{' '}
        <Link href="/assignments" className="font-semibold text-ink-950 underline underline-offset-2">
          Back to Assignments
        </Link>
      </div>
    </div>
  );
}
