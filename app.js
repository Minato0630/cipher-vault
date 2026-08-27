// app.js - Main SPA Application Controller
// Orchestrates the UI, state, worker communication, and browser features.

// 1. Translation Dictionary (English and Tamil)
const translations = {
    en: {
        title: "CipherWing - Secure File Cryptor",
        tagline: "100% Client-Side Privacy-First Encryption",
        encryptTab: "Encrypt Mode",
        decryptTab: "Decrypt Mode",
        dropzoneText: "Drag & drop files here or click to browse",
        dropzoneSub: "Supports images, videos, documents, and generic files up to 2GB+",
        passwordLabel: "Secret Password",
        passwordConfirmLabel: "Confirm Password",
        passwordPlaceholder: "Enter a strong password...",
        passwordConfirmPlaceholder: "Re-enter password to confirm...",
        hintLabel: "File Hint / Note (Stored unencrypted in file)",
        hintPlaceholder: "e.g., 'invoice-dec-2026' or 'work project'...",
        compressLabel: "Compress files before encryption (basic Gzip)",
        btnEncrypt: "Encrypt Files",
        btnDecrypt: "Decrypt File",
        generatePassword: "Auto-generate strong password",
        copyBtn: "Copy",
        historyTitle: "Recently Processed (Local only)",
        noHistory: "No recently processed files.",
        disclaimer: "Your files and passwords never leave your browser. If you lose your password, your file cannot be recovered.",
        strengthWeak: "Weak Password",
        strengthMedium: "Medium Strength",
        strengthStrong: "Strong & Secure",
        passwordsMismatch: "Passwords do not match!",
        enterPassword: "Please enter a password.",
        warningFsaTitle: "Performance Notification",
        warningFsaDesc: "Your browser (Firefox/Safari) does not support direct disk streaming via the File System Access API. Files larger than 500MB might crash or exhaust memory. We recommend Google Chrome or Microsoft Edge for large file processing.",
        incompleteWriteTitle: "Decryption Error!",
        incompleteWriteDesc: "The output file was partially written to your disk and is now corrupted. Please locate and delete this file: ",
        wrongPassword: "Wrong password or corrupted file!",
        successEncrypt: "Successfully encrypted file(s)!",
        successDecrypt: "Successfully decrypted file!",
        queueEmpty: "Queue is empty. Please add files first.",
        statusKeyDerivation: "Deriving cryptographic key...",
        statusProcessing: "Processing...",
        statusCompleted: "Completed",
        statusFailed: "Failed",
        btnDownloadZip: "Download All as ZIP",
        clearHistory: "Clear History",
        dragWarning: "Drop files to add to queue",
        selfDestructWarning: "A file is currently being encrypted/decrypted. Closing this tab will abort the process. Do you want to leave?",
        hintDisplay: "Hint / Note:",
        filePreviewUnsupported: "Preview not available",
        copiedToast: "Password copied to clipboard!",
        fileRemoved: "File removed from queue",
        labelReceipt: "Auto-save transaction receipt file after download",
        btnExportHistory: "Save History Log"
    },
    ta: {
        title: "CipherWing - கோப்பு குறியாக்க செயலி",
        tagline: "100% உங்கள் உலாவியிலேயே இயங்கும் தனியுரிமைப் பாதுகாப்பு",
        encryptTab: "குறியாக்க முறை",
        decryptTab: "குறியாக்கநீக்க முறை",
        dropzoneText: "கோப்புகளை இங்கே இழுத்துப் போடவும் அல்லது உலாவ கிளிக் செய்யவும்",
        dropzoneSub: "படங்கள், வீடியோக்கள், ஆவணங்கள் மற்றும் 2GB+ அளவுள்ள கோப்புகளை ஆதரிக்கிறது",
        passwordLabel: "ரகசிய கடவுச்சொல்",
        passwordConfirmLabel: "கடவுச்சொல்லை உறுதிப்படுத்து",
        passwordPlaceholder: "வலுவான கடவுச்சொல்லை உள்ளிடவும்...",
        passwordConfirmPlaceholder: "கடவுச்சொல்லை மீண்டும் உள்ளிடவும்...",
        hintLabel: "கோப்பு குறிப்பு / விளக்கம் (மறைக்கப்படாமல் சேமிக்கப்படும்)",
        hintPlaceholder: "உதாரணமாக, 'விலைப்பட்டியல் - டிசம்பர் 2026'...",
        compressLabel: "கோப்புகளை குறியாக்கத்திற்கு முன் சுருக்கவும் (Gzip)",
        btnEncrypt: "கோப்புகளை குறியாக்கம் செய்",
        btnDecrypt: "கோப்பை குறியாக்கநீக்கம் செய்",
        generatePassword: "தானியங்கி கடவுச்சொல் உருவாக்கம்",
        copyBtn: "நகலெடு",
        historyTitle: "சமீபத்திய வரலாறு (உள்ளூர் மட்டும்)",
        noHistory: "வரலாறு எதுவும் இல்லை.",
        disclaimer: "உங்கள் கோப்புகளும் கடவுச்சொற்களும் உங்கள் உலாவியை விட்டு வெளியேறாது. உங்கள் கடவுச்சொல்லை இழந்தால், உங்கள் கோப்பை மீட்டெடுக்க முடியாது.",
        strengthWeak: "பலவீனமான கடவுச்சொல்",
        strengthMedium: "நடுத்தர கடவுச்சொல்",
        strengthStrong: "மிகவும் வலுவான கடவுச்சொல்",
        passwordsMismatch: "கடவுச்சொற்கள் பொருந்தவில்லை!",
        enterPassword: "தயவுசெய்து ஒரு கடவுச்சொல்லை உள்ளிடவும்.",
        warningFsaTitle: "செயல்திறன் எச்சரிக்கை",
        warningFsaDesc: "உங்கள் உலாவி (Firefox/Safari) வட்டில் கோப்புகளை நேரடியாக சேமிப்பதை ஆதரிக்கவில்லை. 500MB க்கும் அதிகமான கோப்புகள் உலாவியை செயலிழக்கச் செய்யலாம். பெரிய கோப்புகளுக்கு Google Chrome அல்லது Microsoft Edge ஐப் பயன்படுத்த பரிந்துரைக்கிறோம்.",
        incompleteWriteTitle: "குறியாக்கநீக்கப் பிழை!",
        incompleteWriteDesc: "வட்டில் பகுதி மட்டுமே எழுதப்பட்டதால் கோப்பு சிதைந்துள்ளது. தயவுசெய்து அந்தக் கோப்பைக் கண்டறிந்து கைமுறையாக நீக்கவும்: ",
        wrongPassword: "தவறான கடவுச்சொல் அல்லது கோப்பு சிதைந்துள்ளது!",
        successEncrypt: "கோப்புகள் வெற்றிகரமாக குறியாக்கம் செய்யப்பட்டன!",
        successDecrypt: "கோப்பு வெற்றிகரமாக குறியாக்கநீக்கம் செய்யப்பட்டது!",
        queueEmpty: "வரிசை காலியாக உள்ளது. தயவுசெய்து முதலில் கோப்புகளை சேர்க்கவும்.",
        statusKeyDerivation: "ரகசிய விசையை உருவாக்குகிறது...",
        statusProcessing: "செயலாக்குகிறது...",
        statusCompleted: "முடிந்தது",
        statusFailed: "தோல்வியடைந்தது",
        btnDownloadZip: "அனைத்தையும் ZIP ஆக பதிவிறக்கு",
        clearHistory: "வரலாற்றை அழி",
        dragWarning: "கோப்புகளை வரிசையில் சேர்க்க இங்கே விடுங்கள்",
        selfDestructWarning: "கோப்பு செயலாக்கம் நடைபெறுகிறது. இந்த பக்கத்தை மூடினால் செயலாக்கம் தடைபடும். நீங்கள் வெளியேற விரும்புகிறீர்களா?",
        hintDisplay: "குறிப்பு / குறிப்பேடு:",
        filePreviewUnsupported: "முன்னோட்டம் கிடைக்கவில்லை",
        copiedToast: "கடவுச்சொல் நகலெடுக்கப்பட்டது!",
        fileRemoved: "கோப்பு வரிசையிலிருந்து நீக்கப்பட்டது"
    }
};

