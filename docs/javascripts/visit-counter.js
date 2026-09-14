document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("exporting") || window.location.protocol === "file:") {
    return; // pas de comptage pendant un export PDF
  }
  const apiUrl = window.STATS_API_URL || "http://localhost:3001";
  fetch(`${apiUrl}/api/hit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: window.location.pathname }),
    keepalive: true, // pour que la requête parte même si l'user quitte vite
  }).catch(() => {}); // on ignore silencieusement les erreurs réseau
});