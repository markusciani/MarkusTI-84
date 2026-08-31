const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const menuDefaults = {
  all: "Tickets", search: "Search", stats: "Stats", about: "System", exit: "Quit"
};
const menuNames = { all: "Tickets", search: "Search", stats: "Stats", about: "System", exit: "Quit" };
const apiBaseUrl = (window.TI_API_BASE_URL || window.location.origin).replace(/\/$/, "");
let sessionToken = sessionStorage.getItem("tiBuilderSession") || "";
let config = null;
let tickets = [];
let generated = null;
let generatedSource = "";
let manualEdited = false;
let activePreview = "menu";
let tiFileEnginePromise = null;
let sheetImportConfigured = false;
const TI_FILE_ENGINE_URL = "https://cdn.jsdelivr.net/gh/adriweb/tivars_lib_cpp@0d3bca2e081a273784e5cc0c139179177e76f969/TIVarsLib.js";

function toast(message, error = false) {
  const element = $("#toast");
  element.textContent = message;
  element.className = `toast show${error ? " error" : ""}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { element.className = "toast"; }, 3400);
}

async function api(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${sessionToken}`, "content-type": "application/json", ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed with HTTP ${response.status}`);
  return body;
}

function setConnected(connected) {
  $("#connectionState").classList.toggle("online", connected);
  $("#connectionState").lastChild.textContent = connected ? " Connected" : " Not connected";
  $("#authCard").classList.toggle("hidden", connected);
  $("#workspace").classList.toggle("hidden", !connected);
}

function option(value, label = value) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function renderConfig() {
  const calculator = $("#calculator");
  calculator.replaceChildren(...config.models.map((model) => option(model.id, model.label)));
  const filterCalculator = $("#filterCalculator");
  filterCalculator.replaceChildren(option("", "All calculators"), ...config.models.map((model) => option(model.id, model.label)));
  const statuses = $("#statusFilters");
  statuses.replaceChildren(...config.statuses.map((status) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = status;
    const text = document.createElement("span");
    text.textContent = status.replace("Ready for Delivery", "Ready").replace("Waiting for Calculator", "Wait Calc").replace("Waiting for User", "Wait User");
    label.append(input, text);
    return label;
  }));
  const template = $("#template");
  template.replaceChildren(option("", "Custom"), ...config.templates.map((item) => option(`builtin:${item.id}`, item.name)));
  loadSavedTemplateOptions();
  $("#databaseCount").textContent = `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`;
  updatePrivacyWarning();
}

function renderMenuInputs() {
  const container = $("#menuLabels");
  for (const [key, value] of Object.entries(menuDefaults)) {
    const label = document.createElement("label");
    label.textContent = menuNames[key];
    const input = document.createElement("input");
    input.dataset.menu = key;
    input.value = value;
    input.maxLength = 26;
    label.append(input);
    container.append(label);
  }
}

async function connect() {
  try {
    let sheetStatus;
    [config, { tickets }, sheetStatus] = await Promise.all([
      api("/api/program-builder/config"), api("/api/program-builder/tickets"), api("/api/google-sheets/status")
    ]);
    window.tickets = tickets;
    sessionStorage.setItem("tiBuilderSession", sessionToken);
    setConnected(true);
    renderConfig();
    renderSheetStatus(sheetStatus);
    toast("Connected to the ticket database");
    await runBuilder("preview", false);
  } catch (error) {
    setConnected(false);
    toast(error.message, true);
  }
}

function renderSheetStatus(status) {
  sheetImportConfigured = Boolean(status.configured);
  $("#sheetSources").replaceChildren(...status.sources.map((source) => {
    const row = document.createElement("div");
    row.innerHTML = "<i></i>";
    row.append(document.createTextNode(source.title));
    return row;
  }));
  $("#sheetSummary").textContent = status.configured
    ? "Ready to import new responses from all three sheets."
    : "Webhook tickets are current. Direct Sheet import needs private Google access, but this button can still refresh the ticket list.";
  $("#syncSheets").disabled = false;
}

function selectedFields() {
  return Object.fromEntries($$("[data-field]").map((input) => [input.dataset.field, input.checked]));
}

function selectedStatuses() {
  return $$("#statusFilters input:checked").map((input) => input.value);
}

function requestPayload() {
  return {
    calculator: $("#calculator").value,
    format: $("#format").value,
    programName: $("#programName").value,
    filters: {
      calculator: $("#filterCalculator").value || undefined,
      statuses: selectedStatuses(),
      dateFrom: $("#dateFrom").value || undefined,
      dateTo: $("#dateTo").value || undefined,
      ticketId: $("#ticketId").value.trim() || undefined,
      ticketIdFrom: $("#ticketIdFrom").value.trim() || undefined,
      ticketIdTo: $("#ticketIdTo").value.trim() || undefined,
      limit: Number($("#limit").value),
      sort: $("#sort").value
    },
    fields: selectedFields(),
    options: {
      title: $("#title").value,
      footer: $("#footer").value,
      menuLabels: Object.fromEntries($$("[data-menu]").map((input) => [input.dataset.menu, input.value]))
    }
  };
}

function renderScreen() {
  if (!generated) return;
  let lines;
  if (activePreview === "ticket" && generated.preview.firstTicket) {
    lines = [generated.preview.firstTicket.ticketId, "", "1 Overview", "2 Games", "3 Programs", "4 Delivery", "5 Details", "6 Back"];
  } else {
    lines = [generated.preview.title, ...generated.preview.menuItems.slice(0, 9).map((item, index) => `${index + 1} ${item}`)];
  }
  $("#screenPreview").textContent = lines.slice(0, 10).join("\n");
}

function renderResult(result) {
  generated = result;
  generatedSource = result.source;
  manualEdited = false;
  $("#sourceEditor").value = result.source;
  $("#editState").textContent = "Generated source";
  $("#editState").classList.remove("edited");
  $("#previewTitle").textContent = result.programName;
  $("#sizeMetric").textContent = `${result.estimatedKilobytes.toFixed(1)} KB`;
  $("#ticketMetric").textContent = result.ticketCount;
  $("#sizeWarning").textContent = result.warning || "";
  $("#sizeWarning").classList.toggle("hidden", !result.warning);
  $("#downloadButton").disabled = false;
  $("#sendToCalculator").disabled = false;
  const evo = $("#calculator").value === "TI-84 Evo";
  $("#sendToCalculator").textContent = evo ? "Download .8xp2 + open TI Connect" : "Download .8xp";
  $("#copySource").disabled = false;
  $("#resetSource").disabled = false;
  renderScreen();
}

async function runBuilder(kind, announce = true) {
  if (manualEdited && !window.confirm("Regenerating will overwrite your manual TI-BASIC edits. Continue?")) return;
  try {
    const result = await api(`/api/program-builder/${kind}`, { method: "POST", body: JSON.stringify(requestPayload()) });
    renderResult(result);
    if (announce) toast(`${kind === "generate" ? "Generated" : "Previewed"} ${result.programName} with ${result.ticketCount} tickets`);
  } catch (error) { toast(error.message, true); }
}

function downloadSource() {
  if (!generated) return;
  const source = $("#sourceEditor").value;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([source], { type: "text/plain;charset=utf-8" }));
  link.download = generated.fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  toast(`Downloaded ${generated.fileName}${manualEdited ? " with manual edits" : ""}`);
}

async function tiFileEngine() {
  if (!tiFileEnginePromise) {
    tiFileEnginePromise = import(TI_FILE_ENGINE_URL).then(({ default: createEngine }) => createEngine({
      noInitialRun: true, print: () => {}, printErr: () => {}
    }));
  }
  return tiFileEnginePromise;
}

function engineSource() {
  return $("#sourceEditor").value.replace(/\r\n?/g, "\n")
    .split("\n").map((line) => line.replace(/^(\s*):/, "$1")).join("\n").replace(/\n+$/, "");
}

function readEngineFile(engine, path) {
  const data = engine.FS.readFile(path, { encoding: "binary" });
  return data instanceof Uint8Array ? data : Uint8Array.from(data, (character) => character.charCodeAt(0) & 0xff);
}

async function buildCalculatorFile() {
  if (!generated) throw new Error("Generate a program first");
  const engine = await tiFileEngine();
  const evo = $("#calculator").value === "TI-84 Evo";
  const extension = evo ? "8xp2" : "8xp";
  const targetModel = evo ? "84Evo" : "84+CE";
  const path = `/builder-${Date.now()}.${extension}`;
  const verifyPath = `/verify-${Date.now()}.${extension}`;
  let program;
  let verified;
  try {
    program = engine.TIVarFile.createNew("Program", generated.programName, targetModel);
    program.setContentFromString(engineSource());
    const rawHex = program.getRawContentHexStr();
    const savedPath = program.saveVarToFile("", path.replace(/^\//, "").replace(/\.[^.]+$/, ""));
    const bytes = readEngineFile(engine, savedPath);
    engine.FS.writeFile(verifyPath, bytes);
    verified = engine.TIVarFile.loadFromFile(verifyPath);
    if (verified.isCorrupt()) throw new Error("The calculator file failed checksum validation");
    if (verified.isEvoFormat() !== evo) throw new Error("The calculator file was created for the wrong model");
    if (verified.getRawContentHexStr() !== rawHex) throw new Error("The calculator file failed token verification");
    return { bytes: new Uint8Array(bytes), fileName: `${generated.programName}.${extension}` };
  } finally {
    try { verified?.delete(); } catch { /* already released */ }
    try { program?.delete(); } catch { /* already released */ }
    for (const candidate of [path, verifyPath]) {
      try { engine.FS.unlink(candidate); } catch { /* virtual file was named differently or already removed */ }
    }
  }
}

async function downloadCalculatorFile() {
  const artifact = await buildCalculatorFile();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([artifact.bytes], { type: "application/octet-stream" }));
  link.download = artifact.fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  return artifact.fileName;
}

async function openTiConnect() {
  if (!generated) return;
  const evo = $("#calculator").value === "TI-84 Evo";
  if (evo) window.open("https://connectevo.ti.com/ticevo/en/", "_blank", "noopener");
  $("#sendToCalculator").disabled = true;
  try {
    const fileName = await downloadCalculatorFile();
    toast(evo ? `${fileName} is ready. Select it in TI Connect and send it over USB.` : `Downloaded calculator-ready ${fileName}`);
  } catch (error) {
    toast(`${error.message}. Downloading TI-BASIC source instead.`, true);
    downloadSource();
  } finally {
    $("#sendToCalculator").disabled = false;
  }
}

function currentTemplateConfig() {
  return requestPayload();
}

function savedTemplates() {
  try { return JSON.parse(localStorage.getItem("tiBuilderTemplates") || "[]"); }
  catch { return []; }
}

function loadSavedTemplateOptions() {
  const select = $("#template");
  [...select.options].filter((item) => item.value.startsWith("saved:")).forEach((item) => item.remove());
  savedTemplates().forEach((item) => select.append(option(`saved:${item.id}`, `${item.name} (Saved)`)));
}

function applyTemplate(templateConfig) {
  const filters = templateConfig.filters || {};
  $("#filterCalculator").value = filters.calculator || "";
  $("#limit").value = filters.limit || 20;
  $("#dateFrom").value = filters.dateFrom || "";
  $("#dateTo").value = filters.dateTo || "";
  $("#ticketId").value = filters.ticketId || "";
  $("#ticketIdFrom").value = filters.ticketIdFrom || "";
  $("#ticketIdTo").value = filters.ticketIdTo || "";
  $("#sort").value = filters.sort || "newest";
  $$("#statusFilters input").forEach((input) => { input.checked = (filters.statuses || []).includes(input.value); });
  const fields = templateConfig.fields || {};
  $$("[data-field]").forEach((input) => { input.checked = fields[input.dataset.field] ?? false; });
  if (templateConfig.calculator) $("#calculator").value = templateConfig.calculator;
  if (templateConfig.programName) $("#programName").value = templateConfig.programName;
  if (templateConfig.options) {
    $("#title").value = templateConfig.options.title || "TI Ticket Logs";
    $("#footer").value = templateConfig.options.footer || "Select a menu item";
    $$("[data-menu]").forEach((input) => { input.value = templateConfig.options.menuLabels?.[input.dataset.menu] || menuDefaults[input.dataset.menu]; });
  }
  updatePrivacyWarning();
}

function updatePrivacyWarning() {
  const privateEnabled = $("[data-field=phone]").checked || $("[data-field=email]").checked;
  $("#privacyWarning").classList.toggle("hidden", !privateEnabled);
}

$("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: $("#builderPassword").value })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "Unable to unlock the builder");
    sessionToken = body.token;
    $("#builderPassword").value = "";
    await connect();
  } catch (error) { toast(error.message, true); }
});
$("#previewButton").addEventListener("click", () => runBuilder("preview"));
$("#generateButton").addEventListener("click", () => runBuilder("generate"));
$("#downloadButton").addEventListener("click", downloadSource);
$("#sendToCalculator").addEventListener("click", openTiConnect);
$("#syncSheets").addEventListener("click", async () => {
  const button = $("#syncSheets");
  try {
    button.disabled = true;
    button.textContent = "Refreshing…";
    let message = "Ticket list refreshed from the webhook database";
    if (sheetImportConfigured) {
      const result = await api("/api/google-sheets/import", { method: "POST", body: "{}" });
      message = `Sheets refreshed: ${result.imported} new, ${result.duplicates} already loaded`;
    }
    const [{ tickets: refreshedTickets }, sheetStatus] = await Promise.all([
      api("/api/program-builder/tickets"), api("/api/google-sheets/status")
    ]);
    tickets = refreshedTickets;
    window.tickets = tickets;
    $("#databaseCount").textContent = `${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`;
    renderSheetStatus(sheetStatus);
    await runBuilder("preview", false);
    toast(message);
  } catch (error) {
    toast(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = "Refresh Google Sheets";
  }
});
$("#copySource").addEventListener("click", async () => {
  await navigator.clipboard.writeText($("#sourceEditor").value);
  toast("Source copied to the clipboard");
});
$("#resetSource").addEventListener("click", () => {
  $("#sourceEditor").value = generatedSource;
  manualEdited = false;
  $("#editState").textContent = "Generated source";
  $("#editState").classList.remove("edited");
});
$("#sourceEditor").addEventListener("input", () => {
  manualEdited = $("#sourceEditor").value !== generatedSource;
  $("#editState").textContent = manualEdited ? "Manual edits" : "Generated source";
  $("#editState").classList.toggle("edited", manualEdited);
});
$$("[data-field=phone], [data-field=email]").forEach((input) => input.addEventListener("change", updatePrivacyWarning));
$$("[data-view]").forEach((button) => button.addEventListener("click", () => {
  activePreview = button.dataset.view;
  $$("[data-view]").forEach((item) => item.classList.toggle("active", item === button));
  renderScreen();
}));
$("#template").addEventListener("change", (event) => {
  if (!event.target.value) return;
  const [kind, id] = event.target.value.split(":");
  const selected = kind === "builtin" ? config.templates.find((item) => item.id === id) : savedTemplates().find((item) => item.id === id);
  if (selected) {
    const templateConfig = structuredClone(selected.config);
    if (kind === "builtin" && id === "today") {
      const localNow = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
      templateConfig.filters.dateFrom = localNow;
      templateConfig.filters.dateTo = localNow;
    }
    applyTemplate(templateConfig);
    toast(`Applied ${selected.name}`);
  }
});
$("#saveTemplate").addEventListener("click", () => {
  const name = window.prompt("Template name");
  if (!name?.trim()) return;
  const templates = savedTemplates();
  const item = { id: String(Date.now()), name: name.trim(), config: currentTemplateConfig() };
  templates.push(item);
  localStorage.setItem("tiBuilderTemplates", JSON.stringify(templates));
  loadSavedTemplateOptions();
  $("#template").value = `saved:${item.id}`;
  toast(`Saved template ${item.name}`);
});

renderMenuInputs();
const chromeBrands = navigator.userAgentData?.brands?.map((item) => item.brand) || [];
const isGoogleChrome = chromeBrands.includes("Google Chrome")
  || (/Chrome\//.test(navigator.userAgent) && !/(Edg|OPR|Brave|CriOS)\//.test(navigator.userAgent));
if (!isGoogleChrome) {
  $("#authCard").classList.add("hidden");
  $("#browserBlock").classList.remove("hidden");
} else if (sessionToken) {
  connect();
}
