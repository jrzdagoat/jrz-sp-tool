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
