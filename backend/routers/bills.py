from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
import datetime
from database import supabase
from security import require_admin
from services.calculation import calculate_entry

router = APIRouter(prefix="/api/bills", tags=["Bills"])

BIMONTHLY_LABELS = {
    1: 'January - February', 2: 'January - February',
    3: 'March - April', 4: 'March - April',
    5: 'May - June', 6: 'May - June',
    7: 'July - August', 8: 'July - August',
    9: 'September - October', 10: 'September - October',
    11: 'November - December', 12: 'November - December'
}

def get_period_name(month: int) -> str:
    return BIMONTHLY_LABELS.get(month, f"Period {month}")

class CreateBillRequest(BaseModel):
    societyId: str
    year: int
    month: int

class UpdateAvRequest(BaseModel):
    av: float
    societyId: str

class UpdateHvRequest(BaseModel):
    hv: float
    societyId: str

def verify_society_admin(society_id: str, admin_id: str):
    s = supabase.table("societies").select("id").eq("id", society_id).eq("adminId", admin_id).execute()
    if not s.data:
        raise HTTPException(status_code=404, detail="Society not found or access denied")
    return s.data[0]

@router.get("")
def list_bills(societyId: str = Query(...), admin: dict = Depends(require_admin)):
    verify_society_admin(societyId, admin["id"])
    bills = supabase.table("monthly_bills").select("*, entries:bill_entries(count)").eq("societyId", societyId).order("year", desc=True).order("month", desc=True).execute()

    result = []
    for b in bills.data or []:
        count = len(b.get("entries") or [])
        b["_count"] = {"entries": count}
        result.append(b)

    return result

@router.post("/create", status_code=201)
def create_bill(data: CreateBillRequest, admin: dict = Depends(require_admin)):
    verify_society_admin(data.societyId, admin["id"])

    # Check if already exists
    existing = supabase.table("monthly_bills").select("id").eq("societyId", data.societyId).eq("year", data.year).eq("month", data.month).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail=f"Bill for {get_period_name(data.month)} {data.year} already exists")

    # Fetch active houses
    houses = supabase.table("houses").select("*").eq("societyId", data.societyId).eq("isActive", True).order("houseNo").execute()
    if not houses.data:
        raise HTTPException(status_code=400, detail="No active houses found in this society")

    # Find previous bill
    prev_bill = supabase.table("monthly_bills").select("id, year, month").eq("societyId", data.societyId).lt("year", data.year).order("year", desc=True).order("month", desc=True).limit(1).execute()
    if not prev_bill.data:
        prev_bill = supabase.table("monthly_bills").select("id, year, month").eq("societyId", data.societyId).eq("year", data.year).lt("month", data.month).order("month", desc=True).limit(1).execute()

    prev_av_map = {}
    has_prev_bill = False
    prev_label = ""

    if prev_bill.data:
        has_prev_bill = True
        p_id = prev_bill.data[0]["id"]
        prev_label = f"{get_period_name(prev_bill.data[0]['month'])} {prev_bill.data[0]['year']}"
        prev_entries = supabase.table("bill_entries").select("houseId, av").eq("monthlyBillId", p_id).execute()
        for pe in prev_entries.data or []:
            if pe.get("av") is not None:
                prev_av_map[pe["houseId"]] = pe["av"]

    # Insert MonthlyBill
    new_bill = supabase.table("monthly_bills").insert({
        "societyId": data.societyId,
        "year": data.year,
        "month": data.month,
        "status": "DRAFT"
    }).execute()

    if not new_bill.data:
        raise HTTPException(status_code=500, detail="Failed to create bill")

    bill_id = new_bill.data[0]["id"]

    # Insert entries for all houses
    entries_data = []
    missing_prev_houses = []

    for house in houses.data:
        h_id = house["id"]
        prev_av = prev_av_map.get(h_id)
        hv_autofilled = has_prev_bill and (prev_av is not None)

        if not hv_autofilled:
            missing_prev_houses.append(house["houseNo"])

        entries_data.append({
            "monthlyBillId": bill_id,
            "houseId": h_id,
            "hv": prev_av if hv_autofilled else 0.0,
            "hvAutoFilled": hv_autofilled,
            "isManualHv": not hv_autofilled,
            "v": 600.0
        })

    if entries_data:
        supabase.table("bill_entries").insert(entries_data).execute()

    # Refetch full bill
    full_bill = supabase.table("monthly_bills").select("*, entries:bill_entries(*, house:houses(*)), society:societies(*)").eq("id", bill_id).execute()

    return {
        "bill": full_bill.data[0] if full_bill.data else new_bill.data[0],
        "hasPrevBill": has_prev_bill,
        "prevMonth": prev_label,
        "missingPrevHouses": missing_prev_houses
    }