// 2. Application State Variables
let currentLanguage = localStorage.getItem("language") || "en";
let currentTheme = localStorage.getItem("theme") || "dark";
let currentMode = "encrypt"; // "encrypt" or "decrypt"
let queue = [];
let activeProcessing = false;
let currentProcessingIndex = -1;
let workerInstance = null;

// Feature detection
const supportsFsa = typeof window.showSaveFilePicker !== "undefined";
const supportsCompression = typeof CompressionStream !== "undefined";

// Point to the same origin if hosted together, otherwise fallback to localhost for local dev
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001' 
    : window.location.origin;

// Override fetch globally to automatically append JWT token and handle 401s
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
    if (typeof url === 'string' && (url.startsWith(API_BASE) || url.startsWith(window.API_BASE))) {
        const token = sessionStorage.getItem('cipherVaultToken');
        if (token) {
            options.headers = options.headers || {};
            // Remove old x-user-id header if legacy code still sends it
            if (options.headers['x-user-id']) delete options.headers['x-user-id'];
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await originalFetch(url, options);
        
        // Handle token expiry
        if (res.status === 401 && !url.includes('/auth/session')) {
            sessionStorage.removeItem('cipherVaultToken');
            if (window.showToast) {
                window.showToast('error', 'Session expired. Please log in again.');
            } else {
                alert('Session expired. Please log in again.');
            }
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        }
        return res;
    }
    return originalFetch(url, options);
};

// 3. Document Elements Cache
const el = {
    html: document.documentElement,
    title: document.getElementById("app-title"),
    tagline: document.getElementById("app-tagline"),

    encryptTab: document.getElementById("tab-encrypt"),
    decryptTab: document.getElementById("tab-decrypt"),
    dropzone: document.getElementById("dropzone"),
    dropzoneText: document.getElementById("dropzone-text"),
    dropzoneSub: document.getElementById("dropzone-sub"),
    fileInput: document.getElementById("file-input"),
    passwordLabel: document.getElementById("label-password"),
    passwordConfirmLabel: document.getElementById("label-confirm"),
    passwordInput: document.getElementById("password"),
    passwordConfirmInput: document.getElementById("password-confirm"),
    passwordConfirmGroup: document.getElementById("confirm-group"),
    passwordToggle: document.getElementById("toggle-password"),
    passwordConfirmToggle: document.getElementById("toggle-confirm"),
    strengthText: document.getElementById("strength-text"),
    strengthBar: document.getElementById("strength-bar"),
    hintLabel: document.getElementById("label-hint"),
    hintInput: document.getElementById("hint"),
    hintGroup: document.getElementById("hint-group"),
    compressLabel: document.getElementById("label-compress"),
    compressCheckbox: document.getElementById("compress"),
    compressGroup: document.getElementById("compress-group"),
    btnPrimary: document.getElementById("btn-primary"),
    btnSaveToCase: document.getElementById("btn-save-to-case"),
    btnGenerate: document.getElementById("btn-generate"),
    btnCopy: document.getElementById("btn-copy"),
    generateGroup: document.getElementById("generate-group"),
    warningBanner: document.getElementById("warning-banner"),
    warningTitle: document.getElementById("warning-title"),
    warningDesc: document.getElementById("warning-desc"),
    queueCard: document.getElementById("queue-card"),
    queueHeader: document.getElementById("queue-header-title"),
    queueList: document.getElementById("queue-list"),
    btnDownloadZip: document.getElementById("btn-download-zip"),
    historyTitle: document.getElementById("history-title"),
    historyList: document.getElementById("history-list"),
    btnClearHistory: document.getElementById("btn-clear-history"),
    saveReceiptCheckbox: document.getElementById("save-receipt"),
    labelReceipt: document.getElementById("label-receipt"),
    toastContainer: document.getElementById("toast-container"),
    modalOverlay: document.getElementById("modal-overlay"),
    modalHeader: document.getElementById("modal-header"),
    modalBody: document.getElementById("modal-body"),
    modalClose: document.getElementById("modal-close"),
    hintDisplay: document.getElementById("hint-display"),
    hintDisplayTitle: document.getElementById("hint-display-title"),
    hintDisplayContent: document.getElementById("hint-display-content"),
    
    // CipherVault Profiles Elements
    activeUsernameDisplay: document.getElementById("active-username-display"),
    btnProfileLogout: document.getElementById("btn-profile-logout"),
    keepHistoryBlobsCheckbox: document.getElementById("keep-history-blobs"),
    historySearch: document.getElementById("history-search"),
    historyFilterType: document.getElementById("history-filter-type"),
    workspaceContainer: document.getElementById("workspace-container"),
    
    // Help Drawer Elements
    btnHelpDrawer: document.getElementById("btn-help-drawer"),
    helpDrawer: document.getElementById("help-drawer"),
    btnCloseDrawer: document.getElementById("btn-close-drawer"),
    btnFooterFaq: document.getElementById("btn-footer-faq")
};

// Export app configuration and methods for cross-module integration
window.appConfig = {
    addFilesToQueue,
    startProcessing,
    saveToCase,
    clearQueue,
    getQueue: () => queue,
    toggleMode
};

// 4. Initialize Application
function init() {
    setTheme(currentTheme);
    setLanguage(currentLanguage);
    toggleMode(currentMode);
    toggleUIControls(true); // Ensure primary action buttons are active on boot

    // Disable compression option if browser doesn't support CompressionStream
    if (!supportsCompression) {
        el.compressCheckbox.checked = false;
        el.compressCheckbox.disabled = true;
        el.compressLabel.innerHTML += " <small style='color:var(--error-color);'>(Not supported by browser)</small>";
    }

    setupEventListeners();
    checkProfileAuthentication();

    // Warn if running via file:// protocol (which restricts Web Workers in most browsers)
    if (window.location.protocol === "file:") {
        setTimeout(() => {
            triggerProtocolWarning();
        }, 800);
    }
}

