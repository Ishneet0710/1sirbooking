
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
      console.error('Resend client is not initialized. API key might be missing. Email sending is disabled.');
      // Fallback to console logging if Resend client isn't initialized
      console.log('SIMULATING Email Send (Resend Client Not Initialized / API Key Missing):');
      console.log(`To: ${input.to}`);
      console.log(`Subject: ${input.subject}`);
      console.log(`HTML Body: ${input.htmlBody}`);
      return {
        success: false,
        message: 'Resend client not initialized. API key missing. Email not sent. Logged to console.',
      };
    }

    try {
      // IMPORTANT: Update the 'from' address.
      // For testing without a verified domain, you can use 'Your App <onboarding@resend.dev>'.
      // For production, use an email address from a domain you have verified with Resend.
      const fromAddress = 'Venue1SIR <noreply@yourdomain.com>'; // REPLACE with your verified sending email or onboarding@resend.dev

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [input.to],
        subject: input.subject,
        html: input.htmlBody,
      });

      if (error) {
        console.error('Failed to send email via Resend:', error);
        return {
          success: false,
          message: `Failed to send email: ${error.message || 'Unknown Resend error'}`,
        };
      }

      console.log('Email successfully sent via Resend. Message ID:', data?.id);
      return {
        success: true,
        message: 'Email sent successfully via Resend.',
        messageId: data?.id,
      };
    } catch (err: any) {
      console.error('Error in sendEmailFlow with Resend:', err);
      return {
        success: false,
        message: `Error sending email: ${err.message || 'An unexpected error occurred'}`,
      };
    }
  }
);

