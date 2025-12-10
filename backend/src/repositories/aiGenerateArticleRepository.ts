import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { CreateArticleInput } from '../models/article';
import OpenAI from 'openai';

export interface GenerateArticleParams {
  model: string;
  messages: ChatCompletionMessageParam[];

}

export interface AiArticleProviderConfig {
  endpoint: string;
  apiKey: string;
}

export interface HttpClientRequest<TRequest> {
  url: string;
  body: TRequest;
  headers: Record<string, string>;
}

export interface HttpClientResponse<TResponse> {
  data: TResponse;
  status: number;
}

export interface HttpClient {
  post<TRequest, TResponse>(
    request: HttpClientRequest<TRequest>,
  ): Promise<HttpClientResponse<TResponse>>;
}

interface Dependencies {
  aiApiClient: OpenAI;
  config: AiArticleProviderConfig;
}

interface ProviderArticleResponse {
  title: string;
  content: string;
  photoUrl: string | null;
}

export class AiGenerateArticleRepository {
  private readonly aiApiClient: OpenAI;
  private readonly config: AiArticleProviderConfig;

  constructor({ aiApiClient, config }: Dependencies) {
    this.aiApiClient = aiApiClient;
    this.config = config;
  }

  async generateArticle(params: GenerateArticleParams): Promise<CreateArticleInput> {
    const providerResponse = await this.fetchArticleFromProvider(params);

    return {
      title: providerResponse.title,
      content: providerResponse.content,
      photoUrl: providerResponse.photoUrl ?? null,
    };
  }

  private async fetchArticleFromProvider(
    params: GenerateArticleParams,
  ): Promise<ProviderArticleResponse> {
    if (this.aiApiClient && this.config.endpoint) {
      const response = await this.aiApiClient.chat.completions.create({
        model: params.model,
        messages: params.messages,
        
      });
      return {
        title: response.choices[0].message.content ?? '',
        content: response.choices[0].message.content ?? '',
        photoUrl: null,
      };
    }
    throw new Error('AI API client and configuration are required');
  }
}