// 5. Setup Event Listeners
function setupEventListeners() {
    // Theme and Language Switches

    // Tabs Switcher
    el.encryptTab.addEventListener("click", () => toggleMode("encrypt"));
    el.decryptTab.addEventListener("click", () => toggleMode("decrypt"));

    // File Dropzone Handling
    el.dropzone.addEventListener("click", () => el.fileInput.click());
    el.fileInput.addEventListener("change", handleFileSelection);

    el.dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        el.dropzone.classList.add("dragover");
    });
    el.dropzone.addEventListener("dragleave", () => el.dropzone.classList.remove("dragover"));
    el.dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        el.dropzone.classList.remove("dragover");
        if (e.dataTransfer.files.length > 0) {
            addFilesToQueue(e.dataTransfer.files);
        }
    });

    // Password Eye Toggles
    setupPasswordToggle(el.passwordInput, el.passwordToggle);
    setupPasswordToggle(el.passwordConfirmInput, el.passwordConfirmToggle);

    // Password Strength Meter
    el.passwordInput.addEventListener("input", updatePasswordStrength);

    // Action Trigger Buttons
    el.btnGenerate.addEventListener("click", generateStrongPassword);
    el.btnCopy.addEventListener("click", copyGeneratedPassword);
    el.btnPrimary.addEventListener("click", startProcessing);
    if (el.btnSaveToCase) el.btnSaveToCase.addEventListener("click", saveToCase);
    el.btnDownloadZip.addEventListener("click", downloadBatchAsZip);

    // Profile Event Listeners
    el.btnProfileLogout.addEventListener("click", () => {
        window.accounts.logout();
        window.location.href = "login.html";
    });

    el.keepHistoryBlobsCheckbox.addEventListener("change", async () => {
        const username = window.accounts.getCurrentUser();
        if (!username) return;
        
        const isChecked = el.keepHistoryBlobsCheckbox.checked;
        await window.accounts.updateSettings(username, { keepBlobs: isChecked });
        
        if (isChecked) {
            showToast("warning", "Keeping output files in history will consume substantial local browser storage space.");
        } else {
            showToast("info", "Blob preservation disabled. Future logs will store file metadata only.");
        }
    });

    // History Log Search and Filters
    if (el.historySearch) {
        el.historySearch.addEventListener("input", () => window.historyManager.render());
    }
    if (el.historyFilterType) {
        el.historyFilterType.addEventListener("change", () => window.historyManager.render());
    }

    el.btnClearHistory.addEventListener("click", async () => {
        if (confirm("Are you sure you want to clear your local history log and delete all saved files?")) {
            await window.historyManager.clearAll();
            showToast("success", "Profile history log cleared.");
        }
    });

    // Help Drawer toggle event listeners
    if (el.btnHelpDrawer) {
        el.btnHelpDrawer.addEventListener("click", () => el.helpDrawer.classList.toggle("active"));
    }
    if (el.btnCloseDrawer) {
        el.btnCloseDrawer.addEventListener("click", () => el.helpDrawer.classList.remove("active"));
    }
    if (el.btnFooterFaq) {
        el.btnFooterFaq.addEventListener("click", () => el.helpDrawer.classList.add("active"));
    }

    // Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
        if (activeProcessing) return;
        
        // Ctrl+O to open file browser
        if (e.ctrlKey && e.key.toLowerCase() === "o") {
            e.preventDefault();
            el.fileInput.click();
        }
        // Ctrl+Enter to start processing
        if (e.ctrlKey && e.key === "Enter") {
            e.preventDefault();
            startProcessing();
        }
    });

    // Tab exit warning
    window.addEventListener("beforeunload", (e) => {
        if (activeProcessing) {
            e.preventDefault();
            e.returnValue = translations[currentLanguage].selfDestructWarning;
            return translations[currentLanguage].selfDestructWarning;
        }
    });

    // Modal Close
    el.modalClose.addEventListener("click", () => el.modalOverlay.classList.remove("active"));
}

// Helper to toggle password visibility
function setupPasswordToggle(inputEl, toggleEl) {
    toggleEl.addEventListener("click", () => {
        const type = inputEl.getAttribute("type") === "password" ? "text" : "password";
        inputEl.setAttribute("type", type);
        const icon = toggleEl.querySelector("i");
        if (icon) {
            icon.className = type === "password" ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
        }
    });
}

// 6. Language & Theme Setters
function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem("theme", theme);
    el.html.setAttribute("data-theme", theme);
}

function setLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem("language", lang);
    
    // Update Theme Toggle Text
    setTheme(currentTheme);

    // UI Translation
    if (el.title) el.title.innerText = translations[lang].title;
    el.tagline.innerText = translations[lang].tagline;
    el.encryptTab.innerText = translations[lang].encryptTab;
    el.decryptTab.innerText = translations[lang].decryptTab;
    el.dropzoneText.innerText = translations[lang].dropzoneText;
    el.dropzoneSub.innerText = translations[lang].dropzoneSub;
    el.passwordLabel.innerText = translations[lang].passwordLabel;
    el.passwordConfirmLabel.innerText = translations[lang].passwordConfirmLabel;
    el.passwordInput.placeholder = translations[lang].passwordPlaceholder;
    el.passwordConfirmInput.placeholder = translations[lang].passwordConfirmPlaceholder;
    el.hintLabel.innerText = translations[lang].hintLabel;
    el.hintInput.placeholder = translations[lang].hintPlaceholder;
    const isCompressChecked = el.compressCheckbox ? el.compressCheckbox.checked : true;
    el.compressLabel.innerHTML = `<input type="checkbox" id="compress" ${isCompressChecked ? 'checked' : ''}> ${translations[lang].compressLabel}`;
    el.compressCheckbox = document.getElementById("compress"); // re-cache
    
    const isReceiptChecked = el.saveReceiptCheckbox ? el.saveReceiptCheckbox.checked : true;
    el.labelReceipt.innerHTML = `<input type="checkbox" id="save-receipt" ${isReceiptChecked ? 'checked' : ''}> ${translations[lang].labelReceipt}`;
    el.saveReceiptCheckbox = document.getElementById("save-receipt"); // re-cache

    el.btnGenerate.innerText = translations[lang].generatePassword;
    el.btnCopy.innerText = translations[lang].copyBtn;
    el.historyTitle.innerText = translations[lang].historyTitle;
    el.btnClearHistory.innerText = translations[lang].clearHistory;
    
    // Primary Button Mode translations
    updatePrimaryButtonText();
    updatePasswordStrength();
    renderQueue();
    
    if (window.historyManager && window.accounts && window.accounts.getCurrentUser()) {
        window.historyManager.render();
    }
}

function updatePrimaryButtonText() {
    if (currentMode === "encrypt") {
        el.btnPrimary.innerHTML = `<i class="fa-solid fa-lock"></i> ${translations[currentLanguage].btnEncrypt}`;
    } else {
        el.btnPrimary.innerHTML = `<i class="fa-solid fa-unlock"></i> ${translations[currentLanguage].btnDecrypt}`;
    }
}

// 7. Mode Swapping
function toggleMode(mode) {
    if (activeProcessing) return;
    
    currentMode = mode;
    clearQueue();
    hideFileHint();
    
    if (mode === "encrypt") {
        el.encryptTab.classList.add("active");
        el.decryptTab.classList.remove("active");
        el.passwordConfirmGroup.style.display = "block";
        el.hintGroup.style.display = "block";
        el.compressGroup.style.display = "block";
        el.generateGroup.style.display = "flex";
        el.warningBanner.style.display = "none";
    } else {
        el.decryptTab.classList.add("active");
        el.encryptTab.classList.remove("active");
        el.passwordConfirmGroup.style.display = "none";
        el.hintGroup.style.display = "none";
        el.compressGroup.style.display = "none";
        el.generateGroup.style.display = "none";
        el.warningBanner.style.display = "none";
    }
    
    updatePrimaryButtonText();
}

// 8. File Handling & Queue Management
function handleFileSelection(e) {
    if (e.target.files.length > 0) {
        addFilesToQueue(e.target.files);
    }
    el.fileInput.value = ""; // reset
}

function addFilesToQueue(fileList) {
    let largeFileWarningNeeded = false;
    let limitWarningCount = 0;

    for (let file of fileList) {
        // In Decrypt Mode, we only process 1 file at a time
        if (currentMode === "decrypt") {
            queue = []; // clear previous
            hideFileHint();
        }

        // Feature warning for Safari/Firefox
        if (!supportsFsa && file.size > 500 * 1024 * 1024) {
            largeFileWarningNeeded = true;
            limitWarningCount++;
        }

        // Soft warning for files > 200MB if keep history blobs is checked
        const keepHistoryCheckbox = document.getElementById("keep-history-blobs");
        if (keepHistoryCheckbox && keepHistoryCheckbox.checked && file.size > 200 * 1024 * 1024) {
            showToast("warning", `File "${file.name}" is larger than 200MB. Keeping output files in history will consume substantial local storage space.`);
        }

        const id = "file_" + Math.random().toString(36).substr(2, 9);
        const item = {
            id,
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            progress: 0,
            status: "queued", // "queued", "processing", "completed", "failed"
            error: null,
            resultBlob: null,
            resultName: null
        };
        
        queue.push(item);
        
        // In Decrypt Mode, immediately inspect header to display Hint if available
        if (currentMode === "decrypt") {
            inspectEncryptedHeader(file);
        }
    }

    if (largeFileWarningNeeded) {
        el.warningTitle.innerText = translations[currentLanguage].warningFsaTitle;
        el.warningDesc.innerText = translations[currentLanguage].warningFsaDesc;
        el.warningBanner.style.display = "flex";
    }

    renderQueue();
}

