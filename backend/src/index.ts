// src/app.ts
import express, { Application } from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

import { createArticleRouter } from './routes/articles';
import { ArticleController } from './controllers.ts/articleController';
import { ArticleService } from './services/articlesService';
import { ArticleRepository } from './repositories/articlesRepository';
import { AiGenerateArticleRepository } from './repositories/aiGenerateArticleRepository';
import { notFoundHandler, errorHandler } from './middleware/error';

dotenv.config();

const app: Application = express();

// Basic hardening
app.disable('x-powered-by');

// Core middleware
app.use(express.json());

// --- DI wiring / composition root ---
const articleRepository = new ArticleRepository();

const openAiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const aiGenerateArticleRepository = new AiGenerateArticleRepository({
    aiApiClient: openAiClient,
    config: {
        endpoint: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY || '',
    },
});

const articleService = new ArticleService({
    articleRepository,
    aiGenerateArticleRepository,
});

const articleController = new ArticleController(articleService);



const articleRouter = createArticleRouter({
    articleController,
});

// Routes
app.use('/articles', articleRouter);

// Centralised 404 + error handling (last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
