const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

const checks = [
  ["Accueil", "/", 200],
  ["Connexion client", "/client/account", 200],
  ["Connexion avocat", "/lawyer/account", 200],
  ["Santé API", "/api/health", 200],
  ["Avocats publics", "/api/lawyers", 200],
  ["Compte avocat protégé", "/api/account", 401],
  ["Compte client protégé", "/api/client/account", 401],
];

let failed = false;
for (const [label, path, expected] of checks) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  const ok = response.status === expected;
  console.log(`${ok ? "✓" : "✗"} ${label}: ${response.status} (attendu ${expected})`);
  failed ||= !ok;
}

const csrf = await fetch(`${baseUrl}/api/client/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: "https://example.invalid" },
  body: JSON.stringify({ email: "nobody@example.invalid", password: "invalid" }),
});
console.log(`${csrf.status === 403 ? "✓" : "✗"} Protection inter-origines: ${csrf.status} (attendu 403)`);
failed ||= csrf.status !== 403;

const home = await fetch(`${baseUrl}/`);
const expectedHeaders = [
  "content-security-policy",
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
];
for (const header of expectedHeaders) {
  const ok = Boolean(home.headers.get(header));
  console.log(`${ok ? "✓" : "✗"} En-tête ${header}`);
  failed ||= !ok;
}

if (failed) process.exit(1);
