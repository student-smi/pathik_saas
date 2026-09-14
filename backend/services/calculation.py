def calculate_entry(hv: float, av: float) -> dict:
    if av is None or hv is None:
        return {
            "unit": None,
            "falo": None,
            "v": 600,
            "total": None,
            "isNegative": False
        }

    unit = av - hv
    falo = unit * 5.0
    v = 600.0
    total = v + falo
    is_negative = unit < 0

    return {
        "unit": round(unit, 2),
        "falo": round(falo, 2),
        "v": round(v, 2),
        "total": round(total, 2),
        "isNegative": is_negative
    }
