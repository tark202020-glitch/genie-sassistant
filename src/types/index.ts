export interface LearnedDocument {
  id: string;
  docName: string;
  source: string;
  gcsUri: string;
  indexed: boolean;
  indexTime: string | null;
  docType?: 'script' | 'reference';
}

export type DocType = 'script' | 'reference';

export interface Assistant {
  id: string;
  name: string;
  specialty: string;
  persona: string | null;
  response_style: string | null;
  data_store_id: string | null;
  gcs_folder: string | null;
  created_at: string;
}

export type UploadStep = 'idle' | 'uploading-gcs' | 'importing-ai' | 'complete' | 'error';

export interface Conversation {
  id: string;
  title: string;
  assistant_id: string | null;
  assistant_name?: string | null;
  updated_at: string;
}
