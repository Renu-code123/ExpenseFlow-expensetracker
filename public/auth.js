// ===================== LOGIN =====================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        try {
            const res = await fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || data.message || "Login failed");

                return;
            }

            // ✅ SAVE AUTH DATA
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // ✅ REDIRECT
            window.location.href = "dashboard.html";

        } catch (err) {
            console.error("Login error:", err);
            alert("Server error during login");
        }
    });
}



// ===================== REGISTER =====================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        function isStrongPassword(password) {
            return (
                password.length >= 8 &&
                /[A-Z]/.test(password) &&
                /[a-z]/.test(password) &&
                /[0-9]/.test(password) &&
                /[^A-Za-z0-9]/.test(password)
            );
        }

        if (!isStrongPassword(password)) {
            alert(
                "Password must contain uppercase, lowercase, number & special character."
            );
            return;
        }

        try {
            const res = await fetch("http://localhost:3000/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Registration failed");
                return;
            }

            // ✅ SAVE TOKEN
            localStorage.setItem("authToken", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // ✅ REDIRECT
            window.location.href = "dashboard.html";

        } catch (err) {
            console.error("Registration error:", err);
            alert("Server error during registration");
        }
    });
}



// ===================== LOGOUT =====================

function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");

    window.location.href = "index.html";
}
