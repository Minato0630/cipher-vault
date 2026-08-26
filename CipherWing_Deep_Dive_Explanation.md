# CipherWing Codebase: Technical Deep Dive & Line-by-Line Explanation

This document serves as an exhaustive, file-by-file technical manual explaining exactly how CipherWing works under the hood. It breaks down the architecture, the cryptographic math, and the specific JavaScript techniques used to achieve 100% client-side, zero-knowledge file encryption.

---

## 1. The Cryptographic Engine: `worker.js`

This file is the most critical part of the application. It runs in a **Web Worker** (a separate background thread). If we ran this on the main UI thread, encrypting a 2GB file would completely freeze the browser tab. 

### A. Constants and Setup
```javascript
const CHUNK_SIZE = 16 * 1024 * 1024; // 16MB Chunks
```
We define `CHUNK_SIZE` as 16MB. Browser memory (RAM) is limited (often crashing if a single array exceeds 500MB). By processing the file in 16MB slices, CipherWing can encrypt a file of *any* size (even 10GB+) because it only ever holds 16MB in RAM at any given millisecond.

```javascript
self.onmessage = async function(e) {
    const { action, file, password, compress, hint, fileHandle } = e.data;
    // ... routes to handleEncryption or handleDecryption
};
```
The worker listens for `postMessage` calls from the main UI thread (`app.js`). It extracts the raw file, the user's password, and a `fileHandle` (used to stream data directly to the hard drive).

### B. PBKDF2 Key Derivation (`deriveKey`)
```javascript
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);
    
    const keyMaterial = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveKey"]);
    
    return await crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 600000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false, ["encrypt", "decrypt"]
    );
}
```
**How it works:**
1. We cannot use the user's password directly as an encryption key. An AES-256 key must be exactly 256 bits (32 bytes) of high-entropy randomness.
2. We import the password as raw material into the `SubtleCrypto` API.
3. We use **PBKDF2** (Password-Based Key Derivation Function 2) to hash the password **600,000 times** using SHA-256 and a random 16-byte salt. This specific iteration count follows OWASP guidelines to aggressively slow down hackers attempting to brute-force the password using GPUs.
4. The output is a flawless 256-bit AES-GCM cryptographic key.

### C. Chunked Encryption Loop (`handleEncryption`)
```javascript
const salt = crypto.getRandomValues(new Uint8Array(16));
const baseIv = crypto.getRandomValues(new Uint8Array(12));
```
Every single file gets a totally unique, mathematically random 16-byte Salt and a 12-byte Initialization Vector (IV).

```javascript
// Header construction
const headerFixedPart = new Uint8Array(5 + 1 + 1 + 16 + 12 + 2);
headerFixedPart.set([75, 82, 89, 80, 84], 0); // "KRYPT" magic string
```
Before writing the encrypted file, we construct a custom **Header**. This allows CipherWing to identify the file later during decryption. We write the word "KRYPT", the version number, the Salt, and the Base IV in plain text at the very beginning of the file. (Salt and IVs are public parameters; they do not need to be hidden, they just must be unique).

```javascript
for (let i = 0; i < numChunks; i++) {
    const blobSlice = file.slice(start, end);
    let chunkBuffer = await blobSlice.arrayBuffer();
```
We enter a `for` loop, iterating through the file mathematically based on the 16MB chunk limit. `file.slice` instantly grabs the byte range from the hard drive without loading the entire file into memory.

```javascript
const chunkIv = deriveChunkIv(baseIv, i + 1);
const chunkAad = deriveChunkAad(headerBytes, i + 1, isLast);

const encryptedChunk = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: chunkIv, additionalData: chunkAad },
    key, chunkBuffer
);
```
**The Math here is critical:** 
- AES-GCM requires a unique IV for every single chunk. If an IV is reused, the encryption breaks. `deriveChunkIv` takes the Base IV and mathematically adds the current chunk index (`i + 1`) to the final 4 bytes.
- **AAD (Additional Authenticated Data):** We cryptographically bind the chunk's index number to the encrypted chunk. Why? If an attacker tries to maliciously swap Chunk 2 with Chunk 5 to corrupt your data, AES-GCM will detect that the AAD chunk index doesn't match and throw an error, preventing tampering!

---

## 2. The Orchestrator: `app.js`

This file controls the DOM (Document Object Model) and manages the bridge between the user and the Web Worker.

### A. The File System Access API Streaming
```javascript
if (supportsFsa) {
    const pickerOptions = { suggestedName };
    fileHandle = await window.showSaveFilePicker(pickerOptions);
}
```
**How it works:**
Modern browsers (Chrome, Edge) support `showSaveFilePicker`. This prompts the user with a "Save As" dialog *before* encryption starts. It returns a `fileHandle` which `app.js` passes to `worker.js`. 
Because the worker has this handle, as soon as it encrypts a 16MB chunk, it writes it directly to your hard drive and drops it from memory. This is the secret sauce that allows 2GB+ file processing in a web browser! 
If the browser (like Firefox/Safari) doesn't support this, the chunks are appended to a giant `Uint8Array` in memory, which triggers the `warningFsaTitle` alert if the file is over 500MB.

