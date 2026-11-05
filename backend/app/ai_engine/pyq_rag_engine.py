import os
import random
from typing import Optional, List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.ai_engine.gemini_service import (
    generate_dynamic_interview_question,
    evaluate_dynamic_interview_answer
)

PYQ_KNOWLEDGE_BASE = [
    # ================= 1. REASONING & APTITUDE ROUND =================
    {
        "company": "Amazon",
        "role": "SDE-1",
        "round_category": "reasoning",
        "round_label": "Round 1: Logical Reasoning & Quantitative Aptitude",
        "title": "Logical Deductions & Algorithmic Probability",
        "question": "Solve this logical aptitude scenario: A server cluster contains 10 nodes where exactly 3 nodes are randomly faulty. What is the probability that in an audit of 4 randomly sampled nodes, at most 1 faulty node is found? Explain your combinatorial reasoning step-by-step.",
        "variations": [
            "Analytical Reasoning Challenge: If 5 distributed microservices (A, B, C, D, E) communicate in a sequence where C must execute before D, and A must execute immediately after B, determine all valid execution orders and explain your deductive elimination logic.",
            "Quantitative Aptitude Challenge: A data pipeline processes batches at rates of 60 MB/s, 90 MB/s, and 120 MB/s across three worker threads. Calculate the harmonic mean throughput and determine the total transfer time for a 540 MB payload."
        ],
        "required_concepts": ["probability", "combinations", "permutations", "sample space", "deduction", "step-by-step reasoning"],
        "benchmark_summary": "Calculates hypergeometric probability: P(at most 1) = P(0 faulty) + P(1 faulty). Uses combination formula C(n, k) = n! / (k!(n-k)!) to calculate favorable outcomes over total C(10, 4) = 210 states."
    },
    {
        "company": "TCS",
        "role": "Digital Software Developer",
        "round_category": "reasoning",
        "round_label": "Round 1: Logical Reasoning & Quantitative Aptitude",
        "title": "Critical Path & Logical Network Sequencing",
        "question": "Logical Reasoning: Five software modules (P, Q, R, S, T) have dependency constraints. P finishes before Q can start; R and S finish simultaneously before T; Q must finish before R starts. Which module is the critical path bottleneck, and what is the minimum sequential execution stages?",
        "variations": [
            "Logical Series Completion: Identify the next element in the hexadecimal memory address pattern: 0x10, 0x1A, 0x2E, 0x4C, 0x76, [?]. Detail the underlying arithmetic progression and bitwise offset.",
            "Deductive Syllogism: All immutable objects are thread-safe. Some shared memory structs are not thread-safe. Conclude logically whether any shared memory structs can be immutable objects, and justify using formal set logic."
        ],
        "required_concepts": ["dependency", "critical path", "sequential", "bottleneck", "logical deduction", "progression"],
        "benchmark_summary": "Applies topological ordering and deductive constraint satisfaction. Maps dependencies: P -> Q -> R, S -> T. The critical path has 4 sequential phases: P -> Q -> R -> T, making Q and R the critical transition bottlenecks."
    },
    {
        "company": "Infosys",
        "role": "Specialist Programmer",
        "round_category": "reasoning",
        "round_label": "Round 1: Logical Reasoning & Quantitative Aptitude",
        "title": "Mathematical Induction & Cryptarithmic Reasoning",
        "question": "Solve the cryptarithmic puzzle where BASE + BALL = GAMES. Each letter represents a unique digit from 0 to 9. Determine the values of B, A, S, E, L, G, M and explain your deductive constraints.",
        "variations": [
            "Logical Reasoning: In an automated testing lab, 100 switches control 100 test servers. First pass flips every switch. Second pass flips every 2nd switch. Third pass flips every 3rd switch, up to 100 passes. Which servers remain ON at the end? Explain the mathematical property of perfect squares.",
            "Bayesian Probability Puzzle: A test predicts a software defect with 98% accuracy. Only 1 in 1000 modules has the defect. If a module tests positive, what is the exact posterior probability that it actually has the defect?"
        ],
        "required_concepts": ["deduction", "constraints", "cryptarithm", "carries", "unique digits", "logical elimination"],
        "benchmark_summary": "Uses carry propagation analysis. B + B + carry = G * 10 + A, indicating G = 1 since sum of two 4-digit numbers < 20000. Uses parity constraints and digit elimination to uniquely bind values."
    },

    # ================= 2. CODING & ALGORITHMS ROUND =================
    {
        "company": "Amazon",
        "role": "SDE-1",
        "round_category": "coding",
        "round_label": "Round 2: Data Structures & Live Coding",
        "title": "Sliding Window Maximum & Two Pointers",
        "question": "Implement an optimal algorithm to find the maximum in every sliding window of size K in an array of N integers. How do you achieve O(N) overall time complexity using a Monotonic Deque rather than an O(N log K) Heap?",
        "variations": [
            "Write the algorithm for Trapping Rain Water. Compare the O(N) Two Pointers approach against the Monotonic Stack approach in terms of auxiliary space and cache performance.",
            "Implement an algorithm to find the Longest Substring Without Repeating Characters in O(N) time. Detail the pointer movements and hash map index tracking."
        ],
        "required_concepts": ["monotonic deque", "sliding window", "o(n)", "two pointers", "indices", "amortized o(1)", "queue"],
        "benchmark_summary": "Uses a doubly-ended queue (deque) storing indices of elements in monotonically decreasing order. Elements outside the current window (i - k) are evicted from the front; smaller elements than the incoming value are pruned from the back in amortized O(1)."
    },
    {
        "company": "TCS",
        "role": "Digital Software Developer",
        "round_category": "coding",
        "round_label": "Round 2: Data Structures & Live Coding",
        "title": "Binary Tree Diameter & Lowest Common Ancestor (LCA)",
        "question": "Given a Binary Tree, write a recursive algorithm to compute its Diameter (the longest path between any two leaf nodes). How do you calculate both height and diameter in a single bottom-up DFS traversal in O(N) time?",
        "variations": [
            "Implement an algorithm to serialize and deserialize a Binary Tree into a string format. Explain how pre-order traversal with null delimiters reconstructs the tree accurately.",
            "Write an algorithm to find the Lowest Common Ancestor (LCA) in a Binary Search Tree (BST) in O(H) time without using extra memory."
        ],
        "required_concepts": ["dfs", "recursion", "binary tree", "diameter", "height", "bottom-up", "o(n)"],
        "benchmark_summary": "Performs post-order DFS traversal. At each node, computes left_height and right_height. Updates global max_diameter = max(max_diameter, left + right) and returns 1 + max(left, right) to parent in O(N) time and O(H) recursion stack."
    },
    {
        "company": "Infosys",
        "role": "Specialist Programmer",
        "round_category": "coding",
        "round_label": "Round 2: Data Structures & Live Coding",
        "title": "Dynamic Programming: 0/1 Knapsack & Subset Sum",
        "question": "Implement the 0/1 Knapsack algorithm using Dynamic Programming. Explain the recurrence relation, space optimization from O(N*W) 2D array to O(W) 1D array, and why iterating backwards is mandatory in the 1D approach.",
        "variations": [
            "Explain the recurrence relation for Longest Common Subsequence (LCS). How do you trace back from the 2D DP matrix to reconstruct the exact matching string?",
            "Solve the Coin Change (Minimum Coins) problem. Contrast top-down memoization vs bottom-up tabulation, detailing time and space complexities."
        ],
        "required_concepts": ["dynamic programming", "0/1 knapsack", "recurrence", "memoization", "tabulation", "space optimization", "backwards iteration"],
        "benchmark_summary": "DP state dp[w] stores max value achievable with capacity w. For each item (wt, val), iterating backwards from W down to wt prevents the same item from being counted multiple times, reducing space complexity to O(W) while keeping O(N*W) time."
    },

    # ================= 3. ADVANCED TECHNICAL & SYSTEM DESIGN ROUND =================
    {
        "company": "Amazon",
        "role": "SDE-1",
        "round_category": "technical",
        "round_label": "Round 3: Advanced Technical & System Architecture",
        "title": "LRU Cache Design & Algorithmic Optimization",
        "question": "Explain how you would implement an LRU (Least Recently Used) Cache. Which data structures achieve O(1) time complexity for both get() and put() operations, and how do you handle thread-safety and eviction?",
        "variations": [
            "Design a distributed rate limiter that throttles API calls per client identifier. Contrast Token Bucket, Leaky Bucket, and Sliding Window Counter in Redis.",
            "Explain database sharding strategies (Hash-based vs Range-based). How does consistent hashing mitigate massive data migration when adding new database shards?"
        ],
        "required_concepts": ["hashmap", "doubly linked list", "o(1)", "eviction", "least recently used", "pointers", "concurrency"],
        "benchmark_summary": "Combines a HashMap for O(1) key lookup and a Doubly Linked List for O(1) node relocation and eviction. Head holds most recent items; tail holds least recent. When capacity is exceeded, tail node is pruned in O(1)."
    },
    {
        "company": "TCS",
        "role": "Digital Software Developer",
        "round_category": "technical",
        "round_label": "Round 3: Advanced Technical & System Architecture",
        "title": "Relational Indexing & Database Optimization",
        "question": "Explain how B-Tree indexing works in relational databases like PostgreSQL/MySQL. How does indexing optimize search queries, and what is its negative impact on write operations?",
        "variations": [
            "Explain ACID properties in transaction management. What are dirty reads, non-repeatable reads, and phantom reads under different SQL isolation levels?",
            "Explain microservices communication patterns: Synchronous REST vs Asynchronous Event-Driven Messaging (Kafka/RabbitMQ). How do you handle distributed transactions with the Saga pattern?"
        ],
        "required_concepts": ["b-tree", "o(log n)", "select", "insert", "update", "write overhead", "clustered index", "table scan"],
        "benchmark_summary": "Indexes use B-Trees to enable O(log N) binary search rather than O(N) full table scans. However, every INSERT/UPDATE/DELETE requires rebalancing the tree, adding write latency and storage overhead."
    },

    # ================= 4. BEHAVIORAL & HR LEADERSHIP ROUND =================
    {
        "company": "Amazon",
        "role": "SDE-1",
        "round_category": "behavioral",
        "round_label": "Round 4: Behavioral & HR Leadership Round",
        "title": "Customer Obsession & Technical Trade-offs",
        "question": "Describe a scenario where you made a high-stakes technical decision under tight time constraints. How did you balance immediate delivery against technical debt and customer impact using the STAR method?",
        "variations": [
            "Tell me about a time you had a strong technical disagreement with a team member or lead. How did you handle it, what evidence did you present, and what was the outcome?",
            "Describe a project failure or outage you were responsible for. What went wrong, how did you mitigate the blast radius, and what preventative guardrails did you implement?"
        ],
        "required_concepts": ["situation", "task", "action", "result", "customer", "trade-off", "metrics", "ownership", "star"],
        "benchmark_summary": "Demonstrates Amazon Leadership Principles (Customer Obsession, Ownership, Bias for Action). Clear STAR framework (Situation, Task, Action, Result) with measurable outcomes and post-mortem mitigation of technical debt."
    },
    {
        "company": "TCS",
        "role": "Digital Software Developer",
        "round_category": "behavioral",
        "round_label": "Round 4: Behavioral & HR Leadership Round",
        "title": "Adaptability, Team Collaboration & Conflict Resolution",
        "question": "Using the STAR format, describe an instance where a project requirement changed drastically late in the software development lifecycle. How did you reorganize priorities, collaborate with stakeholders, and deliver successfully?",
        "variations": [
            "Give an example of when you had to learn a completely new technology or framework on a short deadline. How did you approach the learning curve and apply it to production?",
            "Tell me about a time when you received critical feedback on your code or architecture during a review. How did you respond and implement improvements?"
        ],
        "required_concepts": ["situation", "task", "action", "result", "adaptability", "communication", "stakeholders", "deliverables"],
        "benchmark_summary": "Presents structured STAR response highlighting agility, proactive communication, risk assessment, and professional handling of feedback to achieve on-time quality delivery."
    }
]

