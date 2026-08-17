import type { Metadata } from 'next';

/**
 * 지작 랜딩 페이지
 * Claude 디자인 "지작 랜딩 흐름"에서 이식.
 * 4단계 흐름(01 업로드 → 02 전용 보조작가 → 03 디테일 수정 → 04 작가님의 결정) 구성.
 * 고정 색상(크림/테라코타/다크) 기반의 정적 페이지라 다크모드 영향을 받지 않는다.
 */

export const metadata: Metadata = {
  title: '지작 — 내 자료로 만드는 보조작가',
  description:
    '대본과 자료를 업로드하면 그 자료를 근거로 확인하는 보조작가가 만들어집니다. 지작은 대신 쓰지 않습니다.',
};

// 랜딩 전용 스타일: Pretendard 리셋 + CTA 호버(디자인의 style-hover 대체)
const LANDING_CSS = `
html{scroll-behavior:smooth}
.jizak-landing *{box-sizing:border-box}
.jizak-landing a{color:#D97757;text-decoration:none}
.jizak-landing a:hover{color:#151514}
.jizak-landing p{margin:0}
.jizak-landing h1,.jizak-landing h2,.jizak-landing h3,.jizak-landing h4{margin:0;font-weight:700;letter-spacing:-0.03em}
.jizak-landing{font-family:Pretendard,-apple-system,"Apple SD Gothic Neo",sans-serif;-webkit-font-smoothing:antialiased}
.dc-cta-primary:hover{background:#151514 !important;color:#fff !important}
.dc-cta-cream:hover{background:#151514 !important;color:#FAF9F5 !important}
.dc-cta-cream-terra:hover{background:#D97757 !important;color:#fff !important}
.dc-cta-dark:hover{background:#FAF9F5 !important;color:#151514 !important}
`;