### B. Security Tab Locking (`toggleUIControls`)
```javascript
function toggleUIControls(enable) {
    el.passwordInput.disabled = !enable;
    el.btnPrimary.disabled = !enable;
    // ...
}
```
While processing, all UI elements are locked. Furthermore, `window.addEventListener("beforeunload", ...)` is bound so that if the user tries to close the tab while a 2GB file is encrypting, the browser will block them and warn them that data loss will occur.

---

## 3. Authentication & Storage: `accounts.js` & `db.js`

CipherWing has a complete user authentication system, but there is no backend server.

### A. Local IndexedDB (`db.js`)
```javascript
const request = indexedDB.open(DB_NAME, DB_VERSION);
```
IndexedDB is a NoSQL database built directly into your web browser. `db.js` creates an `objectStore` named `profiles` and another named `history`. Everything is wrapped in JavaScript Promises (`new Promise(async (resolve, reject) => {...})`) so that database reads/writes don't freeze the UI.

### B. Secure Account Registration (`accounts.js`)
```javascript
const salt = generateSalt();
const passwordHash = await hashProfilePassword(password, salt);
const newProfile = { username, passwordHash, salt };
await window.db.saveProfile(newProfile);
```
When a user signs up, their password is **not** stored. We generate a 16-byte random salt, run the password through PBKDF2 (600,000 iterations), and store the resulting hash. 

### C. Timing-Attack Resistant Login
```javascript
function buffersEqual(a, b) {
    if (a.byteLength !== b.byteLength) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a[i] ^ b[i]; // Bitwise XOR
    }
    return result === 0;
}
```
During login, we hash the entered password with the user's stored salt. We then compare the resulting hash to the stored hash. 
**Security Concept:** We use bitwise `XOR` (`^`) and `OR` (`|`). If we used a standard `a === b` loop that returned `false` immediately upon finding a mismatch, an attacker could measure the exact microsecond the function took to run. By analyzing the time difference, they could guess the hash byte-by-byte (a "Timing Attack"). The bitwise loop above forces the computer to check every single byte regardless of a match, ensuring it always takes the exact same amount of time.

---

## 4. Audit Log: `history.js`

This script provides an interactive ledger of all files processed.

```javascript
const entry = { username, fileName, action, timestamp, blob: blobToStore };
await window.db.addHistoryEntry(entry);
```
Whenever a file completes successfully, it logs the transaction. If the user enabled "Keep History Blobs" in their settings, `blobToStore` actually saves the entire processed file binary directly into IndexedDB. 

**Storage Quota API:**
```javascript
const estimate = await navigator.storage.estimate();
```
`history.js` utilizes the `navigator.storage` API to calculate exactly how much hard drive space IndexedDB is currently consuming and displays it to the user so they don't accidentally fill up their entire C: drive with cached `.krypt` blobs.

---

## 5. WebGL 3D Visualizer: `screen.js`

CipherWing includes a high-performance 3D background that renders completely independently of the DOM using hardware GPU acceleration.

### A. Three.js Initialization
```javascript
scene = new THREE.Scene();
camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
```
A virtual camera is placed facing a mathematical scene. 

### B. Mathematical Modeling
```javascript
const bodyGeo = new THREE.BoxGeometry(5.5, 4.2, 1.8); // Lock Body
const shackleGeo = new THREE.TorusGeometry(1.9, 0.32, 8, 24, Math.PI); // Lock Loop
```
The Padlock isn't an imported 3D model (like an .obj or .gltf file); it is procedurally generated using sheer mathematics. We map a `TorusGeometry` (a donut shape, cut in half by `Math.PI`) to serve as the shackle, and a `BoxGeometry` as the body. 
The material applied is `MeshBasicMaterial({ wireframe: true })`, which causes Three.js to render only the triangular edge-lines rather than solid faces, giving it a futuristic vector look.

### C. The Animation Loop (`requestAnimationFrame`)
```javascript
mouseX += (targetX - mouseX) * 0.05;
lockGroup.rotation.y = elapsedTime * 0.25 + mouseX;
```
Every single frame (60 times a second), this loop runs. It utilizes **Linear Interpolation (Lerp)** (`* 0.05`) to smoothly trail the mouse cursor. `elapsedTime` from the internal clock forces the lock to constantly spin.

### D. The Success Flash (`window.flashThreeJS`)
When `app.js` successfully finishes encrypting a file, it calls this function. It grabs `Date.now()` and forces a 1.5-second animation where the lock's `opacity` spikes to 0.8 and its rotation speed multiplies exponentially, giving the user an immense sense of visual satisfaction that their cryptography succeeded.

---

### Summary of Data Flow
1. **User Input:** User types password -> `app.js` -> `worker.js`.
2. **Key Gen:** `worker.js` (PBKDF2) -> 256-bit AES Key.
3. **Chunking:** `worker.js` slices 16MB -> Encrypts (AES-GCM) -> Outputs buffer.
4. **Writing:** `worker.js` -> `fileHandle.write()` -> Hard Drive.
5. **UI Update:** `app.js` updates Progress Bar -> Logs to `history.js` -> Triggers `screen.js` flash.
