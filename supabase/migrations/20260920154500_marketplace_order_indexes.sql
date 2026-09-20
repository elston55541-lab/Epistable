create index if not exists trade_orders_rfq_idx on public.trade_orders(rfq_id);
create index if not exists trade_orders_product_idx on public.trade_orders(product_id) where product_id is not null;
