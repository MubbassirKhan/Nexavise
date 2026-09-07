from functools import lru_cache
import os
from dotenv import load_dotenv

load_dotenv()


@lru_cache
def settings() -> dict[str, object]:
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return {
        "supabase_url": os.getenv("SUPABASE_URL", ""),
        "supabase_key": os.getenv("SUPABASE_KEY", ""),
        "cors_origins": [origin.strip() for origin in origins.split(",") if origin.strip()],
        "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
    }
