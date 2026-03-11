import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenerativeAIStream, StreamingTextResponse } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  modelName: 'text-embedding-004',
});

export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 1. 사용자 마지막 메시지를 추출
  const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop()?.content || '';

  // 2. 인텐트(Intent) 라우팅을 위한 가벼운 판단 요청 모델 생성
  const routerModel = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" }
  });

  const routerPrompt = `
  다음 사용자 메시지를 분석하여 3가지 카테고리 중 하나로 분류하세요.
  1. "conversation": 단순한 인사, 일상 대화, 격려 요청, 짧은 질문.
  2. "search": 특정 작법 이론(예: 캐릭터 결핍, 미드포인트), 도메인 지식, 정보나 팁을 묻는 질문.
  3. "analyze": 작성한 캐릭터 설정, 대본/플롯 초안 등을 평가, 피드백, глубо 분석해달라는 요청.

  응답 형식은 반드시 다음과 같은 JSON 포맷이어야 합니다:
  {"intent": "conversation" | "search" | "analyze"}
  
  사용자 메시지: "${lastUserMessage}"
  `;

  // 라우팅 결과 도출
  let intent = "conversation"; // 기본값
  try {
    const routerResult = await routerModel.generateContent(routerPrompt);
    const routerResponseText = routerResult.response.text();
    const parsedIntent = JSON.parse(routerResponseText);
    if (["conversation", "search", "analyze"].includes(parsedIntent.intent)) {
      intent = parsedIntent.intent;
    }
    console.log("[Intent Router] Classified as:", intent);
  } catch (error) {
    console.error("[Intent Router] Classification failed, fallback to conversation", error);
  }

  // 3. 인텐트에 따른 모델 및 시스템 프롬프트(Persona) 분기
  let targetModelName = 'gemini-2.5-flash';
  let systemPrompt = '';

  switch (intent) {
    case 'analyze':
      // 심층 분석 트랙 (Phase 4 대비)
      targetModelName = 'gemini-2.5-pro'; // 분석은 Pro 모델을 쓴다고 가정 (현재 없으면 에러날 수 있으나 계획에 따름)
      systemPrompt = `당신은 시나리오/드라마 대본을 심층 분석하는 'Genie(제니)'입니다.
      사용자가 제공한 대본, 스토리, 캐릭터 설정을 분석하여 구조적 결함(예: 미드포인트 부족, 플롯 구멍)을 짚어내고
      밀도 높은 전문가적 피드백과 대안을 제시하세요. 분석은 냉정하지만 말투는 건설적이어야 합니다.`;
      break;

    case 'search':
      // 지식 기반 트랙 (Phase 3 RAG 연동)
      targetModelName = 'gemini-2.5-flash';
      let retrievedContext = '';
      
      try {
        // 1. 사용자 질문을 벡터로 변환
        const queryEmbedding = await embeddings.embedQuery(lastUserMessage);
        
        // 2. Supabase pgvector 유사도 검색(match_documents params) 수행
        const { data: matchData, error: matchError } = await supabase.rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_count: 5,
        });

        if (matchError) {
          console.error('[RAG Error] Failed to match documents:', matchError);
        } else if (matchData && matchData.length > 0) {
          retrievedContext = matchData.map((d: any) => d.content).join('\n---\n');
          console.log(`[RAG] Retrieved ${matchData.length} chunks via Similarity Search.`);
        }
      } catch (err) {
        console.error('[RAG Exception]', err);
      }

      systemPrompt = `당신은 시나리오 작법서와 이론에 해박한 'Genie(제니)'입니다.
      사용자가 묻는 이론적 개념이나 자료 서칭 요청에 대해 하단의 [참고 자료]를 바탕으로 핵심을 요약하고 구체적인 예시를 들어 명확히 설명해주세요.
      [참고 자료]에 질문과 직접적으로 관련된 내용이 부족하다면, 당신이 가진 보편적인 시나리오 도메인 지식을 추가로 활용하되, 가급적 제공된 문헌을 우선하세요.

      [참고 자료(데이터베이스 검색 결과)]
      ${retrievedContext ? retrievedContext : '검색 결과 없음'}`;
      break;

    case 'conversation':
    default:
      // 일상 대화 트랙 (기본)
      targetModelName = 'gemini-2.5-flash';
      systemPrompt = `당신은 시나리오/드라마 작가를 돕는 따뜻한 보조작가 'Genie(제니)'입니다.
      사용자의 창작 활동에 영감을 주고, 창작의 고통에 깊이 공감하며 응원과 정서적 지지를 제공하세요.`;
      break;
  }
  
  const formattedMessages = [
    { role: 'user', content: systemPrompt },
    { role: 'model', content: '네, 저는 작가님을 돕는 보조작가 제니입니다. 오늘 어떤 설정이나 대본 분석을 도와드릴까요?' },
    ...messages,
  ];

  // 4. 최종 답변 스트리밍 모델 연결
  // gemini-2.5-pro 가 사용 불가능할 경우를 대비하여 try-catch 로 flash 로 롤백 시킬 수도 있으나, 우선 명세대로 설정
  const model = genAI.getGenerativeModel({ model: targetModelName });
  const prompt = formattedMessages.map((m: any) => m.content).join('\n');
  
  const response = await model.generateContentStream(prompt);
  const stream = GoogleGenerativeAIStream(response);

  return new StreamingTextResponse(stream);
}
