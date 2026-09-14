from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from security import get_current_user

router = APIRouter(prefix="/api/portal", tags=["Portal"])

@router.get("/bills/current")
def get_current_portal_bill(user: dict = Depends(get_current_user)):
    resident = user.get("resident")
    if not resident:
        raise HTTPException(status_code=404, detail="Resident profile not found")

    house_id = resident.get("houseId")
    if not house_id:
        raise HTTPException(status_code=404, detail="Resident is not assigned to a house")

    # Get latest published bill entry
    entries = supabase.table("bill_entries").select("*, monthlyBill:monthly_bills!inner(*)").eq("houseId", house_id).in_("monthlyBill.status", ["PUBLISHED", "CORRECTED"]).order("createdAt", desc=True).execute()

    if not entries.data:
        raise HTTPException(status_code=404, detail="No published bill available")

    # Attach house detail
    entry = entries.data[0]
    h_res = supabase.table("houses").select("*, society:societies(*)").eq("id", house_id).execute()
    if h_res.data:
        entry["house"] = h_res.data[0]

    return entry

@router.get("/bills")
def get_portal_bills_history(user: dict = Depends(get_current_user)):
    resident = user.get("resident")
    if not resident or not resident.get("houseId"):
        return []

    house_id = resident.get("houseId")
    entries = supabase.table("bill_entries").select("*, monthlyBill:monthly_bills!inner(*)").eq("houseId", house_id).in_("monthlyBill.status", ["PUBLISHED", "CORRECTED"]).order("createdAt", desc=True).execute()

    result = []
    h_res = supabase.table("houses").select("*, society:societies(*)").eq("id", house_id).execute()
    house_obj = h_res.data[0] if h_res.data else {}

    for entry in entries.data or []:
        entry["house"] = house_obj
        result.append(entry)

    return result

@router.get("/bill/{entry_id}")
def get_portal_bill_detail(entry_id: str, user: dict = Depends(get_current_user)):
    resident = user.get("resident")
    if not resident or not resident.get("houseId"):
        raise HTTPException(status_code=403, detail="Access denied")

    entry = supabase.table("bill_entries").select("*, monthlyBill:monthly_bills(*), house:houses(*, society:societies(*))").eq("id", entry_id).execute()
    if not entry.data:
        raise HTTPException(status_code=404, detail="Bill entry not found")

    e = entry.data[0]
    if e.get("houseId") != resident.get("houseId"):
        raise HTTPException(status_code=403, detail="Access denied to this bill entry")

    return e
