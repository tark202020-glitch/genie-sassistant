import { NextResponse } from 'next/server';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { createClient } from '@supabase/supabase-js';

const pdfParse = require('pdf-parse');

export const maxDuration = 60; // Allow more time for parsing and embedding

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Google Gemini Embeddings Model
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  modelName: 'text-embedding-004',
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '파일이 제공되지 않았습니다.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = '';
    
    // Parse PDF or Text based on extension
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else {
      text = buffer.toString('utf-8');
    }

    if (!text.trim()) {
      return NextResponse.json({ error: '추출된 텍스트가 없습니다.' }, { status: 400 });
    }

    console.log(`[Ingest] 문서 파싱 완료. 추출된 텍스트 길이: ${text.length}`);

    // Split text into chunk documents
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    
    const docs = await splitter.createDocuments([text]);
    console.log(`[Ingest] 총 ${docs.length}개의 청크로 분할 완료.`);

    // Generate embeddings for each chunk and prepare for Supabase
    const vectors = [];
    for (const doc of docs) {
      const embedding = await embeddings.embedQuery(doc.pageContent);
      vectors.push({
        content: doc.pageContent,
        metadata: { source: file.name, ...doc.metadata },
        embedding,
      });
    }

    // Insert vectors to 'documents' table of Supabase
    const { error } = await supabase.from('documents').insert(vectors);

    if (error) {
       console.error('[Ingest Error] Supabase 저장 실패:', error);
       return NextResponse.json({ error: '데이터베이스 저장에 실패했습니다.' }, { status: 500 });
    }

    console.log(`[Ingest] ${vectors.length}개 청크의 DB 저장을 성공적으로 완료했습니다.`);
    return NextResponse.json({ success: true, chunks: vectors.length, message: '업로드 완료' });
    
  } catch (err: any) {
    console.error('[Ingest Exception]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
