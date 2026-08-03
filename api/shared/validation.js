import { z } from "zod";

export const leadSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  workEmail: z.string().trim().email().max(254),
  organization: z.string().trim().min(1).max(160),
  role: z.string().trim().min(1).max(120),
  interest: z.string().trim().max(280).optional(),
  consent: z.literal(true),
  resourceRequested: z.string().trim().min(1).max(120).default("sample-chapter-1"),
  landingPage: z.string().optional(),
  referrer: z.string().max(500).optional(),
  utm: z.record(z.string().optional()).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  organization: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1).max(4000),
  consent: z.literal(true),
});
