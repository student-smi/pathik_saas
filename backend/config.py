import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://dmrunwrkapxxbwykrdik.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
JWT_SECRET = os.getenv("JWT_SECRET", "pathik_sco_super_secret_jwt_key_2026_change_in_production")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://pathik-saas-frontend.vercel.app")
PORT = int(os.getenv("PORT", 5000))
