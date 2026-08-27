// worker.js - Client-Side File Encryption & Decryption Background Worker
// Performs all cryptographic and compression operations off the main thread.

const CHUNK_SIZE = 16 * 1024 * 1024; // 16MB Chunks

// Listen for messages from the main thread (app.js)
self.onmessage = async function(e) {
    const { action, file, password, compress, hint, fileHandle, metadata } = e.data;

    try {
        if (action === "ENCRYPT") {
            await handleEncryption(file, password, compress, hint, fileHandle);
        } else if (action === "DECRYPT") {
            await handleDecryption(file, password, fileHandle);
        }
    } catch (error) {
        console.error("Worker Error:", error);
        self.postMessage({
            type: "ERROR",
            message: error.message || "An unknown error occurred during processing."
        });
    }
};

/**
 * Derives a 256-bit AES-GCM key from a password and salt using PBKDF2 with 600,000 iterations.
 */
async function deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Import raw password as key material
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBytes,
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    // Derive the cryptographic AES-GCM 256-bit key
    return await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 600000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Monotonically derives a chunk-specific 12-byte IV from the base IV.
 * Reads the last 4 bytes as a big-endian uint32, adds the counter offset, and writes it back.
 */
function deriveChunkIv(baseIv, counter) {
    const chunkIv = new Uint8Array(baseIv);
    const view = new DataView(chunkIv.buffer, chunkIv.byteOffset, chunkIv.byteLength);
    const baseVal = view.getUint32(8, false); // Read bytes 8-11
    
    // Add counter offset with overflow wrap-around
    const newVal = (baseVal + counter) >>> 0;
    view.setUint32(8, newVal, false);
    return chunkIv;
}

/**
 * Derives Additional Authenticated Data (AAD) for GCM verification.
 * Binds [Header Bytes] + [Chunk Index (4 bytes)] + [isLast Flag (1 byte)].
 */
function deriveChunkAad(headerBytes, chunkIndex, isLast) {
    const aad = new Uint8Array(headerBytes.length + 5);
    aad.set(headerBytes, 0);
    const view = new DataView(aad.buffer, aad.byteOffset, aad.byteLength);
    view.setUint32(headerBytes.length, chunkIndex, false);
    view.setUint8(headerBytes.length + 4, isLast ? 1 : 0);
    return aad;
}

/**
 * Compresses an ArrayBuffer using native CompressionStream (Gzip).
 */
async function compressChunk(arrayBuffer) {
    if (typeof CompressionStream === 'undefined') {
        throw new Error("COMPRESSION_NOT_SUPPORTED");
    }
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(new Uint8Array(arrayBuffer));
            controller.close();
        }
    });
    const compressionStream = stream.pipeThrough(new CompressionStream('gzip'));
    const response = new Response(compressionStream);
    return await response.arrayBuffer();
}

/**
 * Decompresses an ArrayBuffer using native DecompressionStream (Gzip).
 */
async function decompressChunk(arrayBuffer) {
    if (typeof DecompressionStream === 'undefined') {
        throw new Error("DECOMPRESSION_NOT_SUPPORTED");
    }
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(new Uint8Array(arrayBuffer));
            controller.close();
        }
    });
    const decompressionStream = stream.pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(decompressionStream);
    return await response.arrayBuffer();
}

/**
 * Encryption loop handling chunking, optional compression, IV derivation, and disk writing.
 */
