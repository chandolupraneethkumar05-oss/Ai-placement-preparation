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

def check_slot_collision(existing_schedules, block: str, chamber: str, slot_time: str, student_id: int):
    """
    Detects if a chamber is already occupied at the given time,
    OR if the student has another interview at that time.
    """
    for s in existing_schedules:
        # Venue collision
        if s.block_name == block and s.chamber_name == chamber and s.slot_time == slot_time:
            return {
                "collision": True,
                "reason": f"Collision Detected: {chamber} in {block} is already booked at {slot_time} by another panel."
            }
        # Student collision
        if s.student_id == student_id and s.slot_time == slot_time:
            return {
                "collision": True,
                "reason": f"Collision Detected: Student already has another confirmed interview scheduled at {slot_time}."
            }

    return {"collision": False, "reason": "Slot is vacant"}

def suggest_available_slots(existing_schedules, block_preference="A Block"):
    """Suggests free chambers and time slots for the recruiter."""
    occupied = {(s.block_name, s.chamber_name, s.slot_time) for s in existing_schedules}
    suggestions = []

    blocks_to_check = [block_preference] if block_preference in VFSTR_CAMPUS_VENUES else list(VFSTR_CAMPUS_VENUES.keys())
    
    for b in blocks_to_check:
        for ch in VFSTR_CAMPUS_VENUES[b]:
            for t in DEFAULT_TIME_SLOTS:
                if (b, ch, t) not in occupied:
                    suggestions.append({
                        "block": b,
                        "chamber": ch,
                        "slot_time": t
                    })
                    if len(suggestions) >= 8:
                        return suggestions

    return suggestions
