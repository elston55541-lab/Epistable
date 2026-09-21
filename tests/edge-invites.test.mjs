import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

// Execute the real Edge handler; replace only remote SDK and Deno runtime.
function harness(slug, options = {}) {
  const calls = [];
  let handler;
  const user = { id: 'user-a', email: 'a@example.invalid', email_confirmed_at: '2026-01-01', ...options.user };
  const caller = { id: 'caller', role: 'admin', status: 'active', factory_id: 'factory-a', ...options.caller };
  const pending = { id: 'pending', email: user.email, auth_user_id: user.id, status: 'pending', ...options.pending };
  let reads = 0;
  const client = {
    auth: {
      getUser: async token => { calls.push(['getUser', token]); return options.invalidToken ? { error: new Error('invalid') } : { data: { user } }; },
      updateUser: async attrs => { calls.push(['updateUser', attrs]); return {}; },
      admin: {
        updateUserById: async () => { throw new Error('Administrative password reset forbidden'); },
        createUser: async () => { throw new Error('Unverified account creation forbidden'); },
        inviteUserByEmail: async (...args) => { calls.push(['invite', ...args]); return { data: { user: { id: 'invitee' } } }; },
      },
    },
    rpc: async name => { calls.push(['rpc', name]); return { data: pending }; },
    from: table => {
      calls.push(['table', table]);
      const chain = {
        select: () => chain,
        eq: (key, value) => { calls.push(['eq', key, value]); return chain; },
        maybeSingle: async () => ({ data: slug === 'accept-invite' ? (options.noProfile ? null : pending) : (++reads === 1 ? caller : options.existing || null) }),
        insert: value => { calls.push(['insert', value]); return chain; },
        update: value => { calls.push(['update', value]); return chain; },
        single: async () => ({ data: { id: 'p', email: 'new@example.invalid', role: options.role || 'buyer', status: 'pending', auth_user_id: 'invitee' } }),
      };
      return chain;
    },
  };
  let source = readFileSync(new URL(`../supabase/functions/${slug}/index.ts`, import.meta.url), 'utf8');
  source = source.replace(/^import .*;\r?\n/gm, '');
  vm.runInNewContext(stripTypeScriptTypes(source), {
    Request, Response, crypto,
    fetch: async (url, config) => { calls.push(['updateUser', JSON.parse(config.body), url, config]); return new Response('{}'); },
    createClient: (url, key, config) => { calls.push(['client', key, config]); return client; },
    Deno: { env: { get: key => key }, serve: fn => { handler = fn; } },
  });
  return { calls, request: (body, token = 'valid-token') => handler(new Request('https://example.invalid', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body),
  })) };
}
const body = { email: 'a@example.invalid', password: 'long-test-password' };
for (const [label, opts, request, token, status] of [
  ['unauthenticated cannot reset an existing account', {}, body, null, 401],
  ['invalid JWT cannot reset an account', { invalidToken: true }, body, 'invalid', 401],
  ['unconfirmed email cannot accept', { user: { email_confirmed_at: null } }, body, 'valid', 401],
  ['another email cannot be targeted', {}, { ...body, email: 'victim@example.invalid' }, 'valid', 403],
  ['active account cannot use invite password setup', { pending: { status: 'active' } }, body, 'valid', 403],
  ['inactive account cannot be reactivated', { pending: { status: 'inactive' } }, body, 'valid', 403],
  ['suspended account cannot be reactivated', { pending: { status: 'suspended' } }, body, 'valid', 403],
  ['missing linked profile fails closed', { noProfile: true }, body, 'valid', 403],
]) test(label, async () => {
  const h = harness('accept-invite', opts);
  assert.equal((await h.request(request, token)).status, status);
  assert.ok(!h.calls.some(c => ['updateUser', 'insert', 'update', 'rpc', 'invite'].includes(c[0])));
});
test('confirmed invite uses only caller token and activates linked profile', async () => {
  const h = harness('accept-invite');
  assert.equal((await h.request(body)).status, 200);
  assert.ok(h.calls.some(c => c[0] === 'eq' && c[1] === 'auth_user_id' && c[2] === 'user-a'));
  assert.ok(h.calls.some(c => c[0] === 'client' && c[1] === 'SUPABASE_ANON_KEY' && c[2].global.headers.Authorization === 'Bearer valid-token'));
  assert.equal(h.calls.filter(c => c[0] === 'updateUser').length, 1);
  assert.equal(h.calls.find(c => c[0] === 'updateUser')[3].headers.Authorization, 'Bearer valid-token');
});
for (const [label, opts, role, factory, status] of [
  ['admin cannot create owner', {}, 'owner', 'factory-a', 403],
  ['admin cannot create platform admin', {}, 'platform_admin', 'factory-a', 400],
  ['admin cannot cross factory', {}, 'inspector', 'factory-b', 403],
  ['admin cannot omit factory', {}, 'buyer', null, 403],
  ['unscoped admin cannot invite', { caller: { factory_id: null } }, 'buyer', null, 403],
  ['admin cannot repurpose an owner invitation', { existing: { role: 'owner', factory_id: 'factory-a' } }, 'buyer', 'factory-a', 403],
  ['admin cannot repurpose another factory invitation', { existing: { role: 'buyer', factory_id: 'factory-b' } }, 'buyer', 'factory-a', 403],
  ['suspended caller cannot invite', { caller: { status: 'suspended' } }, 'buyer', 'factory-a', 403],
]) test(label, async () => {
  const h = harness('admin-invite', opts);
  assert.equal((await h.request({ email: 'new@example.invalid', role, factory_id: factory })).status, status);
  assert.ok(!h.calls.some(c => ['insert', 'update', 'invite'].includes(c[0])));
});
test('admin may invite into own factory without marketplace authority', async () => {
  const h = harness('admin-invite');
  assert.equal((await h.request({ email: 'new@example.invalid', role: 'inspector', factory_id: 'factory-a' })).status, 200);
  assert.equal(h.calls.find(c => c[0] === 'insert')[1].factory_id, 'factory-a');
  assert.ok(h.calls.filter(c => c[0] === 'table').every(c => c[1] === 'profiles'));
});
test('legacy owner may create owner without marketplace authority', async () => {
  const h = harness('admin-invite', { caller: { role: 'owner' }, role: 'owner' });
  assert.equal((await h.request({ email: 'new@example.invalid', role: 'owner' })).status, 200);
  assert.ok(h.calls.filter(c => c[0] === 'table').every(c => c[1] === 'profiles'));
});
