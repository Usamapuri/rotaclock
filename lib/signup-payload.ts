import { z } from 'zod'
import type { OrganizationSignupPayload } from '@/lib/provision-tenant-from-signup'

export const signupPayloadSchema = z.object({
  organizationName: z.string().min(1),
  organizationEmail: z.string().email(),
  organizationPhone: z.string().min(1),
  organizationAddress: z.string().optional(),
  organizationCity: z.string().optional(),
  organizationState: z.string().optional(),
  organizationCountry: z.string().min(1),
  organizationIndustry: z.string().min(1),
  organizationSize: z.string().min(1),
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPhone: z.string().min(1),
  adminPassword: z.string().min(8),
  selectedPlan: z.string().min(1),
})

/**
 * Normalize JSONB / API signup payload for provisioning (trim text fields; do not trim password).
 */
export function parseSignupPayloadFromDb(raw: unknown): OrganizationSignupPayload {
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    parsed = JSON.parse(raw) as unknown
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid payload')
  }
  const o = parsed as Record<string, unknown>
  const trim = (s: unknown) => String(s ?? '').trim()
  const trimmed = {
    organizationName: trim(o.organizationName),
    organizationEmail: trim(o.organizationEmail),
    organizationPhone: trim(o.organizationPhone),
    organizationAddress: o.organizationAddress != null ? trim(o.organizationAddress) : undefined,
    organizationCity: o.organizationCity != null ? trim(o.organizationCity) : undefined,
    organizationState: o.organizationState != null ? trim(o.organizationState) : undefined,
    organizationCountry: trim(o.organizationCountry),
    organizationIndustry: trim(o.organizationIndustry),
    organizationSize: trim(o.organizationSize),
    adminFirstName: trim(o.adminFirstName),
    adminLastName: trim(o.adminLastName),
    adminEmail: trim(o.adminEmail),
    adminPhone: trim(o.adminPhone),
    adminPassword: String(o.adminPassword ?? ''),
    selectedPlan: trim(o.selectedPlan),
  }
  return signupPayloadSchema.parse(trimmed) as OrganizationSignupPayload
}
