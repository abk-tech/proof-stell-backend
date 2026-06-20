# 🖥️ ProofStell Backend API

Backend services for the ProofStell decentralized document verification platform.

---

## 🌍 Overview

The backend acts as a bridge between the frontend and the Stellar blockchain.

It handles:

- Document hashing
- Smart contract interaction
- Metadata storage
- Verification logic

---

## 🚀 Core Features

### 📄 Document Processing

- Generate SHA256 hashes from uploaded documents
- Ensure consistent hashing for verification

---

### 🔗 Blockchain Interaction

- Communicate with Soroban smart contracts
- Register and verify document hashes

---

### 🗄️ Metadata Storage

- Store document metadata in PostgreSQL
- Track issuers, timestamps, and ownership

---

### 🔎 Verification Service

- Accept document uploads
- Return verification results:

  - Verified
  - Not Found
  - Revoked

---

## 🏗️ Architecture

```
Frontend (Next.js)
        ↓
Backend API (NestJS)
        ↓
Soroban Smart Contract
        ↓
Stellar Network
```

---

## 🛠️ Tech Stack

- NestJS
- PostgreSQL
- Prisma ORM
- Stellar SDK
- Multer (file handling)
- Crypto (SHA256 hashing)

---

## 📁 Project Structure

```bash
src/
├── documents/
├── issuers/
├── verification/
├── soroban/
├── prisma/
└── utils/
```

---

## 🔗 API Endpoints

### Issue Document

```http
POST /documents/issue
```

---

### Verify Document

```http
POST /verify
```

---

### Revoke Document

```http
POST /documents/revoke
```

---

## 🚀 Getting Started

### Install dependencies

```bash
npm install
```

### Run server

```bash
npm run start:dev
```

---

## 🔐 Environment Variables

```env
DATABASE_URL=
SOROBAN_RPC_URL=
STELLAR_NETWORK=
CONTRACT_ADDRESS=
```

---

## 🔐 Security

- Hash-based verification
- Input validation
- Issuer authorization
- Secure blockchain interaction

---

## 🎯 Goals

- Provide reliable verification services
- Ensure accurate blockchain interaction
- Maintain secure document processing

---

## 🌐 Supported Locales

The translation module provides first-class locale support with consistent fallback behaviour.

- **Default locale:** Configured by marking exactly one language record with `isDefault = true` in the `languages` table. Translation lookups (`TranslationService.getTranslation`) and the interceptor fallback are fully data-driven. `LanguageMiddleware` and `LanguageGuard` still default to `'en'` when no locale signal is present in the request — those are best-effort input fallbacks, not translation fallbacks.
- **Validation:** Endpoints that explicitly opt in via `LanguageValidationPipe` or `LanguageGuard` reject unknown or inactive locale codes with HTTP 400.
- **Lenient endpoints:** `TranslationInterceptor` and `LanguageMiddleware` silently fall back to the configured default when an unrecognised locale is requested, so customer-facing flows never show raw keys.
- **Coverage check:** Call `GET /translations/:languageCode/missing-translations` to identify keys present in the default but missing in a target locale. Use this in CI to catch translation gaps before release.
- **Adding a new locale:**
  1. Insert a `languages` row with `code`, `name`, `nativeName`, `isActive=true`.
  2. Optionally set `isDefault=true` (this unsets any previous default).
  3. Add translations via `POST /translations` or `POST /translations/bulk`.

The default-locale lookup is cached in memory and invalidates automatically when any language row is created, updated, or deleted.

**ProofStell Backend — Powering decentralized verification.**
