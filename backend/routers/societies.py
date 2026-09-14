from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import supabase
from security import require_admin

router = APIRouter(prefix="/api/societies", tags=["Societies"])

class CreateSocietyRequest(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None

@router.get("")
def list_societies(admin: dict = Depends(require_admin)):
    res = supabase.table("societies").select("*").eq("adminId", admin["id"]).execute()
    return res.data

@router.post("", status_code=201)
def create_society(data: CreateSocietyRequest, admin: dict = Depends(require_admin)):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Society name is required")

    res = supabase.table("societies").insert({
        "name": data.name.strip(),
        "address": data.address.strip() if data.address else None,
        "city": data.city.strip() if data.city else None,
        "adminId": admin["id"]
    }).execute()

    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create society")

    return res.data[0]