async function handleEncryption(file, password, compress, hint, fileHandle) {
    // 1. Feature detect compression support
    const supportsCompression = typeof CompressionStream !== 'undefined';
    const useCompression = compress && supportsCompression;

    // 2. Generate random Salt (16 bytes) and Base IV (12 bytes)
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const baseIv = crypto.getRandomValues(new Uint8Array(12));

    // 3. Encode Hint
    const encoder = new TextEncoder();
    const hintBytes = encoder.encode(hint || "");
    
    // 4. Construct Unencrypted Header
    const headerFixedPart = new Uint8Array(5 + 1 + 1 + 16 + 12 + 2);
    // Magic: KRYPT
    headerFixedPart.set([75, 82, 89, 80, 84], 0);
    // Version: 0x01
    headerFixedPart[5] = 1;
    // Flags: Bit 0 for compression
    headerFixedPart[6] = useCompression ? 1 : 0;
    // Salt
    headerFixedPart.set(salt, 7);
    // Base IV
    headerFixedPart.set(baseIv, 23);
    // Hint length (Uint16, big-endian)
    const view = new DataView(headerFixedPart.buffer);
    view.setUint16(35, hintBytes.length, false);

    // Combine fixed header and hint bytes
    const headerBytes = new Uint8Array(headerFixedPart.length + hintBytes.length);
    headerBytes.set(headerFixedPart, 0);
    headerBytes.set(hintBytes, headerFixedPart.length);

    // 5. Derive the cryptographic key from password using PBKDF2 (600k iterations)
    self.postMessage({ type: "STATUS", status: "KEY_DERIVATION" });
    const key = await deriveKey(password, salt);

    // 6. Encrypt File Metadata (Filename, MimeType, Size)
    const metadataBytes = encoder.encode(JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size
    }));

    // Metadata is encrypted using base IV + 0, AAD = headerBytes
    const metadataIv = deriveChunkIv(baseIv, 0);
    const metadataAad = deriveChunkAad(headerBytes, 0, false);
    const encryptedMetadata = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: metadataIv,
            additionalData: metadataAad
        },
        key,
        metadataBytes
    );

    // Construct Metadata Block: [Length (4 bytes)] + [Ciphertext]
    const metadataBlock = new Uint8Array(4 + encryptedMetadata.byteLength);
    const metadataView = new DataView(metadataBlock.buffer);
    metadataView.setUint32(0, encryptedMetadata.byteLength, false);
    metadataBlock.set(new Uint8Array(encryptedMetadata), 4);

    // 7. Write or accumulate file header
    let writable = null;
    if (fileHandle) {
        writable = await fileHandle.createWritable();
        await writable.write(headerBytes);
        await writable.write(metadataBlock);
    } else {
        // Fallback: send header & metadata block as chunks to the main thread
        // We don't put them in the transfer array (the second argument) 
        // because we need to reuse headerBytes for AAD generation in the loop!
        self.postMessage({
            type: "CHUNK",
            chunk: headerBytes.buffer,
            index: -2
        });

        self.postMessage({
            type: "CHUNK",
            chunk: metadataBlock.buffer,
            index: -1
        });
    }

    // 8. Process file in chunks
    const totalSize = file.size;
    const numChunks = Math.ceil(totalSize / CHUNK_SIZE) || 1; // At least 1 chunk for 0-byte files

    for (let i = 0; i < numChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const isLast = (i === numChunks - 1);

        // Slice chunk and read as ArrayBuffer
        const blobSlice = file.slice(start, end);
        let chunkBuffer = await blobSlice.arrayBuffer();

        // Compress chunk if flag is set
        if (useCompression) {
            chunkBuffer = await compressChunk(chunkBuffer);
        }

        // Derive chunk IV (base IV + i + 1) and AAD
        const chunkIv = deriveChunkIv(baseIv, i + 1);
        const chunkAad = deriveChunkAad(headerBytes, i + 1, isLast);

        // Encrypt the chunk
        const encryptedChunk = await crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: chunkIv,
                additionalData: chunkAad
            },
            key,
            chunkBuffer
        );

        // Construct Chunk Block: [Length (4 bytes)] + [Ciphertext + Tag]
        const chunkBlock = new Uint8Array(4 + encryptedChunk.byteLength);
        const chunkView = new DataView(chunkBlock.buffer);
        chunkView.setUint32(0, encryptedChunk.byteLength, false);
        chunkBlock.set(new Uint8Array(encryptedChunk), 4);

        // Write or post back
        if (writable) {
            await writable.write(chunkBlock);
        } else {
            self.postMessage({
                type: "CHUNK",
                chunk: chunkBlock.buffer,
                index: i
            }, [chunkBlock.buffer]);
        }

        // Progress Update
        self.postMessage({
            type: "PROGRESS",
            percent: Math.round(((i + 1) / numChunks) * 100)
        });
    }

    // 9. Finalize
    if (writable) {
        await writable.close();
    }

    self.postMessage({ type: "SUCCESS" });
}

/**
 * Decryption loop handling parsing, key derivation, GCM authentication, decompression, and disk writing.
 */