const LANDING_HTML = `
<div class="jizak-landing" style="background:#FAF9F5;color:#151514;overflow-x:hidden">

  <header style="position:sticky;top:0;z-index:60;background:rgba(255,255,255,0.9);backdrop-filter:blur(10px);border-bottom:1px solid #E0DDD2">
    <div style="max-width:1160px;margin:0 auto;padding:14px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px">
      <a href="#hero" style="display:flex;align-items:center;gap:10px;color:#151514">
        <img src="/logo_B.png" alt="지작" style="height:24px;width:auto;display:block">
        <span style="font-weight:800;font-size:15px;letter-spacing:-0.01em">지작 <span style="font-weight:500;font-size:11px;color:#3F3F3B;letter-spacing:0.06em">JIZAK</span></span>
      </a>
      <a href="/register" class="dc-cta-primary" style="background:#D97757;color:#fff;font-size:13.5px;font-weight:600;padding:10px 18px;border-radius:999px;white-space:nowrap">내 보조작가 만들어보기</a>
    </div>
  </header>

  <section id="hero" style="background:#fff;padding:96px 32px 84px;text-align:center">
    <div style="max-width:760px;margin:0 auto">
      <h1 style="font-size:clamp(36px,5.2vw,64px);line-height:1.12">내 자료로 만드는<br><span style="display:inline-block;background:#D97757;color:#fff;border-radius:14px;padding:2px 16px 6px;margin:0 2px">보조작가</span></h1>
      <p style="margin-top:26px;font-size:16.5px;line-height:1.75;color:#3F3F3B;max-width:34em;margin-left:auto;margin-right:auto">대본과 자료를 업로드하면 그 자료를 근거로 확인하는 보조작가가 만들어집니다. 지작은 대신 쓰지 않습니다. 문장은 끝까지 작가님이 씁니다.</p>
      <div style="margin-top:32px;display:flex;justify-content:center">
        <a href="/register" class="dc-cta-primary" style="background:#D97757;color:#fff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:999px;white-space:nowrap">내 보조작가 만들어보기</a>
      </div>
      <div style="margin-top:64px;font-size:11.5px;font-weight:700;letter-spacing:0.18em;color:#3F3F3B">실제 창작 현장에서 약 1년째 검증되고 있습니다</div>
      <div style="margin-top:26px;display:flex;flex-wrap:wrap;justify-content:center;gap:14px 34px;color:#3F3F3B;font-size:13px;letter-spacing:-0.01em">
        <span>알파 V1.030 실사용 검증</span>
        <span>100여 명 작가 협업</span>
        <span>업로드 자료 RAG 근거 답변</span>
        <span>부산국제영화제 뉴크리에이터상</span>
      </div>
    </div>
  </section>

  <section id="stage-1" style="position:relative;background:#E9E1D0;padding:0 32px 176px">
    <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">
      <div style="position: absolute; inset: 0; background-image: radial-gradient(#151514 1.3px,transparent 1.3px); background-size: 26px 26px; opacity: 0.14; left: 4px; top: -16px"></div>
      <div style="position:absolute;right:-10%;top:4%;width:54%;height:62%;background:#DFD4BC;border-radius:58% 42% 47% 53%/49% 58% 42% 51%"></div>
    </div>
    <div style="position:relative;max-width:1160px;margin:0 auto;padding-top:84px">
      <div style="position:absolute;left:clamp(24px,13vw,168px);top:0;height:56px;width:6px;background:#FAF9F5"></div>
      <div style="position:absolute;left:calc(clamp(24px,13vw,168px) - 18px);top:0;width:18px;height:18px;background:#FAF9F5"><div style="width:100%;height:100%;background:#E9E1D0;border-top-right-radius:18px"></div></div>
      <div style="position:absolute;left:calc(clamp(24px,13vw,168px) + 6px);top:0;width:18px;height:18px;background:#FAF9F5"><div style="width:100%;height:100%;background:#E9E1D0;border-top-left-radius:18px"></div></div>

      <div style="position:relative">
        <div style="position:absolute;left:clamp(24px,13vw,168px);top:-28px;width:34px;height:34px;border-left:6px solid #FAF9F5;border-bottom:6px solid #FAF9F5;border-bottom-left-radius:34px"></div>
        <div style="position:absolute;left:calc(clamp(24px,13vw,168px) + 34px);right:74px;top:3px;transform:translateY(-50%);display:flex;align-items:center;z-index:5">
          <div style="flex:1;height:6px;background:#FAF9F5;border-radius:0 3px 3px 0"></div>
          <div style="display:inline-flex;align-items:center;gap:14px;background:#FAF9F5;border-radius:999px;padding:13px 34px 15px;white-space:nowrap">
            <span style="font-size:12.5px;font-weight:700;letter-spacing:0.16em;color:#D97757">01</span>
            <span style="font-size:clamp(24px,2.6vw,34px);font-weight:800;letter-spacing:-0.03em;color:#151514">업로드</span>
          </div>
          <div style="flex:1;height:6px;background:#FAF9F5;border-radius:3px 0 0 3px"></div>
        </div>
        <div style="position:absolute;right:40px;top:0;width:34px;height:34px;border-top:6px solid #FAF9F5;border-right:6px solid #FAF9F5;border-top-right-radius:34px"></div>
        <div style="position:absolute;right:40px;top:34px;bottom:34px;width:6px;background:#FAF9F5"></div>
        <div style="position:absolute;right:40px;bottom:0;width:34px;height:34px;border-right:6px solid #FAF9F5;border-bottom:6px solid #FAF9F5;border-bottom-right-radius:34px"></div>
        <div style="position:absolute;left:calc(clamp(24px,13vw,168px) + 34px);right:74px;bottom:0;height:6px;background:#FAF9F5"></div>
        <div style="position:absolute;left:clamp(24px,13vw,168px);bottom:-28px;width:34px;height:34px;border-left:6px solid #FAF9F5;border-top:6px solid #FAF9F5;border-top-left-radius:34px"></div>
        <div style="max-width:700px;margin:0 auto;text-align:center;padding:96px 0 120px">
          <h2 style="font-size:clamp(27px,3.1vw,40px);line-height:1.24">국회도서관에서 몇 달을 사는 자료조사,<br>업로드 한 번으로 맡기세요</h2>
          <p style="margin:22px auto 0;max-width:34em;font-size:15.5px;line-height:1.75;color:#3F3F3B">자료조사에 밤을 새우는 작가님을 위해. 쓰고 있는 대본과 참고 자료를 그대로 올리면, 보조작가가 그 자료를 근거로 확인합니다. 자료 '안'의 요약에서 멈추지 않고 '밖'의 사실관계까지 함께 짚습니다.</p>
        </div>
      </div>
      <div style="position:relative;padding-left:clamp(24px,13vw,168px);padding-right:74px">
        <div style="position: absolute; left: clamp(24px,13vw,168px); top: 28px; bottom: 0; width: 6px; background: #FAF9F5; height: 210px"></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:48px;padding-left:52px">
          <div>
            <div style="position:relative;height:62px">
              <div style="position:absolute;left:14px;top:0;width:6px;height:62px;background:#FAF9F5"></div>
              <div style="position:absolute;left:0;top:0;width:14px;height:14px;background:radial-gradient(circle 14px at 0 100%, transparent 13px, #FAF9F5 13.5px)"></div>
              <div style="position:absolute;left:20px;top:0;width:14px;height:14px;background:radial-gradient(circle 14px at 100% 100%, transparent 13px, #FAF9F5 13.5px)"></div>
            </div>
            <div style="margin-top:24px">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="width:34px;height:34px;flex:0 0 34px;border-radius:9px;background:#151514;display:inline-flex;align-items:center;justify-content:center">
                  <span style="width:14px;height:2px;background:#E9E1D0;display:block;box-shadow:0 5px 0 #E9E1D0,0 -5px 0 #E9E1D0"></span>
                </span>
                <h3 style="font-size:17px;line-height:1.35">대본·자료 업로드</h3>
              </div>
              <p style="margin-top:12px;font-size:14.5px;line-height:1.7;color:#3F3F3B">설치도, 새로 배울 것도 없습니다. 쓰던 파일을 올리는 것으로 시작이 끝납니다.</p>
              <a href="/register" class="dc-cta-cream" style="margin-top:16px;display:inline-flex;align-items:center;gap:8px;background:#FAF9F5;color:#151514;font-size:13px;font-weight:600;padding:9px 16px;border-radius:999px">지금 올려보기 →</a>
            </div>
          </div>
          <div>
            <div style="position:relative;height:62px">
              <div style="position:absolute;left:14px;top:0;width:6px;height:62px;background:#FAF9F5"></div>
              <div style="position:absolute;left:0;top:0;width:14px;height:14px;background:radial-gradient(circle 14px at 0 100%, transparent 13px, #FAF9F5 13.5px)"></div>
              <div style="position:absolute;left:20px;top:0;width:14px;height:14px;background:radial-gradient(circle 14px at 100% 100%, transparent 13px, #FAF9F5 13.5px)"></div>
            </div>
            <div style="margin-top:24px">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="width:34px;height:34px;flex:0 0 34px;border-radius:9px;background:#151514;display:inline-flex;align-items:center;justify-content:center">
                  <span style="width:12px;height:12px;border:2px solid #E9E1D0;border-radius:50%;display:block"></span>
                </span>
                <h3 style="font-size:17px;line-height:1.35">업로드 자료를 근거로 한 답변</h3>
              </div>
              <p style="margin-top:12px;font-size:14.5px;line-height:1.7;color:#3F3F3B">인터넷의 남의 정보가 아니라, 작가님이 넣어둔 자료를 근거로 답합니다.</p>
            </div>
          </div>
          <div>
            <div style="position:relative;height:62px">
              <div style="position:absolute;left:14px;top:0;width:6px;height:62px;background:#FAF9F5"></div>
              <div style="position:absolute;left:0;top:0;width:14px;height:14px;background:radial-gradient(circle 14px at 0 100%, transparent 13px, #FAF9F5 13.5px)"></div>
              <div style="position:absolute;left:20px;top:0;width:14px;height:14px;background:radial-gradient(circle 14px at 100% 100%, transparent 13px, #FAF9F5 13.5px)"></div>
            </div>
            <div style="margin-top:24px">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="width:34px;height:34px;flex:0 0 34px;border-radius:9px;background:#151514;display:inline-flex;align-items:center;justify-content:center">
                  <span style="width:13px;height:13px;background:#E9E1D0;border-radius:3px;display:block"></span>
                </span>
                <h3 style="font-size:17px;line-height:1.35">자료 안과 밖을 함께 확인</h3>
              </div>
              <p style="margin-top:12px;font-size:14.5px;line-height:1.7;color:#3F3F3B">드라마·영화 대본 기준으로 고증과 사실관계까지 확인합니다.</p>
            </div>
          </div>
        </div>
      </div>
      <div style="position:absolute;left:clamp(24px,13vw,168px);bottom:-82px;width:6px;height:82px;background:#FAF9F5"></div>
      <div style="position:absolute;left:clamp(24px,13vw,168px);bottom:-116px;width:34px;height:34px;border-left:6px solid #FAF9F5;border-bottom:6px solid #FAF9F5;border-bottom-left-radius:34px"></div>
      <div style="position:absolute;left:calc(clamp(24px,13vw,168px) + 34px);bottom:-116px;right:calc(50% + 34px);height:6px;background:#FAF9F5"></div>
      <div style="position:absolute;left:calc(50% - 34px);bottom:-144px;width:34px;height:34px;border-top:6px solid #FAF9F5;border-right:6px solid #FAF9F5;border-top-right-radius:34px"></div>
      <div style="position:absolute;left:calc(50% - 6px);bottom:-176px;width:6px;height:32px;background:#FAF9F5"></div>
    </div>
  </section>

  <section id="stage-2" style="position:relative;background:#151514;color:#FAF9F5;padding:0 32px 0">
    <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">
      <div style="position:absolute;inset:0;background-image:radial-gradient(#FAF9F5 1.3px,transparent 1.3px);background-size:26px 26px;opacity:0.12"></div>
      <div style="position:absolute;left:-12%;top:12%;width:52%;height:58%;background:#232320;border-radius:52% 48% 60% 40%/44% 52% 48% 56%"></div>
    </div>
    <div style="position:relative;max-width:1160px;margin:0 auto">
      <div style="position:absolute;left:calc(50% - 6px);top:0;width:6px;height:32px;background:#FAF9F5"></div>
      <div style="position:absolute;left:50%;top:-28px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:14px;background:#FAF9F5;border-radius:999px;padding:13px 30px 15px;white-space:nowrap;z-index:5">
        <span style="font-size:12.5px;font-weight:700;letter-spacing:0.16em;color:#D97757">02</span>
        <span style="font-size:clamp(24px,2.6vw,34px);font-weight:800;letter-spacing:-0.03em;color:#151514">전용 보조작가</span>
      </div>
      <div style="position:relative;padding-top:104px;padding-bottom:200px">
        <div style="position:absolute;left:calc(50% - 6px);top:0;width:6px;height:36px;background:#FAF9F5"></div>
        <div style="position:absolute;left:calc(50% - 6px);top:30px;width:34px;height:34px;border-left:6px solid #FAF9F5;border-bottom:6px solid #FAF9F5;border-bottom-left-radius:34px"></div>
        <div style="position:absolute;left:calc(50% + 28px);right:74px;top:58px;height:6px;background:#FAF9F5"></div>
        <div style="position:absolute;right:40px;top:58px;width:34px;height:34px;border-top:6px solid #FAF9F5;border-right:6px solid #FAF9F5;border-top-right-radius:34px"></div>
        <div style="position:absolute;right:40px;top:92px;bottom:140px;width:6px;background:#FAF9F5"></div>
        <div style="position:absolute;right:40px;bottom:106px;width:34px;height:34px;border-right:6px solid #FAF9F5;border-bottom:6px solid #FAF9F5;border-bottom-right-radius:34px"></div>
        <div style="position:absolute;left:calc(clamp(24px,13vw,168px) + 34px);right:74px;bottom:106px;height:6px;background:#FAF9F5"></div>
        <div style="position:absolute;left:clamp(24px,13vw,168px);bottom:78px;width:34px;height:34px;border-left:6px solid #FAF9F5;border-top:6px solid #FAF9F5;border-top-left-radius:34px"></div>
        <div style="position: absolute; left: clamp(24px,13vw,168px); bottom: 0; width: 6px; height: 80px; background: #FAF9F5"></div>
        <div style="max-width:640px;margin:0 auto;text-align:center">
          <h2 style="font-size:clamp(27px,3.1vw,40px);line-height:1.24">장르별로 스페셜한 보조작가를 만들 수 있습니다</h2>
          <p style="margin-top:18px;font-size:15.5px;line-height:1.75;color:#C9C6BB">SF 쓸 땐 SF 보조작가, 로맨스 쓸 땐 로맨스 보조작가. 작품마다 지식 베이스를 분리해 운용하니, 장르가 바뀔 때마다 처음부터 설명할 일이 없습니다.</p>
        </div>
        <div style="margin-top:30px;display:flex;flex-wrap:wrap;justify-content:center;gap:10px">
          <span style="font-size:13px;color:#C9C6BB;border:1px solid #3F3F3B;border-radius:999px;padding:8px 14px;white-space:nowrap">프로젝트 단위 지식베이스 분리</span>
          <span style="font-size:13px;color:#C9C6BB;border:1px solid #3F3F3B;border-radius:999px;padding:8px 14px;white-space:nowrap">206개 모티프</span>
          <span style="font-size:13px;color:#C9C6BB;border:1px solid #3F3F3B;border-radius:999px;padding:8px 14px;white-space:nowrap">SAVE THE CAT 방법론</span>
        </div>
        <div style="margin-top:80px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;padding-left:calc(clamp(24px,13vw,168px) + 48px);padding-right:74px">
          <div style="position:relative">
            <div style="position:absolute;left:26px;bottom:-88px;width:6px;height:88px;background:#FAF9F5"></div><div style="position:absolute;left:12px;bottom:-88px;width:14px;height:14px;background:radial-gradient(circle 14px at 0 0, transparent 13px, #FAF9F5 13.5px)"></div><div style="position:absolute;left:32px;bottom:-88px;width:14px;height:14px;background:radial-gradient(circle 14px at 100% 0, transparent 13px, #FAF9F5 13.5px)"></div>
            <span style="width:38px;height:38px;border-radius:10px;background:#FAF9F5;display:inline-flex;align-items:center;justify-content:center">
              <span style="width:14px;height:14px;border:2px solid #151514;border-radius:50%;display:block"></span>
            </span>
            <h3 style="margin-top:16px;font-size:17px">SF · 설정 자료와 고증</h3>
            <p style="margin-top:10px;font-size:14.5px;line-height:1.7;color:#C9C6BB">세계관 문서와 취재 자료만 학습한 보조작가로 운용합니다.</p>
            <a href="/register" class="dc-cta-cream-terra" style="margin-top:16px;display:inline-flex;align-items:center;gap:8px;background:#FAF9F5;color:#151514;font-size:13px;font-weight:600;padding:9px 16px;border-radius:999px">만들어보기 →</a>
          </div>
          <div style="position:relative">
            <div style="position:absolute;left:26px;bottom:-88px;width:6px;height:88px;background:#FAF9F5"></div><div style="position:absolute;left:12px;bottom:-88px;width:14px;height:14px;background:radial-gradient(circle 14px at 0 0, transparent 13px, #FAF9F5 13.5px)"></div><div style="position:absolute;left:32px;bottom:-88px;width:14px;height:14px;background:radial-gradient(circle 14px at 100% 0, transparent 13px, #FAF9F5 13.5px)"></div>
            <span style="width:38px;height:38px;border-radius:10px;background:#FAF9F5;display:inline-flex;align-items:center;justify-content:center">
              <span style="width:14px;height:14px;background:#151514;border-radius:4px;display:block"></span>
            </span>
            <h3 style="margin-top:16px;font-size:17px">로맨스 · 관계도와 감정선</h3>
            <p style="margin-top:10px;font-size:14.5px;line-height:1.7;color:#C9C6BB">인물 관계와 감정 곡선을 기준으로 상충점을 확인합니다.</p>
            <a href="/register" class="dc-cta-cream-terra" style="margin-top:16px;display:inline-flex;align-items:center;gap:8px;background:#FAF9F5;color:#151514;font-size:13px;font-weight:600;padding:9px 16px;border-radius:999px">만들어보기 →</a>
          </div>
          <div style="position:relative">
            <div style="position:absolute;left:26px;bottom:-88px;width:6px;height:88px;background:#FAF9F5"></div><div style="position:absolute;left:12px;bottom:-88px;width:14px;height:14px;background:radial-gradient(circle 14px at 0 0, transparent 13px, #FAF9F5 13.5px)"></div><div style="position:absolute;left:32px;bottom:-88px;width:14px;height:14px;background:radial-gradient(circle 14px at 100% 0, transparent 13px, #FAF9F5 13.5px)"></div>
            <span style="width:38px;height:38px;border-radius:10px;background:#FAF9F5;display:inline-flex;align-items:center;justify-content:center">
              <span style="width:14px;height:2px;background:#151514;display:block;box-shadow:0 5px 0 #151514,0 -5px 0 #151514"></span>
            </span>
            <h3 style="margin-top:16px;font-size:17px">사극 · 시대 고증과 야사</h3>
            <p style="margin-top:10px;font-size:14.5px;line-height:1.7;color:#C9C6BB">모아둔 사료 안에서 근거를 찾아 작가님 앞에 놓습니다.</p>
            <a href="/register" class="dc-cta-cream-terra" style="margin-top:16px;display:inline-flex;align-items:center;gap:8px;background:#FAF9F5;color:#151514;font-size:13px;font-weight:600;padding:9px 16px;border-radius:999px">만들어보기 →</a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="stage-3" style="position:relative;background:#E4DACB;padding:0 32px 168px">
    <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">
      <div style="position:absolute;inset:0;background-image:radial-gradient(#151514 1.3px,transparent 1.3px);background-size:26px 26px;opacity:0.14"></div>
      <div style="position:absolute;right:-14%;bottom:-6%;width:56%;height:64%;background:#D9CDB6;border-radius:46% 54% 38% 62%/56% 42% 58% 44%"></div>
    </div>
    <div style="position:relative;max-width:1160px;margin:0 auto">
      <div style="position: absolute; left: clamp(24px,13vw,168px); top: 0; bottom: -168px; width: 6px; border-radius: 3px; background-color: #FAF9F5"></div>

      <div style="position:relative;padding-left:calc(clamp(24px,13vw,168px) + 6px);padding-top:112px">
        <div style="padding-left:92px;max-width:620px">
          <h2 style="font-size:clamp(27px,3.1vw,40px);line-height:1.24">캐릭터, 배경, 대사까지<br>디테일하게 수정합니다</h2>
          <p style="margin-top:20px;font-size:15.5px;line-height:1.75;color:#3F3F3B">12화를 쓰다 3화를 다시 뒤지는 작가님을 위해. 보조작가는 대본 전체를 근거로 상충점을 짚습니다. "이 장면은 3화 설정과 상충됩니다" — 판단과 문장은 작가님이 정합니다.</p>
        </div>
        <div style="margin-top:56px;display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;align-items:flex-start">
            <div style="flex: 0 0 92px; width: 92px; height: 58px; border-left: 6px solid #151514; border-bottom: 6px solid #151514; border-bottom-left-radius: 28px; margin-left: -6px; border-color: #FAF9F5"></div>
            <div style="flex:1;max-width:620px;margin-top:34px;margin-left:-6px">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:11.5px;font-weight:700;letter-spacing:0.16em;color:#D97757">CHARACTER</span>
                <h3 style="font-size:17px">캐릭터 일관성</h3>
              </div>
              <p style="margin-top:10px;font-size:14.5px;line-height:1.7;color:#3F3F3B">인물의 이력·관계·행동 근거를 대본 전체와 맞춰 확인합니다.</p>
              <div style="margin-top:14px;background:#FAF9F5;border-radius:12px;padding:14px 18px;font-size:13.5px;line-height:1.6;color:#151514;max-width:440px">"7화의 직업 설정이 2화 대사와 어긋납니다."</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start">
            <div style="flex: 0 0 92px; width: 92px; height: 58px; border-left: 6px solid #151514; border-bottom: 6px solid #151514; border-bottom-left-radius: 28px; margin-left: -6px; border-color: #FAF9F5"></div>
            <div style="flex:1;max-width:620px;margin-top:34px;margin-left:-6px">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:11.5px;font-weight:700;letter-spacing:0.16em;color:#D97757">SETTING</span>
                <h3 style="font-size:17px">배경 · 타임라인</h3>
              </div>
              <p style="margin-top:10px;font-size:14.5px;line-height:1.7;color:#3F3F3B">시간순과 공간 설정을 자동으로 정리해 모순과 떡밥 회수를 점검합니다.</p>
              <div style="margin-top:14px;background:#FAF9F5;border-radius:12px;padding:14px 18px;font-size:13.5px;line-height:1.6;color:#151514;max-width:440px">"3화에 심은 단서가 아직 회수되지 않았습니다."</div>
            </div>
          </div>
          <div style="display:flex;align-items:flex-start">
            <div style="flex: 0 0 92px; width: 92px; height: 58px; border-left: 6px solid #151514; border-bottom: 6px solid #151514; border-bottom-left-radius: 28px; margin-left: -6px; border-color: #FAF9F5"></div>
            <div style="flex:1;max-width:620px;margin-top:34px;margin-left:-6px">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:11.5px;font-weight:700;letter-spacing:0.16em;color:#D97757">DIALOGUE</span>
                <h3 style="font-size:17px">대사톤 보정</h3>
              </div>
              <p style="margin-top:10px;font-size:14.5px;line-height:1.7;color:#3F3F3B">성별·지방색·직업군에 맞는 대화체로 보정하고, 사투리 표현까지 확인합니다.</p>
              <div style="margin-top:14px;background:#FAF9F5;border-radius:12px;padding:14px 18px;font-size:13.5px;line-height:1.6;color:#151514;max-width:440px">"모든 인물이 같은 말투로 말하고 있습니다."</div>
            </div>
          </div>
        </div>
      <div style="position: absolute; left: 130px; top: -29px; display: inline-flex; align-items: center; gap: 14px; background: #FAF9F5; border-radius: 999px; padding: 13px 30px 15px; white-space: nowrap; z-index: 5">
        <span style="font-size:12.5px;font-weight:700;letter-spacing:0.16em;color:#D97757">03</span>
        <span style="font-size:clamp(24px,2.6vw,34px);font-weight:800;letter-spacing:-0.03em;color:#151514">디테일 수정</span>
      </div></div>
    </div>
  </section>

  <section id="stage-4" style="position:relative;background:#D97757;color:#fff;padding:0 32px 120px">
    <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none">
      <div style="position:absolute;inset:0;background-image:radial-gradient(#fff 1.3px,transparent 1.3px);background-size:26px 26px;opacity:0.16"></div>
      <div style="position:absolute;left:-10%;bottom:-20%;width:60%;height:70%;background:#CE6A4B;border-radius:54% 46% 42% 58%/48% 56% 44% 52%"></div>
    </div>
    <div style="position:relative;max-width:1160px;margin:0 auto">
      <div style="position:absolute;left:clamp(24px,13vw,168px);top:0;height:180px;width:6px;background:#FAF9F5"></div>
      <div style="position:absolute;left:calc(clamp(24px,13vw,168px) - 7px);top:176px;width:20px;height:20px;border-radius:50%;background:#FAF9F5"></div>

      <div style="padding-left:calc(clamp(24px,13vw,168px) + 98px);padding-top:112px">
        <h2 style="font-size:clamp(27px,3.1vw,40px);line-height:1.24;max-width:22em">보조작가는 근거를 놓고,<br>문장은 작가님이 씁니다</h2>
        <p style="margin-top:20px;max-width:34em;font-size:15.5px;line-height:1.75;color:rgba(255,255,255,0.92)">대신 써주는 AI가 아닙니다. 문장을 새로 생성하지 않고, 업로드한 자료를 근거로 확인만 합니다. 창작의 주도권은 끝까지 작가님에게 있습니다.</p>
        <div style="margin-top:36px;display:flex;flex-wrap:wrap;align-items:center;gap:14px">
          <a href="/register" class="dc-cta-dark" style="background:#151514;color:#fff;font-size:15px;font-weight:600;padding:15px 28px;border-radius:999px;white-space:nowrap">내 보조작가 만들어보기</a>
          <span style="font-size:13.5px;color:rgba(255,255,255,0.9)">알파 단계 무료 체험 · 구독 후 7일 내 전액 환불(임시 정책)</span>
        </div>
        <div style="margin-top:44px;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;max-width:680px">
          <div style="background:rgba(255,255,255,0.16);border-radius:16px;padding:22px 24px">
            <div style="font-size:12px;letter-spacing:0.14em;font-weight:700">BASIC</div>
            <div style="margin-top:10px;font-size:25px;font-weight:800;letter-spacing:-0.03em">월 9,000원</div>
            <p style="margin-top:8px;font-size:12.5px;color:rgba(255,255,255,0.88)">목표가(가설) · 확정 가격 아님</p>
          </div>
          <div style="background:rgba(255,255,255,0.16);border-radius:16px;padding:22px 24px">
            <div style="font-size:12px;letter-spacing:0.14em;font-weight:700">PRO</div>
            <div style="margin-top:10px;font-size:25px;font-weight:800;letter-spacing:-0.03em">월 19,000원</div>
            <p style="margin-top:8px;font-size:12.5px;color:rgba(255,255,255,0.88)">목표가(가설) · 확정 가격 아님</p>
          </div>
        </div>
      <div style="position: absolute; left: 132px; top: -32px; display: inline-flex; align-items: center; gap: 14px; background: #FAF9F5; border-radius: 999px; padding: 13px 30px 15px; white-space: nowrap; z-index: 5">
        <span style="font-size:12.5px;font-weight:700;letter-spacing:0.16em;color:#D97757">04</span>
        <span style="font-size:clamp(24px,2.6vw,34px);font-weight:800;letter-spacing:-0.03em;color:#151514">작가님의 결정</span>
      </div></div>
    </div>
  </section>

  <section style="background:#FAF9F5;padding:88px 32px">
    <div style="max-width:1160px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px">
      <div>
        <h2 style="font-size:clamp(23px,2.5vw,33px);line-height:1.26">실제 창작 현장에서,<br>약 1년째 검증되고 있습니다</h2>
        <p style="margin-top:16px;font-size:15.5px;line-height:1.75;color:#3F3F3B;max-width:28em">알파 버전을 실제 창작 업무에 도입해 결과물을 다수 생산하며 검증 중입니다. 100여 명의 작가와 협업하며 파악한 페인포인트를 반영해 만들었습니다.</p>
      </div>
      <div style="background:#fff;border:1px solid #E0DDD2;border-radius:18px;padding:28px">
        <div style="font-size:11.5px;letter-spacing:0.16em;color:#D97757;font-weight:700">TEAM</div>
        <p style="margin-top:14px;font-size:15px;line-height:1.75;color:#3F3F3B">운영사 대표는 20년 이상 영화·드라마·출판 기획 및 창작 현장 경력을 갖고 있습니다. 부산국제영화제 뉴크리에이터상을 수상했고, 다수의 드라마·영화 대본을 집필했습니다.</p>
      </div>
    </div>
  </section>

  <footer style="background:#FAF9F5;border-top:1px solid #E0DDD2;padding:32px">
    <div style="max-width:1160px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;align-items:center">
      <img src="/logo_B.png" alt="지작" style="height:20px;width:auto;display:block;opacity:0.8">
      <span style="font-size:12.5px;color:#3F3F3B">지작 JIZAK · 고래방 · 정식 오픈 2026년 12월 말 목표(변동 가능)</span>
    </div>
  </footer>
</div>
`;

export default function LandingPage() {
  return (
    <>
      {/* Pretendard 폰트 (랜딩 전용) */}
      <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
      />
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
    </>
  );
}
