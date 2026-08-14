import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
);

const adminCredentials = {
  Imjustluckyy: { password: "Energyball2001", role: "President" },
  suoazisking: { password: "Lightning10", role: "Admin" },
  ManagerGear: { password: "mygear10", role: "Admin" }
};

const $ = (id) => document.getElementById(id);
const homeView = $("homeView");
const loginView = $("loginView");
const applicationView = $("applicationView");
const portalView = $("portalView");
const loginForm = $("loginForm");
const applicationForm = $("applicationForm");

let accessLogs = [];
let applications = [];
let staffAccounts = [];
let currentUser = null;
let realtimeChannel;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
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
  const key = "blackVelvetDeviceHex";
  let value = localStorage.getItem(key);

  if (!value) {
    value = createDeviceHex();
    localStorage.setItem(key, value);
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
    resolution: `${screen.width}x${screen.height}`
  };
}

async function loadData() {
  const [logs, apps, accounts] = await Promise.all([
    supabase.from("access_logs").select("*").order("created_at", { ascending: false }),
    supabase.from("applications").select("*").order("created_at", { ascending: false }),
    supabase.from("staff_accounts").select("*").order("created_at", { ascending: false })
  ]);

  const result = [logs, apps, accounts].find((item) => item.error);
  if (result) throw result.error;

  accessLogs = logs.data || [];
  applications = apps.data || [];
  staffAccounts = accounts.data || [];

  renderLogs();
  renderApplications();
  renderAccounts();
}

async function addAccessLog(username, success, reason) {
  const info = deviceInfo();

  const { error } = await supabase.from("access_logs").insert({
    username,
    success,
    reason,
    device_hex: info.deviceHex,
    device: info.device,
    browser: info.browser,
    language: info.language,
    platform: info.platform,
    resolution: info.resolution
  });

  if (error) console.error("Could not save access log:", error);
  await loadData();
}

function renderLogs() {
  $("logCount").textContent = accessLogs.length;
  $("logList").innerHTML = accessLogs.length
    ? accessLogs.map((log) => `
      <div class="log-card ${log.success ? "success" : ""}">
        <div class="log-title">
          <span>Staff Login · ${escapeHtml(log.username)}</span>
          <span class="log-status">${log.success ? "Correct credentials" : "Incorrect credentials"}</span>
        </div>
        <div class="log-grid">
          ${[
            ["Device Hex", log.device_hex],
            ["Reason", log.reason],
            ["Device Used", log.device],
            ["Browser", log.browser],
            ["Language", log.language],
            ["Platform", log.platform],
            ["Resolution", log.resolution],
            ["Time", log.created_at ? new Date(log.created_at).toString() : ""]
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

function renderApplications() {
  $("applicationCount").textContent =
    applications.filter((app) => app.status === "Pending").length;

  $("applicationList").innerHTML = applications.length
    ? applications.map((app) => `
      <div class="log-card ${app.status === "Approved" ? "approved" : ""}">
        <div class="log-title">
          <span>${escapeHtml(app.staff_username)} · ${escapeHtml(app.role)}</span>
          <span class="log-status">${escapeHtml(app.status)}</span>
        </div>
        <div class="log-grid">
          ${[
            ["Discord Tag", app.discord_tag],
            ["Age", app.age],
            ["Timezone", app.timezone],
            ["Experience", app.experience],
            ["Availability", app.availability],
            ["Motivation", app.motivation],
            ["References", app.references_text || "None"],
            ["Submitted", app.created_at]
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
            <strong>${escapeHtml(account.created_at)}</strong>
          </div>
        </div>
        <div class="card-actions">
          <button data-delete-account="${escapeHtml(account.username)}">Delete account</button>
        </div>
      </div>
    `).join("")
    : '<div class="empty-state">No approved staff accounts yet.</div>';
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
}

$("staffLoginButton").addEventListener("click", () => show(loginView));
$("applicationButton").addEventListener("click", () => show(applicationView));

document.querySelectorAll("[data-home]").forEach((button) => {
  button.addEventListener("click", () => show(homeView));
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;
  const admin = adminCredentials[username];
  const account = staffAccounts.find((item) => item.username === username);
  const valid = Boolean(
    (admin && admin.password === password) ||
    (account && account.staff_password === password)
  );

  await addAccessLog(
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

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(applicationForm));
  const username = data.staffUsername.trim().toLowerCase();

  const duplicate = applications.some((app) =>
    app.staff_username.toLowerCase() === username
  ) || staffAccounts.some((account) =>
    account.username.toLowerCase() === username
  ) || Object.keys(adminCredentials).some((name) =>
    name.toLowerCase() === username
  );

  if (duplicate) {
    $("applicationMessage").textContent =
      "That staff username already exists or is pending.";
    $("applicationMessage").className = "login-message error";
    return;
  }

  const { error } = await supabase.from("applications").insert({
    discord_tag: data.discordTag,
    staff_username: data.staffUsername.trim(),
    staff_password: data.staffPassword,
    age: Number(data.age),
    timezone: data.timezone,
    experience: data.experience,
    role: data.role,
    availability: data.availability,
    motivation: data.motivation,
    references_text: data.references || "",
    status: "Pending"
  });

  if (error) {
    console.error(error);
    $("applicationMessage").textContent = "Signup could not be submitted.";
    $("applicationMessage").className = "login-message error";
    return;
  }

  applicationForm.reset();
  $("applicationMessage").textContent =
    "Your signup was submitted. You will receive an approval or denial message.";
  $("applicationMessage").className = "login-message success";
  await loadData();
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
    panel.classList.toggle("active-panel", panel.id === button.dataset.panel);
  });
});

$("applicationList").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-application-action]");
  if (!button || !isLeadership()) return;

  const app = applications.find((item) => item.id === button.dataset.id);
  if (!app) return;

  const status = button.dataset.applicationAction === "approve"
    ? "Approved"
    : "Denied";

  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", app.id);

  if (error) return console.error(error);

  if (status === "Approved") {
    await supabase.from("staff_accounts").upsert({
      username: app.staff_username,
      staff_password: app.staff_password,
      role: app.role
    });
  }

  await loadData();
});

$("staffAccountList").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-account]");
  if (!button || !isLeadership()) return;

  const { error } = await supabase
    .from("staff_accounts")
    .delete()
    .eq("username", button.dataset.deleteAccount);

  if (error) return console.error(error);
  await loadData();
});

$("clearLogsButton").addEventListener("click", async () => {
  if (!isLeadership()) return;

  const { error } = await supabase
    .from("access_logs")
    .delete()
    .not("id", "is", null);

  if (error) return console.error(error);
  await loadData();
});

function subscribeToChanges() {
  realtimeChannel = supabase
    .channel("black-velvet-live-updates")
    .on("postgres_changes", { event: "*", schema: "public", table: "access_logs" }, loadData)
    .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, loadData)
    .on("postgres_changes", { event: "*", schema: "public", table: "staff_accounts" }, loadData)
    .subscribe();
}

(async function start() {
  try {
    await loadData();
    subscribeToChanges();
  } catch (error) {
    console.error("Supabase setup error:", error);
    $("loginMessage").textContent =
      "Supabase is connected, but the database tables or policies are not ready.";
    $("loginMessage").className = "login-message error";
  }
})();
