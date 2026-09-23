-- Static evidence Storage policy contract.
-- Runtime deletion semantics still require the hosted Storage API + privileged post-state check.

begin;

create function pg_temp.assert_true(ok boolean,label text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %',label; end if;
end $$;

select pg_temp.assert_true(
  not exists(
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='trade_evidence_select'
  ),
  'broad protected evidence SELECT policy is absent'
);

select pg_temp.assert_true(
  not exists(
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='trade_evidence_update'
  ),
  'browser protected evidence UPDATE policy is absent'
);

select pg_temp.assert_true(
  not exists(
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='trade_evidence_delete_select'
  ),
  'legacy cleanup SELECT alias is absent'
);

select pg_temp.assert_true(
  (
    select count(*)=1
    from pg_policies
    where schemaname='storage' and tablename='objects'
      and cmd='SELECT'
      and policyname like 'trade_evidence_%'
      and policyname='trade_evidence_delete_discovery'
      and qual like '%storage.allow_only_operation%'
      and qual like '%storage.object.delete_many%'
      and qual like '%pending%'
      and qual like '%rejected%'
  ),
  'only operation-scoped protected evidence SELECT remains'
);

select pg_temp.assert_true(
  (
    select count(*)=1
    from pg_policies
    where schemaname='storage' and tablename='objects'
      and cmd='DELETE'
      and policyname like 'trade_evidence_%'
      and policyname='trade_evidence_delete_pending_cleanup'
      and qual like '%pending%'
      and qual like '%rejected%'
  ),
  'cleanup DELETE is explicit pending/rejected allowlist'
);

select 'evidence storage policy assertions passed; fixtures rolled back' as result;
rollback;
