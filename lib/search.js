import axios from 'axios';
import { logger } from './logger.js';

/**
 * Searches the web using Google Custom Search API, Tavily, or Wikipedia
 * @param {string} query - The search query
 * @returns {Promise<Array<{title: string, link: string, snippet: string}>>}
 */
export async function searchWeb(query) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (apiKey && cx) {
        try {
            logger.info(`[Search] Querying Google Custom Search API for: "${query}"`);
            const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}`;
            const response = await axios.get(url, { timeout: 10000 });
            
            const items = response.data?.items || [];
            if (items.length > 0) {
                return items.slice(0, 5).map(item => ({
                    title: item.title,
                    link: item.link,
                    snippet: item.snippet || ''
                }));
            }
        } catch (err) {
            logger.error('[Search] Google Custom Search failed:', err.message);
        }
    }

    if (tavilyKey) {
        try {
            logger.info(`[Search] Querying Tavily Search API for: "${query}"`);
            const response = await axios.post('https://api.tavily.com/search', {
                query: query,
                search_depth: 'basic',
                max_results: 5
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tavilyKey}`
                },
                timeout: 10000
            });
            
            const results = response.data?.results || [];
            if (results.length > 0) {
                return results.map(item => ({
                    title: item.title,
                    link: item.url,
                    snippet: item.content || ''
                }));
            }
        } catch (err) {
            logger.error('[Search] Tavily Search failed:', err.message);
        }
    }

    // Fallback: Wikipedia Search
    try {
        logger.info(`[Search] Querying Wikipedia API for: "${query}"`);
        const url = `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'AstroBot/2.0' },
            timeout: 10000
        });

        const items = response.data?.query?.search || [];
        return items.slice(0, 5).map(item => ({
            title: item.title,
            link: `https://ar.wikipedia.org/?curid=${item.pageid}`,
            snippet: (item.snippet || '').replace(/<[^>]*>/g, '').trim()
        }));
    } catch (err) {
        logger.error('[Search] Wikipedia Search failed:', err.message);
        return [];
    }
}

