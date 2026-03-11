'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`성공적으로 업로드되었습니다! (생성된 청크 수: ${data.chunks})`);
        setFile(null); // 초기화
      } else {
        alert(`업로드 실패: ${data.error}`);
      }
    } catch(e) {
      console.error(e);
      alert('업로드 중 시스템 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="flex flex-col h-screen max-w-3xl mx-auto p-4 bg-background">
      <header className="py-6 text-center border-b">
        <h1 className="text-3xl font-bold text-foreground">Genie Assistant 🧞‍♂️</h1>
        <p className="text-muted-foreground mt-2">당신만의 맞춤형 AI 보조작가 시스템</p>
      </header>

      <section className="flex-1 overflow-y-auto w-full py-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>시나리오, 드라마 대본 작성, 무엇이든 물어보세요!</p>
            <p className="text-sm mt-2">"주인공의 결핍을 어떻게 설정하면 좋을까?"</p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-xl ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted text-muted-foreground rounded-tl-none border border-border'
                }`}
              >
                <span className="font-semibold text-xs block mb-1 opacity-70">
                  {m.role === 'user' ? '작가님' : 'Genie 보조작가'}
                </span>
                <p className="whitespace-pre-wrap leading-relaxed break-words">{m.content}</p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-xl bg-muted text-muted-foreground rounded-tl-none border border-border">
              <span className="animate-pulse">Genie가 답변을 작성 중입니다...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>

      {/* RAG 문서 업로드 영역 */}
      <div className="mt-2 flex items-center justify-between bg-muted/50 p-3 rounded-xl border border-border">
        <input 
          type="file" 
          accept=".txt,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
        <button
          onClick={handleFileUpload}
          disabled={!file || uploading}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {uploading ? '업로드 중...' : '문서 학습하기 (RAG)'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2 w-full">
        <input
          className="flex-1 border border-border rounded-full px-6 py-4 bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          value={input}
          placeholder="Genie에게 메시지 보내기..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full font-semibold transition-colors disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </main>
  );
}
