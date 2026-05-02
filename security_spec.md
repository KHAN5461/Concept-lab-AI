# Firestore Security Specification

### 1. Data Invariants
- A `Profile` must exist globally for a given `userId` but cannot be modified to have another `userId` after creation. All reads are scoped strictly to the `userId`.
- A `Session` or `LabSession` cannot exist without a valid `userId` belonging to the current verified user.
- Any entity containing user generated text (`Feedback`, `Flashcard`, `SavedResource`) bounds strictly string sizes (e.g., maximum 2000 chars) to prevent "Denial of Wallet" resource exhaustion.
- Relational integrity requires fields like `userId`, `createdAt`, and `type` to be immutable on any `allow update`.

### 2. The "Dirty Dozen" Payloads
1. **Shadow Update**: Passing an extra random field like `isAdmin: true` into a `update` or `create` request.
2. **Email Spoofing**: Attempted access by an unverified Google account identity.
3. **PII Blanket Read**: Attempting to read `/profiles/{otherUserId}`.
4. **Query Trust**: Attempted list query without providing the `userId == request.auth.uid` filter.
5. **Value Poisoning**: Intercepting an `update` payload and swapping a `number` like `totalExp` with a massive string.
6. **ID Poisoning Guard**: Registering a document ID with malicious characters or excessive length to induce parsing errors.
7. **The Atomicity Guarantee**: Relational update checks bypass via bulk update payload manipulation.
8. **Array Guarding**: Submitting 10,000 array elements for `messages` or `strengths`.
9. **Type Substitution Array**: Bypassing an array loop by submitting a String.
10. **System Field Tampering**: Client attempts to manipulate `createdAt` after the document is established.
11. **Relational Integrity**: Client updates `userId` ownership to siphon resources.
12. **Denial of Wallet**: Stuffing 2MB payload into a `title` field.

### 3. Test Runner
The test configurations have been written to `firestore.rules.test.ts` representing the Red Team payload validation suite. All permutations of standard schema failures have been covered.
