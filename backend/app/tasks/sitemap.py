import os
from datetime import datetime
from sqlalchemy import select
from app.database import async_session
from app.models.post import Post
from app.config import settings


async def generate_sitemap(ctx: dict) -> None:
    """Generate sitemap.xml for all published posts."""
    async with async_session() as db:
        result = await db.execute(
            select(Post.slug, Post.updated_at)
            .where(Post.status == "published")
            .order_by(Post.published_at.desc())
        )
        posts = result.all()

    site_url = getattr(settings, "site_url", "http://localhost")
    base_url = site_url.rstrip("/")

    urls = []
    urls.append(f"  <url><loc>{base_url}</loc><changefreq>daily</changefreq></url>")
    urls.append(f"  <url><loc>{base_url}/blog</loc><changefreq>daily</changefreq></url>")
    for slug, updated in posts:
        lastmod = updated.strftime("%Y-%m-%d") if updated else ""
        urls.append(
            f"  <url><loc>{base_url}/blog/{slug}</loc>"
            f"<lastmod>{lastmod}</lastmod><changefreq>weekly</changefreq></url>"
        )

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "\n".join(urls)
    xml += "\n</urlset>"

    os.makedirs(settings.upload_dir, exist_ok=True)
    filepath = os.path.join(settings.upload_dir, "sitemap.xml")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(xml)

    print(f"[{datetime.now()}] Sitemap generated: {len(posts) + 2} URLs")
