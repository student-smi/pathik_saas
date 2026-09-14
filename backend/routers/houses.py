from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from database import supabase
from security import require_admin, hash_password

router = APIRouter(prefix="/api/houses", tags=["Houses"])

class CreateHouseRequest(BaseModel):
    societyId: str
    houseNo: str
    residentName: Optional[str] = None
    residentPhone: Optional[str] = None
    residentEmail: Optional[str] = None

@router.get("")
def list_houses(societyId: str = Query(...), admin: dict = Depends(require_admin)):
    # Verify society
    s = supabase.table("societies").select("id").eq("id", societyId).eq("adminId", admin["id"]).execute()
    if not s.data:
        raise HTTPException(status_code=404, detail="Society not found")

    res = supabase.table("houses").select("*, resident:residents(*)").eq("societyId", societyId).order("houseNo").execute()
    return res.data

@router.post("", status_code=201)
def create_house(data: CreateHouseRequest, admin: dict = Depends(require_admin)):
    s = supabase.table("societies").select("id").eq("id", data.societyId).eq("adminId", admin["id"]).execute()
    if not s.data:
        raise HTTPException(status_code=404, detail="Society not found")

    house_no = data.houseNo.strip()
    # Existing house check
    existing = supabase.table("houses").select("id").eq("societyId", data.societyId).eq("houseNo", house_no).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail=f"House {house_no} already exists in this society")

    # Create House
    h_res = supabase.table("houses").insert({
        "societyId": data.societyId,
        "houseNo": house_no
    }).execute()
    if not h_res.data:
        raise HTTPException(status_code=500, detail="Failed to create house")

    house = h_res.data[0]

    # Create Resident if details provided (legacy — prefer POST /api/residents)
    if data.residentName and data.residentEmail:
        email = data.residentEmail.lower().strip()
        u_exist = supabase.table("users").select("id").eq("email", email).execute()
        if u_exist.data:
            user_id = u_exist.data[0]["id"]
        else:
            u_res = supabase.table("users").insert({
                "email": email,
                "passwordHash": hash_password("Resident@123"),
                "role": "RESIDENT"
            }).execute()
            user_id = u_res.data[0]["id"]

        supabase.table("residents").insert({
            "name": data.residentName.strip(),
            "phone": data.residentPhone.strip() if data.residentPhone else None,
            "houseId": house["id"],
            "userId": user_id
        }).execute()

    # Sync into any DRAFT bills
    draft_bills = supabase.table("monthly_bills").select("id, year, month").eq("societyId", data.societyId).eq("status", "DRAFT").execute()
    for bill in draft_bills.data or []:
        # Find previous bill for HV
        prev_bill = supabase.table("monthly_bills").select("id").eq("societyId", data.societyId).lt("year", bill["year"]).order("year", desc=True).order("month", desc=True).limit(1).execute()
        if not prev_bill.data:
            prev_bill = supabase.table("monthly_bills").select("id").eq("societyId", data.societyId).eq("year", bill["year"]).lt("month", bill["month"]).order("month", desc=True).limit(1).execute()

        hv_val = 0
        hv_auto = False
        if prev_bill.data:
            prev_entry = supabase.table("bill_entries").select("av").eq("monthlyBillId", prev_bill.data[0]["id"]).eq("houseId", house["id"]).execute()
            if prev_entry.data and prev_entry.data[0]["av"] is not None:
                hv_val = prev_entry.data[0]["av"]
                hv_auto = True

        supabase.table("bill_entries").insert({
            "monthlyBillId": bill["id"],
            "houseId": house["id"],
            "hv": hv_val,
            "hvAutoFilled": hv_auto,
            "isManualHv": not hv_auto,
            "v": 600
        }).execute()

    # Refetch house with resident
    full = supabase.table("houses").select("*, resident:residents(*)").eq("id", house["id"]).execute()
    return full.data[0] if full.data else house

@router.delete("/{house_id}")
def delete_house(house_id: str, admin: dict = Depends(require_admin)):
    h = supabase.table("houses").select("*, society:societies(adminId)").eq("id", house_id).execute()
    if not h.data or h.data[0]["society"]["adminId"] != admin["id"]:
        raise HTTPException(status_code=404, detail="House not found")

    supabase.table("houses").delete().eq("id", house_id).execute()
    return {"message": "House deleted"}
