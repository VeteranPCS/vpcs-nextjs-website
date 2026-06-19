import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl';

const DISALLOW = [
    '/api/*',
    '/error',
    '/not-found',
    '/studio',
    '/studio/*',
    '/thank-you',
    '/blog-search',
    '/blog-search/*',
    '/blog-search?*',
    '/contact-lender?*',
    '/contact-agent?*',
];

// AI/LLM crawlers we explicitly want indexing the site. Today the global
// `*` rule already covers these — the explicit allowlist signals intent
// and guards against future restrictive defaults from these crawlers.
const AI_USER_AGENTS = [
    'GPTBot',          // OpenAI
    'OAI-SearchBot',   // OpenAI SearchGPT
    'ChatGPT-User',    // OpenAI on-demand fetch
    'ClaudeBot',       // Anthropic indexing
    'Claude-User',     // Anthropic on-demand fetch
    'Claude-SearchBot',// Anthropic search
    'PerplexityBot',   // Perplexity indexing
    'Perplexity-User', // Perplexity on-demand fetch
    'Google-Extended', // Google generative AI
    'Applebot-Extended',// Apple Intelligence
    'CCBot',           // Common Crawl (powers many models)
    'Amazonbot',       // Amazon (Alexa+, Rufus)
    'Bytespider',      // ByteDance
    'Meta-ExternalAgent',
    'cohere-ai',
    'DuckAssistBot',
    'YouBot',
    'anthropic-ai',
];

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            { userAgent: '*', allow: '/', disallow: DISALLOW },
            ...AI_USER_AGENTS.map((ua) => ({ userAgent: ua, allow: '/', disallow: DISALLOW })),
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    }
}
