-- Evidence integrity receipt tests.
-- Run after 20260923153000_evidence_integrity_phase1.sql and
-- 20260923161000_evidence_review_receipts.sql on an isolated test database.
-- All fixtures roll back.

begin;
set local lock_timeout='3s';
set local statement_timeout='20s';

create function pg_temp.assert_true(ok boolean,label text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %',label; end if;
end $$;

create function pg_temp.expect_error(stmt text, expected_state text, expected_detail text default null)
returns boolean language plpgsql as $$
declare
  actual_state text;
  actual_detail text;
begin
  execute stmt;
  return false;
exception when others then
  get stacked diagnostics actual_state=returned_sqlstate,actual_detail=pg_exception_detail;
  return actual_state=expected_state
    and (expected_detail is null or actual_detail=expected_detail);
end $$;

-- Deterministic fixture identities.
insert into auth.users(id,email) values
('00000000-0000-0000-0000-00000000e001','evidence-platform@example.invalid'),
('00000000-0000-0000-0000-00000000e002','evidence-seller@example.invalid'),
('00000000-0000-0000-0000-00000000e004','evidence-platform-2@example.invalid');

insert into public.profiles(id,auth_user_id,name,email,role,status) values
('evidence-platform','00000000-0000-0000-0000-00000000e001','Evidence reviewer','evidence-platform@example.invalid','owner','active'),
('evidence-platform-2','00000000-0000-0000-0000-00000000e004','Evidence reviewer 2','evidence-platform-2@example.invalid','owner','active');

insert into epistable_private.marketplace_access(auth_user_id,access_role) values
('00000000-0000-0000-0000-00000000e001','platform_admin'),
('00000000-0000-0000-0000-00000000e004','platform_admin');

insert into auth.sessions(id,user_id) values
('00000000-0000-0000-0000-00000000e003','00000000-0000-0000-0000-00000000e001'),
('00000000-0000-0000-0000-00000000e005','00000000-0000-0000-0000-00000000e001'),
('00000000-0000-0000-0000-00000000e006','00000000-0000-0000-0000-00000000e004');

insert into public.organizations(id,type,name,country,verification_status)
values('evidence_seller','seller','Evidence Seller','India','verified');

insert into epistable_private.evidence_byte_bindings(
  id,organization_id,storage_path,content_sha256,uploader_id
) values
('00000000-0000-0000-0000-00000000e010','evidence_seller','evidence_seller/doc/main.pdf',repeat('a',64),'00000000-0000-0000-0000-00000000e002'),
('00000000-0000-0000-0000-00000000e011','evidence_seller','evidence_seller/doc/public.pdf',repeat('b',64),'00000000-0000-0000-0000-00000000e002'),
('00000000-0000-0000-0000-00000000e012','evidence_seller','evidence_seller/doc/null-digest.pdf',repeat('c',64),'00000000-0000-0000-0000-00000000e002'),
('00000000-0000-0000-0000-00000000e013','evidence_seller','evidence_seller/doc/other.pdf',repeat('d',64),'00000000-0000-0000-0000-00000000e002');

-- Schema invariants: public visibility and nullable digest must fail at the database layer.
select pg_temp.assert_true(
  pg_temp.expect_error(
    $q$insert into public.trade_documents(
      id,organization_id,document_type,title,visibility,verification_status,
      storage_path,evidence_version,content_sha256,evidence_binding_id
    ) values(
      'evidence_public','evidence_seller','coa','Public','public','pending',
      'evidence_seller/doc/public.pdf',1,repeat('b',64),'00000000-0000-0000-0000-00000000e011'
    )$q$,
    '23514',null
  ),
  'public visibility rejected by schema'
);

select pg_temp.assert_true(
  pg_temp.expect_error(
    $q$insert into public.trade_documents(
      id,organization_id,document_type,title,visibility,verification_status,
      storage_path,evidence_version,content_sha256,evidence_binding_id
    ) values(
      'evidence_null_digest','evidence_seller','coa','Null digest','buyers','pending',
      'evidence_seller/doc/null-digest.pdf',1,null,'00000000-0000-0000-0000-00000000e012'
    )$q$,
    '23502',null
  ),
  'NULL content_sha256 rejected by schema'
);

insert into public.trade_documents(
  id,organization_id,document_type,title,visibility,verification_status,
  storage_path,evidence_version,content_sha256,evidence_binding_id
) values
('evidence_doc','evidence_seller','coa','Evidence','buyers','pending',
 'evidence_seller/doc/main.pdf',1,repeat('a',64),'00000000-0000-0000-0000-00000000e010'),
('evidence_other','evidence_seller','coa','Other Evidence','buyers','pending',
 'evidence_seller/doc/other.pdf',1,repeat('d',64),'00000000-0000-0000-0000-00000000e013');

create temporary table captured_receipt(receipt_id uuid primary key, issued_expiry timestamptz not null);
grant select,insert,delete on captured_receipt to authenticated;

-- Reviewer 1, session 1.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000e001',true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000e001","session_id":"00000000-0000-0000-0000-00000000e003","role":"authenticated"}',
  true
);
set local role authenticated;

