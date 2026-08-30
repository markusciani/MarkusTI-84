const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const menuDefaults = {
  all: "ALL TICKETS", new: "NEW", working: "WORKING", ready: "READY", completed: "COMPLETED",
  search: "SEARCH", stats: "STATS", about: "ABOUT", exit: "EXIT"
};
let apiBaseUrl = sessionStorage.getItem("tiBuilderApiBaseUrl") || window.TI_API_BASE_URL || window.location.origin;
let apiSecret = sessionStorage.getItem("tiBuilderApiSecret") || "";
let config = null;
let tickets = [];
let generated = null;
let generatedSource = "";
let manualEdited = false;
let activePreview = "menu";

function toast(message, error = false) {
  const element = $("#toast");
  element.textContent = message;
  element.className = `toast show${error ? " error" : ""}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { element.className = "toast"; }, 3400);
}

async function api(path, options = {}) {
  const baseUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { authorization: `Bearer ${apiSecret}`, "content-type": "application/json", ...(options.headers || {}) }
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
}

function renderMenuInputs() {
  const container = $("#menuLabels");
  for (const [key, value] of Object.entries(menuDefaults)) {
    const label = document.createElement("label");
    label.textContent = key[0].toUpperCase() + key.slice(1);
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
    [config, { tickets }] = await Promise.all([
      api("/api/program-builder/config"), api("/api/program-builder/tickets")
    ]);
    window.tickets = tickets;
    sessionStorage.setItem("tiBuilderApiSecret", apiSecret);
    setConnected(true);
    renderConfig();
    toast("Connected to the ticket database");
    await runBuilder("preview", false);
  } catch (error) {
    setConnected(false);
    toast(error.message, true);
  }
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
      aboutText: $("#aboutText").value,
      footer: $("#footer").value,
      menuLabels: Object.fromEntries($$("[data-menu]").map((input) => [input.dataset.menu, input.value]))
    }
  };
}

function renderScreen() {
  if (!generated) return;
  let lines;
  if (activePreview === "ticket" && generated.preview.firstTicket) {
    lines = [generated.preview.firstTicket.ticketId, ...generated.preview.firstTicket.lines.slice(0, 8), "<> MOVE CLEAR BACK"];
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
    $("#title").value = templateConfig.options.title || "TI TICKET LOGS";
    $("#aboutText").value = templateConfig.options.aboutText || "TICKET SNAPSHOT - NO NETWORK REQUIRED";
    $("#footer").value = templateConfig.options.footer || "<> MOVE CLEAR BACK";
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
  apiSecret = $("#apiSecret").value;
  apiBaseUrl = $("#apiBaseUrl").value.trim();
  sessionStorage.setItem("tiBuilderApiBaseUrl", apiBaseUrl);
  await connect();
});
$("#previewButton").addEventListener("click", () => runBuilder("preview"));
$("#generateButton").addEventListener("click", () => runBuilder("generate"));
$("#downloadButton").addEventListener("click", downloadSource);
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
$("#apiBaseUrl").value = apiBaseUrl;
if (apiSecret) {
  $("#apiSecret").value = apiSecret;
  connect();
}
