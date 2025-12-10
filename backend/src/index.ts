// src/app.ts
import express, { Application } from 'express';

import createArticleRouter from './routes/articles.routes';
import { createArticleController } from './controllers/articles.controller';
import { ArticleService } from './services/articles.service';
import { ArticleRepository } from './repositories/article.repository';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';

const app: Application = express();

// Basic hardening
app.disable('x-powered-by');

// Core middleware
app.use(express.json());

// --- DI wiring / composition root ---
const articleRepository = new ArticleRepository();
const articleService = new ArticleService({ articleRepository });
const articleController = createArticleController({ articleService });
const articleRouter = createArticleRouter({ articleController });

// Routes
app.use('/articles', articleRouter);

// Centralised 404 + error handling (last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
