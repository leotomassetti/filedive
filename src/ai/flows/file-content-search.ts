'use server';
/**
 * @fileOverview Implements a flow for searching content within uploaded files, supporting fuzzy matching and advanced search operators.
 *
 * - fileContentSearch - A function that handles the file content search process.
 * - FileContentSearchInput - The input type for the fileContentSearch function.
 * - FileContentSearchOutput - The return type for the fileContentSearch function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const FileContentSearchInputSchema = z.object({
  query: z.string().describe('The search query, which may include special operators such as quotation marks for exact match, asterisks for wildcards, tildes for synonyms, and minus signs for exclusion.'),
  fileContent: z.string().describe('The content of the file to search within.'),
  fileName: z.string().optional().describe('The name of the file being searched.'),
});
export type FileContentSearchInput = z.infer<typeof FileContentSearchInputSchema>;

const FileContentSearchOutputSchema = z.object({
  searchResults: z.string().describe('The relevant search results from the file content, accounting for fuzzy matching, typos, and advanced search operators. If no relevant content is found, return "No relevant content found."'),
});
export type FileContentSearchOutput = z.infer<typeof FileContentSearchOutputSchema>;

export async function fileContentSearch(input: FileContentSearchInput): Promise<FileContentSearchOutput> {
  return fileContentSearchFlow(input);
}

const fileContentSearchPrompt = ai.definePrompt({
  name: 'fileContentSearchPrompt',
  input: {
    schema: z.object({
      query: z.string().describe('The search query with potential typos and special operators.'),
      fileContent: z.string().describe('The content of the file to search within.'),
      fileName: z.string().optional().describe('The name of the file being searched.'),
    }),
  },
  output: {
    schema: z.object({
      searchResults: z.string().describe('The relevant search results from the file content, accounting for fuzzy matching, typos, and advanced search operators. If no relevant content is found, you MUST return "No relevant content found."'),
    }),
  },
  prompt: `You are an expert search assistant. Given a file content and a search query, find the most relevant search results from the file content, accounting for potential typos, fuzzy matching, and the following search operators:

  - Quotation marks ("): Force an exact match of the phrase within the quotes.
  - Asterisk (*): Use as a wildcard to represent any word or set of words.
  - Tilde (~): Search for the term followed by synonyms.
  - Minus sign (-): Exclude results containing the word following the minus sign.

  Many punctuation marks are ignored, like commas, periods, and semicolons. Focus on the words around them.
  
  If no relevant content is found, you MUST return "No relevant content found."
  DO NOT include surrounding context, and be concise.

  File Name: {{fileName}}
  File Content: {{{fileContent}}}
  Search Query: {{{query}}}

  Return the relevant search results:
  `,
});

const fileContentSearchFlow = ai.defineFlow<
  typeof FileContentSearchInputSchema,
  typeof FileContentSearchOutputSchema
>({
  name: 'fileContentSearchFlow',
  inputSchema: FileContentSearchInputSchema,
  outputSchema: FileContentSearchOutputSchema,
}, async input => {
  try {
    const {output} = await fileContentSearchPrompt(input);
    if (!output?.searchResults) {
      return {searchResults: 'No relevant content found.'};
    }
    return output;
  } catch (error: any) {
    console.error('Error during file content search:', error);
    return {searchResults: `Error during file content search. Please check the Genkit logs for more details. ${error.message}`};
  }
});
