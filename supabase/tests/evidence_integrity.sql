-- Evidence-integrity contract tests. Run after 20260923160000_evidence_integrity_cutover.sql.
begin;

create temporary table test_actors(label text,id uuid default gen_random_uuid());
insert into test_actors(label) values ('platform'),('seller');
insert into auth.users(id,email)
select id,'evidence-'||id||'@example.invalid' from test_actors;

insert into public.profiles(id,auth_user_id,name,email,role,status)
select id::text,id,'Evidence test','evidence-'||id||'@example.invalid','admin','active'
from test_actors;

insert into public.organizations(id,type,name,country,verification_status)
values ('evidence_seller','seller','Evidence Seller','India','verified');

insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
select id,null,'platform_admin' from test_actors where label='platform';
insert into epistable_private.marketplace_access(auth_user_id,organization_id,access_role)
select id,'evidence_seller','seller_admin' from test_actors where label='seller';

create function pg_temp.assert_true(ok boolean,label text)
returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;

create function pg_temp.denied(stmt text)
returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception
  when insufficient_privilege or check_violation or unique_violation or foreign_key_violation then return true;
end $$;
grant select on test_actors to authenticated;

-- The schema fails loudly on removed visibility/source states.
select pg_temp.assert_true(
  pg_temp.denied($q$
    insert into public.trade_documents(
      id,organization_id,document_type,title,visibility,verification_status
    ) values ('bad_public','evidence_seller','coa','Bad public','public','pending')
  $q$),
  'public protected-evidence visibility is rejected'
);

select pg_temp.assert_true(
  pg_temp.denied($q$
    insert into public.trade_documents(
      id,organization_id,document_type,title,visibility,verification_status,file_url
    ) values ('bad_external','evidence_seller','coa','Bad external','buyers','pending','https://example.com/evidence.pdf')
  $q$),
  'external protected-evidence URL is rejected'
);

insert into public.trade_documents(
  id,organization_id,document_type,title,visibility,verification_status,
  storage_path,file_name,mime_type,file_size,evidence_sha256,evidence_version,delivery_status
) values (
  'doc_a','evidence_seller','coa','Evidence A','buyers','pending',
  'evidence_seller/doc_a/a.pdf','a.pdf','application/pdf',100,
  repeat('a',64),1,'candidate'
);

-- Document approval without a receipt is rejected even for platform admins.
reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',(select id::text from test_actors where label='platform'),
    'session_id','evidence-session-1',
    'role','authenticated'
  )::text,
  true
);
set local role authenticated;

select pg_temp.assert_true(
  pg_temp.denied($q$
    select public.review_marketplace_record(
      'document','doc_a','verified','Receipt is required'
    )
  $q$),
  'document review without receipt is rejected'
);

create temporary table receipt_a as
select public.prepare_document_review('doc_a') as value;

select public.review_marketplace_record(
  'document','doc_a','verified','Reviewed exact bytes',
  ((select value->>'receipt_id' from receipt_a))::uuid
);

select pg_temp.assert_true(
  (select verification_status='verified' and delivery_status='current'
   from public.trade_documents where id='doc_a'),
  'approved A becomes current'
);
select pg_temp.assert_true(
  (select count(*)=1 from public.marketplace_reviews
   where target_id='doc_a'
     and decision='verified'
     and evidence_sha256=repeat('a',64)
     and document_version=1
     and review_receipt_id=((select value->>'receipt_id' from receipt_a))::uuid),
  'history is receipt, version and digest bound'
);

-- Identical authenticated retry is idempotent.
select public.review_marketplace_record(
  'document','doc_a','verified','Reviewed exact bytes',
  ((select value->>'receipt_id' from receipt_a))::uuid
);
select pg_temp.assert_true(
  (select count(*)=1 from public.marketplace_reviews
   where review_receipt_id=((select value->>'receipt_id' from receipt_a))::uuid),
  'identical retry does not duplicate history'
);

-- Competing reuse of the consumed receipt is rejected.
select pg_temp.assert_true(
  pg_temp.denied(format(
    'select public.review_marketplace_record(%L,%L,%L,%L,%L::uuid)',
    'document','doc_a','rejected','Different decision',
    (select value->>'receipt_id' from receipt_a)
  )),
  'consumed receipt cannot authorize a different decision'
);

reset role;

-- A replacement is a distinct candidate row. A remains current until B is approved.
insert into public.trade_documents(
  id,organization_id,document_type,title,visibility,verification_status,
  storage_path,file_name,mime_type,file_size,evidence_sha256,evidence_version,
  delivery_status,supersedes_document_id
) values (
  'doc_b','evidence_seller','coa','Evidence B','buyers','pending',
  'evidence_seller/doc_b/b.pdf','b.pdf','application/pdf',100,
  repeat('b',64),2,'candidate','doc_a'
);

select pg_temp.assert_true(
  (select delivery_status='current' from public.trade_documents where id='doc_a')
  and
  (select delivery_status='candidate' from public.trade_documents where id='doc_b'),
  'A stays current while B is pending'
);

-- Approved bytes are immutable.
select pg_temp.assert_true(
  pg_temp.denied($q$
    update public.trade_documents
      set storage_path='evidence_seller/doc_a/replaced.pdf',
          evidence_sha256=repeat('c',64)
    where id='doc_a'
  $q$),
  'approved bytes cannot be replaced behind the approved row'
);

reset role;
select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',(select id::text from test_actors where label='platform'),
    'session_id','evidence-session-1',
    'role','authenticated'
  )::text,
  true
);
set local role authenticated;

create temporary table receipt_b as
select public.prepare_document_review('doc_b') as value;

select public.review_marketplace_record(
  'document','doc_b','verified','Reviewed replacement bytes',
  ((select value->>'receipt_id' from receipt_b))::uuid
);

select pg_temp.assert_true(
  (select delivery_status='superseded' and verification_status='verified'
   from public.trade_documents where id='doc_a'),
  'A becomes historical without rewriting approval'
);
select pg_temp.assert_true(
  (select delivery_status='current' and verification_status='verified'
   from public.trade_documents where id='doc_b'),
  'approved B becomes current'
);
select pg_temp.assert_true(
  (select count(*)=1 from public.marketplace_reviews
   where target_id='doc_a' and decision='verified'),
  'A approval history remains immutable'
);

-- Session binding: receipt from session 1 cannot be consumed in session 2.
reset role;
insert into public.trade_documents(
  id,organization_id,document_type,title,visibility,verification_status,
  storage_path,file_name,mime_type,file_size,evidence_sha256,evidence_version,delivery_status
) values (
  'doc_c','evidence_seller','coa','Evidence C','buyers','pending',
  'evidence_seller/doc_c/c.pdf','c.pdf','application/pdf',100,
  repeat('c',64),1,'candidate'
);

select set_config('request.jwt.claim.sub',(select id::text from test_actors where label='platform'),true);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',(select id::text from test_actors where label='platform'),
    'session_id','evidence-session-1',
    'role','authenticated'
  )::text,
  true
);
set local role authenticated;
create temporary table receipt_c as
select public.prepare_document_review('doc_c') as value;

reset role;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub',(select id::text from test_actors where label='platform'),
    'session_id','evidence-session-2',
    'role','authenticated'
  )::text,
  true
);
set local role authenticated;

select pg_temp.assert_true(
  pg_temp.denied(format(
    'select public.review_marketplace_record(%L,%L,%L,%L,%L::uuid)',
    'document','doc_c','verified','Wrong session',
    (select value->>'receipt_id' from receipt_c)
  )),
  'review receipt is session bound'
);

reset role;
rollback;
