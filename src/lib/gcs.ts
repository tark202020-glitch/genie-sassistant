import { Storage } from '@google-cloud/storage';

function createStorage(): Storage {
  const projectId = process.env.GCP_PROJECT_ID;

  // Vercel 등 배포 환경: JSON 키를 환경변수로 직접 전달
  if (process.env.GCS_CREDENTIALS) {
    const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
    return new Storage({ credentials, projectId });
  }

  // 로컬 환경: 파일 경로 사용
  return new Storage({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId,
  });
}

export const storage = createStorage();
export const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'story_ai_helper';
