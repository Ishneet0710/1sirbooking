
import 'dotenv/config'; // Load environment variables from .env file
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// The GEMINI_API_KEY environment variable must be set for the googleAI() plugin.
// You can get an API key from Google AI Studio: https://makersuite.google.com/
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
