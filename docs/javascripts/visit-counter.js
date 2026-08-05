document.addEventListener("DOMContentLoaded", () => {
  fetch("https://hackdocsapi.occoru.art/api/hit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: window.location.pathname }),
    keepalive: true, // pour que la requête parte même si l'user quitte vite
  }).catch(() => {}); // on ignore silencieusement les erreurs réseau
});