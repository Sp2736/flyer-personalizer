export interface PresignRequest {
  content_type: string;
}

export interface PresignResponse {
  upload_url: string;
  storage_path: string;
}

export interface ModuleItem {
  id: string;
  name: string;
  enabled: boolean;
}

export interface ThemeItem {
  id: string;
  name: string;
  module_id: string;
  preview_thumbnail_url: string;
}

export interface PreviewRequest {
  module: string;
  theme_id: string;
  paper_size: "A4" | "12x18";
  character_count: number;
  student_name: string;
  school_name: string;
  photo_storage_paths: string[];
}

export interface PreviewResponse {
  generation_id: string;
  preview_url: string;
}

export interface DownloadResponse {
  final_pdf_url: string;
  final_png_url: string;
}

export interface CreditsResponse {
  remaining: number;
}

export interface HistoryItem {
  id: string;
  created_at: string;
  student_name: string;
  school_name: string;
  theme_name: string;
  paper_size: string;
  student_photo_url: string;
  preview_url: string;
  final_pdf_url: string;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    let data: any;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    const message = (typeof data === "object" && data?.detail) || (typeof data === "string" ? data : res.statusText);
    return new ApiError(res.status, message, data);
  }
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function authHeader(): Record<string, string> {
  // If authentication headers/tokens are added in the future, include them here
  return {};
}

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...opts.headers,
      ...authHeader(),
    },
  });

  if (!res.ok) {
    throw await ApiError.fromResponse(res);
  }

  return res.json();
}
