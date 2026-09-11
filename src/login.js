const keyInput = document.getElementById("key");
const rememberBox = document.getElementById("remember");
const btn = document.getElementById("signin");
const errBox = document.getElementById("error");

const saved = localStorage.getItem("jrz_key");
if (saved) keyInput.value = saved;

async function trySignIn() {
  errBox.textContent = "";
  const val = keyInput.value.trim();
  if (!val) {
    errBox.textContent = "Enter your license key.";
    return;
  }
  btn.disabled = true;
  btn.textContent = "Checking...";

  const result = await window.jrz.checkKey(val);

  if (!result.ok) {
    btn.disabled = false;
    btn.textContent = "Sign In";
    errBox.textContent = result.error || "Invalid key.";
    return;
  }

  if (rememberBox.checked) {
    localStorage.setItem("jrz_key", val);
  } else {
    localStorage.removeItem("jrz_key");
  }

  await window.jrz.authSuccess();
}

btn.addEventListener("click", trySignIn);
keyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") trySignIn();
});

// ---------- Key generator ----------
const genLink = document.getElementById("genLink");
const genPanel = document.getElementById("genPanel");
const genOwner = document.getElementById("genOwner");
const genBtn = document.getElementById("genBtn");
const genResult = document.getElementById("genResult");

genLink.addEventListener("click", (e) => {
  e.preventDefault();
  genPanel.style.display = genPanel.style.display === "none" ? "block" : "none";
});

genBtn.addEventListener("click", async () => {
  genBtn.disabled = true;
  genBtn.textContent = "Generating...";
  const result = await window.jrz.generateKey(genOwner.value.trim());
  genBtn.disabled = false;
  genBtn.textContent = "Generate";

  if (result.ok) {
    genResult.innerHTML = `
      <div style="background:#0f0f12;border:1px solid var(--border);border-radius:8px;padding:8px 10px;display:flex;justify-content:space-between;align-items:center;gap:8px">
        <span style="color:var(--good);font-family:monospace">${result.key}</span>
        <button id="copyBtn" class="btn" style="padding:4px 10px">Copy</button>
      </div>`;
    document.getElementById("copyBtn").addEventListener("click", () => {
      navigator.clipboard.writeText(result.key);
      document.getElementById("copyBtn").textContent = "Copied!";
    });
    genOwner.value = "";
  }
});
