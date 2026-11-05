COMPANY_ROUNDS_CATALOG = {
    "Amazon": [
        {"round_no": 1, "name": "Online Assessment (OA)", "type": "Coding & Work Style", "details": "2 Algorithmic DSA problems on Hackerrank + Amazon Work Style Leadership Principles simulation."},
        {"round_no": 2, "name": "Technical Interview 1", "type": "Live Coding & DSA", "details": "Deep-dive into Trees, Graphs, Dynamic Programming and Big-O Space/Time complexity trade-offs."},
        {"round_no": 3, "name": "Technical Interview 2", "type": "System & Object-Oriented Design", "details": "Low-level class modeling, modular architecture, API design, and multi-threaded edge cases."},
        {"round_no": 4, "name": "Bar Raiser & Behavioral", "type": "Leadership Principles", "details": "Comprehensive evaluation on Ownership, Customer Obsession, and Bias for Action using STAR methodology."}
    ],
    "TCS": [
        {"round_no": 1, "name": "TCS NQT Integrated Qualifier", "type": "Cognitive + Hands-on Coding", "details": "Numerical, Verbal, Reasoning ability followed by 2 Advanced Hands-on Coding questions."},
        {"round_no": 2, "name": "Technical Interview", "type": "Core CS & Projects", "details": "Object-Oriented Programming in Java/Python, Database normalization, SQL queries, and Final Year Project defense."},
        {"round_no": 3, "name": "Managerial & HR Interview", "type": "Cultural Fit & Willingness", "details": "Communication skills, relocation flexibility, and foundational problem-solving mindset."}
    ],
    "Infosys": [
        {"round_no": 1, "name": "Hands-on Coding Assessment", "type": "Pure Coding (No Aptitude)", "details": "For Specialist Programmer (SP) and DSE: 3 Complex Algorithmic problems (Greedy, DP, Graph Theory). No generic aptitude."},
        {"round_no": 2, "name": "Technical & Live Code Optimization", "type": "Live Interview", "details": "Explaining time complexity, refactoring solutions, and answering Core CS fundamentals."},
        {"round_no": 3, "name": "HR / Behavioral Discussion", "type": "HR Round", "details": "Assessment of cultural fitment, academic consistency, and communication skills."}
    ],
    "Cognizant": [
        {"round_no": 1, "name": "Skill-Based Assessment", "type": "Technical & Analytical", "details": "Analytical and programming MCQ challenge on arrays, strings, and cloud/database concepts."},
        {"round_no": 2, "name": "Technical Interview", "type": "Core Stack & OOPs", "details": "Full-stack concepts, database indexing, REST APIs, and project architecture review."},
        {"round_no": 3, "name": "HR Clearance", "type": "HR Discussion", "details": "Document verification, background criteria check, and joining date confirmation."}
    ],
    "Wipro": [
        {"round_no": 1, "name": "National Qualifier Test", "type": "Aptitude + Written + Coding", "details": "Logical ability, English comprehension, and 2 hands-on coding questions."},
        {"round_no": 2, "name": "Technical Interview", "type": "Core Programming", "details": "Data structures, basic algorithms, DBMS, and academic project review."},
        {"round_no": 3, "name": "HR Interview", "type": "HR Round", "details": "Personal interview on adaptability, company values, and institutional achievements."}
    ]
}

def get_company_rounds(company_name: str) -> list[dict]:
    for name, rounds in COMPANY_ROUNDS_CATALOG.items():
        if name.lower() in company_name.lower():
            return rounds
    # Default standard tech pipeline
    return [
        {"round_no": 1, "name": "Online Technical & Coding Assessment", "type": "Screening", "details": "Problem-solving and domain fundamentals assessment."},
        {"round_no": 2, "name": "Technical Interview", "type": "Live Technical", "details": "Data structures, algorithms, and project architecture defense."},
        {"round_no": 3, "name": "HR & Culture Fit Round", "type": "HR", "details": "Behavioral alignment, communication, and offer discussion."}
    ]
