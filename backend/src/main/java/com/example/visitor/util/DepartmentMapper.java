package com.example.visitor.util;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Central department name normalizer.
 *
 * Three formats exist in the DB:
 *   department_summary : CSE | CCE | CSBS | ECE | MECH | AIDS | AIML | VLSI | BT
 *   staff.department   : AI & DS | AI & ML | Non-Teaching Admin | ...
 *   students.department: B.E. CSE | B.E. CCE | B.E. CSE (AI & ML) | B.Tech. AI & DS | ...
 *
 * All public methods accept ANY of the three formats and return the canonical short code.
 */
public class DepartmentMapper {

    // canonical code → display label (for UI)
    private static final Map<String, String> CODE_TO_LABEL = new LinkedHashMap<>();

    // all known aliases (lower-cased) → canonical code
    private static final Map<String, String> ALIAS_TO_CODE = new LinkedHashMap<>();

    static {
        // ── CSE ──────────────────────────────────────────────────────────────
        reg("CSE", "Computer Science & Engineering",
            "CSE", "B.E. CSE", "B.E. CSE (CORE)", "Computer Science and Engineering",
            "Computer Science & Engineering");

        // ── CCE ──────────────────────────────────────────────────────────────
        reg("CCE", "Civil & Construction Engineering",
            "CCE", "B.E. CCE", "Civil Engineering", "Civil & Construction Engineering");

        // ── CSBS ─────────────────────────────────────────────────────────────
        reg("CSBS", "CS & Business Systems",
            "CSBS", "B.Tech. CS & BS", "B.Tech CS & BS",
            "Computer Science & Business Systems", "Computer Science and Business Systems",
            "CS & BS", "CS&BS");

        // ── ECE ──────────────────────────────────────────────────────────────
        reg("ECE", "Electronics & Communication Engineering",
            "ECE", "B.E. ECE",
            "Electronics & Communication", "Electronics and Communication",
            "Electronics & Communication Engineering",
            "Electronics and Communication Engineering");

        // ── MECH ─────────────────────────────────────────────────────────────
        reg("MECH", "Mechanical Engineering",
            "MECH", "B.E. MECH", "Mechanical Engineering");

        // ── AIDS ─────────────────────────────────────────────────────────────
        reg("AIDS", "AI & Data Science",
            "AIDS", "B.Tech. AI & DS", "B.Tech AI & DS",
            "AI & DS", "AI & Data Science", "AI and Data Science",
            "Artificial Intelligence & Data Science",
            "Artificial Intelligence and Data Science",
            "B.Tech. AIDS");

        // ── AIML ─────────────────────────────────────────────────────────────
        reg("AIML", "AI & Machine Learning",
            "AIML", "B.E. CSE (AI & ML)", "B.E. CSE (AIML)",
            "AI & ML", "AI & Machine Learning", "AI and Machine Learning",
            "B.Tech. AIML");

        // ── VLSI ─────────────────────────────────────────────────────────────
        reg("VLSI", "EE (VLSI Design)",
            "VLSI", "B.E. EE (VLSI)", "B.E. EE (VLSI Design)",
            "EE (VLSI)", "VLSI Design", "EE VLSI");

        // ── BT ───────────────────────────────────────────────────────────────
        reg("BT", "Biotechnology",
            "BT", "B.Tech.BT", "B.Tech. BT", "Biotechnology");

        // ── EEE ──────────────────────────────────────────────────────────────
        reg("EEE", "Electrical & Electronics Engineering",
            "EEE", "Electrical & Electronics Engineering",
            "Electrical and Electronics Engineering");

        // ── IT ───────────────────────────────────────────────────────────────
        reg("IT", "Information Technology",
            "IT", "Information Technology");

        // ── ADMIN / HR ────────────────────────────────────────────────────────
        reg("ADMIN", "Administration",
            "ADMIN", "Administration", "Non-Teaching Admin",
            "Non Teaching Admin", "Admin");
    }

