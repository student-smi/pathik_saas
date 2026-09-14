from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from database import supabase
from security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/login")
def login(data: LoginRequest):
    email = data.email.lower().strip()
    res = supabase.table("users").select("*").eq("email", email).execute()
    if not res.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = res.data[0]
    if not user.get("isActive", True):
        raise HTTPException(status_code=403, detail="Account deactivated. Contact admin.")

    if not verify_password(data.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Generate token
    token = create_access_token({"userId": user["id"], "role": user["role"]})

    # Resident details if resident
    resident_info = None
    if user.get("role") == "RESIDENT":
        r_res = supabase.table("residents").select("*, house:houses(*, society:societies(*))").eq("userId", user["id"]).execute()
        if r_res.data:
            r = r_res.data[0]
            house = r.get("house") or {}
            society = house.get("society") or {}
            resident_info = {
                "id": r.get("id"),
                "name": r.get("name"),
                "phone": r.get("phone"),
                "houseId": r.get("houseId"),
                "houseNo": house.get("houseNo"),
                "societyId": house.get("societyId"),
                "society": society.get("name")
            }

    user_data = {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "resident": resident_info
    }

    return {
        "token": token,
        "user": user_data
    }

@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    return {
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "resident": user.get("resident")
        }
    }
