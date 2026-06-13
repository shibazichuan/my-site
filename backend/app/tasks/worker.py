from arq.connections import RedisSettings
from arq.cron import cron
from app.tasks.sitemap import generate_sitemap


class WorkerSettings:
    functions = [generate_sitemap]
    redis_settings = RedisSettings(host="redis", port=6379, database=1)
    cron_jobs = [
        # Generate sitemap every Sunday at 3:00 AM
        cron(generate_sitemap, hour=3, minute=0, weekday=6),
    ]

    @staticmethod
    async def on_startup(ctx):
        print("[ARQ Worker] Started")

    @staticmethod
    async def on_shutdown(ctx):
        print("[ARQ Worker] Shutting down")
