const adminCredentials = {
  Imjustluckyy: { password: "Energyball2001", role: "President" },
  suoazisking: { password: "Lightning10", role: "Admin" },
  ManagerGear: { password: "mygear10", role: "Admin" }
};

const KEYS = {
  device: "blackVelvetDeviceHex",
  logs: "blackVelvetAccessLogs",
  applications: "blackVelvetApplications",
  accounts: "blackVelvetStaffAccounts"
};

const $ = (id) => document.getElementById(id);
const homeView = $("homeView");
const loginView = $("loginView");
const applicationView = $("applicationView");
const portalView = $("portalView");
const loginForm = $("loginForm");
const applicationForm = $("applicationForm");

let accessLogs = load(KEYS.logs, []);
let applications = load(KEYS.applications, []);
let staffAccounts = load(KEYS.accounts, []);
let currentUser = null;

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createDeviceHex() {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  return `D${Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function getDeviceHex() {
  let value = localStorage.getItem(KEYS.device);

  if (!value) {
    value = createDeviceHex();
    localStorage.setItem(KEYS.device, value);
  }

  return value;
}

function deviceInfo() {
  return {
    deviceHex: getDeviceHex(),
    device: /Mobi|Android/i.test(navigator.userAgent)
      ? "Mobile device"
      : "Desktop device",
    browser: navigator.userAgent,
    language: navigator.language || "Unknown",
    platform: navigator.platform || "Unknown",
    resolution: `${screen.width}x${screen.height}`,
    time: new Date().toString()
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

function addAccessLog(username, success, reason) {
  accessLogs.unshift({
    username,
    success,
    reason,
    ...deviceInfo()
  });

  save(KEYS.logs, accessLogs);
  renderLogs();
}

function renderLogs() {
  $("logCount").textContent = accessLogs.length;
  $("logList").innerHTML = accessLogs.length
    ? accessLogs.map((log) => `
      <div class="log-card ${log.success ? "success" : ""}">
        <div class="log-title">
          <span>Staff Login · ${escapeHtml(log.username)}</span>
          <span class="log-status">
            ${log.success ? "Correct credentials" : "Incorrect credentials"}
          </span>
        </div>
        <div class="log-grid">
          ${[
            ["Device Hex", log.deviceHex],
            ["Reason", log.reason],
            ["Device Used", log.device],
            ["Browser", log.browser],
            ["Language", log.language],
            ["Platform", log.platform],
            ["Resolution", log.resolution],
            ["Time", log.time]
          ].map(([label, value]) => `
            <div class="log-field">
              <span>${label}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("")
    : '<div class="empty-state">No access events yet.</div>';
}

function show(view) {
  [homeView, loginView, applicationView, portalView]
    .forEach((item) => item.classList.add("hidden"));

  view.classList.remove("hidden");
}

function isLeadership() {
  return currentUser &&
    Object.prototype.hasOwnProperty.call(adminCredentials, currentUser.username);
}

function renderLeadership() {
  document.querySelectorAll(".leadership-only").forEach((element) => {
    element.classList.toggle("hidden", !isLeadership());
  });

  renderApplications();
  renderAccounts();
}

function renderApplications() {
  $("applicationCount").textContent =
    applications.filter((app) => app.status === "Pending").length;

  $("applicationList").innerHTML = applications.length
    ? applications.map((app) => `
      <div class="log-card ${app.status === "Approved" ? "approved" : ""}">
        <div class="log-title">
          <span>${escapeHtml(app.staffUsername)} · ${escapeHtml(app.role)}</span>
          <span class="log-status">${escapeHtml(app.status)}</span>
        </div>
        <div class="log-grid">
          ${[
            ["Discord Tag", app.discordTag],
            ["Age", app.age],
            ["Timezone", app.timezone],
            ["Experience", app.experience],
            ["Availability", app.availability],
            ["Motivation", app.motivation],
            ["References", app.references || "None"],
            ["Submitted", app.submitted]
          ].map(([label, value]) => `
            <div class="log-field">
              <span>${label}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `).join("")}
        </div>
        ${app.status === "Pending" ? `
          <div class="card-actions">
            <button data-application-action="approve" data-id="${app.id}">Accept</button>
            <button data-application-action="deny" data-id="${app.id}">Deny</button>
          </div>
        ` : ""}
      </div>
    `).join("")
    : '<div class="empty-state">No applications yet.</div>';
}

function renderAccounts() {
  $("staffAccountList").innerHTML = staffAccounts.length
    ? staffAccounts.map((account) => `
      <div class="log-card approved">
        <div class="log-title">
          <span>${escapeHtml(account.username)}</span>
          <span class="log-status">${escapeHtml(account.role)}</span>
        </div>
        <div class="log-grid">
          <div class="log-field">
            <span>Created</span>
            <strong>${escapeHtml(account.created)}</strong>
          </div>
          <div class="log-field">
            <span>Source</span>
            <strong>Approved staff application</strong>
          </div>
        </div>
        <div class="card-actions">
          <button data-delete-account="${escapeHtml(account.username)}">
            Delete account
          </button>
        </div>
      </div>
    `).join("")
    : '<div class="empty-state">No approved staff accounts yet.</div>';
}

$("staffLoginButton").addEventListener("click", () => show(loginView));
$("applicationButton").addEventListener("click", () => show(applicationView));

document.querySelectorAll("[data-home]").forEach((button) => {
  button.addEventListener("click", () => show(homeView));
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;
  const admin = adminCredentials[username];
  const account = staffAccounts.find((item) => item.username === username);
  const valid = Boolean(
    (admin && admin.password === password) ||
    (account && account.password === password)
  );

  addAccessLog(
    username || "Blank username",
    valid,
    valid ? "Correct credentials" : "Username or password was incorrect"
  );

  if (!valid) {
    $("loginMessage").textContent = "Invalid username or password.";
    $("loginMessage").className = "login-message error";
    $("password").value = "";
    return;
  }

  currentUser = {
    username,
    role: admin?.role || account.role
  };

  $("signedInAs").textContent = `${username} · ${currentUser.role}`;
  $("loginMessage").textContent = "";
  loginForm.reset();
  show(portalView);
  renderLeadership();
});

applicationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(applicationForm));
  const username = data.staffUsername.trim().toLowerCase();

  const duplicateApplication = applications.some(
    (app) => app.staffUsername.toLowerCase() === username
  );

  const existingAccount = staffAccounts.some(
    (account) => account.username.toLowerCase() === username
  );

  const existingAdmin = Object.keys(adminCredentials).some(
    (name) => name.toLowerCase() === username
  );

  if (duplicateApplication || existingAccount || existingAdmin) {
    $("applicationMessage").textContent =
      "That staff username already exists or is pending.";
    $("applicationMessage").className = "login-message error";
    return;
  }

  applications.unshift({
    ...data,
    staffUsername: data.staffUsername.trim(),
    password: data.staffPassword,
    status: "Pending",
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()),
    submitted: new Date().toString()
  });

  save(KEYS.applications, applications);
  applicationForm.reset();

  $("applicationMessage").textContent =
    "Your signup was submitted. You will receive an approval or denial message.";
  $("applicationMessage").className = "login-message success";
});

$("clearApplicationButton").addEventListener("click", () => {
  applicationForm.reset();
  $("applicationMessage").textContent = "";
});

$("logoutButton").addEventListener("click", () => {
  currentUser = null;
  show(homeView);
});

$("navigation").addEventListener("click", (event) => {
  const button = event.target.closest(".nav-button");

  if (!button) return;
  if (button.classList.contains("leadership-only") && !isLeadership()) return;

  document.querySelectorAll(".nav-button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });

  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle(
      "active-panel",
      panel.id === button.dataset.panel
    );
  });
});

$("applicationList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-application-action]");

  if (!button || !isLeadership()) return;

  const app = applications.find((item) => item.id === button.dataset.id);
  if (!app) return;

  if (button.dataset.applicationAction === "approve") {
    app.status = "Approved";

    staffAccounts.push({
      username: app.staffUsername,
      password: app.password,
      role: app.role,
      created: new Date().toString()
    });
  } else {
    app.status = "Denied";
  }

  save(KEYS.applications, applications);
  save(KEYS.accounts, staffAccounts);
  renderApplications();
  renderAccounts();
});

$("staffAccountList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-account]");

  if (!button || !isLeadership()) return;

  staffAccounts = staffAccounts.filter(
    (account) => account.username !== button.dataset.deleteAccount
  );

  save(KEYS.accounts, staffAccounts);
  renderAccounts();
});

$("clearLogsButton").addEventListener("click", () => {
  if (!isLeadership()) return;

  accessLogs = [];
  save(KEYS.logs, accessLogs);
  renderLogs();
});

renderLogs();
renderApplications();
renderAccounts();