-- Generic document review path must fail closed.
select pg_temp.assert_true(
  pg_temp.expect_error(
    $q$select public.review_marketplace_record('document','evidence_doc','verified','Checked')$q$,
    '23514','EVIDENCE_REVIEW_RECEIPT_REQUIRED'
  ),
  'generic document review requires receipt'
);

insert into captured_receipt(receipt_id,issued_expiry)
select receipt_id,expires_at from public.prepare_marketplace_document_review('evidence_doc');

select pg_temp.assert_true(
  (select count(*)=1 from captured_receipt),
  'receipt issued'
);

-- Changing TTL config after issuance must not retroactively alter the live receipt.
reset role;
update epistable_private.evidence_integrity_config
set review_receipt_ttl_seconds=60
where singleton=true;
select pg_temp.assert_true(
  (select r.expires_at=c.issued_expiry and r.expires_at>now()
   from epistable_private.marketplace_review_receipts r
   join captured_receipt c on c.receipt_id=r.id),
  'TTL config change does not alter issued receipt expires_at'
);
update epistable_private.evidence_integrity_config
set review_receipt_ttl_seconds=300
where singleton=true;
set local role authenticated;

-- Wrong target.
select pg_temp.assert_true(
  pg_temp.expect_error(
    format(
      'select public.review_marketplace_document(''evidence_other'',''verified'',''Checked'',%L::uuid)',
      (select receipt_id from captured_receipt)
    ),
    '42501','EVIDENCE_REVIEW_TARGET_MISMATCH'
  ),
  'receipt cannot cross target document'
);

-- Wrong session, same reviewer.
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000e001","session_id":"00000000-0000-0000-0000-00000000e005","role":"authenticated"}',
  true
);
select pg_temp.assert_true(
  pg_temp.expect_error(
    format(
      'select public.review_marketplace_document(''evidence_doc'',''verified'',''Checked'',%L::uuid)',
      (select receipt_id from captured_receipt)
    ),
    '42501','EVIDENCE_REVIEW_SESSION_MISMATCH'
  ),
  'receipt cannot cross authenticated session'
);

-- Wrong reviewer.
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000e004',true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000e004","session_id":"00000000-0000-0000-0000-00000000e006","role":"authenticated"}',
  true
);
set local role authenticated;
select pg_temp.assert_true(
  pg_temp.expect_error(
    format(
      'select public.review_marketplace_document(''evidence_doc'',''verified'',''Checked'',%L::uuid)',
      (select receipt_id from captured_receipt)
    ),
    '42501','EVIDENCE_REVIEW_REVIEWER_MISMATCH'
  ),
  'receipt cannot cross reviewer'
);

-- Restore original reviewer/session.
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000e001',true);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000e001","session_id":"00000000-0000-0000-0000-00000000e003","role":"authenticated"}',
  true
);
set local role authenticated;

-- Version mismatch must not consume the receipt.
reset role;
update public.trade_documents set evidence_version=2 where id='evidence_doc';
set local role authenticated;
select pg_temp.assert_true(
  pg_temp.expect_error(
    format(
      'select public.review_marketplace_document(''evidence_doc'',''verified'',''Checked'',%L::uuid)',
      (select receipt_id from captured_receipt)
    ),
    '23514','EVIDENCE_REVIEW_VERSION_MISMATCH'
  ),
  'changed evidence version invalidates receipt'
);
reset role;
update public.trade_documents set evidence_version=1 where id='evidence_doc';
set local role authenticated;

-- Digest mismatch.
reset role;
update public.trade_documents set content_sha256=repeat('e',64) where id='evidence_doc';
set local role authenticated;
select pg_temp.assert_true(
  pg_temp.expect_error(
    format(
      'select public.review_marketplace_document(''evidence_doc'',''verified'',''Checked'',%L::uuid)',
      (select receipt_id from captured_receipt)
    ),
    '23514','EVIDENCE_REVIEW_DIGEST_MISMATCH'
  ),
  'changed digest invalidates receipt'
);
reset role;
update public.trade_documents set content_sha256=repeat('a',64) where id='evidence_doc';
set local role authenticated;

