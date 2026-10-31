-- ====================================================================
-- Migration: 20261102_product_pamphlet_cover.sql
-- Pamphlet cover image for the learner "Pamphlet View" of a product.
-- Uploaded by administrators (stored in the product-images bucket).
-- Safe to re-run.
-- ====================================================================
ALTER TABLE public.product_knowledge_items ADD COLUMN IF NOT EXISTS pamphlet_cover_url TEXT;
