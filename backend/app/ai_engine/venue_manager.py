from typing import List, Dict, Optional, Any

VFSTR_CAMPUS_VENUES = {
    "A Block": ["Chamber A-101 (Executive Cabin)", "Chamber A-204 (Interview Panel 1)", "A-Block Placement Conference Hall"],
    "H Block": ["Seminar Hall H-2", "Chamber H-301", "H-Block Discussion Room 1"],
    "NTR Library": ["Digital Conference Room", "2nd Floor Research Annex", "NTR Library Interview Pod 1"],
    "N Block": ["Chamber N-105", "N-Block Meeting Room 2"],
    "P Block": ["Placement Cell Cabin P-1", "Placement Cell Cabin P-2", "P-Block Boardroom"],
    "U Block": ["Chamber U-302", "U-Block Panel Room 1"]
}

DEFAULT_TIME_SLOTS = [
    "09:30 AM - 10:00 AM",
    "10:00 AM - 10:30 AM",
    "10:30 AM - 11:00 AM",
    "11:00 AM - 11:30 AM",
    "11:30 AM - 12:00 PM",
    "01:30 PM - 02:00 PM",
    "02:00 PM - 02:30 PM",
    "02:30 PM - 03:00 PM",
    "03:00 PM - 03:30 PM"
]

def check_slot_collision(
    existing_schedules, 
    block: str, 
    chamber: str, 
    a: Optional[str] = None, 
    b: Any = None, 
    c: Optional[int] = None,
    slot_date: str = "",
    slot_time: str = "",
    student_id: int = 0
):
    """
    True multi-dimensional collision detector considering Date + Time + Room + Student:
    - Same room on different dates: NO collision.
    - Same student on different dates: NO collision.
    - Same room on same date at same time: COLLISION.
    - Same student on same date at same time: COLLISION.
    Supports both positional calling conventions and keyword arguments.
    """
    # Determine resolved date, time, and student_id
    if slot_date or slot_time or student_id:
        resolved_date = slot_date
        resolved_time = slot_time
        resolved_student_id = student_id
    elif isinstance(b, str):
        # Called as check_slot_collision(existing, block, chamber, slot_date, slot_time, student_id)
        resolved_date = a or ""
        resolved_time = b or ""
        resolved_student_id = c or 0
    else:
        # Called as check_slot_collision(existing, block, chamber, slot_time, student_id)
        resolved_date = ""
        resolved_time = a or ""
        resolved_student_id = b if isinstance(b, int) else 0

    clean_date = (resolved_date or "").strip().lower()
    clean_time = (resolved_time or "").strip().lower()
    clean_block = (block or "").strip().lower()
    clean_chamber = (chamber or "").strip().lower()

    for s in existing_schedules:
        s_date = (getattr(s, "slot_date", "") or "").strip().lower()
        s_time = (getattr(s, "slot_time", "") or "").strip().lower()
        s_block = (getattr(s, "block_name", "") or "").strip().lower()
        s_chamber = (getattr(s, "chamber_name", "") or "").strip().lower()
        s_student_id = getattr(s, "student_id", None)

        # If both dates are specified and different, they do NOT collide
        if s_date and clean_date and s_date != clean_date:
            continue

        # 1. Venue conflict (same date/unspecified, same room, same time)
        if s_block == clean_block and s_chamber == clean_chamber and s_time == clean_time:
            date_str = f" on {resolved_date}" if resolved_date else ""
            return {
                "collision": True,
                "reason": f"Venue Collision Detected: {chamber} in {block} is already booked{date_str} at {resolved_time} by another panel."
            }

        # 2. Student conflict (same date/unspecified, same candidate, same time)
        if s_student_id == resolved_student_id and s_time == clean_time:
            date_str = f" on {resolved_date}" if resolved_date else ""
            return {
                "collision": True,
                "reason": f"Candidate Schedule Collision: Student already has another confirmed interview scheduled{date_str} at {resolved_time}."
            }

    return {"collision": False, "reason": "Slot is vacant"}

def suggest_available_slots(existing_schedules, slot_date: str = "", block_preference: str = "A Block"):
    """Suggests free chambers and time slots for the recruiter taking the specific interview date into account."""
    clean_date = (slot_date or "").strip().lower()
    
    # Filter occupied by date if date provided
    if clean_date:
        occupied = {
            (s.block_name.strip().lower(), s.chamber_name.strip().lower(), s.slot_time.strip().lower())
            for s in existing_schedules
            if (s.slot_date or "").strip().lower() == clean_date
        }
    else:
        occupied = {
            (s.block_name.strip().lower(), s.chamber_name.strip().lower(), s.slot_time.strip().lower())
            for s in existing_schedules
        }

    suggestions = []
    blocks_to_check = [block_preference] if block_preference in VFSTR_CAMPUS_VENUES else list(VFSTR_CAMPUS_VENUES.keys())
    
    for b in blocks_to_check:
        for ch in VFSTR_CAMPUS_VENUES[b]:
            for t in DEFAULT_TIME_SLOTS:
                key = (b.strip().lower(), ch.strip().lower(), t.strip().lower())
                if key not in occupied:
                    suggestions.append({
                        "block": b,
                        "chamber": ch,
                        "slot_time": t,
                        "slot_date": slot_date or "Scheduled Date"
                    })
                    if len(suggestions) >= 8:
                        return suggestions

    return suggestions
