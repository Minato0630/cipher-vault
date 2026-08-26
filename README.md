# CipherWing (formerly CipherVault) 🔐

**Tagline:** Offline-Only Client-Side File Cryptographic Suite
**Live Deployment:** [https://cipherwing.vercel.app](https://cipherwing.vercel.app)

CipherWing is a privacy-first, zero-trust web application that performs 100% offline file encryption and decryption in browser memory. It ensures that sensitive files never leave the user's device by utilizing the Web Crypto API, Web Workers, and IndexedDB.

---

## 🤖 AI Context & Developer Guide

*This section is specifically tailored for AI assistants and developers looking to understand, maintain, or extend the codebase.*

### Architecture Overview
CipherWing operates entirely on the client-side. There is **no backend server, no API, and no database** other than the browser's native IndexedDB. The application is served statically (via Vercel) and all processing happens via JavaScript executing within the browser.

### Key Cryptographic Parameters
- **Algorithm:** AES-256-GCM (Authenticated Encryption).
- **Key Derivation:** PBKDF2 with HMAC-SHA-256, utilizing **600,000 iterations**.
- **Initialization Vector (IV):** A 12-byte random base IV generated per file using `crypto.getRandomValues`. The IV for each chunk is derived monotonically from this base IV.
- **Salt:** A 16-byte random salt generated per file/profile.
- **Chunk Size:** 16 MB chunks (`16 * 1024 * 1024`) to handle large files (up to 2GB+) without exceeding the browser's heap memory limit.

### File Structure & Dependencies

1. **`index.html` & `login.html`**
   - The UI views. `login.html` provides the local offline authentication interface. `index.html` serves as the primary workspace (file queue, drag-and-drop, theme toggles, and help drawers).
   
2. **`style.css`**
   - Contains raw vanilla CSS. Uses CSS custom properties (variables) for toggling between the Dark (Yellow/Black) and Light (Yellow/White) themes. Uses modern flexbox/grid layouts and CSS animations.

3. **`app.js` (Main Controller)**
   - **Role:** Orchestrates the UI state, user events, DOM updates, and translation dictionaries (English/Tamil).
   - **Key Mechanics:**
     - Manages the queue array of files.
     - Spawns the `worker.js` thread for heavy lifting to prevent UI freezes.
     - Relies on the **File System Access API** (`window.showSaveFilePicker`) to stream output directly to disk if supported, bypassing memory limitations.
     - Controls UI element locks (`toggleUIControls`) during processing.

4. **`worker.js` (Cryptographic Engine)**
   - **Role:** Executes all heavy cryptographic operations off the main thread.
   - **Key Mechanics:**
     - `deriveKey`: Derives the 256-bit AES-GCM key from the user's password and salt using PBKDF2.
     - `handleEncryption` & `handleDecryption`: Slices the Blob into 16MB chunks, optionally compresses them using `CompressionStream` (Gzip), and processes them using `crypto.subtle.encrypt/decrypt`.
     - **Custom File Format (`.krypt`):** Creates a file header consisting of a Magic String (`KRYPT`), Version (`1`), Flags, Salt (16 bytes), Base IV (12 bytes), Hint Length, and an unencrypted Hint string, followed by encrypted Metadata, followed by encrypted chunks.

5. **`accounts.js` (Authentication)**
   - **Role:** Manages the creation and login of local offline profiles.
   - **Key Mechanics:** 
     - Hashes user passwords using PBKDF2 with 600,000 iterations (similar to file encryption) and stores the hash and salt in IndexedDB.
     - Uses a constant-time comparison bitwise check in `buffersEqual` to prevent timing attacks.

6. **`db.js` (IndexedDB Manager)**
   - **Role:** A Promise-wrapper around the native IndexedDB API.
   - **Key Mechanics:**
     - Manages the `CipherVaultDB` database (Version 1).
     - Maintains two object stores: `profiles` (keyPath: username) and `history` (keyPath: id, autoIncrement: true).

7. **`history.js` (Audit Log)**
   - **Role:** Interacts with `db.js` to render a filterable, searchable list of the user's encryption/decryption history.
   - **Key Mechanics:** Tracks storage quotas and handles the optional storage of blobs if the user opted to "Keep History Blobs".

8. **`screen.js` (3D WebGL Background)**
   - **Role:** Renders the interactive background using Three.js (loaded via CDN).
   - **Key Mechanics:**
     - Creates a wireframe padlock and drifting particle field.
     - Utilizes a `MutationObserver` on the `data-theme` attribute of the `<html>` tag to dynamically swap the hex colors of the materials based on light/dark mode.
     - Listens for `window.flashThreeJS()` which is called by `app.js` upon successful encryption/decryption to momentarily increase the spin speed and opacity of the padlock.

9. **`jszip.min.js`**
   - Bundled external library used in `app.js` to compile a ZIP archive when downloading a batch of completed files.

### Critical Workflows

**Encryption Flow:**
1. User provides a File and Password.
2. `app.js` spawns `worker.js`.
3. `worker.js` generates Random Salt + Base IV and derives the Key.
4. Header + Hint + Encrypted Metadata are constructed and written to disk.
5. The File is chunked (16MB). Each chunk is (optionally) compressed, encrypted with AES-GCM (deriving a new IV from the Base IV), and written to disk.
6. Worker posts `SUCCESS` back to `app.js`.

**Decryption Flow:**
1. User provides a `.krypt` file and Password.
2. `worker.js` reads the first 64KB to parse the Header (validating the "KRYPT" magic string, extracting Salt, Base IV, and Hint).
3. `worker.js` derives the Key and decrypts the Metadata block.
4. `worker.js` iterates over the remaining chunks (reading a 4-byte size prefix per chunk), decrypting, (optionally) decompressing, and writing to disk.

---

## 🚀 How to Run Locally

Because CipherWing relies heavily on Web Workers, it cannot be run directly via the `file://` protocol due to standard browser security restrictions (CORS).

You must serve it via a local HTTP server.

**Option 1: Using npx (Node.js)**
```bash
npx serve
```

**Option 2: Using Python**
```bash
python3 -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.
