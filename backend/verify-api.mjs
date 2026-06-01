/**
 * End-to-end API verification. Hits the running server, asserts behaviour,
 * then cleans up the test users/tasks it created so Atlas stays tidy.
 * Run from the backend dir (so dotenv + mongoose resolve): node verify-api.mjs
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const BASE = 'http://localhost:5000';
const suffix = Date.now();
const adminEmail = `verify_admin_${suffix}@verify.local`;
const userEmail = `verify_user_${suffix}@verify.local`;
const PW = 'Passw0rd!';

let passCount = 0;
let failCount = 0;
const check = (name, cond, extra = '') => {
  if (cond) {
    passCount++;
    console.log(`  ✅ ${name}`);
  } else {
    failCount++;
    console.log(`  ❌ ${name} ${extra}`);
  }
};

async function req(method, path, { body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

const section = (t) => console.log(`\n── ${t} ──`);

try {
  section('Health');
  const health = await req('GET', '/health');
  check('GET /health -> 200 ok', health.status === 200 && health.json?.status === 'ok', `(got ${health.status})`);

  section('Auth: register');
  const regAdmin = await req('POST', '/api/v1/auth/register', {
    body: { name: 'Verify Admin', email: adminEmail, password: PW },
  });
  check('register #1 -> 201', regAdmin.status === 201, `(got ${regAdmin.status})`);
  check('first user auto-promoted to admin', regAdmin.json?.data?.user?.role === 'admin', `(role=${regAdmin.json?.data?.user?.role})`);
  check('returns access + refresh tokens', !!regAdmin.json?.data?.accessToken && !!regAdmin.json?.data?.refreshToken);
  check('password never returned', regAdmin.json?.data?.user?.password === undefined);
  const adminToken = regAdmin.json?.data?.accessToken;

  const regUser = await req('POST', '/api/v1/auth/register', {
    body: { name: 'Verify User', email: userEmail, password: PW },
  });
  check('register #2 -> 201', regUser.status === 201, `(got ${regUser.status})`);
  check('second user role = user', regUser.json?.data?.user?.role === 'user', `(role=${regUser.json?.data?.user?.role})`);
  let userToken = regUser.json?.data?.accessToken;
  let userRefresh = regUser.json?.data?.refreshToken;

  section('Auth: validation & duplicates');
  const weak = await req('POST', '/api/v1/auth/register', {
    body: { name: 'X', email: `weak_${suffix}@verify.local`, password: 'weak' },
  });
  check('weak password rejected -> 400', weak.status === 400, `(got ${weak.status})`);
  check('400 includes field-level errors', Array.isArray(weak.json?.errors) && weak.json.errors.length > 0);

  const dup = await req('POST', '/api/v1/auth/register', {
    body: { name: 'Dup', email: adminEmail, password: PW },
  });
  check('duplicate email -> 409', dup.status === 409, `(got ${dup.status})`);

  section('Auth: login & me');
  const badLogin = await req('POST', '/api/v1/auth/login', { body: { email: adminEmail, password: 'WrongPass1' } });
  check('wrong password -> 401', badLogin.status === 401, `(got ${badLogin.status})`);

  const login = await req('POST', '/api/v1/auth/login', { body: { email: userEmail, password: PW } });
  check('login -> 200', login.status === 200, `(got ${login.status})`);
  userToken = login.json?.data?.accessToken;
  userRefresh = login.json?.data?.refreshToken;

  const me = await req('GET', '/api/v1/auth/me', { token: userToken });
  check('GET /me with token -> 200', me.status === 200 && me.json?.data?.user?.email === userEmail);

  const noToken = await req('GET', '/api/v1/auth/me');
  check('GET /me without token -> 401', noToken.status === 401, `(got ${noToken.status})`);

  const badToken = await req('GET', '/api/v1/tasks', { token: 'not.a.jwt' });
  check('invalid token -> 401', badToken.status === 401, `(got ${badToken.status})`);

  section('Tasks: CRUD (as regular user)');
  const create = await req('POST', '/api/v1/tasks', {
    token: userToken,
    body: { title: 'Verify task', description: 'created by test', priority: 'high', status: 'todo' },
  });
  check('create task -> 201', create.status === 201, `(got ${create.status})`);
  const taskId = create.json?.data?.task?.id;
  check('task has owner + id', !!taskId && !!create.json?.data?.task?.owner);

  const badCreate = await req('POST', '/api/v1/tasks', { token: userToken, body: { description: 'no title' } });
  check('create without title -> 400', badCreate.status === 400, `(got ${badCreate.status})`);

  const list = await req('GET', '/api/v1/tasks?page=1&limit=10', { token: userToken });
  check('list tasks -> 200', list.status === 200);
  check('list returns pagination meta', !!list.json?.meta && typeof list.json.meta.total === 'number');
  check('list scoped to owner (1 task)', list.json?.data?.tasks?.length === 1, `(got ${list.json?.data?.tasks?.length})`);

  const getOne = await req('GET', `/api/v1/tasks/${taskId}`, { token: userToken });
  check('get task by id -> 200', getOne.status === 200 && getOne.json?.data?.task?.id === taskId);

  const update = await req('PATCH', `/api/v1/tasks/${taskId}`, { token: userToken, body: { status: 'done' } });
  check('update task -> 200 + status changed', update.status === 200 && update.json?.data?.task?.status === 'done');

  const filtered = await req('GET', '/api/v1/tasks?status=done', { token: userToken });
  check('filter by status=done works', filtered.json?.data?.tasks?.every((t) => t.status === 'done'));

  section('RBAC: ownership isolation & admin powers');
  const otherFetch = await req('GET', `/api/v1/tasks/${taskId}`, { token: adminToken });
  check("admin CAN see another user's task", otherFetch.status === 200, `(got ${otherFetch.status})`);

  // Create a task as admin, ensure regular user cannot see it.
  const adminTask = await req('POST', '/api/v1/tasks', { token: adminToken, body: { title: 'admin-only task' } });
  const adminTaskId = adminTask.json?.data?.task?.id;
  const userTriesAdminTask = await req('GET', `/api/v1/tasks/${adminTaskId}`, { token: userToken });
  check("regular user CANNOT see admin's task -> 404", userTriesAdminTask.status === 404, `(got ${userTriesAdminTask.status})`);

  const userListsUsers = await req('GET', '/api/v1/users', { token: userToken });
  check('regular user GET /users -> 403 (RBAC)', userListsUsers.status === 403, `(got ${userListsUsers.status})`);

  const adminListsUsers = await req('GET', '/api/v1/users?page=1&limit=10', { token: adminToken });
  check('admin GET /users -> 200', adminListsUsers.status === 200, `(got ${adminListsUsers.status})`);
  check('admin sees >= 2 users', adminListsUsers.json?.meta?.total >= 2, `(total=${adminListsUsers.json?.meta?.total})`);

  // Admin promotes the regular user to admin.
  const userId = regUser.json?.data?.user?.id;
  const promote = await req('PATCH', `/api/v1/users/${userId}`, { token: adminToken, body: { role: 'admin' } });
  check('admin can promote user role -> 200', promote.status === 200 && promote.json?.data?.user?.role === 'admin');

  section('Auth: refresh & logout rotation');
  const refresh = await req('POST', '/api/v1/auth/refresh', { body: { refreshToken: userRefresh } });
  check('refresh -> 200 + new tokens', refresh.status === 200 && !!refresh.json?.data?.accessToken);
  const reused = await req('POST', '/api/v1/auth/refresh', { body: { refreshToken: userRefresh } });
  check('OLD refresh token rejected after rotation -> 401', reused.status === 401, `(got ${reused.status})`);

  const newUserRefresh = refresh.json?.data?.refreshToken;
  const newUserAccess = refresh.json?.data?.accessToken;
  const logout = await req('POST', '/api/v1/auth/logout', { token: newUserAccess, body: { refreshToken: newUserRefresh } });
  check('logout -> 200', logout.status === 200, `(got ${logout.status})`);
  const afterLogout = await req('POST', '/api/v1/auth/refresh', { body: { refreshToken: newUserRefresh } });
  check('refresh after logout rejected -> 401', afterLogout.status === 401, `(got ${afterLogout.status})`);

  section('Tasks: delete & 404s');
  const del = await req('DELETE', `/api/v1/tasks/${taskId}`, { token: adminToken });
  check('delete task -> 200', del.status === 200, `(got ${del.status})`);
  const getDeleted = await req('GET', `/api/v1/tasks/${taskId}`, { token: adminToken });
  check('deleted task now 404', getDeleted.status === 404, `(got ${getDeleted.status})`);
  const badId = await req('GET', '/api/v1/tasks/not-an-objectid', { token: adminToken });
  check('invalid task id -> 400', badId.status === 400, `(got ${badId.status})`);
  const unknownRoute = await req('GET', '/api/v1/does-not-exist');
  check('unknown route -> 404', unknownRoute.status === 404, `(got ${unknownRoute.status})`);

  section('Docs');
  const docs = await req('GET', '/api/docs.json');
  check('OpenAPI spec served', docs.status === 200 && docs.json?.openapi?.startsWith('3.'));
  check('spec documents /auth/login path', !!docs.json?.paths?.['/api/v1/auth/login']);
} catch (err) {
  console.error('\nFATAL during verification:', err);
  failCount++;
} finally {
  // ---- Cleanup: remove all @verify.local users and their tasks ----
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection;
    const testUsers = await db.collection('users').find({ email: /@verify\.local$/ }).toArray();
    const ids = testUsers.map((u) => u._id);
    const delTasks = await db.collection('tasks').deleteMany({ owner: { $in: ids } });
    const delUsers = await db.collection('users').deleteMany({ email: /@verify\.local$/ });
    console.log(`\n🧹 Cleanup: removed ${delUsers.deletedCount} test users, ${delTasks.deletedCount} test tasks.`);
    await mongoose.disconnect();
  } catch (e) {
    console.log(`\n⚠️ Cleanup skipped: ${e.message}`);
  }

  console.log(`\n═════ RESULT: ${passCount} passed, ${failCount} failed ═════`);
  process.exit(failCount === 0 ? 0 : 1);
}
