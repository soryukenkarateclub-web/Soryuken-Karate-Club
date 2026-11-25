# Sōryuken Karate Club — Security Specification (Phase 0)

## 1. Data Invariants
1. **Master Gate Ownership**: Every dojo subcollection (`batches`, `students`, `admissions`, `attendance`, `payments`, `bills`) belongs to a parent `/dojos/{dojoId}` document whose `ownerId` matches `request.auth.uid` (or bootstrapped admin `mohammadratul85@gmail.com` with `email_verified == true`).
2. **Email Verification**: No unauthenticated or unverified-email requests may read or write any Firestore collection.
3. **Immutable Audit Fields**: `ownerId` and `createdAt` can never be mutated after document creation. `createdAt` and `updatedAt` must equal `request.time`.
4. **Strict Key & Type Enforcement**: Every `create` requires `keys().hasAll(...) && keys().hasOnly(...)` and every `update` enforces `diff(existing()).affectedKeys().hasOnly(...)` alongside full `isValid[Entity](incoming())` validation.
5. **PII Isolation**: Student phone numbers, addresses, emails, and emergency contacts are readable only by the verified dojo owner (`ownerId == request.auth.uid`) or verified bootstrapped admin.
6. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid || isBootstrappedAdmin()` without any `get()` or `exists()` lookups inside `list`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Student Read**: `get(/dojos/dojo-1/students/stu-1)` with `auth == null`.
2. **Unverified Email Write**: `create(/dojos/dojo-1/students/stu-1)` with `auth.token.email_verified == false`.
3. **Identity Spoofing on Create**: `create(/dojos/dojo-1/students/stu-1)` with `ownerId: "victim-uid"` != `request.auth.uid`.
4. **Shadow / Ghost Field Injection**: `create(/dojos/dojo-1/students/stu-1)` including unexpected `"isAdmin": true`.
5. **Shadow Update Injection**: `update(/dojos/dojo-1/payments/pay-1)` adding `"shadowFlag": "hacked"`.
6. **ID Poisoning (Resource Exhaustion)**: `create(/dojos/dojo-1/students/<2000-char-id>)` or invalid characters in ID (`"bad$id"`).
7. **Owner Reassignment on Update**: `update(/dojos/dojo-1/students/stu-1)` changing `ownerId` to another UID.
8. **CreatedAt Tampering**: `create(/dojos/dojo-1/bills/bill-1)` with a backdated client timestamp instead of `request.time`.
9. **Negative Financial Value**: `create(/dojos/dojo-1/payments/pay-1)` with `amount: -500` or `netAmount: -100`.
10. **Invalid Enum Value**: `create(/dojos/dojo-1/students/stu-1)` with `beltRank: "Diamond"` or `status: "Deleted"`.
11. **Oversized String Poisoning**: `create(/dojos/dojo-1/bills/bill-1)` with `title` length > 120 characters.
12. **Cross-Tenant List Scraping**: `list(/dojos/other-dojo/students)` without filtering to `ownerId == request.auth.uid`.
