// ==========================================
// Multi-Agent GD
// Authentication Page
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // ==========================
    // DOM Elements
    // ==========================

    const loginTab = document.getElementById("login-tab");
    const signupTab = document.getElementById("signup-tab");

    const authTitle = document.getElementById("auth-title");
    const authSubtitle = document.getElementById("auth-subtitle");

    const submitBtn = document.getElementById("submit-btn");

    const bottomMessage = document.getElementById("bottom-message");
    const bottomLink = document.getElementById("bottom-link");

    const nameGroup = document.getElementById("name-group");
    const confirmPasswordGroup = document.getElementById("confirm-password-group");

    const forgotPassword = document.getElementById("forgot-password");

    const fullName = document.getElementById("full-name");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirm-password");

    const togglePassword = document.getElementById("toggle-password");
    const toggleConfirmPassword = document.getElementById("toggle-confirm-password");

    const errorMessage = document.getElementById("error-message");

    const authForm = document.getElementById("auth-form");

    // ==========================
    // Current Mode
    // ==========================

    let isLogin = true;

    // ==========================
    // Login Mode
    // ==========================

    function showLogin() {

        isLogin = true;

        loginTab.classList.add("active");
        signupTab.classList.remove("active");

        authTitle.textContent = "Welcome Back 👋";
        authSubtitle.textContent =
            "Login to continue your GD practice.";

        submitBtn.textContent = "Login";

        bottomMessage.textContent =
            "Don't have an account?";

        bottomLink.textContent =
            "Create Account";

        nameGroup.style.display = "none";
        confirmPasswordGroup.style.display = "none";

        forgotPassword.style.display = "inline";

        clearError();

    }

    // ==========================
    // Signup Mode
    // ==========================

    function showSignup() {

        isLogin = false;

        signupTab.classList.add("active");
        loginTab.classList.remove("active");

        authTitle.textContent = "Create Account";

        authSubtitle.textContent =
            "Create your account to start practicing.";

        submitBtn.textContent = "Sign Up";

        bottomMessage.textContent =
            "Already have an account?";

        bottomLink.textContent =
            "Login";

        nameGroup.style.display = "block";
        confirmPasswordGroup.style.display = "block";

        forgotPassword.style.display = "none";

        clearError();

    }

    // ==========================
    // Password Visibility
    // ==========================

    function toggleVisibility(input, icon) {

        if (input.type === "password") {

            input.type = "text";

            icon.classList.remove("fa-eye");
            icon.classList.add("fa-eye-slash");

        }

        else {

            input.type = "password";

            icon.classList.remove("fa-eye-slash");
            icon.classList.add("fa-eye");

        }

    }

    togglePassword.addEventListener("click", () => {

        toggleVisibility(password, togglePassword);

    });

    toggleConfirmPassword.addEventListener("click", () => {

        toggleVisibility(confirmPassword, toggleConfirmPassword);

    });

    // ==========================
    // Tabs
    // ==========================

    loginTab.addEventListener("click", showLogin);

    signupTab.addEventListener("click", showSignup);

    bottomLink.addEventListener("click", (event) => {

        event.preventDefault();

        if (isLogin) {

            showSignup();

        }

        else {

            showLogin();

        }

    });

    // ==========================
    // Validation
    // ==========================

    function showError(message) {

        errorMessage.textContent = message;

    }

    function clearError() {

        errorMessage.textContent = "";

    }

    function validEmail(email) {

        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        return regex.test(email);

    }

    // ==========================
    // Form Submit
    // ==========================

    authForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        clearError();

        const name = fullName.value.trim();

        const userEmail = email.value.trim();

        const userPassword = password.value.trim();

        const confirm = confirmPassword.value.trim();

        if (!validEmail(userEmail)) {

            showError("Please enter a valid email.");

            return;

        }

        if (userPassword.length < 6) {

            showError("Password must contain at least 6 characters.");

            return;

        }

        if (!isLogin) {

            if (name === "") {

                showError("Please enter your full name.");

                return;

            }

            if (confirm !== userPassword) {

                showError("Passwords do not match.");

                return;

            }

        }

        // ---- Real login / signup through the server (MongoDB) ----

        try {

            submitBtn.disabled = true;

            const result = await apiRequest(
                "POST",
                isLogin ? "/api/auth/login" : "/api/auth/signup",
                isLogin
                    ? { email: userEmail, password: userPassword }
                    : { name, email: userEmail, password: userPassword }
            );

            if (!result.success) {

                showError(result.message || "Something went wrong. Try again.");

                return;
            }

            Store.logout();                       // clear any old local data
            Store.setToken(result.token);
            Store.setUser(result.user, true);

            await Store.pullSessions();           // load this user's history

            sessionStorage.setItem("gdSynced", "1");
        }

        catch (err) {

            showError("Cannot reach the server. Make sure it is running.");

            return;
        }

        finally {

            submitBtn.disabled = false;
        }

        authForm.reset();

        window.location.href = "dashboard.html";

    });

    // ==========================
    // Forgot password / Google
    // ==========================

    forgotPassword.addEventListener("click", (event) => {

        event.preventDefault();

        showError("Password reset will be available once the API is linked.");

    });

    const googleBtn = document.getElementById("google-btn");

    if (googleBtn) {

        googleBtn.addEventListener("click", (event) => {

            event.preventDefault();

            showError("Google sign-in will be available once the API is linked.");

        });
    }

    // ==========================
    // Default Screen
    // ==========================

    // Already logged in -> go straight to the dashboard
    if (Store.getUser() && Store.getToken()) {

        window.location.href = "dashboard.html";

        return;
    }

    // index.html "Sign up" buttons link here with #signup
    function showFromHash() {

        if (window.location.hash === "#signup") {

            showSignup();

        }

        else {

            showLogin();

        }
    }

    window.addEventListener("hashchange", showFromHash);

    showFromHash();

});