#/ app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router
from app.core.config import settings
from app.models.database import Base, engine
from app.models import user, vacancy, vacancy_file
from fastapi.responses import Response

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# origins = [
#     "http://localhost:5173",
#     "http://127.0.0.1:5173",
#     "http://localhost:3000",
#     "http://127.0.0.1:3000",
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/robots.txt", include_in_schema=False)
def robots_txt():
    content = f"""User-agent: *
Allow: /
Disallow: /login
Disallow: /dashboard
Disallow: /auth
Disallow: /vacancies/files
Sitemap: {settings.PUBLIC_BASE_URL}/sitemap.xml
"""
    return Response(content=content, media_type="text/plain")


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml():
    content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{settings.PUBLIC_BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>{settings.PUBLIC_BASE_URL}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.2</priority>
  </url>
</urlset>
"""
    return Response(content=content, media_type="application/xml")