function clearQueue() {
    queue.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    queue = [];
    renderQueue();
}

function removeFileFromQueue(id) {
    if (activeProcessing) return;
    
    const index = queue.findIndex(item => item.id === id);
    if (index !== -1) {
        if (queue[index].previewUrl) {
            URL.revokeObjectURL(queue[index].previewUrl);
        }
        queue.splice(index, 1);
        showToast("info", translations[currentLanguage].fileRemoved);
        
        // Hide hint display if decrypt target is removed
        if (currentMode === "decrypt") {
            hideFileHint();
        }
        
        renderQueue();
    }
}

// 9. Generate Thumbnails / Previews
function createFilePreview(item, containerEl) {
    const previewEl = document.createElement("div");
    previewEl.className = "file-preview";

    const type = item.type;
    const name = item.name.toLowerCase();

    if (type.startsWith("image/") || (item.resultBlob && item.resultBlob.type.startsWith("image/"))) {
        const img = document.createElement("img");
        const blob = item.resultBlob || item.file;
        img.src = URL.createObjectURL(blob);
        item.previewUrl = img.src; // cache to revoke
        previewEl.appendChild(img);
    } else if (type.startsWith("video/") || (item.resultBlob && item.resultBlob.type.startsWith("video/"))) {
        const video = document.createElement("video");
        const blob = item.resultBlob || item.file;
        video.src = URL.createObjectURL(blob);
        video.muted = true;
        video.preload = "metadata";
        item.previewUrl = video.src; // cache to revoke
        
        // Render 1st frame on load
        video.addEventListener("loadeddata", () => {
            video.currentTime = 0.5;
        });
        
        previewEl.appendChild(video);
    } else {
        // Document icon style preview fallback
        const icon = document.createElement("i");
        if (name.endsWith(".pdf")) {
            icon.className = "fa-solid fa-file-pdf";
            icon.style.color = "#ef4444";
        } else if (name.endsWith(".doc") || name.endsWith(".docx")) {
            icon.className = "fa-solid fa-file-word";
            icon.style.color = "#3b82f6";
        } else if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
            icon.className = "fa-solid fa-file-excel";
            icon.style.color = "#10b981";
        } else if (name.endsWith(".ppt") || name.endsWith(".pptx")) {
            icon.className = "fa-solid fa-file-powerpoint";
            icon.style.color = "#f57c00";
        } else if (name.endsWith(".txt")) {
            icon.className = "fa-solid fa-file-lines";
        } else {
            icon.className = "fa-solid fa-file-shield";
        }
        previewEl.appendChild(icon);
    }

    containerEl.appendChild(previewEl);
}

// 10. Unencrypted Header Parsing (Hint inspection before decryption)
async function inspectEncryptedHeader(file) {
    try {
        const slice = file.slice(0, 1024);
        const buffer = await slice.arrayBuffer();
        const view = new DataView(buffer);
        
        if (buffer.byteLength < 37) return;

        const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 5));
        if (magic !== "KRYPT") return;

        const hintLength = view.getUint16(35, false);
        if (buffer.byteLength < 37 + hintLength) return;

        const hintBytes = new Uint8Array(buffer, 37, hintLength);
        const hint = new TextDecoder().decode(hintBytes);
        
        if (hint && hint.trim().length > 0) {
            showFileHint(hint);
        }
    } catch (e) {
        console.error("Failed to parse file hint", e);
    }
}

function showFileHint(hint) {
    el.hintDisplayTitle.innerText = translations[currentLanguage].hintDisplay;
    el.hintDisplayContent.innerText = hint;
    el.hintDisplay.style.display = "block";
}

function hideFileHint() {
    el.hintDisplay.style.display = "none";
    el.hintDisplayContent.innerText = "";
}

