public class TestFuzzy {
    public static void main(String[] args) {
        String staffName = "KANAGAVALLI N.";
        String hodEntry = "Dr. Kanagavalli N./AP";
        
        String cleaned = hodEntry.split("/")[0].trim()
                        .replaceAll("(?i)^(dr\\.?|prof\\.?|mr\\.?|mrs\\.?|ms\\.?)\\s*", "").trim();
                        
        System.out.println("Cleaned: *" + cleaned + "*");
        System.out.println("Match A: " + cleaned.equalsIgnoreCase(staffName));
        System.out.println("Match B: " + staffName.toLowerCase().contains(cleaned.toLowerCase()));
        System.out.println("Match C: " + cleaned.toLowerCase().contains(staffName.toLowerCase()));
    }
}
