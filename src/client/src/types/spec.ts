export interface Spec {
  id: string;
  topic: string;
  author: string;
  date: string;
  tags: string[];
  content: string;
  version?: string;
  metadata?: Record<string, any>;
}

export interface SpecListResponse {
  specs: Spec[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SpecDetailResponse extends Spec {
  versionHistory?: SpecVersion[];
}

export interface SpecVersion {
  version: string;
  date: string;
  author: string;
  changes: string;
}