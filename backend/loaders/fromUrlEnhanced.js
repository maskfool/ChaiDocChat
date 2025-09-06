// Enhanced URL crawler for documentation websites
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import * as cheerio from 'cheerio';

export async function fromUrlEnhanced(url, options = {}) {
  const {
    maxPages = 50,
    maxDepth = 3,
    baseUrl = null,
    includePatterns = [],
    excludePatterns = ['#', 'mailto:', 'tel:', 'javascript:', '.pdf', '.zip', '.exe'],
    delay = 1000, // 1 second delay between requests
    userAgent = 'Mozilla/5.0 (compatible; ChaiDocChat/1.0)'
  } = options;

  const baseUrlObj = new URL(url);
  const baseDomain = baseUrlObj.origin;
  const visited = new Set();
  const toVisit = [{ url, depth: 0 }];
  const documents = [];

  console.log(`[crawler] Starting crawl from: ${url}`);
  console.log(`[crawler] Max pages: ${maxPages}, Max depth: ${maxDepth}`);

  while (toVisit.length > 0 && documents.length < maxPages) {
    const { url: currentUrl, depth } = toVisit.shift();
    
    if (visited.has(currentUrl) || depth > maxDepth) {
      continue;
    }

    try {
      console.log(`[crawler] Fetching: ${currentUrl} (depth: ${depth})`);
      
      const loader = new CheerioWebBaseLoader(currentUrl, {
        userAgent,
        timeout: 10000,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        }
      });

      const docs = await loader.load();
      
      if (docs.length > 0) {
        const doc = docs[0];
        const $ = cheerio.load(doc.pageContent);
        
        // Clean up the content
        $('script, style, nav, header, footer, .sidebar, .navigation').remove();
        
        // Extract title and content
        const title = $('title').text().trim() || $('h1').first().text().trim();
        const content = $.text().replace(/\s+/g, ' ').trim();
        
        if (content.length > 100) { // Only include pages with substantial content
          doc.pageContent = `# ${title}\n\n${content}`;
          doc.metadata = {
            ...doc.metadata,
            source: currentUrl,
            title,
            depth,
            crawledAt: new Date().toISOString()
          };
          
          documents.push(doc);
          visited.add(currentUrl);
          
          console.log(`[crawler] ✓ Added: ${title} (${content.length} chars)`);
        }

        // Find links to crawl next
        if (depth < maxDepth) {
          const links = [];
          $('a[href]').each((_, element) => {
            const href = $(element).attr('href');
            if (!href) return;

            try {
              const absoluteUrl = new URL(href, currentUrl).href;
              const urlObj = new URL(absoluteUrl);
              
              // Only crawl same domain
              if (urlObj.origin !== baseDomain) return;
              
              // Check exclude patterns
              if (excludePatterns.some(pattern => absoluteUrl.includes(pattern))) return;
              
              // Check include patterns (if specified)
              if (includePatterns.length > 0 && !includePatterns.some(pattern => absoluteUrl.includes(pattern))) return;
              
              // Avoid already visited or queued URLs
              if (!visited.has(absoluteUrl) && !toVisit.some(item => item.url === absoluteUrl)) {
                links.push(absoluteUrl);
              }
            } catch (e) {
              // Invalid URL, skip
            }
          });

          // Add new links to queue
          links.forEach(link => {
            toVisit.push({ url: link, depth: depth + 1 });
          });
          
          console.log(`[crawler] Found ${links.length} new links to crawl`);
        }
      }

      // Delay between requests to be respectful
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    } catch (error) {
      console.warn(`[crawler] Failed to fetch ${currentUrl}:`, error.message);
    }
  }

  console.log(`[crawler] Completed: ${documents.length} pages crawled`);
  return documents;
}

// Specialized function for documentation sites
export async function fromDocumentationSite(url, options = {}) {
  const docOptions = {
    maxPages: 100,
    maxDepth: 4,
    includePatterns: ['/docs/', '/documentation/', '/guide/', '/tutorial/', '/api/'],
    excludePatterns: ['#', 'mailto:', 'tel:', 'javascript:', '.pdf', '.zip', '.exe', '/search', '/login', '/register'],
    delay: 500, // Faster for docs
    ...options
  };

  return fromUrlEnhanced(url, docOptions);
}
