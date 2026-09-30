/* =========================================
   CYBER AWARENESS LAB
   Website JavaScript
========================================= */

/* =========================================
   GITHUB RELEASE CONFIGURATION

   Change EXECUTABLE_FILENAME for future releases, for example:
   Cyber-Awareness-Lab-v1.1.0.exe
========================================= */

const GITHUB_REPOSITORY_URL =
    "https://github.com/anujprajapati2109/Cyber-Awareness-Lab";
const EXECUTABLE_FILENAME = "Cyber-Awareness-Lab-v1.0.4.exe";
const GITHUB_LATEST_RELEASE_URL =
    `${GITHUB_REPOSITORY_URL}/releases/latest`;
const GITHUB_RELEASE_ASSET_URL =
    `${GITHUB_LATEST_RELEASE_URL}/download/${EXECUTABLE_FILENAME}`;

document.querySelectorAll("[data-release-download]").forEach((link) => {
    link.href = GITHUB_RELEASE_ASSET_URL;
});

document.querySelectorAll("[data-github-release-link]").forEach((link) => {
    link.href = GITHUB_LATEST_RELEASE_URL;
});

document.querySelectorAll("[data-github-repository-link]").forEach((link) => {
    link.href = GITHUB_REPOSITORY_URL;
});


/* =========================================
   CURRENT YEAR
========================================= */

const yearElement = document.getElementById("currentYear");

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}


/* =========================================
   DOWNLOAD BUTTON FEEDBACK
========================================= */

const downloadButtons = document.querySelectorAll(
    "[data-release-download]"
);

downloadButtons.forEach((button) => {

    button.addEventListener("click", () => {

        const originalText = button.querySelector("strong");

        if (!originalText) {
            return;
        }

        const originalValue = originalText.textContent;

        originalText.textContent = "Starting download...";

        setTimeout(() => {
            originalText.textContent = originalValue;
        }, 2500);

    });

});


/* =========================================
   SMOOTH SCROLL
========================================= */

document.querySelectorAll('a[href^="#"]').forEach((link) => {

    link.addEventListener("click", (event) => {

        const targetId = link.getAttribute("href");

        if (targetId === "#") {
            return;
        }

        const target = document.querySelector(targetId);

        if (!target) {
            return;
        }

        event.preventDefault();

        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    });

});