@router.get("/by-id/{bill_id}")
def get_bill_by_id(bill_id: str, admin: dict = Depends(require_admin)):
    b = supabase.table("monthly_bills").select("*, entries:bill_entries(*, house:houses(*)), society:societies(*)").eq("id", bill_id).execute()
    if not b.data:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill = b.data[0]
    verify_society_admin(bill["societyId"], admin["id"])

    # Sort entries by houseNo
    if bill.get("entries"):
        bill["entries"].sort(key=lambda x: x.get("house", {}).get("houseNo", ""))

    return bill

@router.get("/{society_id}/{year}/{month}")
def get_bill(society_id: str, year: int, month: int, admin: dict = Depends(require_admin)):
    verify_society_admin(society_id, admin["id"])
    b = supabase.table("monthly_bills").select("*, entries:bill_entries(*, house:houses(*)), society:societies(*)").eq("societyId", society_id).eq("year", year).eq("month", month).execute()
    if not b.data:
        raise HTTPException(status_code=404, detail=f"Bill for {get_period_name(month)} {year} not found")

    bill = b.data[0]
    if bill.get("entries"):
        bill["entries"].sort(key=lambda x: x.get("house", {}).get("houseNo", ""))

    return bill

@router.patch("/entry/{entry_id}/av")
def update_entry_av(entry_id: str, data: UpdateAvRequest, admin: dict = Depends(require_admin)):
    verify_society_admin(data.societyId, admin["id"])

    e_res = supabase.table("bill_entries").select("*, monthlyBill:monthly_bills(*)").eq("id", entry_id).execute()
    if not e_res.data:
        raise HTTPException(status_code=404, detail="Bill entry not found")

    entry = e_res.data[0]
    hv = float(entry.get("hv") or 0)
    av = float(data.av)

    calc = calculate_entry(hv, av)

    update_payload = {
        "av": av,
        "unit": calc["unit"],
        "falo": calc["falo"],
        "v": calc["v"],
        "total": calc["total"],
        "isNegative": calc["isNegative"]
    }

    updated = supabase.table("bill_entries").update(update_payload).eq("id", entry_id).execute()

    # If bill was published, mark CORRECTED
    m_bill = entry.get("monthlyBill") or {}
    if m_bill.get("status") == "PUBLISHED":
        supabase.table("monthly_bills").update({"status": "CORRECTED"}).eq("id", m_bill["id"]).execute()

    # Refetch entry with house
    res = supabase.table("bill_entries").select("*, house:houses(*)").eq("id", entry_id).execute()
    return res.data[0] if res.data else updated.data[0]

@router.patch("/entry/{entry_id}/hv")
def update_entry_hv(entry_id: str, data: UpdateHvRequest, admin: dict = Depends(require_admin)):
    verify_society_admin(data.societyId, admin["id"])

    e_res = supabase.table("bill_entries").select("*").eq("id", entry_id).execute()
    if not e_res.data:
        raise HTTPException(status_code=404, detail="Bill entry not found")

    entry = e_res.data[0]
    hv = float(data.hv)
    av = float(entry["av"]) if entry.get("av") is not None else None

    update_payload = {
        "hv": hv,
        "isManualHv": True,
        "hvAutoFilled": False
    }

    if av is not None:
        calc = calculate_entry(hv, av)
        update_payload.update({
            "unit": calc["unit"],
            "falo": calc["falo"],
            "v": calc["v"],
            "total": calc["total"],
            "isNegative": calc["isNegative"]
        })

    supabase.table("bill_entries").update(update_payload).eq("id", entry_id).execute()
    res = supabase.table("bill_entries").select("*, house:houses(*)").eq("id", entry_id).execute()
    return res.data[0]

