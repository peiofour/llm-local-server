export interface GenerateRequest {
  prompt: string;
  model?: string;
  stream?: boolean;
}

export interface GenerateResponse {
  text: string;
}

export interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}