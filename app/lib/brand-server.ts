import 'server-only'
import { headers } from 'next/headers'
import { BRAND_HEADER, DEFAULT_BRAND, isBrand, type Brand } from './brand'

/** Marke aus dem Header, den proxy.ts setzt — für Server Components. */
export async function currentBrand(): Promise<Brand> {
  const value = (await headers()).get(BRAND_HEADER)
  return isBrand(value) ? value : DEFAULT_BRAND
}
