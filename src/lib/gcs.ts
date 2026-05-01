import { Storage } from '@google-cloud/storage';

function createStorage(): Storage {
  const projectId = process.env.GCP_PROJECT_ID;

  const credJson = process.env.GCS_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS || '';

  // JSON 문자열인 경우 (Vercel 등 배포 환경)
  if (credJson.trim().startsWith('{')) {
    try {
      const credentials = JSON.parse(credJson);
      return new Storage({ credentials, projectId });
    } catch {
      // JSON 파싱 실패 시 파일 경로로 시도
    }
  }

  // 파일 경로인 경우 (로컬 환경)
  if (credJson) {
    return new Storage({ keyFilename: credJson, projectId });
  }

  return new Storage({ projectId });
}

export const storage = createStorage();
export const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'story_ai_helper';
