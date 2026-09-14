import os
from dotenv import load_dotenv
from supabase import create_client
from passlib.context import CryptContext

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

sb = create_client(supabase_url, service_key)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fetch admin user
res = sb.table("users").select("*").eq("email", "admin@pathiksco.com").execute()
if not res.data:
    print("ERROR: User not found!")
else:
    user = res.data[0]
    print("User found:", user["email"])
    print("isActive:", user.get("isActive"))
    stored_hash = user.get("passwordHash", "")
    print("Hash length:", len(stored_hash))
    print("Hash preview:", stored_hash[:20])
    match = pwd_context.verify("Admin@123", stored_hash)
    print("Password match:", match)
