/* ==========================================
   ACCOUNTS (LOG IN / SIGN UP)
   Stored in this browser's localStorage.
========================================== */

const USERS_KEY = "negosyouth_users";
const SESSION_KEY = "negosyouth_session";

const introStartButton = document.getElementById("introStartButton");
const authOverlay = document.getElementById("authOverlay");
const authForm = document.getElementById("authForm");
const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authSwitch = document.getElementById("authSwitch");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const authUsername = document.getElementById("authUsername");
const authPassword = document.getElementById("authPassword");
const authConfirm = document.getElementById("authConfirm");
const confirmField = document.getElementById("confirmField");
const authError = document.getElementById("authError");
const authSubmit = document.getElementById("authSubmit");
const authClose = document.getElementById("authClose");
const togglePw = document.getElementById("togglePw");
const navAccount = document.getElementById("navAccount");
const introGreeting = document.getElementById("introGreeting");
const heroContent = document.querySelector(".hero-content");
const businessPicker = document.getElementById("businessPicker");
const gameLayout = document.getElementById("gameLayout");
const businessCards = document.querySelectorAll(".business-card");

let currentUser = null;
let authMode = "login";
let authBusy = false;

function loadUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function saveUsers(users) {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        return true;
    } catch (e) {
        return false;
    }
}

function makeSalt() {
    const bytes = new Uint8Array(8);

    if (window.crypto && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
    }

    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
    const text = salt + ":" + password;

    if (window.crypto && crypto.subtle) {
        const buffer = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(text)
        );

        return Array.from(
            new Uint8Array(buffer),
            b => b.toString(16).padStart(2, "0")
        ).join("");
    }

    // Fallback for browsers without SubtleCrypto
    let hash = 5381;

    for (const ch of text) {
        hash = ((hash << 5) + hash + ch.charCodeAt(0)) >>> 0;
    }

    return "f" + hash.toString(16);
}

function showAuthError(message) {
    authError.textContent = message;
    authError.hidden = false;

    authError.classList.remove("shake");
    void authError.offsetWidth;
    authError.classList.add("shake");
}

function clearAuthError() {
    authError.hidden = true;
    authError.textContent = "";
}

function setAuthMode(mode) {
    authMode = mode;

    const signup = mode === "signup";

    tabLogin.classList.toggle("active", !signup);
    tabSignup.classList.toggle("active", signup);

    tabLogin.setAttribute("aria-selected", String(!signup));
    tabSignup.setAttribute("aria-selected", String(signup));

    confirmField.hidden = !signup;

    authTitle.textContent = signup ? "NEW PLAYER" : "PLAYER LOGIN";

    authSubtitle.textContent = signup
        ? "Create your account to get started."
        : "Log in to continue your business journey.";

    authSubmit.textContent = signup ? "CREATE ACCOUNT" : "LOG IN";

    authPassword.autocomplete = signup ? "new-password" : "current-password";

    authSwitch.innerHTML = signup
        ? 'Already have an account? <button type="button" data-mode="login">Log in</button>'
        : 'New here? <button type="button" data-mode="signup">Sign up</button>';

    clearAuthError();
}

function openAuth(mode) {
    setAuthMode(mode);

    authForm.reset();

    authPassword.type = "password";
    authConfirm.type = "password";
    togglePw.textContent = "👁";

    authOverlay.classList.add("show");
    authOverlay.setAttribute("aria-hidden", "false");

    setTimeout(() => authUsername.focus(), 120);
}

function closeAuth() {
    authOverlay.classList.remove("show");
    authOverlay.setAttribute("aria-hidden", "true");
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    if (authBusy) return;

    clearAuthError();

    const name = authUsername.value.trim();
    const password = authPassword.value;
    const key = name.toLowerCase();

    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
        showAuthError("Username must be 3–16 characters: letters, numbers or underscore.");
        authUsername.focus();
        return;
    }

    if (password.length < 6) {
        showAuthError("Password must be at least 6 characters.");
        authPassword.focus();
        return;
    }

    authBusy = true;
    authSubmit.disabled = true;

    try {
        const users = loadUsers();

        if (authMode === "signup") {
            if (password !== authConfirm.value) {
                showAuthError("Passwords don't match. Type the same password in both fields.");
                authConfirm.focus();
                return;
            }

            if (users[key]) {
                showAuthError("That username is taken. Try another one or log in.");
                authUsername.focus();
                return;
            }

            const salt = makeSalt();

            users[key] = {
                name,
                salt,
                hash: await hashPassword(password, salt),
                createdAt: Date.now(),
                lastLogin: Date.now()
            };

            if (!saveUsers(users)) {
                showAuthError("This browser can't save your account. Turn off private mode and try again.");
                return;
            }
        } else {
            const user = users[key];

            const hash = user
                ? await hashPassword(password, user.salt)
                : null;

            if (!user || hash !== user.hash) {
                showAuthError("Wrong username or password.");
                return;
            }

            user.lastLogin = Date.now();
            saveUsers(users);
        }

        try {
            localStorage.setItem(SESSION_KEY, key);
        } catch (e) {}

        currentUser = key;

        updateAccountUI();
        closeAuth();
    } finally {
        authBusy = false;
        authSubmit.disabled = false;
    }
}