async function handleDecryption(file, password, fileHandle) {
    const totalSize = file.size;

    // 1. Read first 64KB slice to parse the header (safely covers header + hint + metadata block size)
    const initialSlice = file.slice(0, Math.min(65536, totalSize));
    const initialBuffer = await initialSlice.arrayBuffer();
    const initialView = new DataView(initialBuffer);

    if (initialBuffer.byteLength < 37) {
        throw new Error("INVALID_FORMAT");
    }

    // Verify Magic: KRYPT
    const magic = String.fromCharCode(...new Uint8Array(initialBuffer, 0, 5));
    if (magic !== "KRYPT") {
        throw new Error("INVALID_FORMAT");
    }

    const version = initialView.getUint8(5);
    if (version !== 1) {
        throw new Error("UNSUPPORTED_VERSION");
    }

    const flags = initialView.getUint8(6);
    const isCompressed = (flags & 1) === 1;

    // Extract Salt (16 bytes) and Base IV (12 bytes)
    const salt = new Uint8Array(initialBuffer, 7, 16);
    const baseIv = new Uint8Array(initialBuffer, 23, 12);

    // Extract Hint
    const hintLength = initialView.getUint16(35, false);
    if (initialBuffer.byteLength < 37 + hintLength) {
        throw new Error("INVALID_FORMAT");
    }
    
    const decoder = new TextDecoder();
    const hint = decoder.decode(new Uint8Array(initialBuffer, 37, hintLength));

    const headerLength = 37 + hintLength;
    const headerBytes = new Uint8Array(initialBuffer, 0, headerLength);

    // 2. Derive key from password using PBKDF2 (600k iterations)
    self.postMessage({ type: "STATUS", status: "KEY_DERIVATION" });
    const key = await deriveKey(password, salt);

    // 3. Read Encrypted Metadata Block Size (4 bytes at offset headerLength)
    if (initialBuffer.byteLength < headerLength + 4) {
        throw new Error("INVALID_FORMAT");
    }
    const metadataSize = initialView.getUint32(headerLength, false);

    // Read Encrypted Metadata Block
    if (totalSize < headerLength + 4 + metadataSize) {
        throw new Error("INVALID_FORMAT");
    }
    const metadataBlockSlice = file.slice(headerLength + 4, headerLength + 4 + metadataSize);
    const metadataBlockBuffer = await metadataBlockSlice.arrayBuffer();

    // Decrypt Metadata using base IV + 0, AAD = headerBytes
    const metadataIv = deriveChunkIv(baseIv, 0);
    const metadataAad = deriveChunkAad(headerBytes, 0, false);
    
    let decryptedMetadata;
    try {
        decryptedMetadata = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: metadataIv,
                additionalData: metadataAad
            },
            key,
            metadataBlockBuffer
        );
    } catch (e) {
        // Any decyption failure on GCM implies wrong password or file tampering
        throw new Error("WRONG_PASSWORD");
    }

    const metadata = JSON.parse(decoder.decode(decryptedMetadata));
    metadata.hint = hint;
    metadata.compressed = isCompressed;

    // Send metadata back to the UI thread
    self.postMessage({ type: "METADATA", metadata });

    // 4. Initialize stream or callback accumulator
    let writable = null;
    if (fileHandle) {
        writable = await fileHandle.createWritable();
    }

    // 5. Decrypt Chunks
    let offset = headerLength + 4 + metadataSize;
    let chunkIndex = 0;
    let validatedLastChunk = false;

    // Read and decrypt size-prefixed chunks sequentially
    while (offset < totalSize) {
        // Read chunk size (4 bytes)
        if (offset + 4 > totalSize) {
            throw new Error("MALFORMED_FILE");
        }
        
        const sizeSlice = file.slice(offset, offset + 4);
        const sizeBuffer = await sizeSlice.arrayBuffer();
        const sizeView = new DataView(sizeBuffer);
        const chunkSize = sizeView.getUint32(0, false);
        offset += 4;

        if (offset + chunkSize > totalSize) {
            throw new Error("FILE_TRUNCATED");
        }

        // Read encrypted chunk data
        const chunkSlice = file.slice(offset, offset + chunkSize);
        const chunkBuffer = await chunkSlice.arrayBuffer();
        offset += chunkSize;

        const isLast = (offset >= totalSize);
        if (isLast) {
            validatedLastChunk = true;
        }

        // Derive IV and AAD
        const chunkIv = deriveChunkIv(baseIv, chunkIndex + 1);
        const chunkAad = deriveChunkAad(headerBytes, chunkIndex + 1, isLast);

        // Decrypt the chunk
        let decryptedChunk;
        try {
            decryptedChunk = await crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: chunkIv,
                    additionalData: chunkAad
                },
                key,
                chunkBuffer
            );
        } catch (e) {
            throw new Error("DECRYPT_FAILED");
        }

        // Decompress chunk if compression is set
        if (isCompressed) {
            try {
                decryptedChunk = await decompressChunk(decryptedChunk);
            } catch (e) {
                if (e.message === "DECOMPRESSION_NOT_SUPPORTED") {
                    throw new Error("DECOMPRESSION_NOT_SUPPORTED");
                }
                throw new Error("DECOMPRESSION_FAILED");
            }
        }

        // Write decrypted bytes to disk or send back to main thread
        if (writable) {
            await writable.write(decryptedChunk);
        } else {
            self.postMessage({
                type: "CHUNK",
                chunk: decryptedChunk,
                index: chunkIndex
            }, [decryptedChunk]);
        }

        chunkIndex++;
        
        // Progress Update
        const processedPercentage = Math.round((offset / totalSize) * 100);
        self.postMessage({
            type: "PROGRESS",
            percent: processedPercentage
        });
    }

    // 6. Security verification: Ensure the last chunk encountered actually had the isLast flag set to 1 in AAD
    if (!validatedLastChunk) {
        throw new Error("TRUNCATED_EOF");
    }

    if (writable) {
        await writable.close();
    }

    self.postMessage({ type: "SUCCESS" });
}
