/* =========================================================
   CONTACT FORM
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "contactForm"
            );


        if (!form) return;


        form.addEventListener(
            "submit",
            submitContact
        );

    }
);


/* =========================================================
   SUBMIT
========================================================= */

async function submitContact(
    event
) {

    event.preventDefault();


    const name =
        document
            .getElementById(
                "contactName"
            )
            .value
            .trim();


    const email =
        document
            .getElementById(
                "contactEmail"
            )
            .value
            .trim();


    const subject =
        document
            .getElementById(
                "contactSubject"
            )
            .value
            .trim();


    const message =
        document
            .getElementById(
                "contactBody"
            )
            .value
            .trim();


    if (
        !name ||
        !email ||
        !subject ||
        !message
    ) {

        showContactMessage(
            "Please fill in all fields.",
            "error"
        );

        return;

    }


    const button =
        form.querySelector(
            ".primary-btn"
        );


    const originalHTML =
        button.innerHTML;


    button.disabled =
        true;


    button.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        Sending...

    `;


    try {

        const response =
            await fetch(
                "/api/contact",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            name,

                            email,

                            subject,

                            message

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to send message."
            );

        }


        showContactMessage(
            data.message,
            "success"
        );


        form.reset();


    } catch (error) {

        showContactMessage(
            error.message,
            "error"
        );


    } finally {

        button.disabled =
            false;


        button.innerHTML =
            originalHTML;

    }

}


/* =========================================================
   MESSAGE
========================================================= */

function showContactMessage(
    message,
    type
) {

    const box =
        document.getElementById(
            "contactMessage"
        );


    if (!box) return;


    box.textContent =
        message;


    box.className =
        `form-message ${type}`;

}