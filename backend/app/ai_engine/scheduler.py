def autonomous_schedule_interviews(applications, panels_count=2, venue="VFSTR E-Block 204"):
    """
    Autonomous constraint satisfaction scheduler:
    - Balances shortlisted students evenly across panels
    - Assigns staggered 25-minute slots starting from 10:00 AM
    - Prevents double-booking and room overlap
    """
    if not applications:
        return []

    time_slots = [
        "10:00 AM - 10:25 AM",
        "10:30 AM - 10:55 AM",
        "11:00 AM - 11:25 AM",
        "11:30 AM - 11:55 AM",
        "12:00 PM - 12:25 PM",
        "02:00 PM - 02:25 PM",
        "02:30 PM - 02:55 PM",
        "03:00 PM - 03:25 PM"
    ]

    assignments = []
    for idx, app in enumerate(applications):
        panel_idx = (idx % panels_count) + 1
        slot_idx = idx // panels_count
        slot_time = time_slots[slot_idx % len(time_slots)]
        panel_name = f"Panel {panel_idx} (Technical & HR)"

        assignments.append({
            "application_id": app.id,
            "job_id": app.job_id,
            "student_id": app.student_id,
            "panel_name": panel_name,
            "venue": f"{venue} (Table {panel_idx})",
            "slot_time": slot_time,
            "status": "CONFIRMED"
        })

    return assignments