// 11. Render Functions
function renderQueue() {
    if (queue.length === 0) {
        el.queueCard.style.display = "none";
        el.queueList.innerHTML = "";
        return;
    }

    el.queueCard.style.display = "block";
    el.queueHeader.innerText = currentMode === "encrypt" 
        ? `${translations[currentLanguage].encryptTab} Queue (${queue.length})` 
        : `${translations[currentLanguage].decryptTab} File`;
        
    el.queueList.innerHTML = "";
    
    // Disable Drag & Drop reorder in Decrypt mode since queue is always max 1
    const enableDrag = (currentMode === "encrypt" && !activeProcessing);

    queue.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = `queue-item ${item.status}`;
        itemEl.setAttribute("data-id", item.id);
        
        if (enableDrag) {
            itemEl.draggable = true;
            setupDragAndDropSorting(itemEl);
        }

        // Drag Handle
        if (enableDrag) {
            const handle = document.createElement("div");
            handle.className = "drag-handle";
            handle.innerHTML = `<i class="fa-solid fa-grip-vertical"></i>`;
            itemEl.appendChild(handle);
        }

        // Thumbnail Preview
        createFilePreview(item, itemEl);

        // Details Panel
        const details = document.createElement("div");
        details.className = "file-details";

        const name = document.createElement("div");
        name.className = "file-name";
        name.innerText = item.name;
        details.appendChild(name);

        const meta = document.createElement("div");
        meta.className = "file-meta";
        
        const sizeBadge = document.createElement("span");
        sizeBadge.className = "file-badge";
        sizeBadge.innerText = formatSize(item.size);
        meta.appendChild(sizeBadge);

        if (item.status === "processing") {
            const statusLabel = document.createElement("span");
            statusLabel.className = "queue-item-status";
            statusLabel.innerText = item.progressMsg || `${translations[currentLanguage].statusProcessing} (${item.progress}%)`;
            meta.appendChild(statusLabel);
        } else if (item.status === "completed") {
            const statusLabel = document.createElement("span");
            statusLabel.className = "queue-item-status";
            statusLabel.innerText = translations[currentLanguage].statusCompleted;
            meta.appendChild(statusLabel);
        } else if (item.status === "failed") {
            const statusLabel = document.createElement("span");
            statusLabel.className = "queue-item-status";
            statusLabel.innerText = `${translations[currentLanguage].statusFailed} (${item.error})`;
            meta.appendChild(statusLabel);
        }

        details.appendChild(meta);
        itemEl.appendChild(details);

        // Action Panel (Delete or Individual Download)
        const actions = document.createElement("div");
        actions.className = "item-actions";

        if (item.status === "completed" && item.resultBlob) {
            const downloadBtn = document.createElement("button");
            downloadBtn.className = "btn-item-action";
            downloadBtn.innerHTML = `<i class="fa-solid fa-download"></i>`;
            downloadBtn.addEventListener("click", () => triggerFileDownload(item));
            actions.appendChild(downloadBtn);
        }

        if (!activeProcessing) {
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "btn-item-action delete";
            deleteBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i>`;
            deleteBtn.addEventListener("click", () => removeFileFromQueue(item.id));
            actions.appendChild(deleteBtn);
        }

        itemEl.appendChild(actions);

        // Progress bar indicator
        if (item.status === "processing" || item.status === "completed" || item.status === "failed") {
            const progress = document.createElement("div");
            progress.className = "item-progress";
            progress.style.width = `${item.progress}%`;
            itemEl.appendChild(progress);
        }

        el.queueList.appendChild(itemEl);
    });

    // Manage batch ZIP download button visibility
    const completedItemsWithBlobs = queue.filter(item => item.status === "completed" && item.resultBlob);
    if (currentMode === "encrypt" && completedItemsWithBlobs.length > 1) {
        el.btnDownloadZip.style.display = "flex";
        el.btnDownloadZip.innerText = translations[currentLanguage].btnDownloadZip;
    } else {
        el.btnDownloadZip.style.display = "none";
    }
}

// Drag & Drop Queue Reordering
let draggedItem = null;

function setupDragAndDropSorting(itemEl) {
    itemEl.addEventListener("dragstart", () => {
        draggedItem = itemEl;
        setTimeout(() => itemEl.classList.add("dragging"), 0);
    });

    itemEl.addEventListener("dragend", () => {
        draggedItem.classList.remove("dragging");
        draggedItem = null;
        
        // Re-align our state queue array matches the visual layout order
        const reorderedQueue = [];
        const renderedItems = el.queueList.querySelectorAll(".queue-item");
        renderedItems.forEach(renderedItem => {
            const id = renderedItem.getAttribute("data-id");
            const qItem = queue.find(i => i.id === id);
            if (qItem) reorderedQueue.push(qItem);
        });
        queue = reorderedQueue;
    });

    itemEl.addEventListener("dragover", (e) => {
        e.preventDefault();
        const overItem = e.currentTarget;
        if (overItem !== draggedItem) {
            const rect = overItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (e.clientY < midpoint) {
                el.queueList.insertBefore(draggedItem, overItem);
            } else {
                el.queueList.insertBefore(draggedItem, overItem.nextSibling);
            }
        }
    });
}

// 12. Password Strength Evaluator
function updatePasswordStrength() {
    const password = el.passwordInput.value;
    if (!password) {
        el.strengthText.innerText = "";
        el.strengthBar.innerHTML = `<div class="strength-segment"></div><div class="strength-segment"></div><div class="strength-segment"></div>`;
        return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 14) score++; // bonus length
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const segments = el.strengthBar.querySelectorAll(".strength-segment");
    segments.forEach(seg => seg.className = "strength-segment"); // reset

    if (score <= 2) {
        el.strengthText.innerText = translations[currentLanguage].strengthWeak;
        el.strengthText.style.color = "var(--error-color)";
        segments[0].className = "strength-segment strength-weak";
    } else if (score <= 4) {
        el.strengthText.innerText = translations[currentLanguage].strengthMedium;
        el.strengthText.style.color = "var(--warning-color)";
        segments[0].className = "strength-segment strength-medium";
        segments[1].className = "strength-segment strength-medium";
    } else {
        el.strengthText.innerText = translations[currentLanguage].strengthStrong;
        el.strengthText.style.color = "var(--success-color)";
        segments[0].className = "strength-segment strength-strong";
        segments[1].className = "strength-segment strength-strong";
        segments[2].className = "strength-segment strength-strong";
    }
}

// 13. Auto Generate Random Passwords
function generateStrongPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    const len = 20;
    let pass = "";
    
    // Cryptographically secure generation
    const randomVals = new Uint32Array(len);
    window.crypto.getRandomValues(randomVals);
    for (let i = 0; i < len; i++) {
        pass += chars[randomVals[i] % chars.length];
    }

    el.passwordInput.value = pass;
    el.passwordConfirmInput.value = pass;
    el.passwordInput.setAttribute("type", "text"); // Show it
    el.passwordConfirmInput.setAttribute("type", "text");
    
    updatePasswordStrength();
    showToast("info", translations[currentLanguage].generatePassword);
}

function copyGeneratedPassword() {
    const password = el.passwordInput.value;
    if (!password) return;
    
    navigator.clipboard.writeText(password).then(() => {
        showToast("success", translations[currentLanguage].copiedToast);
    });
}

// 14. Start Queue Processing (Encryption/Decryption Orchestration)
async function startProcessing() {
    if (activeProcessing) return;
    
    // Validations
    if (queue.length === 0) {
        showToast("error", translations[currentLanguage].queueEmpty);
        return;
    }

    const password = el.passwordInput.value;
    if (!password) {
        showToast("error", translations[currentLanguage].enterPassword);
        return;
    }

    if (currentMode === "encrypt") {
        const confirm = el.passwordConfirmInput.value;
        if (password !== confirm) {
            showToast("error", translations[currentLanguage].passwordsMismatch);
            return;
        }
    }

    // Set locks
    activeProcessing = true;
    toggleUIControls(false);

    // Process files one-by-one in the queue
    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        if (item.status === "completed") continue; // Skip already finished ones if in queue

        currentProcessingIndex = i;
        item.status = "processing";
        item.progress = 0;
        item.progressMsg = translations[currentLanguage].statusKeyDerivation;
        renderQueue();

        try {
            await processFileItem(item, password);
            item.status = "completed";
            item.progress = 100;
            
            try {
                await window.historyManager.saveRun(item.name, item.file.type, item.size, currentMode, item.resultBlob);
            } catch (err) {
                if (err.message === "QUOTA_EXCEEDED") {
                    showToast("error", "Storage limit exceeded! File processed successfully, but output could not be logged to history.");
                } else {
                    showToast("warning", "Failed to log run: " + err.message);
                }
            }
        } catch (error) {
            console.error("Encryption/Decryption processing failed", error);
            item.status = "failed";
            item.progress = 100;
            item.error = error.message;
            showToast("error", `${item.name}: ${error.message}`);
        }
        
        renderQueue();
    }

    // Processing finished
    activeProcessing = false;
    currentProcessingIndex = -1;
    toggleUIControls(true);
    
    // Clear passwords from inputs for security
    el.passwordInput.value = "";
    el.passwordConfirmInput.value = "";
    updatePasswordStrength();

    // Overall final toast
    const failedCount = queue.filter(item => item.status === "failed").length;
    if (failedCount === 0) {
        showToast("success", currentMode === "encrypt" 
            ? translations[currentLanguage].successEncrypt 
            : translations[currentLanguage].successDecrypt);
        
        // Trigger Three.js visual animation flash on success
        if (typeof window.flashThreeJS === "function") {
            window.flashThreeJS();
        }
    }
}

// Role UI gating
window.applyCaseVaultRoleUI = function(role) {
    if (!el.btnSaveToCase) return;
    
    // Make visible
    el.btnSaveToCase.style.display = "flex";
    
    // Reset state
    el.btnSaveToCase.disabled = false;
    el.btnSaveToCase.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> <span>Save to Case</span>`;
    el.btnSaveToCase.title = "";

    if (role === 'court_clerk') {
        el.btnSaveToCase.disabled = true;
        el.btnSaveToCase.innerHTML = `<i class="fa-solid fa-ban"></i> <span>Save to Case (Restricted)</span>`;
        el.btnSaveToCase.title = "Court Clerk role: view/download only";
    } else if (role === 'auditor') {
        el.btnSaveToCase.disabled = true;
        el.btnSaveToCase.innerHTML = `<i class="fa-solid fa-ban"></i> <span>Save to Case (Restricted)</span>`;
        el.btnSaveToCase.title = "Auditor role: view audit log only";
    } else if (role === 'forensic_expert') {
        el.btnSaveToCase.title = "Forensic Expert role: can only upload forensic_report";
    }
}

// Helper for testing Phase 3
window.setTestRole = function(role) {
    window.activeCaseRole = role;
    window.activeCaseId = 'test-case';
    applyCaseVaultRoleUI(role);
    console.log(`Role set to ${role}`);
    showToast("success", `Role changed to ${role}`);
};

// Case Vault integration
async function saveToCase(selectedItemIds = null) {
    if (activeProcessing) return;
    if (queue.length === 0) {
        showToast("error", translations[currentLanguage].queueEmpty);
        return;
    }
    if (currentMode !== "encrypt") {
        showToast("error", "Save to Case is only for encryption.");
        return;
    }

    const caseId = window.activeCaseId;
    if (!caseId) {
        showToast("error", "No active case selected.");
        return;
    }

    const userId = window.accounts.getCurrentUser();
    if (!userId) {
        showToast("error", "Must be logged in to save to case.");
        return;
    }

    // Role Enforcement Check
    const role = window.activeCaseRole; // Set when navigating to case
    if (role === 'court_clerk' || role === 'auditor') {
        showToast("error", `Your role (${role}) does not permit uploading.`);
        return;
    }

    activeProcessing = true;
    toggleUIControls(false);

    try {
        await window.keywrap.init(userId);

        // Fetch case members
        const res = await fetch(`${API_BASE}/cases/${caseId}`, {
            headers: { 'x-user-id': userId }
        });
        if (!res.ok) throw new Error("Failed to fetch case members");
        const caseData = await res.json();
        
        // Use selected item IDs if provided, else use the whole queue
        const targetQueue = selectedItemIds ? queue.filter(item => selectedItemIds.includes(item.id)) : queue;

        if (targetQueue.length === 0) {
            showToast("error", "No files selected for upload.");
            return;
        }

        for (let i = 0; i < targetQueue.length; i++) {
            const item = targetQueue[i];

            currentProcessingIndex = queue.indexOf(item);
            item.status = "processing";
            item.progress = 0;
            item.progressMsg = "Wrapping Keys for Case...";
            if (typeof renderQueue === 'function') renderQueue();

            // Generate wrapped keys
            const { perDocumentKeyString, wrappedKeys } = await window.keywrap.generateAndWrapForMembers(caseId, caseData.members);

            item.progressMsg = "Encrypting...";
            renderQueue();

            // Run normal worker processing, but prevent file download (preventDownload = true)
            await processFileItem(item, perDocumentKeyString, true);

            // POST to backend
            item.progressMsg = "Uploading to Case Vault...";
            renderQueue();

            const formData = new FormData();
            formData.append('document', item.resultBlob);
            formData.append('doc_type', role === 'forensic_expert' ? 'forensic_report' : 'other'); 
            formData.append('filename_encrypted', item.resultName);
            formData.append('wrapped_keys', JSON.stringify(wrappedKeys));

            const uploadRes = await fetch(`${API_BASE}/cases/${caseId}/documents`, {
                method: 'POST',
                headers: { 'x-user-id': userId },
                body: formData
            });

            if (!uploadRes.ok) throw new Error("Failed to upload document");

            item.status = "completed";
            item.progress = 100;
            renderQueue();
        }

        showToast("success", "Successfully saved to Case Vault!");
        if (typeof window.flashThreeJS === "function") window.flashThreeJS();

    } catch (error) {
        console.error("Save to Case failed", error);
        showToast("error", error.message);
    } finally {
        activeProcessing = false;
        currentProcessingIndex = -1;
        toggleUIControls(true);
    }
}

// 15. Stream to disk or fallback memory buffer (Per-Item handling)
async function processFileItem(item, password, preventDownload = false) {
    return new Promise(async (resolve, reject) => {
        let fileHandle = null;
        let fileWritableName = null;

        // Try showSaveFilePicker if supported (and we aren't preventing download, implying background processing)
        if (supportsFsa && !preventDownload) {
            try {
                // Suggest appropriate file name
                let suggestedName = item.name;
                if (currentMode === "encrypt") {
                    suggestedName += ".krypt";
                } else if (suggestedName.endsWith(".krypt")) {
                    // Pre-strip .krypt to guess decrypted name if it matches
                    suggestedName = suggestedName.slice(0, -6);
                }

                const pickerOptions = {
                    suggestedName,
                    types: [{
                        description: currentMode === "encrypt" ? "Encrypted File" : "Decrypted File",
                        accept: {
                            "application/octet-stream": [currentMode === "encrypt" ? ".krypt" : ".*"]
                        }
                    }]
                };

                fileHandle = await window.showSaveFilePicker(pickerOptions);
                fileWritableName = fileHandle.name;
            } catch (err) {
                // User cancelled file selection dialog
                if (err.name === "AbortError") {
                    activeProcessing = false;
                    currentProcessingIndex = -1;
                    toggleUIControls(true);
                    item.status = "queued";
                    item.progress = 0;
                    renderQueue();
                    reject(new Error("File save destination selection cancelled."));
                    return;
                }
                console.warn("FSA picker error, falling back to memory arrays:", err);
            }
        }

        // Spawn a fresh Web Worker for this file task
        workerInstance = new Worker("worker.js");
        
        const chunks = [];
        let decryptedName = null;
        let decryptedType = null;
        let errorReason = null;

        // Start command details
        const msgData = {
            action: currentMode.toUpperCase(),
            file: item.file,
            password,
            compress: el.compressCheckbox.checked,
            hint: el.hintInput.value,
            fileHandle: fileHandle
        };

        // If fileHandle is present, transfer it to the worker
        // Note: Transferring handles in workers requires browser support.
        // We pass the handle directly inside msgData, which is structured-cloned.
        workerInstance.postMessage(msgData);

        workerInstance.onmessage = async (e) => {
            const data = e.data;

            if (data.type === "STATUS") {
                if (data.status === "KEY_DERIVATION") {
                    item.progressMsg = translations[currentLanguage].statusKeyDerivation;
                    renderQueue();
                }
            } else if (data.type === "PROGRESS") {
                item.progress = data.percent;
                item.progressMsg = `${translations[currentLanguage].statusProcessing} (${data.percent}%)`;
                renderQueue();
            } else if (data.type === "METADATA") {
                // Sent from Decrypt worker once parsed
                decryptedName = data.metadata.name;
                decryptedType = data.metadata.type;
            } else if (data.type === "CHUNK") {
                // Fallback route chunks collector
                chunks.push(new Uint8Array(data.chunk));
            } else if (data.type === "SUCCESS") {
                // Operation completed
                workerInstance.terminate();
                workerInstance = null;

                if (!fileHandle) {
                    // Generate Blob download payload
                    const fullBlob = new Blob(chunks, { type: decryptedType || "application/octet-stream" });
                    item.resultBlob = fullBlob;
                    
                    if (currentMode === "encrypt") {
                        item.resultName = item.name + ".krypt";
                    } else {
                        item.resultName = decryptedName || item.name.replace(".krypt", "");
                    }
                    
                    // Trigger download automatically for the processed file
                    if (!preventDownload) {
                        triggerFileDownload(item);
                    }
                } else {
                    item.resultName = fileWritableName;
                }

                // Download transaction receipt if selected
                if (el.saveReceiptCheckbox && el.saveReceiptCheckbox.checked) {
                    generateAndDownloadReceipt(item);
                }

                resolve();
            } else if (data.type === "ERROR") {
                workerInstance.terminate();
                workerInstance = null;
                
                // Friendly error strings
                let userFriendlyError = data.message;
                if (data.message === "WRONG_PASSWORD" || data.message === "DECRYPT_FAILED") {
                    userFriendlyError = translations[currentLanguage].wrongPassword;
                    if (data.message === "DECRYPT_FAILED" && fileHandle) {
                        triggerIncompleteWriteAlert(fileWritableName);
                    }
                } else if (data.message === "INVALID_FORMAT") {
                    userFriendlyError = currentLanguage === "en" 
                        ? "The selected file is not a valid encrypted file (.krypt)." 
                        : "தேர்ந்தெடுக்கப்பட்ட கோப்பு செல்லுபடியாகும் குறியாக்கப்பட்ட கோப்பு அல்ல (.krypt).";
                } else if (data.message === "UNSUPPORTED_VERSION") {
                    userFriendlyError = currentLanguage === "en" 
                        ? "This file was encrypted with an unsupported version." 
                        : "இந்த கோப்பு ஆதரிக்கப்படாத பதிப்பில் குறியாக்கம் செய்யப்பட்டுள்ளது.";
                } else if (data.message === "MALFORMED_FILE" || data.message === "FILE_TRUNCATED" || data.message === "TRUNCATED_EOF") {
                    userFriendlyError = currentLanguage === "en" 
                        ? "The file is corrupted, incomplete, or has been tampered with." 
                        : "இந்த கோப்பு சிதைந்துள்ளது, முழுமையற்றது அல்லது சேதப்படுத்தப்பட்டுள்ளது.";
                    if (fileHandle) {
                        triggerIncompleteWriteAlert(fileWritableName);
                    }
                } else if (data.message === "DECOMPRESSION_NOT_SUPPORTED") {
                    userFriendlyError = currentLanguage === "en"
                        ? "Your browser does not support decompressing files."
                        : "உங்கள் உலாவி கோப்புகளை சுருக்குவதை ஆதரிக்கவில்லை.";
                }

                reject(new Error(userFriendlyError));
            }
        };

        workerInstance.onerror = (err) => {
            if (workerInstance) {
                workerInstance.terminate();
                workerInstance = null;
            }
            reject(new Error(err.message || "Worker thread crashed."));
        };
    });
}

// 16. Fallback Blob Downloader Trigger
function triggerFileDownload(item) {
    if (!item.resultBlob) return;
    
    const url = URL.createObjectURL(item.resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.resultName;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup memory references
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// 17. Batch Compilation as ZIP (using local JSZip)
async function downloadBatchAsZip() {
    const completedItems = queue.filter(item => item.status === "completed" && item.resultBlob);
    if (completedItems.length === 0) return;

    el.btnDownloadZip.disabled = true;
    const oldHtml = el.btnDownloadZip.innerHTML;
    el.btnDownloadZip.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Compiling ZIP...`;

    try {
        const zip = new JSZip();
        completedItems.forEach(item => {
            zip.file(item.resultName, item.resultBlob);
        });

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        
        const a = document.createElement("a");
        a.href = zipUrl;
        a.download = `krypt_batch_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(zipUrl);
        }, 100);

        showToast("success", "Batch ZIP compiled and downloaded!");
    } catch (e) {
        console.error("ZIP Generation Failed", e);
        showToast("error", "Failed to compile ZIP file.");
    } finally {
        el.btnDownloadZip.disabled = false;
        el.btnDownloadZip.innerHTML = oldHtml;
    }
}