-- Workflow revision changes invalidate outstanding receipts.
reset role;
update epistable_private.evidence_integrity_config
set workflow_revision='evidence-review-v2'
where singleton=true;
set local role authenticated;
select pg_temp.assert_true(
  pg_temp.expect_error(
    format(
      'select public.review_marketplace_document(''evidence_doc'',''verified'',''Checked'',%L::uuid)',
      (select receipt_id from captured_receipt)
    ),
    '23514','EVIDENCE_REVIEW_WORKFLOW_REVISION_MISMATCH'
  ),
  'workflow revision invalidates outstanding receipt'
);
reset role;
update epistable_private.evidence_integrity_config
set workflow_revision='evidence-review-v1'
where singleton=true;
set local role authenticated;

-- Purpose is structurally fixed: an invalid purpose cannot be inserted.
reset role;
select pg_temp.assert_true(
  pg_temp.expect_error(
    $q$insert into epistable_private.marketplace_review_receipts(
      target_document_id,reviewer_id,session_id,purpose,workflow_revision,
      evidence_binding_id,evidence_version,content_sha256,storage_path,expires_at
    ) values(
      'evidence_doc','00000000-0000-0000-0000-00000000e001',
      '00000000-0000-0000-0000-00000000e003','other','evidence-review-v1',
      '00000000-0000-0000-0000-00000000e010',1,repeat('a',64),
      'evidence_seller/doc/main.pdf',now()+interval '5 minutes'
    )$q$,
    '23514',null
  ),
  'receipt purpose cannot leave document_review'
);
set local role authenticated;

-- Expiry is evaluated from the stored expires_at, not current TTL config.
reset role;
update epistable_private.marketplace_review_receipts
set issued_at=now()-interval '10 minutes',
    expires_at=now()-interval '1 second'
where id=(select receipt_id from captured_receipt);
set local role authenticated;
select pg_temp.assert_true(
  pg_temp.expect_error(
    format(
      'select public.review_marketplace_document(''evidence_doc'',''verified'',''Checked'',%L::uuid)',
      (select receipt_id from captured_receipt)
    ),
    '23514','EVIDENCE_REVIEW_RECEIPT_EXPIRED'
  ),
  'expired receipt rejected'
);
reset role;
update epistable_private.marketplace_review_receipts
set issued_at=now(),
    expires_at=now()+interval '5 minutes'
where id=(select receipt_id from captured_receipt);
set local role authenticated;

-- Successful consume. Reason normalization is trim(reason).
select public.review_marketplace_document(
  'evidence_doc','verified','  Checked exact bytes  ',
  (select receipt_id from captured_receipt)
);

select pg_temp.assert_true(
  (select verification_status='verified'
      and reviewed_evidence_version=1
      and reviewed_content_sha256=repeat('a',64)
   from public.trade_documents where id='evidence_doc'),
  'successful review binds exact version and digest'
);

select pg_temp.assert_true(
  (select count(*)=1
   from public.marketplace_reviews
   where target_kind='document'
     and target_id='evidence_doc'
     and receipt_id=(select receipt_id from captured_receipt)
     and decision='verified'
     and reason='Checked exact bytes'),
  'one receipt-bound history row written'
);

-- Identical retry, including harmless outer whitespace, is idempotent.
select public.review_marketplace_document(
  'evidence_doc','verified','Checked exact bytes',
  (select receipt_id from captured_receipt)
);
select pg_temp.assert_true(
  (select count(*)=1
   from public.marketplace_reviews
   where receipt_id=(select receipt_id from captured_receipt)),
  'identical retry does not create duplicate history'
);

-- Competing semantic mutation is rejected.
select pg_temp.assert_true(
  pg_temp.expect_error(
    format(
      'select public.review_marketplace_document(''evidence_doc'',''rejected'',''Different result'',%L::uuid)',
      (select receipt_id from captured_receipt)
    ),
    '23514','EVIDENCE_REVIEW_RECEIPT_ALREADY_CONSUMED'
  ),
  'different retry cannot reuse consumed receipt'
);

-- Removing the active session invalidates subsequent receipt use.
reset role;
delete from auth.sessions where id='00000000-0000-0000-0000-00000000e003';
set local role authenticated;
select pg_temp.assert_true(
  pg_temp.expect_error(
    format(
      'select public.review_marketplace_document(''evidence_doc'',''verified'',''Checked exact bytes'',%L::uuid)',
      (select receipt_id from captured_receipt)
    ),
    '42501','EVIDENCE_REVIEW_SESSION_INACTIVE'
  ),
  'revoked session fails closed even for otherwise-idempotent retry'
);

reset role;
select 'evidence integrity receipt assertions passed; fixtures rolled back' as result;
rollback;
