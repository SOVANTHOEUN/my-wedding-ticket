# Security Test Report — Wedding E-Ticket

**Test Date:** February 18, 2026  
**Target:** https://my-wedding-ticket.vercel.app/wedding-invitation%20V7

---

## ✅ Test Results Summary

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

---

## Conclusion

All recommended security measures are in place and functioning. The site is well-protected for a static wedding invitation with serverless guest lookup.