def fetch_pyq_for_company(
    company_name: str, 
    round_category: Optional[str] = None,
    exclude_titles: Optional[List[str]] = None,
    api_key: Optional[str] = None,
    target_role: Optional[str] = "Software Engineer"
) -> dict:
    rc_clean = "technical"
    if round_category:
        rc = round_category.strip().lower()
        if "reason" in rc or "aptitude" in rc or "round 1" in rc or "round1" in rc:
            rc_clean = "reasoning"
        elif "code" in rc or "coding" in rc or "algo" in rc or "round 2" in rc or "round2" in rc:
            rc_clean = "coding"
        elif "tech" in rc or "system" in rc or "design" in rc or "round 3" in rc or "round3" in rc:
            rc_clean = "technical"
        elif "hr" in rc or "behavior" in rc or "round 4" in rc or "round4" in rc:
            rc_clean = "behavioral"

    # 1. ATTEMPT DYNAMIC GENERATION VIA GEMINI AI (If API key available)
    if api_key or os.getenv("GEMINI_API_KEY"):
        dynamic_q = generate_dynamic_interview_question(
            company=company_name,
            round_type=rc_clean,
            target_role=target_role,
            exclude_titles=exclude_titles,
            api_key=api_key
        )
        if dynamic_q:
            return dynamic_q

    # 2. DETERMINISTIC DEDUPLICATED RAG FALLBACK
    pool = PYQ_KNOWLEDGE_BASE
    filtered_by_round = [q for q in pool if q.get("round_category") == rc_clean]
    if filtered_by_round:
        pool = filtered_by_round

    # Company preference match within the selected round pool
    matches = [q for q in pool if q["company"].lower() in company_name.lower()]
    target_candidates = matches if matches else pool

    # STRICT ANTI-DUPLICATION: Exclude previously presented questions
    excluded = set(t.strip().lower() for t in (exclude_titles or []))
    unseen_candidates = [q for q in target_candidates if q["title"].strip().lower() not in excluded]

    if unseen_candidates:
        chosen = random.choice(unseen_candidates)
    else:
        chosen = random.choice(target_candidates)
    
    # Pick either base question or a fresh variation not in excluded list
    all_options = [chosen["question"]] + chosen.get("variations", [])
    fresh_options = [opt for opt in all_options if opt.strip().lower() not in excluded]
    question_text = random.choice(fresh_options) if fresh_options else random.choice(all_options)

    return {
        "company": chosen["company"],
        "role": chosen["role"],
        "round_category": chosen.get("round_category", rc_clean),
        "round_label": chosen.get("round_label", f"{chosen['company']} Assessment"),
        "title": chosen["title"],
        "question": question_text,
        "required_concepts": chosen["required_concepts"],
        "benchmark_summary": chosen["benchmark_summary"],
        "ai_powered": False
    }

