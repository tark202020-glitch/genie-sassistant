import { GoogleGenerativeAI } from '@google/generative-ai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

// Google gemini-embedding-001 모델 (3072차원 → outputDimensionality: 768로 축소)
const embeddingModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
const EMBEDDING_DIMENSIONS = 768;

// Rate Limit 재시도 지연 (ms)
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 단일 텍스트의 임베딩 벡터 생성 (재시도 포함)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      } as any);
      return result.embedding.values;
    } catch (err: any) {
      if (err.status === 429 && attempt < 4) {
        const waitTime = Math.min((attempt + 1) * 5000, 30000);
        console.log(`[Embedding] Rate Limit (시도 ${attempt + 1}/5) — ${waitTime / 1000}초 대기...`);
        await sleep(waitTime);
      } else {
        throw err;
      }
    }
  }
  throw new Error('임베딩 생성 실패: 최대 재시도 초과');
}

/**
 * 여러 텍스트의 임베딩 벡터를 순차 생성 (Rate Limit 방지)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await embeddingModel.embedContent({
          content: { role: 'user', parts: [{ text: texts[i] }] },
          outputDimensionality: EMBEDDING_DIMENSIONS,
        } as any);
        embeddings.push(result.embedding.values);
        break;
      } catch (err: any) {
        if (err.status === 429 && attempt < 4) {
          const waitTime = Math.min((attempt + 1) * 5000, 30000);
          console.log(`[Embedding] Rate Limit (${i + 1}/${texts.length}, 시도 ${attempt + 1}/5) — ${waitTime / 1000}초 대기...`);
          await sleep(waitTime);
        } else {
          throw err;
        }
      }
    }

    // 매 2개마다 1.5초 대기 (Rate Limit 예방 강화)
    if ((i + 1) % 2 === 0 && i < texts.length - 1) {
      await sleep(1500);
    }

    if ((i + 1) % 10 === 0) {
      console.log(`[Embedding] 진행: ${i + 1}/${texts.length}`);
    }
  }
  return embeddings;
}

/**
 * 텍스트를 청크로 분할
 * - chunkSize: 800자 (한글 기준 적절한 크기)
 * - chunkOverlap: 200자 (문맥 유지)
 */
export async function splitTextIntoChunks(
  text: string,
  chunkSize: number = 800,
  chunkOverlap: number = 200
): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
    separators: ['\n\n', '\n', '。', '.', '!', '?', ';', ',', ' ', ''],
  });

  const docs = await splitter.createDocuments([text]);
  return docs.map(doc => doc.pageContent);
}

/**
 * 문서 전체 텍스트에서 핵심 요약 생성 (Gemini Flash)
 * - 업로드 시 1회만 호출, 결과를 DB에 저장
 */
export async function generateDocumentSummary(
  text: string,
  fileName: string
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // 텍스트가 너무 길면 앞뒤를 샘플링
  const MAX_INPUT = 30000;
  let inputText = text;
  if (text.length > MAX_INPUT) {
    const head = text.slice(0, MAX_INPUT * 0.7);
    const tail = text.slice(-MAX_INPUT * 0.3);
    inputText = head + '\n\n[... 중략 ...]\n\n' + tail;
  }

  const prompt = `다음은 "${fileName}" 문서의 내용입니다.

이 문서의 핵심 내용을 한국어로 요약해주세요.

요약 형식:
1. **문서 개요** (1~2문장): 이 문서가 무엇에 관한 것인지
2. **핵심 내용** (3~5개 불릿): 가장 중요한 포인트들
3. **주요 키워드**: 쉼표로 구분

간결하고 정보 밀도 높게 작성하세요.

---
${inputText}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (err: any) {
      if (err.status === 429 && attempt < 2) {
        const waitTime = (attempt + 1) * 5000;
        console.log(`[Summary] Rate Limit — ${waitTime / 1000}초 대기 후 재시도...`);
        await sleep(waitTime);
      } else {
        console.error('[Summary] 요약 생성 실패:', err.message);
        return '요약 생성에 실패했습니다.';
      }
    }
  }
  return '요약 생성에 실패했습니다.';
}

/**
 * 파일 Buffer에서 텍스트 추출
 * - PDF: pdf-parse 사용
 * - TXT/기타: UTF-8 디코딩
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = fileName.toLowerCase().split('.').pop();

  if (ext === 'pdf') {
    // pdf-parse 동적 임포트 (서버 사이드 전용)
    const pdfParse = (await import('pdf-parse')).default;
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  }

  // txt, md, csv 등 텍스트 파일
  return buffer.toString('utf-8');
}
