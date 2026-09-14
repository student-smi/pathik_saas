import jwt
import datetime
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from config import JWT_SECRET
from database import supabase

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: datetime.timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(days=7))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = decode_token(token)
    user_id = payload.get("userId") or payload.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    # Fetch user from Supabase
    res = supabase.table("users").select("*").eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="User not found")

    user = res.data[0]
    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="User account is deactivated")

    # If resident, attach resident info
    if user.get("role") == "RESIDENT":
        res_res = supabase.table("residents").select("*, house:houses(*, society:societies(*))").eq("userId", user_id).execute()
        if res_res.data:
            r = res_res.data[0]
            house = r.get("house") or {}
            society = house.get("society") or {}
            user["resident"] = {
                "id": r.get("id"),
                "name": r.get("name"),
                "phone": r.get("phone"),
                "houseId": r.get("houseId"),
                "houseNo": house.get("houseNo"),
                "societyId": house.get("societyId"),
                "society": society.get("name")
            }

    return user

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user
