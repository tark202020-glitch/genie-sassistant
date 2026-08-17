'use client';

import Link from 'next/link';
import { PildongLogoImg } from '@/components/shared/PildongLogoImg';
import {
  BookOpen,
  PenLine,
  Users,
  Upload,
  Bot,
  MessageSquare,
  Sparkles,
  FileText,
  ChevronDown,
  Send,
  Plus,
  User,
  Paperclip,
  ArrowRight,
} from 'lucide-react';

/* ─────────────────────── 1. Navigation ─────────────────────── */
function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/landing-classic" className="flex items-center gap-2">
          <PildongLogoImg size={28} />
          <span className="text-xl font-serif font-normal text-foreground">지작</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
          >
            로그인
          </Link>
          <Link
            href="/register"
            className="text-sm text-white bg-terracotta hover:bg-terracotta/90 transition-colors px-5 py-2.5 rounded-[9.6px] font-medium"
          >
            시작하기
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────── 2. Hero ─────────────────────── */
function Hero() {
  return (
    <section className="pt-16 pb-12 md:pt-24 md:pb-20">
      <div className="max-w-[1200px] mx-auto px-6 grid md:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        {/* Left: Text */}
        <div>
          <p className="text-xs font-medium tracking-widest uppercase text-terracotta mb-4">
            AI 공동 창작 플랫폼
          </p>
          <h1 className="text-4xl md:text-[56px] md:leading-[1.15] font-serif font-normal text-foreground mb-6">
            당신의 지식으로
            <br />
            당신만의 보조작가를
            <br />
            만드세요
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-[480px]">
            내가 공부한 자료, 내가 쓴 글을 학습한 AI가
            <br className="hidden md:block" />
            나만의 스타일로 함께 씁니다
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-white bg-terracotta hover:bg-terracotta/90 transition-colors px-8 py-3.5 rounded-[24px] font-medium text-base"
            >
              시작하기
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors px-5 py-3.5 rounded-[24px] border border-border text-sm"
            >
              자세히 알아보기
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Right: Mock UI */}
        <div className="rounded-[24px] border border-border bg-card shadow-lg p-5 md:p-6">
          {/* Mock header */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/60">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/40 rounded-lg text-xs">
              <Bot className="w-3.5 h-3.5" />
              <span className="font-medium text-foreground">스릴러 전문가</span>
            </div>
            <span className="text-[11px] text-muted-foreground">스릴러,범죄드라마</span>
          </div>

          {/* Mock chat */}
          <div className="space-y-3 mb-4">
            {/* User message */}
            <div className="flex justify-end">
              <div className="bg-foreground text-background px-4 py-2.5 rounded-xl rounded-tr-none text-sm max-w-[80%] leading-relaxed">
                주인공이 범인의 정체를 알게 되는 5화 엔딩을 어떻게 구성하면 좋을까?
              </div>
            </div>
            {/* AI message */}
            <div className="flex justify-start">
              <div className="bg-muted/50 border border-border px-4 py-2.5 rounded-xl rounded-tl-none text-sm max-w-[85%] leading-relaxed text-foreground">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5">
                  <Bot className="w-3 h-3" /> 스릴러 전문가
                </span>
                업로드해주신 &quot;반전 구조론&quot; 자료를 참고하면, 관객이 주인공보다 먼저 단서를 발견하도록 배치하는 것이 효과적입니다...
              </div>
            </div>
          </div>

          {/* Mock input */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-muted-foreground">
              메시지를 입력하세요...
            </div>
            <div className="w-9 h-9 bg-foreground rounded-lg flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-background" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── 3. Core Values ─────────────────────── */
const VALUES = [
  {
    icon: BookOpen,
    title: '나의 지식이 곧 AI의 지식',
    desc: '내가 연구한 자료, 참고한 작품을 업로드하면 AI가 그 지식을 바탕으로 답합니다. 범용 AI가 아닌, 나만 아는 맥락을 이해하는 보조작가.',
  },
  {
    icon: PenLine,
    title: '내 문체를 학습합니다',
    desc: '내가 쓴 시놉시스, 대사, 트리트먼트를 학습하면 나의 문체와 톤을 반영한 제안을 합니다. 남의 스타일이 아닌, 내 글의 연장선.',
  },
  {
    icon: Users,
    title: '원하는 만큼, 원하는 스타일로',
    desc: '스릴러 전문가, SF 세계관 설계사, 로맨스 대사 작가 — 장르별, 역할별로 여러 보조작가를 만들어 프로젝트마다 활용하세요.',
  },
];

function CoreValues() {
  return (
    <section id="features" className="py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-serif font-normal text-center text-foreground mb-12">
          왜 지작인가요?
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-[9.6px] border border-border bg-card p-8 space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-terracotta/10 flex items-center justify-center">
                <v.icon className="w-6 h-6 text-terracotta" />
              </div>
              <h3 className="text-lg font-serif font-normal text-foreground">{v.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── 4. How It Works ─────────────────────── */
const STEPS = [
  { num: '01', icon: Upload, title: '자료 업로드', desc: '시놉시스, 레퍼런스 작품, 연구 노트 — PDF, 텍스트 파일을 올리세요' },
  { num: '02', icon: Bot, title: '보조작가 생성', desc: '이름, 전문 분야, 페르소나를 설정하고 나만의 AI를 만드세요' },
  { num: '03', icon: MessageSquare, title: '함께 쓰기', desc: '대화하듯 질문하고, 아이디어를 발전시키고, 대본을 함께 완성하세요' },
];

function HowItWorks() {
  return (
    <section className="py-16 md:py-24 bg-muted/20">
      <div className="max-w-[1200px] mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-serif font-normal text-center text-foreground mb-14">
          3단계로 시작하세요
        </h2>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Desktop connecting line */}
          <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px border-t-2 border-dashed border-border" />

          {STEPS.map((s) => (
            <div key={s.num} className="text-center relative">
              <div className="w-20 h-20 rounded-full bg-terracotta text-white text-xl font-medium flex items-center justify-center mx-auto mb-5 relative z-10">
                {s.num}
              </div>
              <s.icon className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-serif font-normal text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── 5. Product Demo ─────────────────────── */
function ProductDemo() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-serif font-normal text-center text-foreground mb-4">
          대본 작가를 위해 설계된 AI
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-[500px] mx-auto">
          보조작가와 실시간으로 대화하며 작품을 발전시키세요
        </p>

        {/* Large mock UI */}
        <div className="max-w-[900px] mx-auto rounded-[24px] border border-border bg-card shadow-lg overflow-hidden">
          <div className="flex">
            {/* Mini sidebar */}
            <div className="hidden md:flex flex-col w-56 border-r border-border bg-muted/30 p-4 gap-1.5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 px-2">보조작가</p>
              {['스릴러 전문가', 'SF 세계관', '로맨스 대사'].map((name, i) => (
                <div
                  key={name}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    i === 0 ? 'bg-card border border-border font-medium text-foreground' : 'text-muted-foreground hover:bg-card/60'
                  }`}
                >
                  <Bot className="w-4 h-4 shrink-0" />
                  {name}
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-border">
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-terracotta">
                  <Plus className="w-4 h-4" />
                  새 보조작가
                </div>
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 flex flex-col">
              {/* Chat header */}
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-accent/40 rounded-md text-xs font-medium">
                  <Bot className="w-3 h-3" />
                  스릴러 전문가
                </div>
                <span className="text-[11px] text-muted-foreground">스릴러,범죄드라마</span>
              </div>

              {/* Messages */}
              <div className="flex-1 p-5 space-y-4">
                <div className="flex justify-end">
                  <div className="bg-foreground text-background px-4 py-2.5 rounded-xl rounded-tr-none text-sm max-w-[75%]">
                    <span className="flex items-center gap-1 text-[11px] opacity-70 mb-1">
                      <User className="w-3 h-3" /> 작가님
                    </span>
                    3화에서 복선으로 깔아둔 열쇠가 5화 엔딩에서 어떻게 회수되면 좋을까?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-muted/50 border border-border px-4 py-2.5 rounded-xl rounded-tl-none text-sm max-w-[80%] text-foreground leading-relaxed">
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5">
                      <Bot className="w-3 h-3" /> 스릴러 전문가
                    </span>
                    학습된 &quot;0315 블랙위도우 3화&quot; 대본을 참고하면, 열쇠는 주인공이 아닌 <strong>조연 B</strong>가 먼저 발견하도록 구성하는 것이 반전 효과를 극대화합니다.
                    <br /><br />
                    📌 제안 구조:
                    <br />
                    1. 5화 중반: 조연 B가 열쇠 발견 (관객만 인지)
                    <br />
                    2. 5화 엔딩: 주인공이 같은 장소에서 열쇠가 없음을 확인
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="px-5 py-4 border-t border-border flex gap-2 items-center">
                <div className="w-9 h-9 border border-border rounded-lg flex items-center justify-center text-muted-foreground">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-sm text-muted-foreground">
                  스릴러 전문가에게 메시지 보내기...
                </div>
                <div className="w-9 h-9 bg-foreground rounded-lg flex items-center justify-center">
                  <Send className="w-4 h-4 text-background" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── 6. Features (UI-based) ─────────────────────── */
function Features() {
  return (
    <section className="py-16 md:py-24 bg-muted/20">
      <div className="max-w-[1200px] mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-serif font-normal text-center text-foreground mb-16">
          지작이 제공하는 기능
        </h2>

        {/* Feature A: 학습자료 관리 */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center">
                <Upload className="w-4 h-4 text-terracotta" />
              </div>
              <span className="text-xs font-medium tracking-wider uppercase text-terracotta">학습자료 관리</span>
            </div>
            <h3 className="text-2xl font-serif font-normal text-foreground mb-4">
              내 자료를 AI에게 가르치세요
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              PDF, 텍스트 파일을 업로드하면 AI가 내용을 분석하고 학습합니다.
              공유 자료는 모든 보조작가가, 전용 자료는 해당 보조작가만 참고합니다.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> PDF 지원</span>
              <span className="flex items-center gap-1.5"><Upload className="w-4 h-4" /> 드래그 & 드롭</span>
            </div>
          </div>
          {/* Mock: Document list */}
          <div className="rounded-[16px] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-border/60">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">학습자료</span>
              <span className="text-[11px] text-muted-foreground ml-auto">5개 자료</span>
            </div>
            <div className="space-y-0.5">
              {['시나리오_구조론.pdf', '반전극_분석_노트.txt', '3막_구조_레퍼런스.pdf', '캐릭터_아크_연구.pdf', '대사_톤_분석.txt'].map((f) => (
                <div key={f} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm text-foreground transition-colors">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{f}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border/60">
              <div className="bg-terracotta hover:bg-terracotta/90 text-white text-sm rounded-lg px-4 py-2 text-center transition-colors">
                <Upload className="w-3.5 h-3.5 inline mr-1.5" />
                학습하기
              </div>
            </div>
          </div>
        </div>

        {/* Feature B: 보조작가 시스템 (reversed) */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          {/* Mock: Assistant selector */}
          <div className="rounded-[16px] border border-border bg-card p-5 shadow-sm order-2 md:order-1">
            <div className="border border-border rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4" />
                <div>
                  <p className="text-sm font-medium text-foreground">스릴러 전문가</p>
                  <p className="text-[11px] text-muted-foreground">스릴러,범죄드라마</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 space-y-0.5">
              <p className="text-[11px] text-muted-foreground px-2 py-1">보조작가 전환</p>
              {[
                { name: '기본 모드', desc: '공유 학습자료 기반', active: false },
                { name: '스릴러 전문가', desc: '스릴러,범죄드라마', active: true },
                { name: 'SF 세계관', desc: '과학소설,디스토피아', active: false },
              ].map((a) => (
                <div
                  key={a.name}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                    a.active ? 'bg-card border border-border' : ''
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${a.active ? 'font-medium text-foreground' : 'text-secondary-foreground'}`}>{a.name}</p>
                    <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                  </div>
                  {a.active && <div className="w-2 h-2 rounded-full bg-terracotta shrink-0" />}
                </div>
              ))}
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-terracotta border-t border-border mt-1 pt-1">
                <Plus className="w-3.5 h-3.5" />
                새 보조작가 만들기
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-terracotta" />
              </div>
              <span className="text-xs font-medium tracking-wider uppercase text-terracotta">보조작가 시스템</span>
            </div>
            <h3 className="text-2xl font-serif font-normal text-foreground mb-4">
              장르별 전문 보조작가를 만드세요
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              스릴러, 로맨스, SF 등 장르별로 전문 보조작가를 생성하세요.
              각 보조작가는 독립된 지식 베이스와 페르소나를 가집니다.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> 맞춤 페르소나</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> 복수 보조작가</span>
            </div>
          </div>
        </div>

        {/* Feature C: 파일 첨부 채팅 */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-terracotta/10 flex items-center justify-center">
                <Paperclip className="w-4 h-4 text-terracotta" />
              </div>
              <span className="text-xs font-medium tracking-wider uppercase text-terracotta">파일 첨부 채팅</span>
            </div>
            <h3 className="text-2xl font-serif font-normal text-foreground mb-4">
              문서를 첨부하고 바로 질문하세요
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              채팅창에 파일을 드래그하거나 + 버튼으로 첨부하면,
              AI가 문서 내용을 읽고 기존 학습 자료와 함께 분석합니다.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> PDF·TXT·MD</span>
              <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> 즉시 분석</span>
            </div>
          </div>
          {/* Mock: Chat with attachment */}
          <div className="rounded-[16px] border border-border bg-card p-5 shadow-sm">
            {/* Attachment chip */}
            <div className="flex gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border bg-muted/30 text-foreground">
                <FileText className="w-3 h-3" />
                경쟁작_5화_분석.pdf
                <span className="text-muted-foreground">2.4MB</span>
              </div>
            </div>
            {/* User message with attachment */}
            <div className="flex justify-end mb-3">
              <div className="bg-foreground text-background px-4 py-2.5 rounded-xl rounded-tr-none text-sm max-w-[85%]">
                <div className="flex items-center gap-1.5 mb-1.5 text-[11px] opacity-60">
                  <FileText className="w-3 h-3" />
                  경쟁작_5화_분석.pdf
                </div>
                자료파일에 기반하되 첨부한 문서를 참고하여 5화 엔딩에 대한 아이디어를 주세요
              </div>
            </div>
            {/* AI response */}
            <div className="flex justify-start">
              <div className="bg-muted/50 border border-border px-4 py-2.5 rounded-xl rounded-tl-none text-sm max-w-[90%] text-foreground leading-relaxed">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1.5">
                  <Bot className="w-3 h-3" /> 스릴러 전문가
                </span>
                첨부하신 경쟁작 분석과 학습된 대본을 비교 분석하면, 차별화 포인트는 <strong>시간 역전 구조</strong>입니다...
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── 7. Final CTA + Footer ─────────────────────── */
function FinalCTA() {
  return (
    <>
      <section className="py-20 md:py-28 text-center">
        <div className="max-w-[600px] mx-auto px-6">
          <h2 className="text-3xl md:text-[40px] md:leading-[1.2] font-serif font-normal text-foreground mb-5">
            당신의 이야기를,
            <br />
            당신의 보조작가와 함께
          </h2>
          <p className="text-muted-foreground mb-8">지금 바로 시작하세요.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-white bg-terracotta hover:bg-terracotta/90 transition-colors px-10 py-4 rounded-[24px] font-medium text-lg"
          >
            시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PildongLogoImg size={18} />
            <span className="text-sm text-muted-foreground">© 2026 지작 (Jijak)</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>이용약관</span>
            <span>개인정보처리방침</span>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ─────────────────────── Page ─────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <CoreValues />
      <HowItWorks />
      <ProductDemo />
      <Features />
      <FinalCTA />
    </div>
  );
}