function getUser() {
    return currentUser ? loadUsers()[currentUser] : null;
}

function updateAccountUI() {
    const user = getUser();

    navAccount.innerHTML = "";

    if (user) {
        const chip = document.createElement("span");
        chip.className = "nav-chip";
        chip.textContent = "👤 " + user.name;

        const out = document.createElement("button");
        out.type = "button";
        out.className = "nav-link-button";
        out.textContent = "LOG OUT";
        out.addEventListener("click", logOut);

        if (user.business) {
            const change = document.createElement("button");
            change.type = "button";
            change.className = "nav-link-button";
            change.textContent = "CHANGE BUSINESS";
            change.addEventListener("click", () => setBusiness(null));

            navAccount.append(chip, change, out);
        } else {
            navAccount.append(chip, out);
        }

        introGreeting.textContent = "WELCOME BACK, " + user.name.toUpperCase();
        heroContent.hidden = true;

        // Pick a business first, then show the game layout
        businessPicker.hidden = Boolean(user.business);
        gameLayout.hidden = !user.business;
    } else {
        const login = document.createElement("button");
        login.type = "button";
        login.className = "nav-link-button";
        login.textContent = "LOG IN";
        login.addEventListener("click", () => openAuth("login"));

        const signup = document.createElement("button");
        signup.type = "button";
        signup.className = "nav-link-button solid";
        signup.textContent = "SIGN UP";
        signup.addEventListener("click", () => openAuth("signup"));

        navAccount.append(login, signup);

        introGreeting.textContent = "WELCOME TO THE GAME";
        heroContent.hidden = false;
        businessPicker.hidden = true;
        gameLayout.hidden = true;
    }
}

function setBusiness(choice) {
    const users = loadUsers();

    if (!currentUser || !users[currentUser]) return;

    users[currentUser].business = choice;
    saveUsers(users);

    updateAccountUI();
}

function logOut() {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch (e) {}

    currentUser = null;
    updateAccountUI();
}

/* ==========================================
   EVENTS
========================================== */

introStartButton.addEventListener("click", () => openAuth("login"));

businessCards.forEach(card => {
    card.addEventListener("click", () => setBusiness(card.dataset.business));
});

authForm.addEventListener("submit", handleAuthSubmit);

tabLogin.addEventListener("click", () => setAuthMode("login"));
tabSignup.addEventListener("click", () => setAuthMode("signup"));

authSwitch.addEventListener("click", event => {
    const button = event.target.closest("button[data-mode]");

    if (button) {
        setAuthMode(button.dataset.mode);
        authForm.reset();
        authUsername.focus();
    }
});

authClose.addEventListener("click", closeAuth);

authOverlay.addEventListener("click", event => {
    if (event.target === authOverlay) closeAuth();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && authOverlay.classList.contains("show")) {
        closeAuth();
    }
});

togglePw.addEventListener("click", () => {
    const show = authPassword.type === "password";

    authPassword.type = show ? "text" : "password";
    authConfirm.type = show ? "text" : "password";

    togglePw.textContent = show ? "🙈" : "👁";
    togglePw.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

// Restore a saved session
try {
    const saved = localStorage.getItem(SESSION_KEY);

    if (saved && loadUsers()[saved]) {
        currentUser = saved;
    }
} catch (e) {}

updateAccountUI();

/* ==========================================
   SCREEN VIDEO SPEED
========================================== */

const screenVideo = document.querySelector(".screen-video");

if (screenVideo) {
    screenVideo.defaultPlaybackRate = 0.7;
    screenVideo.playbackRate = 0.7;

    // Re-apply in case the browser resets it when the video loads
    screenVideo.addEventListener("loadedmetadata", () => {
        screenVideo.playbackRate = 0.7;
    });
}