def evaluate_pyq_response(question_data: dict, student_answer: str, api_key: Optional[str] = None) -> dict:
    """
    Evaluates candidate's answer using Gemini API if key is present;
    otherwise falls back to institutional Concept Rubric + TF-IDF semantic scoring.
    """
    ans_clean = student_answer.strip().lower()
    if len(ans_clean) < 20:
        return {
            "score": 30,
            "verdict": "Insufficient Detail",
            "concept_coverage_percent": 15,
            "matched_concepts": [],
            "missing_concepts": question_data.get("required_concepts", [])[:4],
            "feedback": "Your answer is too brief for a campus interview panel. Explain the underlying reasoning, complexity trade-offs, and methodology in depth."
        }

    # 1. ATTEMPT EVALUATION WITH GEMINI API
    if api_key or os.getenv("GEMINI_API_KEY"):
        gemini_eval = evaluate_dynamic_interview_answer(question_data, student_answer, api_key=api_key)
        if gemini_eval:
            gemini_eval["ai_evaluator"] = "Google Gemini 2.5/1.5 Flash"
            return gemini_eval

    # 2. LOCAL CONCEPT RUBRIC + TF-IDF SEMANTIC SCORING FALLBACK
    req_concepts = question_data.get("required_concepts", [])
    matched = [c for c in req_concepts if c in ans_clean]
    missing = [c for c in req_concepts if c not in ans_clean]
    coverage_pct = int(round((len(matched) / max(1, len(req_concepts))) * 100))

    benchmark = question_data.get("benchmark_summary", "")
    corpus = [ans_clean, benchmark.lower()]
    sim_score = 50
    try:
        vec = TfidfVectorizer(stop_words="english")
        matrix = vec.fit_transform(corpus)
        sim = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
        sim_score = int(round(sim * 100))
    except Exception:
        sim_score = coverage_pct

    final_score = int(round(0.6 * coverage_pct + 0.4 * sim_score))
    final_score = max(35, min(96, final_score))

    feedback_points = []
    if matched:
        feedback_points.append(f"Strong demonstration of core principles: {', '.join(matched[:3])}.")
    if missing:
        feedback_points.append(f"To satisfy the company panel, explicitly address: {', '.join(missing[:3])}.")

    feedback_text = " ".join(feedback_points)

    return {
        "score": final_score,
        "verdict": "Interview Ready" if final_score >= 75 else "Needs Polish" if final_score >= 55 else "Needs Revision",
        "concept_coverage_percent": coverage_pct,
        "matched_concepts": matched,
        "missing_concepts": missing,
        "feedback": feedback_text,
        "ai_evaluator": "VFSTR Institutional Rubric Engine"
    }
