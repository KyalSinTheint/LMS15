-- ====================================================================
-- Migration: 20261103_product_icon_key.sql
-- Insurance icon chosen by administrators for each product (replaces the
-- uploaded product image in the learner hub, admin list and pamphlet).
-- NULL = icon inferred automatically from the product name.
-- Safe to re-run.
-- ====================================================================
ALTER TABLE public.product_knowledge_items ADD COLUMN IF NOT EXISTS icon_key TEXT;