    private static void reg(String code, String label, String... aliases) {
        CODE_TO_LABEL.put(code.toUpperCase(), label);
        for (String alias : aliases) {
            ALIAS_TO_CODE.put(alias.trim().toLowerCase(), code.toUpperCase());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Normalize any department string to the canonical short code.
     * e.g. "B.E. CSE (AI & ML)" → "AIML"
     *      "AI & DS"            → "AIDS"
     *      "CSE"                → "CSE"
     * Returns the input uppercased if no mapping found.
     */
    public static String toShortCode(String dept) {
        if (dept == null || dept.isBlank()) return null;
        String key = dept.trim().toLowerCase();
        String code = ALIAS_TO_CODE.get(key);
        if (code != null) return code;

        // Fuzzy fallback: check if any alias is contained in the input
        for (Map.Entry<String, String> e : ALIAS_TO_CODE.entrySet()) {
            if (key.contains(e.getKey()) || e.getKey().contains(key)) {
                return e.getValue();
            }
        }
        return dept.trim().toUpperCase();
    }

    /**
     * Convert short code to human-readable label.
     * e.g. "AIDS" → "AI & Data Science"
     */
    public static String toFullName(String code) {
        if (code == null || code.isBlank()) return null;
        String label = CODE_TO_LABEL.get(code.trim().toUpperCase());
        return label != null ? label : code.trim();
    }

    /**
     * Returns true if two department strings (any format) refer to the same dept.
     */
    public static boolean isSameDepartment(String a, String b) {
        if (a == null || b == null) return false;
        String ca = toShortCode(a);
        String cb = toShortCode(b);
        return ca != null && ca.equalsIgnoreCase(cb);
    }

    // ── Staff-table format (staff.department column) ──────────────────────────
    // Maps canonical code → the exact string used in the staff table
    private static final Map<String, String> CODE_TO_STAFF_DEPT = new LinkedHashMap<>();
    static {
        CODE_TO_STAFF_DEPT.put("CSE",   "CSE");
        CODE_TO_STAFF_DEPT.put("CCE",   "CCE");
        CODE_TO_STAFF_DEPT.put("CSBS",  "CS & BS");
        CODE_TO_STAFF_DEPT.put("ECE",   "ECE");
        CODE_TO_STAFF_DEPT.put("MECH",  "MECH");
        CODE_TO_STAFF_DEPT.put("AIDS",  "AI & DS");
        CODE_TO_STAFF_DEPT.put("AIML",  "AI & ML");
        CODE_TO_STAFF_DEPT.put("VLSI",  "EE (VLSI)");
        CODE_TO_STAFF_DEPT.put("BT",    "BT");
        CODE_TO_STAFF_DEPT.put("EEE",   "EEE");
        CODE_TO_STAFF_DEPT.put("IT",    "IT");
        CODE_TO_STAFF_DEPT.put("ADMIN", "Non-Teaching Admin");
    }

    /**
     * Convert any department format to the exact string stored in staff.department.
     * e.g. "AIDS" → "AI & DS"
     *      "B.E. CSE (AI & ML)" → "AI & ML"
     *      "AI & DS" → "AI & DS"  (already correct)
     */
    public static String toStaffDeptFormat(String dept) {
        String code = toShortCode(dept);
        if (code == null) return dept;
        String staffFmt = CODE_TO_STAFF_DEPT.get(code.toUpperCase());
        return staffFmt != null ? staffFmt : code;
    }

    /**
     * Returns a keyword suitable for LIKE matching against students.department.
     * e.g. "AIDS" → "AI & DS"  (the staff-format string, which is a substring of "B.Tech. AI & DS")
     *      "B.E. CSE (AI & ML)" → "AI & ML"
     *      "CSE" → "CSE"
     */
    public static String toStudentDeptKeyword(String dept) {
        // The staff-format string is always a substring of the student-format string
        return toStaffDeptFormat(dept);
    }

    // Legacy alias kept for backward compatibility
    public static String toCode(String dept) { return toShortCode(dept); }
}
