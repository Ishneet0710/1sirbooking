
'use server';
/**
 * @fileOverview A Genkit flow for sending email notifications using Nodemailer with Gmail.
 *
 * - sendEmail - A function that sends an email.
 * - EmailInput - The input type for the sendEmail function.
 * - EmailOutput - The return type for the sendEmail function.
 */

import 'dotenv/config'; // Load environment variables from .env file
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import nodemailer from 'nodemailer';

// Environment variables for Gmail authentication
const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

console.log('[send-email-flow.ts] GMAIL_USER from process.env:', gmailUser ? 'FOUND' : 'NOT FOUND');
console.log('[send-email-flow.ts] GMAIL_APP_PASSWORD from process.env:', gmailAppPassword ? 'FOUND but hidden' : 'NOT FOUND');


let transporter: nodemailer.Transporter | null = null;

if (gmailUser && gmailAppPassword) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword, // Use App Password if 2FA is enabled
    },
  });
  console.log('[send-email-flow.ts] Nodemailer transporter initialized with Gmail.');
} else {
  console.warn('[send-email-flow.ts] Nodemailer transporter NOT initialized. GMAIL_USER or GMAIL_APP_PASSWORD missing. Email sending will be simulated.');
}


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
    if (!transporter) {
      const warningMessage = 'Nodemailer transporter not initialized. Gmail credentials might be missing or invalid. Email sending is disabled.';
      console.warn(`[send-email-flow.ts] ${warningMessage}`);
      // Fallback to console logging
      console.log('[send-email-flow.ts] SIMULATING Email Send:');
      console.log(`  To: ${input.to}`);
      console.log(`  Subject: ${input.subject}`);
      console.log(`  HTML Body: ${input.htmlBody}`);
      return {
        success: false,
        message: `${warningMessage} Email content logged to server console.`,
      };
    }

    const mailOptions = {
      from: `"Venue1SIR" <${gmailUser}>`, // Sender address (must be your Gmail address)
      to: input.to, // List of receivers
      subject: input.subject, // Subject line
      html: input.htmlBody, // HTML body
    };

    try {
      console.log(`[send-email-flow.ts] Attempting to send email via Nodemailer/Gmail from: ${mailOptions.from} to: ${input.to}`);
      const info = await transporter.sendMail(mailOptions);

      console.log('[send-email-flow.ts] Email successfully sent via Nodemailer/Gmail. Message ID:', info.messageId);
      return {
        success: true,
        message: 'Email sent successfully via Nodemailer/Gmail.',
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error('[send-email-flow.ts] Failed to send email via Nodemailer/Gmail. Error details:', err);
      return {
        success: false,
        message: `Failed to send email via Nodemailer/Gmail: ${err.message || 'Unknown Nodemailer error. Check server logs.'}`,
      };
    }
  }
);

