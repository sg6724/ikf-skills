"""
Custom tools for the Performance Marketing Agent.
"""

import os
from pathlib import Path
from agno.tools import tool


def get_campaign_root() -> Path:
    """Get the root path for campaign results."""
    current_dir = Path(__file__).resolve().parent
    project_root = current_dir.parent.parent.parent
    return project_root / "results" / "campaigns"


@tool(
    name="extract_website_content",
    description="Extract content from a website URL. Use this when you have a brand's website URL to get their actual page content, services, messaging, and brand voice. Returns markdown content from the page.",
    show_result=True
)
def extract_website_content(url: str) -> str:
    """
    Extract content from a website using Tavily Extract API.
    
    Args:
        url: The website URL to extract content from (e.g., "https://ikf.co.in")
        
    Returns:
        str: Extracted page content in markdown format
    """
    from tavily import TavilyClient
    
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return "❌ Error: TAVILY_API_KEY not set in environment"
    
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
                return f"⚠️ No content extracted from {url}. The page may be blocked or empty."
        else:
            return f"⚠️ Could not extract content from {url}"
            
    except Exception as e:
        return f"❌ Error extracting content: {str(e)}"


@tool(
    name="save_campaign_asset",
    description="Save a campaign asset (image, copy, email) to the campaign deck folder structure.",
    show_result=True
)
def save_campaign_asset(
    brand_name: str,
    asset_type: str,
    filename: str,
    content: str = None,
    image_bytes: bytes = None,
    create_folders: bool = False
) -> str:
    """
    Save a campaign asset to the organized folder structure.
    
    Args:
        brand_name: Brand name in kebab-case (e.g., "glow-up-skincare")
        asset_type: Type of asset - "images", "copy/instagram", "emails", "root"
        filename: Name of the file to save
        content: Text content for markdown files
        image_bytes: Binary content for image files
        create_folders: If True, just creates the folder structure without saving
        
    Returns:
        str: Path to saved file or confirmation of folder creation
    """
    # Normalize brand name to kebab-case
    brand_slug = brand_name.lower().replace(" ", "-").replace("_", "-")
    
    campaign_root = get_campaign_root()
    brand_folder = campaign_root / brand_slug
    
    # Create folder structure
    folders = [
        brand_folder,
        brand_folder / "images",
        brand_folder / "copy" / "instagram",
        brand_folder / "emails",
    ]
    
    for folder in folders:
        folder.mkdir(parents=True, exist_ok=True)
    
    if create_folders:
        return f"✅ Campaign folder structure created at: {brand_folder}"
    
    # Determine target path
    if asset_type == "root":
        target_path = brand_folder / filename
    else:
        target_path = brand_folder / asset_type / filename
    
    # Ensure parent exists
    target_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save content
    if image_bytes:
        with open(target_path, "wb") as f:
            f.write(image_bytes)
    elif content:
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(content)
    else:
        return "❌ Error: Must provide either content or image_bytes"
    
    return f"✅ Saved: {target_path}"


@tool(
    name="list_campaign_assets",
    description="List all assets in a campaign deck folder.",
    show_result=True
)
def list_campaign_assets(brand_name: str) -> str:
    """
    List all files in a brand's campaign folder.
    
    Args:
        brand_name: Brand name to list assets for
        
    Returns:
        str: Formatted list of all assets
    """
    brand_slug = brand_name.lower().replace(" ", "-").replace("_", "-")
    campaign_root = get_campaign_root()
    brand_folder = campaign_root / brand_slug
    
    if not brand_folder.exists():
        return f"❌ No campaign folder found for: {brand_name}"
    
    output = [f"📁 Campaign: {brand_slug}\n"]
    
    for item in sorted(brand_folder.rglob("*")):
        if item.is_file():
            relative = item.relative_to(brand_folder)
            size = item.stat().st_size
            if size < 1024:
                size_str = f"{size}B"
            else:
                size_str = f"{size // 1024}KB"
            output.append(f"  {relative} ({size_str})")
    
    return "\n".join(output) if len(output) > 1 else f"📁 Campaign folder exists but is empty: {brand_folder}"
