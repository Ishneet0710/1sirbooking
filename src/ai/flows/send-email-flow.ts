
'use server';
/**
 * @fileOverview A Genkit flow for sending email notifications using Resend.
 *
 * - sendEmail - A function that sends an email.
 * - EmailInput - The input type for the sendEmail function.
 * - EmailOutput - The return type for the sendEmail function.
 */

import 'dotenv/config'; // Load environment variables from .env file
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Resend } from 'resend';

// Initialize Resend with your API key.
// IMPORTANT: Store your API key in an environment variable (e.g., RESEND_API_KEY)
// and ensure it's configured for your deployment environment (e.g., Firebase secrets).
// DO NOT hardcode the API key here.
// The .env.local file (for local development) or Firebase secrets (for deployment)
// should contain: RESEND_API_KEY=your_actual_key
const resendApiKey = process.env.RESEND_API_KEY;

// Log whether the API key was found (for debugging purposes)
console.log('[send-email-flow.ts] RESEND_API_KEY from process.env:', resendApiKey ? 'FOUND' : 'NOT FOUND');

const resend = resendApiKey ? new Resend(resendApiKey) : null;


const EmailInputSchema = z.object({
  to: z.string().email().describe('The recipient email address.'),
  subject: z.string().describe('The subject of the email.'),
  htmlBody: z.string().describe('The HTML body content of the email.'),
});
export type EmailInput = z.infer<typeof EmailInputSchema>;

const EmailOutputSchema = z.object({
  success: z.boolean().describe('Whether the email was sent successfully.'),
  message: z.string().describe('A message indicating the outcome.'),
  messageId: z.string().optional().describe('The message ID from the email provider if successful.'),
});
export type EmailOutput = z.infer<typeof EmailOutputSchema>;

// This is the wrapper function you'll call from your Next.js page
export async function sendEmail(input: EmailInput): Promise<EmailOutput> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: EmailInputSchema,
    outputSchema: EmailOutputSchema,
  },
  async (input: EmailInput): Promise<EmailOutput> => {
    if (!resend) {
      const warningMessage = 'Resend client not initialized. API key might be missing or invalid. Email sending is disabled.';
      console.warn(`[send-email-flow.ts] ${warningMessage}`);
      // Fallback to console logging if Resend client isn't initialized
      console.log('[send-email-flow.ts] SIMULATING Email Send:');
      console.log(`  To: ${input.to}`);
      console.log(`  Subject: ${input.subject}`);
      console.log(`  HTML Body: ${input.htmlBody}`);
      return {
        success: false,
        message: `${warningMessage} Email content logged to server console.`,
      };
    }

    try {
      // IMPORTANT: Update the 'from' address.
      // For testing without a verified domain, you can use 'Your App <onboarding@resend.dev>'.
      // For production, use an email address from a domain you have verified with Resend.
      // Example: const fromAddress = 'Your App Name <you@yourverifieddomain.com>';
      const fromAddress = 'Venue1SIR <onboarding@resend.dev>'; 
      console.log(`[send-email-flow.ts] Attempting to send email via Resend from: ${fromAddress} to: ${input.to}`);

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [input.to], // Resend API expects 'to' to be an array of strings
        subject: input.subject,
        html: input.htmlBody,
      });

      if (error) {
        console.error('[send-email-flow.ts] Failed to send email via Resend. Error details:', JSON.stringify(error, null, 2));
        return {
          success: false,
          message: `Failed to send email via Resend: ${error.message || 'Unknown Resend error. Check server logs.'}`,
        };
      }

      console.log('[send-email-flow.ts] Email successfully sent via Resend. Message ID:', data?.id);
      return {
        success: true,
        message: 'Email sent successfully via Resend.',
        messageId: data?.id,
      };
    } catch (err: any) {
      console.error('[send-email-flow.ts] Error in sendEmailFlow with Resend:', err);
      return {
        success: false,
        message: `Error sending email: ${err.message || 'An unexpected error occurred. Check server logs.'}`,
      };
    }
  }
);
