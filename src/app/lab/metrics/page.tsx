import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// M4(지표 계산·대시보드) / M5(회귀 비교)에서 구현 — 개발 진행문서 §6
export default function MetricsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">지표 대시보드</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">준비 중 (M4)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>골드 데이터가 쌓이면 여기에서 지표 6종(A급 일치 · 장점 재현 · 작가 대입 정밀도 · 지식 상태 탐지 · 설정 충돌 재현 · 근거 유효율)과 실행 간 회귀 비교를 제공합니다.</p>
          <p>필수 케이스: “2부 편의점 장면을 R25 A급으로 탐지” — 통과 전 릴리즈 불가.</p>
        </CardContent>
      </Card>
    </div>
  );
}