// 18. UI Control Locking/Unlocking
function toggleUIControls(enable) {
    el.encryptTab.disabled = !enable;
    el.decryptTab.disabled = !enable;
    el.passwordInput.disabled = !enable;
    el.passwordConfirmInput.disabled = !enable;
    el.hintInput.disabled = !enable;
    el.compressCheckbox.disabled = !enable || !supportsCompression;
    el.btnPrimary.disabled = !enable;
    el.btnGenerate.disabled = !enable;
    
    if (enable) {
        el.dropzone.style.pointerEvents = "auto";
        el.dropzone.style.opacity = "1";
    } else {
        el.dropzone.style.pointerEvents = "none";
        el.dropzone.style.opacity = "0.6";
    }
}

// 19. Warning Alerts & Toasts
function triggerIncompleteWriteAlert(filename) {
    el.modalHeader.className = "modal-header";
    el.modalHeader.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${translations[currentLanguage].incompleteWriteTitle}`;
    el.modalBody.innerText = `${translations[currentLanguage].incompleteWriteDesc} "${filename}"`;
    el.modalOverlay.classList.add("active");
}

function triggerProtocolWarning() {
    el.modalHeader.className = "modal-header warning-header";
    el.modalHeader.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Security Protocol Notice`;
    el.modalBody.innerHTML = `
        <p><strong>CipherWing is running via the <code>file://</code> protocol.</strong></p>
        <p style="margin-top: 10px;">Modern web browsers restrict Web Workers (used for offline encryption processing) when pages are opened directly from a local folder.</p>
        <p style="margin-top: 10px;">To ensure encryption and decryption work correctly, please run CipherWing using a local web server by running the start command in your terminal:</p>
        <pre style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 6px; margin-top: 8px; font-family: monospace; font-size: 0.85rem; user-select: all; text-align: left; color: #fff;">npx serve</pre>
    `;
    el.modalOverlay.classList.add("active");
}

