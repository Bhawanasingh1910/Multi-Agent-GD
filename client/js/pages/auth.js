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

    authForm.addEventListener("submit", (event) => {

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

        authForm.reset();

        window.location.href = "dashboard.html";

    });

    // ==========================
    // Default Screen
    // ==========================

    showLogin();

});