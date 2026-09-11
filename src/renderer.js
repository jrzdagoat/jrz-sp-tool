const slotsContainer = document.getElementById("slots");
const exportBtn = document.getElementById("exportBtn");
const clearAllBtn = document.getElementById("clearAll");
const resourceNameInput = document.getElementById("resourceName");

let SLOTS = [];
const assignments = {}; // slotId -> [{ path, name }]

function renderSlot(slot) {
  const row = document.createElement("div");
  row.className = "slot-row";
  row.innerHTML = `
    <div>
      <div class="slot-title">${slot.label}</div>
      <div class="slot-desc">${slot.desc}</div>
    </div>
    <div class="dropzone" data-slot="${slot.id}">
      <span class="placeholder">Drop a sound here, or click to browse</span>
    </div>
    <div class="slot-meta empty" data-meta="${slot.id}">0 files</div>
  `;

  const zone = row.querySelector(".dropzone");

  zone.addEventListener("click", async () => {
    const files = await window.jrz.pickFiles(true);
    if (files.length) addFiles(slot.id, files);
  });

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files)
      .filter(f => /\.(wav|ogg|mp3)$/i.test(f.name))
      .map(f => ({ path: f.path, name: f.name }));
    if (files.length) addFiles(slot.id, files);
  });

  slotsContainer.appendChild(row);
}

function addFiles(slotId, files) {
  if (!assignments[slotId]) assignments[slotId] = [];
  assignments[slotId].push(...files);
  redrawZone(slotId);
}

function removeFile(slotId, idx) {
  assignments[slotId].splice(idx, 1);
  redrawZone(slotId);
}

function redrawZone(slotId) {
  const zone = document.querySelector(`.dropzone[data-slot="${slotId}"]`);
  const meta = document.querySelector(`[data-meta="${slotId}"]`);
  const files = assignments[slotId] || [];

  zone.innerHTML = "";
  if (!files.length) {
    zone.innerHTML = `<span class="placeholder">Drop a sound here, or click to browse</span>`;
    meta.textContent = "0 files";
    meta.classList.add("empty");
    return;
  }

  files.forEach((f, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${f.name} <button data-idx="${i}">✕</button>`;
    chip.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      removeFile(slotId, i);
    });
    zone.appendChild(chip);
  });

  meta.textContent = `${files.length} file${files.length > 1 ? "s" : ""}`;
  meta.classList.remove("empty");
}

clearAllBtn.addEventListener("click", () => {
  Object.keys(assignments).forEach(id => {
    assignments[id] = [];
    redrawZone(id);
  });
});

exportBtn.addEventListener("click", async () => {
  const total = Object.values(assignments).reduce((n, arr) => n + arr.length, 0);
  if (!total) {
    alert("Assign at least one sound before exporting.");
    return;
  }
  exportBtn.disabled = true;
  exportBtn.textContent = "Building...";

  const result = await window.jrz.buildExport({
    resourceName: resourceNameInput.value.trim() || "jrz_soundpack",
    assignments
  });

  exportBtn.disabled = false;
  exportBtn.textContent = "Export sound pack";

  if (result.canceled) return;
  if (!result.ok) {
    alert("Export failed.");
    return;
  }
  if (confirm(`Packed ${result.fileCount} sound(s) into ${result.path}.\nShow it in your file explorer?`)) {
    window.jrz.showInFolder(result.path);
  }
});

(async () => {
  SLOTS = await window.jrz.getSlots();
  SLOTS.forEach(renderSlot);
})();
