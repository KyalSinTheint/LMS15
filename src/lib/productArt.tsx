/**
 * The product picture as a component: every product gets its own 3D
 * illustration (see product3d.tsx), the same on every page.
 */
import React from 'react';
import { useLms } from '../context/LmsContext';
import { assignProductArt, Product3DArt, productArtCandidates, type ArtProduct } from './product3d';

/** The picture each product gets (same on every page). */
export function useProductArtMap() {
  const { products } = useLms();
  return React.useMemo(() => assignProductArt(products), [products]);
}

/** The 3D illustration that matches a product, never the same as another product's. */
export const Product3D: React.FC<{ product: ArtProduct; className?: string }> = ({ product, className }) => {
  const map = useProductArtMap();
  const art = (product.id && map.get(product.id)) || productArtCandidates(product)[0];
  return <Product3DArt scene={art} className={className} />;
};