function showToast(type, message) {
    // Type is success, error, warning, info
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let iconClass = "fa-circle-info";
    if (type === "success") iconClass = "fa-circle-check";
    if (type === "error") iconClass = "fa-circle-xmark";
    if (type === "warning") iconClass = "fa-triangle-exclamation";

    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${iconClass}"></i></div>
        <div class="toast-body">
            <div class="toast-title">${type.toUpperCase()}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
    `;

    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.style.animation = "none";
        toast.style.opacity = "0";
        setTimeout(() => el.toastContainer.removeChild(toast), 300);
    });

    el.toastContainer.appendChild(toast);

    // Auto dismiss after 5s
    setTimeout(() => {
        if (el.toastContainer.contains(toast)) {
            toast.style.opacity = "0";
            setTimeout(() => {
                if (el.toastContainer.contains(toast)) {
                    el.toastContainer.removeChild(toast);
                }
            }, 300);
        }
    }, 5000);
}

// 20. Local Hashing and State Control
async function checkProfileAuthentication() {
    const activeUser = window.accounts.getCurrentUser();
    if (activeUser) {
        await showWorkspace(activeUser);
    } else {
        window.location.href = "login.html";
    }
}

async function showWorkspace(username) {
    el.workspaceContainer.style.display = "block";
    
    const display = window.accounts.getCurrentDisplayName() || username;
    el.activeUsernameDisplay.textContent = display;
    
    // Read and apply user settings
    const settings = await window.accounts.getSettings(username);
    el.keepHistoryBlobsCheckbox.checked = !!settings.keepBlobs;

    // Render history
    window.historyManager.render();
}

// 21. Format Helpers
function formatSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 22. Generate and Download Transaction Receipt File
function generateAndDownloadReceipt(item) {
    let content = "==================================================\n";
    content += "CIPHERWING - TRANSACTION RECEIPT\n";
    content += "==================================================\n";
    content += `Receipt Generated: ${new Date().toLocaleString()}\n`;
    content += `Operation: ${currentMode.toUpperCase()}\n\n`;

    content += "FILE DETAILS:\n";
    content += `- Original Name: ${item.name}\n`;
    content += `- Original Size: ${formatSize(item.size)}\n`;
    content += `- Mime Type: ${item.type || "application/octet-stream"}\n`;
    if (item.resultName) {
        content += `- Result Name: ${item.resultName}\n`;
    }

    content += "\nCRYPTOGRAPHIC PROTOCOL:\n";
    content += `- Algorithm: AES-256-GCM (Authenticated Encryption)\n`;
    content += `- Key Derivation: PBKDF2 (600,000 iterations, SHA-256)\n`;

    content += "\nSECURITY POLICY NOTICE:\n";
    content += `- 100% Client-Side: processed locally in browser. No server uploads.\n`;
    content += `- Password protection: your password is NOT stored in this receipt.\n`;
    content += `- Warning: If you lose the password, this file cannot be decrypted.\n`;
    content += "==================================================\n";

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Save receipt filename based on result name
    let receiptName = (item.resultName || item.name) + "_receipt.txt";
    a.download = receiptName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// Run bootstrapper
window.addEventListener("DOMContentLoaded", () => {
    init();

    // Mode Switcher logic
    const navModePersonal = document.getElementById("nav-mode-personal");
    const navModeCase = document.getElementById("nav-mode-case");
    const personalVaultContainer = document.getElementById("personal-vault-container");
    const caseVaultContainer = document.getElementById("case-vault-container");
    const queueCard = document.getElementById("queue-card");
    
    if (navModePersonal && navModeCase) {
        navModePersonal.addEventListener("click", () => {
            navModePersonal.classList.add("active");
            navModeCase.classList.remove("active");
            
            navModePersonal.style.color = "var(--text-primary)";
            navModeCase.style.color = "var(--text-secondary)";

            personalVaultContainer.style.display = "grid";
            caseVaultContainer.style.display = "none";
            queueCard.style.display = "block";
            
            // Re-render history if needed
            window.historyManager.render();
        });

        navModeCase.addEventListener("click", () => {
            navModeCase.classList.add("active");
            navModePersonal.classList.remove("active");
            
            navModeCase.style.color = "var(--text-primary)";
            navModePersonal.style.color = "var(--text-secondary)";

            personalVaultContainer.style.display = "none";
            caseVaultContainer.style.display = "block";
            queueCard.style.display = "none";
            
            if (window.casesUI && !window.casesUI.initialized) {
                window.casesUI.init();
            } else if (window.casesUI) {
                // Refresh dashboard when switching back
                window.casesUI.showDashboard();
            }
        });
    }
});

// === PHASE 4 MOCK LOGIC ===
let currentMockDocBlob = null;
let currentMockDocMetadata = null;
let currentDecryptedBlobUrl = null;

// Helper to expose the mock UI for testing
window.showPhase4Mock = function(docId) {
    document.getElementById("mock-doc-view").style.display = "block";
    document.getElementById("mock-doc-id").innerText = docId;
    window.mockDocId = docId;
};

document.addEventListener("DOMContentLoaded", () => {
    const btnMockOpen = document.getElementById("btn-mock-open");
    const btnMockSign = document.getElementById("btn-mock-sign");
    if (!btnMockOpen) return;

    btnMockOpen.addEventListener("click", async () => {
        try {
            const caseId = window.activeCaseId;
            const docId = window.mockDocId;
            const userId = window.accounts.getCurrentUser();
            
            if (!caseId || !docId || !userId) {
                showToast("error", "Missing context for test.");
                return;
            }

            await window.signatures.init(userId);

            const verSpan = document.getElementById("mock-doc-verification");
            verSpan.innerText = "Checking...";
            verSpan.style.color = "orange";

            // 1. Fetch doc metadata
            const res = await fetch(`${API_BASE}/cases/${caseId}/documents/${docId}`, {
                headers: { 'x-user-id': userId }
            });
            if (!res.ok) throw new Error("Failed to fetch document metadata");
            const data = await res.json();
            currentMockDocMetadata = data.metadata;
            const currentMockDocWrappedKey = data.wrapped_key;

            // Fetch case members to get uploader's public key
            const caseRes = await fetch(`${API_BASE}/cases/${caseId}`, {
                headers: { 'x-user-id': userId }
            });
            if (!caseRes.ok) throw new Error("Failed to fetch case details");
            const caseData = await caseRes.json();
            const uploader = caseData.members.find(m => m.user_id === currentMockDocMetadata.uploaded_by);
            if (!uploader || !uploader.public_key) throw new Error("Uploader public key not found");
            const uploaderPublicKey = uploader.public_key;

            // 2. Fetch doc blob (the ciphertext)
            const blobRes = await fetch(`${API_BASE}/cases/${caseId}/documents/${docId}/download`, {
                headers: { 'x-user-id': userId }
            });
            if (!blobRes.ok) throw new Error("Failed to fetch document blob");
            currentMockDocBlob = await blobRes.blob();

            // 3. Verify signature if present
            let isValid = true;
            if (currentMockDocMetadata.signature) {
                isValid = await window.signatures.verifyBlob(
                    currentMockDocBlob,
                    currentMockDocMetadata.signature,
                    currentMockDocMetadata.signer_public_key
                );

                if (isValid) {
                    verSpan.innerText = `Verified — signed by ${currentMockDocMetadata.signer_id}, unchanged since ${currentMockDocMetadata.uploaded_at}`;
                    verSpan.style.color = "green";
                } else {
                    verSpan.innerText = "FAILED — Document has been modified or signature is invalid!";
                    verSpan.style.color = "red";
                }
            } else {
                verSpan.innerText = "No signature present (Draft)";
                verSpan.style.color = "gray";
            }

            // Clean up previous blob URL
            if (currentDecryptedBlobUrl) {
                URL.revokeObjectURL(currentDecryptedBlobUrl);
                currentDecryptedBlobUrl = null;
            }

            const contentContainer = document.getElementById("mock-doc-content-container");
            const btnDownload = document.getElementById("btn-mock-download-decrypted");
            contentContainer.style.display = "none";
            btnDownload.style.display = "none";

            // If signature is invalid, do not attempt to decrypt
            if (!isValid) {
                return;
            }

            // 4. Decrypt Document
            verSpan.innerText += " | Decrypting...";
            
            await window.keywrap.init(userId);
            const perDocumentKeyString = await window.keywrap.unwrapKey(currentMockDocWrappedKey, uploaderPublicKey);

            const worker = new Worker("worker.js");
            const chunks = [];
            let decryptedName = null;
            let decryptedType = null;

            worker.postMessage({
                action: "DECRYPT",
                file: currentMockDocBlob,
                password: perDocumentKeyString,
                compress: false,
                hint: "",
                fileHandle: null
            });

            worker.onmessage = (e) => {
                const wData = e.data;
                if (wData.type === "METADATA") {
                    decryptedName = wData.metadata.name;
                    decryptedType = wData.metadata.type;
                } else if (wData.type === "CHUNK") {
                    chunks.push(new Uint8Array(wData.chunk));
                } else if (wData.type === "SUCCESS") {
                    worker.terminate();
                    
                    const fullBlob = new Blob(chunks, { type: decryptedType || "application/octet-stream" });
                    currentDecryptedBlobUrl = URL.createObjectURL(fullBlob);

                    verSpan.innerText = verSpan.innerText.replace(" | Decrypting...", " | Decrypted Successfully");
                    contentContainer.style.display = "block";
                    btnDownload.style.display = "block";

                    // Handle inline rendering
                    if (decryptedType && decryptedType.startsWith("image/")) {
                        contentContainer.innerHTML = `<img src="${currentDecryptedBlobUrl}" style="max-width: 100%; max-height: 400px; border-radius: 4px;">`;
                    } else if (decryptedType === "application/pdf") {
                        contentContainer.innerHTML = `<embed src="${currentDecryptedBlobUrl}" type="application/pdf" width="100%" height="400px" />`;
                    } else if (decryptedType && decryptedType.startsWith("text/")) {
                        // For text we could read it, but an iframe is safer
                        contentContainer.innerHTML = `<iframe src="${currentDecryptedBlobUrl}" style="width: 100%; height: 400px; background: white; border: none; border-radius: 4px;"></iframe>`;
                    } else {
                        contentContainer.innerHTML = `<p style="color: white; margin: 20px;">Preview not available for this file type (${decryptedType}). Please download.</p>`;
                    }

                    // Setup download button
                    btnDownload.onclick = () => {
                        const a = document.createElement("a");
                        a.href = currentDecryptedBlobUrl;
                        a.download = decryptedName || "decrypted_document";
                        a.click();
                    };
                } else if (wData.type === "ERROR") {
                    worker.terminate();
                    verSpan.innerText = verSpan.innerText.replace(" | Decrypting...", " | DECRYPTION FAILED (Wrong Key or Tampered data)");
                    verSpan.style.color = "red";
                    showToast("error", "Decryption failed: " + wData.message);
                }
            };
            
            worker.onerror = (err) => {
                worker.terminate();
                showToast("error", "Worker crashed during decryption");
            };
        } catch (e) {
            console.error(e);
            showToast("error", e.message);
        }
    });

    btnMockSign.addEventListener("click", async () => {
        try {
            const caseId = window.activeCaseId;
            const docId = window.mockDocId;
            const userId = window.accounts.getCurrentUser();

            if (!currentMockDocBlob) {
                showToast("error", "Open document first!");
                return;
            }

            await window.signatures.init(userId);
            const signatureHex = await window.signatures.signBlob(currentMockDocBlob);

            const res = await fetch(`${API_BASE}/cases/${caseId}/documents/${docId}/sign`, {
                method: 'PATCH',
                headers: { 
                    'x-user-id': userId,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ signature: signatureHex })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to sign");
            }

            showToast("success", "Document finalized and signed!");
            // Re-open to verify
            btnMockOpen.click();

        } catch (e) {
            console.error(e);
            showToast("error", e.message);
        }
    });
});

