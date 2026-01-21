**Records Encryptions**

**&**

**Verifications (REV)**

Below is a **general architecture** for a _locally-based encrypted record & verification system for property deeds_, tailored to your requirements and enhanced with best practices from modern systems and similar land-registry/verification platforms (including blockchain-related approaches for hashes and audit trails) that are emerging in land administration globally.

**📌 High-Level System Architecture**

**⚙️ 1. Frontend Layer (UI/UX)**

**Built with:**

- **Next.js** (React framework; SSR/SSG support)
- **Tailwind CSS** (styling)
- **Shadcn & Mapcn** (component libraries + interactive maps)

**Components / Dashboards**

- **Login & User Management**
    - Sign-in/up using Supabase Auth (role-based access: staff, verifier, Chief Registrar, admin)
- **Document Upload Module**
    - Upload PDF/Office docs for hashing
    - Show progress & preview
- **Staff Dashboard**
    - List encrypted documents
    - Verification tasks queue
    - Encryption & verification history
- **Verifier Dashboard**
    - Assigned docs
    - Verification tools + decision logs
- **GIS Viewer**
    - Map showing property locations (Leaflet/Mapcn)
    - Layers for status (encrypted, verified, rejected, fraud flags)
- **Chief Registrar Dashboard**
    - Global stats + charts
    - GIS map analytics & heatmaps
    - Reports export (CSV / PDF)

**🧠 2. Backend & API Layer (Business Logic)**

**Hosted on:**

- **Supabase Edge Functions** (serverless logic)
- **Supabase Auth** (authentication)
- **Supabase Storage** (files)
- **Supabase Database (PostgreSQL)**

**Key Services & Flows**

- **Authentication & RBAC**
- **Document Hashing**
    - Compute SHA-256 hash
    - Store in DB linked to property & metadata
- **Document Verification**
    - Re-hash uploaded file and compare to stored hash
    - Log verification outcome (approved, rejected + reason)
- **Logging & Auditing**
    - All activities logged with timestamps
- **Report Generation**
    - Summary of stats
    - Detailed rejection reports
- **GIS Integration**
    - Fetch spatial info by property ID
    - Return GeoJSON layers for frontend map

**🗃️ 3. Database Schema (Relational)**

| **Table** | **Key Fields** | **Purpose** |
| --- | --- | --- |
| **Users** | id, email, role | Staff, verifier, Chief Registrar, admin |
| **Properties** | id, property_no, address, geom | Property metadata + location |
| **Documents** | id, property_id, doc_number, uploader_id, status, created_at | Main document record |
| **DocumentHashes** | id, doc_id, sha256_hash, timestamp | Document cryptographic fingerprint |
| **Verifications** | id, doc_id, verifier_id, status, reason, timestamp | Audit trail of verification |
| **Logs** | id, user_id, action, details, ts | Global system logs |

👉 The **hash** is kept in the DB; the original document is stored for future reference and linked to its hash. Also, the uploaded document to verify is stored for future reference and referenced to the same property. This uploaded document can be deleted by Chief Registrar or System Administrator.

**🔐 4. Document Upload & Hash Workflow**

1.  Staff uploads a deed document (PDF).
2.  Backend saves the document in **Supabase Storage**.
3.  System computes **SHA-256 hash** of the document content.
4.  Store the hash + metadata (doc number, property ID, uploader, timestamp) in the DB.
5.  Link with **Property** (ID, address, GIS coords).
6.  Mark status as _Encrypted/Hashed_.

**Purpose:** A SHA-256 hash acts as a fingerprint. If the doc is altered later, the hash changes drastically, enabling tamper detection.

**🔎 5. Verification Workflow**

1.  Verifier, Staff Member, Admin or Chief Registrar selects a document to verify.
2.  Upload the document again.
3.  System recomputes the SHA-256 hash and compares to stored hash.
    - If match → _Verified_
    - If mismatch → _Rejected_
4.  Log details: verifier ID, outcome, time, and **reason for rejection**.
5.  Matches and derive the discrepancy and record for future analysis.

**Logs & audit trails** become crucial for transparency and legal admissibility.

**📊 6. Dashboards & Analytics**

**📈 Chief Registrar Dashboard**

- Total docs encrypted / verified / rejected
- Rejection causes & frequency
- GIS map overlays:
    - Verified properties
    - Rejected or suspicious
    - New uploads
- Filters by region, staff, date range

**📋 Staff & Verifier Dashboards**

- Individual performance stats
- Pending verifications
- Encryption tasks completed

**🗺️ 7. GIS Viewer & Spatial Analytics**

- Interactive map showing property parcels from the **Properties** table
- Layers indicating:
    - Status (verified, rejected, flagged)
    - Fraud hot-spots (based on analytics)
- Filters for date/status/region

**Map capabilities:**

- Zoom to property
- Click-to view document metadata
- Chart overlays (statistics, time series)

Tools like **Mapcn + Leaflet** make it interactive and modern.

**🧾 8. Reporting & Export**

- Generate PDF/Excel reports by date, region, user, property type
- Include:
    - Document statuses
    - Rejection reasons
    - GIS summary heatmaps
- Export options for executives

Reports support audit, planning, and operational reviews.

**🔄 9. Logs & Audit Trail (Critical)**

Every action logged with:

- User ID
- Action type (upload, hash, verify, reject)
- Document ID
- Timestamp
- Reason / metadata (e.g., rejection cause)

\=> Enables traceability and compliance.

**🛡️ 10. Security & Compliance Enhancements**

- **Role-Based Access Control (RBAC)**
    - Fine-grained permissions for staff / verifier / admin
- **Encryption At Rest**
    - Secure storage of documents
- **Immutable Logs**
    - Use cryptographic timestamps

**📌**

**📦 Technology Mapping to Requirements**

| **Requirement** | **Tech** |
| --- | --- |
| Hashing SHA-256 | **Supabase Edge Function + Node.js crypto** |
| UI Frontend | **Next.js + Tailwind + Shadcn** |
| Auth & Roles | **Supabase Auth** |
| Storage | **Supabase Storage** |
| DG Viewer | **Mapcn + GIS via GeoJSON** |
| Logs & Reports | Supabase + Edge Functions |
| Auditing | Supabase DB + logs table |

**🧠 Summary of Features**

✅ Document hashing & storage  
✅ User roles (staff, verifier, registrar, admin)  
✅ Dashboards (individual + Chief Registrar)  
✅ GIS map with analytics layers  
✅ Log & audit trail of all actions  
✅ Rejection tracking + documented reasons  
✅ Report generation  
✅ Secure authentication & storage  

Note that the system must be able to deal with Content scanned.Please use nextjs@latest, which is ver 16.*. md files must be stored in  folder: /home/sbhunu/production/ver/docs. Ensure that the technology stack is properly set