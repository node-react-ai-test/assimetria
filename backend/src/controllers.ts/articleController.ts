
  
  /**
   * Repository contract used by the service.
   * Implement this with your ORM / DB client.
   */
  export interface ArticleRepository {
    findMany(params: ListArticlesParams): Promise<Article[]>;
    countAll(): Promise<number>;
  
    findById(id: string): Promise<Article | null>;
    create(payload: CreateArticleInput): Promise<Article>;
    update(id: string, payload: UpdateArticleInput): Promise<Article | null>;
    delete(id: string): Promise<boolean>;
  
    findByDateRange(params: GetArticlesByDatesParams): Promise<Article[]>;
    countByDateRange(from: Date, to: Date): Promise<number>;
  }
  
  /**
   * Service contract used by the controller.
   */
  export interface ArticleService {
    listArticles(params: ListArticlesParams): Promise<PaginatedResult<Article>>;
    getArticleById(id: string): Promise<Article | null>;
    createArticle(payload: CreateArticleInput): Promise<Article>;
    updateArticle(
      id: string,
      payload: UpdateArticleInput,
    ): Promise<Article | null>;
    deleteArticle(id: string): Promise<boolean>;
    getArticlesByDates(
      params: GetArticlesByDatesParams,
    ): Promise<PaginatedResult<Article>>;
  }
  
  /**
   * Default implementation of ArticleService.
   */
  export class DefaultArticleService implements ArticleService {
    constructor(
      private readonly articleRepository: ArticleRepository,
    ) {}
  
    async listArticles(
      params: ListArticlesParams,
    ): Promise<PaginatedResult<Article>> {
      const { limit, offset } = params;
  
      const [items, total] = await Promise.all([
        this.articleRepository.findMany({ limit, offset }),
        this.articleRepository.countAll(),
      ]);
  
      return { items, total, limit, offset };
    }
  
    async getArticleById(id: string): Promise<Article | null> {
      return this.articleRepository.findById(id);
    }
  
    async createArticle(payload: CreateArticleInput): Promise<Article> {
      return this.articleRepository.create(payload);
    }
  
    async updateArticle(
      id: string,
      payload: UpdateArticleInput,
    ): Promise<Article | null> {
      return this.articleRepository.update(id, payload);
    }
  
    async deleteArticle(id: string): Promise<boolean> {
      return this.articleRepository.delete(id);
    }
  
    /**
     * Service function corresponding to:
     * GET /articles/search?from=YYYY-MM-DD&to=YYYY-MM-DD[&limit=&offset=]
     */
    async getArticlesByDates(
      params: GetArticlesByDatesParams,
    ): Promise<PaginatedResult<Article>> {
      const { from, to, limit, offset } = params;
  
      const [items, total] = await Promise.all([
        this.articleRepository.findByDateRange({ from, to, limit, offset }),
        this.articleRepository.countByDateRange(from, to),
      ]);
  
      return { items, total, limit, offset };
    }
  }
  