/* =========================================================
   AUTH JAVASCRIPT
========================================================= */
// SANDHU JII
/* =========================================================
   PAGE READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupPasswordToggles();


        const loginForm =
            document.getElementById(
                "loginForm"
            );


        const signupForm =
            document.getElementById(
                "signupForm"
            );


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                handleLogin
            );

        }


        if (signupForm) {

            signupForm.addEventListener(
                "submit",
                handleSignup
            );

        }

    }
);
// SANDHU JIIIII

/* =========================================================
   PASSWORD TOGGLE
========================================================= */

function setupPasswordToggles() {

    document
        .querySelectorAll(
            ".password-toggle"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        const targetId =
                            button.dataset.target;


                        const input =
                            document.getElementById(
                                targetId
                            );


                        const icon =
                            button.querySelector(
                                "i"
                            );


                        if (
                            input.type ===
                            "password"
                        ) {

                            input.type =
                                "text";

                            icon.className =
                                "fa-regular fa-eye-slash";

                        } else {

                            input.type =
                                "password";

                            icon.className =
                                "fa-regular fa-eye";

                        }

                    }
                );

            }
        );

}

// SANDHU JI
/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(
    event
) {

    event.preventDefault();


    const email =
        document
            .getElementById("email")
            .value
            .trim();


    const password =
        document
            .getElementById("password")
            .value;


    if (!email || !password) {

        showAuthMessage(
            "Please fill in all fields.",
            "error"
        );

        return;

    }


    await submitAuth(
        "/api/login",
        {
            email,
            password
        },
        "Logging in..."
    );

}


/* =========================================================
   SIGNUP
========================================================= */

async function handleSignup(
    event
) {

    event.preventDefault();


    const name =
        document
            .getElementById("name")
            .value
            .trim();


    const email =
        document
            .getElementById("email")
            .value
            .trim();


    const password =
        document
            .getElementById("password")
            .value;


    const confirmPassword =
        document
            .getElementById(
                "confirmPassword"
            )
            .value;
// SANDHU

    if (
        password !==
        confirmPassword
    ) {

        showAuthMessage(
            "Passwords do not match.",
            "error"
        );

        return;

    }


    if (password.length < 6) {

        showAuthMessage(
            "Password must contain at least 6 characters.",
            "error"
        );

        return;

    }


    await submitAuth(
        "/api/signup",
        {
            name,
            email,
            password
        },
        "Creating account..."
    );

}


/* =========================================================
   AUTH REQUEST
========================================================= */

async function submitAuth(
    url,
    payload,
    loadingText
) {

    const form =
        document.querySelector(
            ".auth-card form"
        );


    const button =
        form?.querySelector(
            ".primary-btn"
        );


    if (!button) return;


    const originalHTML =
        button.innerHTML;


    button.disabled =
        true;

// SANDHU JI
    button.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        ${loadingText}

    `;


    try {

        const response =
            await fetch(
                url,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Something went wrong."
            );

        }


        showAuthMessage(
            data.message,
            "success"
        );


        setTimeout(
            () => {

                window.location.href =
                    "/";

            },
            700
        );
// SANDHU

    } catch (error) {

        showAuthMessage(
            error.message,
            "error"
        );


        button.disabled =
            false;


        button.innerHTML =
            originalHTML;

    }

}


/* =========================================================
   MESSAGE
========================================================= */
// SANDHU
function showAuthMessage(
    message,
    type
) {

    const box =
        document.getElementById(
            "authMessage"
        );


    if (!box) return;


    box.textContent =
        message;


    box.className =
        `form-message ${type}`;

}