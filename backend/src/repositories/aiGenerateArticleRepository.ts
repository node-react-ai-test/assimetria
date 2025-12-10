import { CreateArticleInput } from '../models/article';

export interface GenerateArticleParams {
  topic: string;
  keywords?: string[];
  tone?: 'neutral' | 'casual' | 'formal';
}

export interface AiArticleProviderConfig {
  endpoint: string;
  apiKey?: string;
}

export interface HttpClientRequest<TRequest> {
  url: string;
  body: TRequest;
  headers?: Record<string, string>;
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
  httpClient?: HttpClient;
  config?: AiArticleProviderConfig;
}

interface ProviderArticleResponse {
  title: string;
  content: string;
  photoUrl?: string | null;
}

export class AiGenerateArticleRepository {
  private readonly httpClient?: HttpClient;
  private readonly config?: AiArticleProviderConfig;

  constructor({ httpClient, config }: Dependencies = {}) {
    this.httpClient = httpClient;
    this.config = config;
  }

  async generateArticle(params: GenerateArticleParams): Promise<CreateArticleInput> {
    const normalizedTopic = params.topic?.trim();

    if (!normalizedTopic) {
      throw new Error('Topic is required to generate an article');
    }

    const providerResponse = await this.fetchArticleFromProvider({
      ...params,
      topic: normalizedTopic,
    });

    return {
      title: providerResponse.title,
      content: providerResponse.content,
      photoUrl: providerResponse.photoUrl ?? null,
    };
  }

  private async fetchArticleFromProvider(
    params: GenerateArticleParams,
  ): Promise<ProviderArticleResponse> {
    if (this.httpClient && this.config?.endpoint) {
      // The actual HTTP call will be implemented once the provider is selected.
      // Leaving the structure in place keeps the public contract unchanged.
      await Promise.resolve();
    }

    return this.buildTemplateArticle(params);
  }

  private buildTemplateArticle(params: GenerateArticleParams): ProviderArticleResponse {
    const capitalizedTopic = this.capitalize(params.topic);
    const tone = params.tone ?? 'neutral';
    const keywordsLine = params.keywords?.length
      ? `Key themes: ${params.keywords.join(', ')}.`
      : '';

    const title = `Insights on ${capitalizedTopic}`;
    const paragraphs = [
      `### Context`,
      `A ${tone} walkthrough of the most relevant developments around ${capitalizedTopic}.`,
      '',
      `### Highlights`,
      '1. Market signal or historical background.',
      '2. Tactical guidance and actionable steps.',
      '3. Additional resources and references.',
      '',
      keywordsLine,
      '_Drafted automatically as a placeholder response._',
    ].filter(Boolean);

    return {
      title,
      content: paragraphs.join('\n'),
      photoUrl: null,
    };
  }

  private capitalize(value: string): string {
    if (!value) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1);
  }

}

