"""
Tavily search and URL extraction tools.
"""

import os
from agno.tools import tool


@tool(
    name="web_search_using_tavily",
    description="Search the web for information. Use for competitor research, industry trends, and general web queries. Returns summarized results.",
    show_result=False
)
def tavily_search(query: str, max_results: int = 5) -> str:
    """
    Search the web using Tavily API.
    
    Args:
        query: Search query
        max_results: Maximum number of results (default 5)
        
    Returns:
        Formatted search results
    """
    from tavily import TavilyClient
    
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return "Error: TAVILY_API_KEY not set in environment"
    
    try:
        client = TavilyClient(api_key=api_key)
        response = client.search(
            query=query,
            search_depth="basic",
            max_results=max_results,
            include_images=False,
        )
        
        if not response or "results" not in response:
            return f"No results found for: {query}"
        
        results = []
        for r in response["results"][:max_results]:
            results.append(f"**{r.get('title', 'Untitled')}**\n{r.get('url', '')}\n{r.get('content', '')[:500]}\n")
        
        return f"## Search Results for: {query}\n\n" + "\n---\n".join(results)
        
    except Exception as e:
        return f"Error searching: {str(e)}"


@tool(
    name="extract_url_content",
    description="Extract content from a URL. Use for getting actual website content, brand pages, LinkedIn profiles. Returns markdown content from the page.",
    show_result=False
)
def extract_url_content(url: str) -> str:
    """
    Extract content from a website using Tavily Extract API.
    
    Args:
        url: The website URL to extract content from (e.g., "https://ikf.co.in")
        
    Returns:
        Extracted page content in markdown format
    """
    from tavily import TavilyClient
    
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return "Error: TAVILY_API_KEY not set in environment"
    
    try:
        client = TavilyClient(api_key=api_key)
        
        # Ensure URL has protocol
        if not url.startswith("http"):
            url = f"https://{url}"
        
        response = client.extract(urls=[url])
        
        if response and "results" in response and len(response["results"]) > 0:
            result = response["results"][0]
            content = result.get("raw_content", "")
            
            if content:
                return f"## Extracted from {url}\n\n{content[:8000]}"  # Limit to 8k chars
            else:
                return f"No content extracted from {url}. The page may be blocked or empty."
        else:
            return f"Could not extract content from {url}"
            
    except Exception as e:
        return f"Error extracting content: {str(e)}"
