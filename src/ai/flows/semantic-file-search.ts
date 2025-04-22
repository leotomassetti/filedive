'use server';

/**
 * @fileOverview Implements a flow for semantic search within uploaded files,
 * supporting intent-based queries using NLP.
 *
 * - semanticFileSearch - A function that handles the semantic file search process.
 * - SemanticFileSearchInput - The input type for the semanticFileSearch function.
 * - SemanticFileSearchOutput - The return type for the semanticFileSearch function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SemanticFileSearchInputSchema = z.object({
  query: z.string().describe('The intent-based search query, e.g., "find budget reports from 2023".'),
  fileTitles: z.array(z.string()).describe('The list of file titles to search within.'),
});
export type SemanticFileSearchInput = z.infer<typeof SemanticFileSearchInputSchema>;

const SemanticFileSearchOutputSchema = z.object({
  relevantFileTitles: z.array(z.string()).describe('The relevant file titles based on the intent of the query. If no relevant content is found, return an empty array.'),
});
export type SemanticFileSearchOutput = z.infer<typeof SemanticFileSearchOutputSchema>;

export async function semanticFileSearch(input: SemanticFileSearchInput): Promise<SemanticFileSearchOutput> {
  return semanticFileSearchFlow(input);
}

const semanticFileSearchPrompt = ai.definePrompt({
  name: 'semanticFileSearchPrompt',
  input: {
    schema: z.object({
      query: z.string().describe('The intent-based search query.'),
      fileTitles: z.array(z.string()).describe('The list of file titles to search within.'),
    }),
  },
  output: {
    schema: z.object({
      relevantFileTitles: z.array(z.string()).describe('The relevant file titles based on the intent of the query. If no relevant content is found, return an empty array.'),
    }),
  },
  prompt: `You are an expert search assistant specializing in semantic search.
Given a list of file titles and a search query, identify the file titles that are most relevant to the intent of the query.

Return an array of the relevant file titles. If no relevant content is found, return an empty array.

File Titles: {{{fileTitles}}}
Search Query: {{{query}}}

Return the relevant file titles:
  `,
});

const semanticFileSearchFlow = ai.defineFlow<
  typeof SemanticFileSearchInputSchema,
  typeof SemanticFileSearchOutputSchema
>({
  name: 'semanticFileSearchFlow',
  inputSchema: SemanticFileSearchInputSchema,
  outputSchema: SemanticFileSearchOutputSchema,
}, async input => {
  try {
    const {output} = await semanticFileSearchPrompt(input);
    if (!output?.relevantFileTitles) {
      return {relevantFileTitles: []};
    }
    return output;
  } catch (error: any) {
    console.error('Error during semantic file search:', error);
    return {relevantFileTitles: []};
  }
});
