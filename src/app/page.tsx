"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Toaster } from "@/components/ui/toaster";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { semanticFileSearch } from "@/ai/flows/semantic-file-search";
import { fileContentSearch } from "@/ai/flows/file-content-search";
import { Checkbox } from "@/components/ui/checkbox";

interface UploadedFile {
  id: string;
  name: string;
  uploadDate: Date;
  content: string;
  type?: string; // Optional file type
  index: string; // Index file by content
}

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [showLargeFileWarning, setShowLargeFileWarning] = useState(false);
  const [filesFound, setFilesFound] = useState<string[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      let hasLargeFile = false;

      for (const file of acceptedFiles) {
        if (
          uploadedFiles.some((uploadedFile) => uploadedFile.name === file.name)
        ) {
          toast({
            title: "File Already Uploaded",
            description: `File "${file.name}" has already been uploaded.`,
            variant: "destructive",
          });
          continue;
        }

        if (file.size > 1000000000) {
          hasLargeFile = true;
          setShowLargeFileWarning(true);
          continue;
        }
        if (
          file.type?.startsWith("image") ||
          file.type?.startsWith("audio") ||
          file.type?.startsWith("video")
        ) {
          toast({
            title: "File Type Unsupported",
            description: "The app will accept this type soon!",
            variant: "destructive",
          });
          continue;
        }
        if (!isValidFileType(file)) {
          toast({
            title: "Unsupported File Type",
            description: `The app will accept this type soon!`,
            variant: "destructive",
          });
          continue;
        }
        setUploadingFiles((prev) => [...prev, file.name]);

        let fileContent: string = await readFileContent(file);

        const newFile: UploadedFile = {
          id: crypto.randomUUID(),
          name: file.name,
          uploadDate: new Date(),
          content: fileContent,
          index: fileContent, // indexing the content
        };
        setUploadedFiles((prevFiles) => [...prevFiles, newFile]);
        setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
        toast({
          title: "File Uploaded",
          description: `File ${file.name} uploaded successfully.`,
        });
      }
      if (hasLargeFile) {
        toast({
          title: "Large File Unsupported",
          description:
            "Large files are unsupported (e.g., chunked uploads for files >1GB). Support for large files is coming soon.",
          variant: "destructive",
        });
        setShowLargeFileWarning(false);
      }
    },
    [toast, uploadedFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "text/csv": [".csv"],
      "text/x-c": [".c"],
      "text/x-c++": [".cpp", ".cc", ".cxx"],
      "text/x-python": [".py"],
      "text/x-java-source": [".java"],
      "text/typescript": [".ts"],
      "text/javascript": [".js"],
      "text/html": [".html"],
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
      "video/quicktime": [".mov"],
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    validator: (fileOrNull: File | null) => {
      if (!fileOrNull || !fileOrNull.name)
        return { code: "missing-file", message: "No file selected." };
      return null;
    },
  });

  const isValidFileType = (file: File): boolean => {
    if (!file) return false;
    const allowedExtensions = [
      "pdf",
      "docx",
      "txt",
      "md",
      "xls",
      "xlsx",
      "csv",
      "c",
      "cpp",
      "cc",
      "cxx",
      "py",
      "java",
      "ts",
      "js",
      "html",
      "mp3",
      "wav",
      "mp4",
      "webm",
      "mov",
      "jpeg",
      "jpg",
      "png",
      "webp",
    ];
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";
    return allowedExtensions.includes(fileExtension);
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileType = file.name.split(".").pop()?.toLowerCase();
        let content = event.target?.result as string;

        if (fileType === "csv") {
          const lines = content.split("\n");
          content = lines.map((line) => line.split(",").join(" ")).join("\n");
        } else if (fileType === "xlsx") {
          content = "XLSX file content - requires additional library to parse.";
        }

        resolve(content);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsText(file);
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Empty Search Query",
        description: "Please enter a search query.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setHasSearched(true);
    setFilesFound([]);

    const results: string[] = [];

    try {
      const searchPromises = uploadedFiles.map(async (file) => {
        let contentSearchResult;

        if (useSemanticSearch && semanticFileSearch) {
          const semanticSearchResult = await semanticFileSearch({
            query: searchQuery,
            fileTitles: [file.name],
          });

          if (
            semanticSearchResult &&
            semanticSearchResult.relevantFileTitles &&
            semanticSearchResult.relevantFileTitles.length > 0
          ) {
            contentSearchResult = await fileContentSearch({
              query: searchQuery,
              fileContent: file.content,
              fileName: file.name,
            });
          } else {
            return null;
          }
        } else {
          contentSearchResult = await fileContentSearch({
            query: searchQuery,
            fileContent: file.content,
            fileName: file.name,
          });
        }
        if (contentSearchResult && contentSearchResult.searchResults) {
          if (
            !contentSearchResult.searchResults.includes(
              "Error during file content search"
            ) &&
            contentSearchResult.searchResults !== "No relevant content found."
          ) {
            return file.name;
          }
        }
        return null;
      });
      const fileNames = await Promise.all(searchPromises);

      fileNames.forEach((fileName) => {
        if (fileName) results.push(fileName);
      });

      setFilesFound(results);
    } catch (error: any) {
      console.error("Search failed:", error);
      toast({
        title: "Search Failed",
        description: `Search failed. ${
          error?.message ? error.message : "An unexpected error occurred."
        }`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const filteredFiles = uploadedFiles.filter((file) => {
    return searchQuery ? filesFound.includes(file.name) : true;
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const shouldShowNoFilesMessage =
    hasSearched && filteredFiles.length === 0 && uploadedFiles.length > 0;

  return (
    <div className="container mx-auto p-4">
      <Toaster />
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>FileDive</CardTitle>
            <CardDescription>
              Upload and search your files easily!
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeSwitcher />
          </div>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer mb-4"
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <>
                <Icons.upload className="h-6 w-6 mb-2" />
                <p>Drag and drop some files here, or click to select files</p>
              </>
            )}
          </div>
          {showLargeFileWarning && (
            <p className="text-sm text-red-500 mt-2">
              Large files are unsupported (e.g., chunked uploads for files {">"}
              1GB). Support for large files is coming soon.
            </p>
          )}
          <Accordion type="single" collapsible className="mb-4">
            <AccordionItem value="usage">
              <AccordionTrigger>How to Search</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <p>
                    Upload your files via drag and drop or file selection, then
                    use the search bar to find content within them. Here are
                    some tips for effective searching:
                  </p>
                  <ul>
                    <li>
                      Type your search query and press Enter or click the Search
                      button.
                    </li>
                    <li>
                      To search for an exact phrase, enclose the phrase in
                      quotation marks ("). Example: "exact phrase".
                    </li>
                    <li>
                      Use an asterisk (*) as a wildcard to represent any word or
                      set of words. Example: search *.
                    </li>
                    <li>
                      Use a tilde (~) to search for the term followed by
                      synonyms. Example: intelligent~.
                    </li>
                    <li>
                      Use a minus sign (-) to exclude results containing the
                      word following the minus sign. Example: AI -robots.
                    </li>
                    <li>
                      Punctuation marks like commas, periods, and semicolons are
                      ignored; focus on the key words.
                    </li>
                    {semanticFileSearch && (
                      <li>
                        For semantic search, try intent-based queries like "find
                        budget reports from 2023".
                      </li>
                    )}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Input
              type="text"
              placeholder="Search file content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow"
              onKeyDown={handleKeyDown}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <>
                  <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
            <Checkbox
              id="semantic-search"
              checked={useSemanticSearch}
              onCheckedChange={(checked) =>
                setUseSemanticSearch(checked || false)
              }
            />
            <label
              htmlFor="semantic-search"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Semantic Search
            </label>
          </div>
          {filesFound.length > 0 && (
            <div ref={resultsRef}>
              <h3>Results</h3>
              <ul>
                {filteredFiles.map((file) => (
                  <li key={file.id} className="mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Icons.fileText className="inline-block h-4 w-4 mr-1" />
                        {file.name}
                      </div>
                      {uploadingFiles.includes(file.name) && (
                        <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {shouldShowNoFilesMessage && <p></p>}
        </CardContent>
      </Card>
    </div>
  );
}

const toBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

function isValidBase64(str: string): boolean {
  try {
    atob(str);
    return true;
  } catch (e) {
    return false;
  }
}
