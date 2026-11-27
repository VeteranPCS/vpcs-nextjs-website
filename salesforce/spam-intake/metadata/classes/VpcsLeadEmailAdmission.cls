public without sharing class VpcsLeadEmailAdmission {
    public static final String BLOCKED_CODE = 'VPCS_LEAD_EMAIL_BLOCKED';
    // Same whitespace characters as JavaScript trim() and \s.
    private static final String WHITESPACE =
        '[\\u0009-\\u000D\\u0020\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]';
    private static final Pattern INNER_WHITESPACE = Pattern.compile(WHITESPACE);

    public static String canonicalEmailHash(String email) {
        if (email == null) {
            return null;
        }
        String normalized = email.replaceAll('^' + WHITESPACE + '+|' + WHITESPACE + '+$', '').toLowerCase();
        if (normalized.length() > 254 || INNER_WHITESPACE.matcher(normalized).find()) {
            return null;
        }
        Integer separator = normalized.indexOf('@');
        if (separator <= 0 || separator != normalized.lastIndexOf('@') ||
            separator == normalized.length() - 1) {
            return null;
        }

        String local = normalized.substring(0, separator);
        String domain = normalized.substring(separator + 1);
        if (domain.equals('gmail.com')) {
            Integer plus = local.indexOf('+');
            if (plus >= 0) {
                local = local.substring(0, plus);
            }
            local = local.replace('.', '');
        }
        return String.isBlank(local) ? null : EncodingUtil.convertToHex(
            Crypto.generateDigest('SHA-256', Blob.valueOf(local + '@' + domain))
        );
    }

    public static Set<String> activeHashes(Set<String> hashes) {
        Set<String> blocked = new Set<String>();
        if (!hashes.isEmpty()) {
            // System mode is intentional. Every Lead writer receives the same policy.
            for (Vpcs_Blocked_Email__c entry : [
                SELECT Email_Hash__c
                FROM Vpcs_Blocked_Email__c
                WHERE Email_Hash__c IN :hashes AND Active__c = true
                WITH SYSTEM_MODE
            ]) {
                blocked.add(entry.Email_Hash__c);
            }
        }
        return blocked;
    }

    public static void enforce(List<Lead> current, Map<Id, Lead> previous) {
        Map<Integer, String> candidateHashes = new Map<Integer, String>();
        for (Integer index = 0; index < current.size(); index++) {
            Lead record = current[index];
            Lead prior = previous == null ? null : previous.get(record.Id);
            if (record.Email == null ||
                (prior != null && prior.Email != null && record.Email.equals(prior.Email))) {
                continue;
            }
            String hash = canonicalEmailHash(record.Email);
            if (hash != null) {
                candidateHashes.put(index, hash);
            }
        }
        Set<String> blocked = activeHashes(new Set<String>(candidateHashes.values()));
        for (Integer index : candidateHashes.keySet()) {
            if (blocked.contains(candidateHashes.get(index))) {
                current[index].addError(BLOCKED_CODE);
            }
        }
    }
}