@router.post("/{bill_id}/publish")
def publish_bill(bill_id: str, admin: dict = Depends(require_admin)):
    b = supabase.table("monthly_bills").select("*").eq("id", bill_id).execute()
    if not b.data:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill = b.data[0]
    verify_society_admin(bill["societyId"], admin["id"])

    now_iso = datetime.datetime.utcnow().isoformat()
    supabase.table("monthly_bills").update({"status": "PUBLISHED", "publishedAt": now_iso}).eq("id", bill_id).execute()

    full_bill = supabase.table("monthly_bills").select("*, entries:bill_entries(*, house:houses(*)), society:societies(*)").eq("id", bill_id).execute()
    return full_bill.data[0] if full_bill.data else bill

@router.post("/{bill_id}/unpublish")
def unpublish_bill(bill_id: str, admin: dict = Depends(require_admin)):
    b = supabase.table("monthly_bills").select("*").eq("id", bill_id).execute()
    if not b.data:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill = b.data[0]
    verify_society_admin(bill["societyId"], admin["id"])

    supabase.table("monthly_bills").update({"status": "DRAFT", "publishedAt": None}).eq("id", bill_id).execute()
    return {"message": "Bill unpublished"}

@router.post("/{bill_id}/sync-houses")
def sync_houses(bill_id: str, admin: dict = Depends(require_admin)):
    b = supabase.table("monthly_bills").select("*, entries:bill_entries(*)").eq("id", bill_id).execute()
    if not b.data:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill = b.data[0]
    verify_society_admin(bill["societyId"], admin["id"])

    all_houses = supabase.table("houses").select("*").eq("societyId", bill["societyId"]).eq("isActive", True).execute()
    existing_ids = set(e["houseId"] for e in bill.get("entries") or [])

    missing = [h for h in (all_houses.data or []) if h["id"] not in existing_ids]

    if not missing:
        return {"message": "All houses already present", "added": []}

    # Find prev bill
    prev_bill = supabase.table("monthly_bills").select("id").eq("societyId", bill["societyId"]).lt("year", bill["year"]).order("year", desc=True).order("month", desc=True).limit(1).execute()
    if not prev_bill.data:
        prev_bill = supabase.table("monthly_bills").select("id").eq("societyId", bill["societyId"]).eq("year", bill["year"]).lt("month", bill["month"]).order("month", desc=True).limit(1).execute()

    added_list = []
    for house in missing:
        hv_val = 0.0
        hv_auto = False
        if prev_bill.data:
            p_entry = supabase.table("bill_entries").select("av").eq("monthlyBillId", prev_bill.data[0]["id"]).eq("houseId", house["id"]).execute()
            if p_entry.data and p_entry.data[0].get("av") is not None:
                hv_val = p_entry.data[0]["av"]
                hv_auto = True

        supabase.table("bill_entries").insert({
            "monthlyBillId": bill_id,
            "houseId": house["id"],
            "hv": hv_val,
            "hvAutoFilled": hv_auto,
            "isManualHv": not hv_auto,
            "v": 600.0
        }).execute()
        added_list.append(house["houseNo"])

    full_bill = supabase.table("monthly_bills").select("*, entries:bill_entries(*, house:houses(*)), society:societies(*)").eq("id", bill_id).execute()

    return {
        "message": f"Added {len(added_list)} house(s): {', '.join(added_list)}",
        "bill": full_bill.data[0] if full_bill.data else bill,
        "added": added_list
    }

@router.delete("/{bill_id}")
def delete_bill(bill_id: str, admin: dict = Depends(require_admin)):
    b = supabase.table("monthly_bills").select("*").eq("id", bill_id).execute()
    if not b.data:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill = b.data[0]
    verify_society_admin(bill["societyId"], admin["id"])

    if bill.get("status") == "PUBLISHED":
        raise HTTPException(status_code=400, detail="Unpublish the bill before deleting")

    supabase.table("monthly_bills").delete().eq("id", bill_id).execute()
    return {"message": "Bill deleted"}
