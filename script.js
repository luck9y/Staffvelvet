import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://ptgzhljvzyceawwohmym.supabase.co",
  "sb_publishable_H-6UMCfs6yyEG3JcBhETSg_sjr0aoVk"
);

const adminCredentials = {
  imjustluckyy: { password: "Energyball2001", role: "Owner" },
  suoaz: { password: "Lightning10", role: "Owner" },
  managergear: { password: "mygear10", role: "Manager" }
};

const leadershipRoles = ["Owner", "Admin", "Manager"];

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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[character]));
}

function setMessage(id, text, type = "") {
  const element = $(id);
  if (!element) return;
  element.textContent = text;
  element.className = `action-message ${type}`;
}

function showDatabaseError(id, action, error) {
  console.error(action, error);
  setMessage(id, `${action}: ${error?.message || "Database error."}`, "error");
}

function createDeviceHex() {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  return `D${Array.from(bytes).map((value) =>
    value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
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
    device: /Mobi|Android/i.test(navigator.userAgent) ? "Mobile device" : "Desktop device",
    browser: navigator.userAgent,
    language: navigator.language || "Unknown",
    platform: navigator.platform || "Unknown",
    resolution: `${screen.width}x${screen.height}`
  };
}

function getReadKey() {
  return `blackVelvetLogsRead:${currentUser?.username || "unknown"}`;
}

function getUnreadLogs() {
  const lastRead = Number(localStorage.getItem(getReadKey()) || 0);

  return accessLogs.filter((log) => {
    const time = log.created_at ? new Date(log.created_at).getTime() : 0;
    return time > lastRead;
  });
}

function markLogsRead() {
  localStorage.setItem(getReadKey(), String(Date.now()));
  renderLogs();
  setMessage("logsMessage", "All current login logs marked as read.", "success");
}

function isLeadership() {
  const username = currentUser?.username?.trim().toLowerCase();
  const role = currentUser?.role;

  return Boolean(
    username &&
    (
      adminCredentials[username] ||
      leadershipRoles.includes(role)
    )
  );
}

function show(view) {
  [homeView, loginView, applicationView, portalView]
    .forEach((item) => item.classList.add("hidden"));

  view.classList.remove("hidden");
}

function renderLeadership() {
  document.querySelectorAll(".leadership-only").forEach((element) => {
    element.classList.toggle("hidden", !isLeadership());
  });
}

async function loadData() {
  const [logs, apps, accounts] = await Promise.all([
    supabase.from("access_logs").select("*").order("created_at", { ascending: false }),
    supabase.from("applications").select("*").order("created_at", { ascending: false }),
    supabase.from("staff_accounts").select("*").order("created_at", { ascending: false })
  ]);

  const failedQuery = [logs, apps, accounts].find((result) => result.error);
  if (failedQuery) throw failedQuery.error;

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
  const unreadLogs = getUnreadLogs();
  $("logCount").textContent = unreadLogs.length;

  $("logList").innerHTML = accessLogs.length
    ? accessLogs.map((log) => `
      <div class="log-card ${log.success ? "success" : ""}">
        <div class="log-title">
          <span>Staff Login · ${escapeHtml(log.username || log.user)}</span>
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
            <button type="button" data-application-action="approve" data-id="${escapeHtml(app.id)}">Accept</button>
            <button type="button" data-application-action="deny" data-id="${escapeHtml(app.id)}">Deny</button>
          </div>
        ` : ""}
      </div>
    `).join("")
    : '<div class="empty-state">No applications yet.</div>';
}

