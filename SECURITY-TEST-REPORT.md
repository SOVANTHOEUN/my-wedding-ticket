# Security Test Report — Wedding E-Ticket

**Test Date:** February 18, 2026  
**Target:** https://my-wedding-ticket.vercel.app/wedding-invitation%20V7

---

## ✅ Test Results Summary

### Guest API & General

| # | Test | Result | Details |
|---|------|--------|---------|
| 1 | **Security Headers** | ✅ PASS | CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy all present |
| 2 | **HTTPS / HSTS** | ✅ PASS | HTTP redirects to HTTPS; HSTS enabled |
| 3 | **Guest List Exposure** | ✅ PASS | `guests.js` removed from HTML; no guest data in page source |
| 4 | **API Single-Guest Response** | ✅ PASS | API returns only one guest per request; full list never exposed |
| 5 | **API Input Validation** | ✅ PASS | Invalid token → `null`; missing token → 400 error |
| 6 | **XSS in Token** | ✅ PASS | `<script>alert(1)</script>` as token → no match, returns null; no script execution |
| 7 | **Path Traversal** | ✅ PASS | `../../../etc/passwd` as token → no match, returns null |
| 8 | **API Response Sanitization** | ✅ PASS | Guest names returned as plain text; no HTML/script in JSON |
| 9 | **CSP Active** | ✅ PASS | Content-Security-Policy header applied |

### RSVP API (POST/PATCH)

| # | Test | Result | Details |
|---|------|--------|---------|
| 10 | **XSS in message** | ✅ PASS | `<script>alert(1)</script>` sanitized client-side; stored as plain text |
| 11 | **XSS in location** | ✅ PASS | `"><img src=x onerror=alert(1)>` sanitized |
| 12 | **Invalid token** | ✅ PASS | `g999` → 404 Guest not found |
| 13 | **Invalid status** | ✅ PASS | `status: "hacked"` → 400 Bad Request |
| 14 | **Oversized message** | ✅ PASS | 600+ chars truncated to 500 by API |
| 15 | **Malformed JSON** | ✅ PASS | Invalid JSON body → 400 |
| 16 | **SQL injection style token** | ✅ PASS | `'; DROP TABLE--` rejected as invalid token |
| 17 | **XSS in GET token** | ✅ PASS | Script-like token in `?g=` → no match, returns `submitted: false` |
| 18 | **Double submit** | ✅ PASS | Second POST same token → 409 Already submitted |

---

## Security Headers Verified

```
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=(self)
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

---

## Attack Vectors Tested

1. **XSS (Cross-Site Scripting)** — Malicious script in URL param → API treats as invalid token, returns null. Client uses `textContent` for display (safe).
2. **Data Enumeration** — Attacker can try tokens one-by-one (g001, g002...) but cannot retrieve full list in one request.
3. **Path Traversal** — Invalid; token used only as lookup key.
4. **Clickjacking** — Mitigated by X-Frame-Options: SAMEORIGIN.
5. **MIME Sniffing** — Mitigated by X-Content-Type-Options: nosniff.
6. **RSVP XSS** — Message and location sanitized with `sanitizeGuestName()` (strips `< > " ' &`).
7. **RSVP Input Validation** — Status whitelist (confirm/decline/undecided); token must exist in guest list.
8. **RSVP Double Submit** — Second POST with same token returns 409; prevents duplicate rows.

---

## Running RSVP Security Tests

```bash
node scripts/test-rsvp-security.js https://my-wedding-ticket.vercel.app
```

For local testing with `vercel dev`:
```bash
vercel dev
# In another terminal:
node scripts/test-rsvp-security.js http://localhost:3000
```

---

## Conclusion

All recommended security measures are in place and functioning. The site is well-protected for a static wedding invitation with serverless guest lookup and RSVP.
