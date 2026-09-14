"""
Residents Router
================
POST /api/residents         — Create resident with auto-generated email & password
GET  /api/residents         — List residents for a society
DELETE /api/residents/{id}  — Delete resident
POST /api/residents/{id}/reset-password — Reset password

Credential logic (mirrors frontend preview):
  Email    = firstname@gmail.com  (first word of name, lowercased, alphanumeric only)
  Password = house number         (e.g. "101", "A-12")
"""

import re
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from database import supabase
from security import require_admin, hash_password

router = APIRouter(prefix="/api/residents", tags=["Residents"])


# ---------------------------------------------------------------------------
# Credential generators — must match frontend preview logic exactly
# ---------------------------------------------------------------------------

def _generate_email(name: str) -> str:
    """firstname@gmail.com  (first word, lowercase, alphanumeric only)"""
    first_word = name.strip().split()[0] if name.strip() else "resident"
    clean = re.sub(r"[^a-z0-9]", "", first_word.lower())
    return f"{clean}@gmail.com" if clean else "resident@gmail.com"


def _generate_password(house_no: str) -> str:
    """Password = house number as-is (e.g. '101', 'A-12')"""
    return house_no.strip()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CreateResidentRequest(BaseModel):
    name: str
    phone: Optional[str] = None
    houseId: str


class ResetPasswordRequest(BaseModel):
    newPassword: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("")
def list_residents(societyId: str = Query(...), admin: dict = Depends(require_admin)):
    """Return all residents for a society (admin-owned)."""
    # Verify society belongs to admin
    s = supabase.table("societies").select("id").eq("id", societyId).eq("adminId", admin["id"]).execute()
    if not s.data:
        raise HTTPException(status_code=404, detail="Society not found")

    res = supabase.table("residents") \
        .select("*, house:houses(houseNo, floor, societyId), user:users(email, isActive)") \
        .eq("house.societyId", societyId) \
        .execute()

    # Filter to only residents whose house belongs to this society
    filtered = [r for r in res.data if r.get("house") and r["house"].get("societyId") == societyId]
    return filtered


@router.post("", status_code=201)
def create_resident(data: CreateResidentRequest, admin: dict = Depends(require_admin)):
    """
    Create a resident with auto-generated credentials:
      email    = firstname@gmail.com
      password = house number
    Returns the resident + generatedCredentials for the admin popup.
    """
    # 1. Fetch the house (must belong to this admin's society)
    h_res = supabase.table("houses") \
        .select("*, society:societies(id, adminId)") \
        .eq("id", data.houseId) \
        .execute()

    if not h_res.data:
        raise HTTPException(status_code=404, detail="House not found")

    house = h_res.data[0]
    society = house.get("society") or {}

    if society.get("adminId") != admin["id"]:
        raise HTTPException(status_code=403, detail="Not your society")

    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Resident name is required")

    # 2. Generate credentials
    plain_email    = _generate_email(data.name)
    plain_password = _generate_password(house["houseNo"])

    # 3. Create or reuse user account
    u_exist = supabase.table("users").select("id").eq("email", plain_email).execute()
    if u_exist.data:
        user_id = u_exist.data[0]["id"]
        # Update password to match current house number (idempotent)
        supabase.table("users").update({
            "passwordHash": hash_password(plain_password)
        }).eq("id", user_id).execute()
    else:
        u_res = supabase.table("users").insert({
            "email": plain_email,
            "passwordHash": hash_password(plain_password),
            "role": "RESIDENT",
            "isActive": True,
        }).execute()
        if not u_res.data:
            raise HTTPException(status_code=500, detail="Failed to create user account")
        user_id = u_res.data[0]["id"]

    # 4. Create resident record
    r_res = supabase.table("residents").insert({
        "name": data.name.strip(),
        "phone": data.phone.strip() if data.phone else None,
        "houseId": data.houseId,
        "userId": user_id,
    }).execute()

    if not r_res.data:
        raise HTTPException(status_code=500, detail="Failed to create resident")

    resident = r_res.data[0]

    return {
        **resident,
        # Frontend shows this in the CredentialsPopup
        "generatedCredentials": {
            "email":    plain_email,
            "password": plain_password,
        }
    }


@router.delete("/{resident_id}")
def delete_resident(resident_id: str, admin: dict = Depends(require_admin)):
    """Delete a resident and deactivate their user account."""
    r = supabase.table("residents") \
        .select("*, house:houses(*, society:societies(adminId))") \
        .eq("id", resident_id) \
        .execute()

    if not r.data:
        raise HTTPException(status_code=404, detail="Resident not found")

    resident = r.data[0]
    society  = (resident.get("house") or {}).get("society") or {}

    if society.get("adminId") != admin["id"]:
        raise HTTPException(status_code=403, detail="Not your resident")

    # Delete resident row
    supabase.table("residents").delete().eq("id", resident_id).execute()

    # Deactivate user account (don't hard-delete — keeps history)
    if resident.get("userId"):
        supabase.table("users").update({"isActive": False}).eq("id", resident["userId"]).execute()

    return {"message": "Resident removed"}


@router.post("/{resident_id}/reset-password")
def reset_password(
    resident_id: str,
    data: ResetPasswordRequest,
    admin: dict = Depends(require_admin),
):
    """Admin resets a resident's password."""
    r = supabase.table("residents") \
        .select("*, house:houses(*, society:societies(adminId))") \
        .eq("id", resident_id) \
        .execute()

    if not r.data:
        raise HTTPException(status_code=404, detail="Resident not found")

    resident = r.data[0]
    society  = (resident.get("house") or {}).get("society") or {}

    if society.get("adminId") != admin["id"]:
        raise HTTPException(status_code=403, detail="Not your resident")

    if not data.newPassword or len(data.newPassword.strip()) < 3:
        raise HTTPException(status_code=400, detail="Password must be at least 3 characters")

    supabase.table("users").update({
        "passwordHash": hash_password(data.newPassword.strip())
    }).eq("id", resident["userId"]).execute()

    return {"message": "Password reset successfully"}