function renderAccounts() {
  const roles = ["Owner", "Admin", "Manager", "President", "Mod", "Helper"];

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
          <div class="log-field">
            <span>Rank</span>
            <select data-role-account="${escapeHtml(account.username)}">
              ${roles.map((role) => `
                <option value="${role}" ${account.role === role ? "selected" : ""}>${role}</option>
              `).join("")}
            </select>
          </div>
        </div>
        <div class="card-actions">
          <button type="button" data-delete-account="${escapeHtml(account.username)}">Remove account</button>
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

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const usernameInput = $("username").value.trim();
  const usernameKey = usernameInput.toLowerCase();
  const password = $("password").value;
  const admin = adminCredentials[usernameKey];

  const account = staffAccounts.find(
    (item) => item.username?.trim().toLowerCase() === usernameKey
  );

  const valid = Boolean(
    (admin && admin.password === password) ||
    (account && account.staff_password === password)
  );

  await addAccessLog(
    usernameInput || "Blank username",
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
    username: usernameKey,
    role: admin?.role || account.role
  };

  $("signedInAs").textContent = `${usernameInput} · ${currentUser.role}`;
  $("loginMessage").textContent = "";
  loginForm.reset();
  show(portalView);
  renderLeadership();
});

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(applicationForm));
  const username = data.staffUsername.trim();
  const usernameKey = username.toLowerCase();

  const duplicate =
    applications.some((app) => app.staff_username?.toLowerCase() === usernameKey) ||
    staffAccounts.some((account) => account.username?.toLowerCase() === usernameKey) ||
    Object.keys(adminCredentials).includes(usernameKey);

  if (duplicate) {
    $("applicationMessage").textContent = "That staff username already exists or is pending.";
    $("applicationMessage").className = "login-message error";
    return;
  }

  const { error } = await supabase.from("applications").insert({
    discord_tag: data.discordTag,
    staff_username: username,
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
    $("applicationMessage").textContent = `Signup failed: ${error.message}`;
    $("applicationMessage").className = "login-message error";
    return;
  }

  applicationForm.reset();
  $("applicationMessage").textContent = "Your signup was submitted.";
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
  if (!button || button.classList.contains("hidden")) return;
  if (button.classList.contains("leadership-only") && !isLeadership()) return;

  document.querySelectorAll(".nav-button").forEach((item) => {
    item.classList.toggle("active", item === button);
  });

  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active-panel", panel.id === button.dataset.panel);
  });

  if (button.dataset.panel === "loginLogs") {
    markLogsRead();
  }
});

$("applicationList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-application-action]");
  if (!button || !isLeadership()) return;

  const applicationId = button.dataset.id;
  const action = button.dataset.applicationAction;
  const status = action === "approve" ? "Approved" : "Denied";
  const message = action === "approve" ? "Accepting application..." : "Denying application...";

  if (!applicationId) {
    setMessage("applicationsMessage", "This application has no database ID.", "error");
    return;
  }

  setMessage("applicationsMessage", message);
  button.disabled = true;
  button.textContent = action === "approve" ? "Accepting..." : "Denying...";

  const { data: updatedRows, error: updateError } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .select("id, status");

  if (updateError) {
    button.disabled = false;
    button.textContent = action === "approve" ? "Accept" : "Deny";
    showDatabaseError("applicationsMessage", `Could not ${action} application`, updateError);
    return;
  }

  if (!updatedRows?.length) {
    button.disabled = false;
    button.textContent = action === "approve" ? "Accept" : "Deny";
    setMessage("applicationsMessage", "No application was updated.", "error");
    return;
  }

  const app = applications.find((item) => String(item.id) === String(applicationId));

  if (status === "Approved" && app) {
    const { error: accountError } = await supabase.from("staff_accounts").upsert({
      username: app.staff_username,
      staff_password: app.staff_password,
      role: app.role
    }, { onConflict: "username" });

    if (accountError) {
      showDatabaseError("applicationsMessage", "Approved, but account creation failed", accountError);
      return;
    }
  }

  setMessage(
    "applicationsMessage",
    status === "Approved" ? "Application accepted." : "Application denied.",
    "success"
  );

  await loadData();
});

$("staffAccountList").addEventListener("change", async (event) => {
  const select = event.target.closest("select[data-role-account]");
  if (!select || !isLeadership()) return;

  const username = select.dataset.roleAccount;
  const role = select.value;

  setMessage("accountsMessage", `Changing ${username} to ${role}...`);
  select.disabled = true;

  const { error } = await supabase
    .from("staff_accounts")
    .update({ role })
    .eq("username", username);

  select.disabled = false;

  if (error) {
    showDatabaseError("accountsMessage", "Could not change staff rank", error);
    await loadData();
    return;
  }

  if (currentUser?.username === username.toLowerCase()) {
    currentUser.role = role;
    $("signedInAs").textContent = `${username} · ${role}`;
    renderLeadership();
  }

  setMessage("accountsMessage", `${username} is now ${role}.`, "success");
  await loadData();
});

$("staffAccountList").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-delete-account]");
  if (!button || !isLeadership()) return;

  const username = button.dataset.deleteAccount;
  setMessage("accountsMessage", `Removing ${username}...`);
  button.disabled = true;
  button.textContent = "Removing...";

  const { data: deletedRows, error } = await supabase
    .from("staff_accounts")
    .delete()
    .eq("username", username)
    .select("username");

  if (error) {
    button.disabled = false;
    button.textContent = "Remove account";
    showDatabaseError("accountsMessage", "Could not remove staff account", error);
    return;
  }

  if (!deletedRows?.length) {
    button.disabled = false;
    button.textContent = "Remove account";
    setMessage("accountsMessage", "No account was removed.", "error");
    return;
  }

  setMessage("accountsMessage", `${username} removed successfully.`, "success");
  await loadData();
});

function subscribeToChanges() {
  supabase
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
      `Supabase error: ${error.message || "Check your tables and policies."}`;
    $("loginMessage").className = "login-message error";
  }
})();
