
import { KBDocument } from "../types";
// @ts-ignore
import * as pdfjsModule from 'pdfjs-dist';
// @ts-ignore
import * as mammothModule from 'mammoth';

// Handle potentially different import structures (ESM vs CJS interop)
const pdfjsLib = (pdfjsModule as any).default || pdfjsModule;
const mammoth = (mammothModule as any).default || mammothModule;

const GITHUB_API_BASE = "https://api.github.com/repos";

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    // Use CDNJS for the worker to ensure a standard classic script environment. 
    // This fixes "fake worker" and "window.pdfjsWorker is undefined" errors.
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export interface GitHubFileNode {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: "file" | "dir";
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export const fetchGitHubRepoContents = async (repoString: string): Promise<KBDocument[]> => {
  // Repo string format: "owner/repo"
  // Handles "https://github.com/user/repo", "user/repo", and removes ".git" suffix
  const cleanRepo = repoString.trim()
    .replace('https://github.com/', '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');
  
  try {
    const response = await fetch(`${GITHUB_API_BASE}/${cleanRepo}/contents`);
    
    if (!response.ok) {
        if (response.status === 404) throw new Error("Repository not found. Make sure it is public and the name is correct.");
        if (response.status === 403) throw new Error("Rate limit exceeded. Try again later.");
        throw new Error(`GitHub API Error: ${response.statusText}`);
    }

    const data: GitHubFileNode[] = await response.json();
    
    // Support Text and Binary document formats
    // We explicitly skip images (png, jpg) for knowledge base indexing as we need OCR for those.
    const supportedExtensions = ['.md', '.txt', '.json', '.csv', '.pdf', '.docx'];
    
    const validFiles = data.filter(item => 
        item.type === 'file' && 
        supportedExtensions.some(ext => item.name.toLowerCase().endsWith(ext))
    );

    const documents: KBDocument[] = await Promise.all(validFiles.map(async (file) => {
        let content = "";
        let type: KBDocument['type'] = 'txt';
        const fileName = file.name.toLowerCase();

        try {
            if (fileName.endsWith('.pdf')) {
                 type = 'pdf';
                 // Safety check for library loading
                 if (!pdfjsLib.getDocument) {
                    throw new Error("PDF Library not initialized correctly (getDocument missing)");
                 }

                 const res = await fetch(file.download_url);
                 const arrayBuffer = await res.arrayBuffer();
                 
                 // Parse PDF
                 // useSystemFonts helps avoid network errors for font files
                 const loadingTask = pdfjsLib.getDocument({ 
                     data: arrayBuffer,
                     useSystemFonts: true
                 });
                 const pdf = await loadingTask.promise;
                 
                 let fullText = "";
                 for (let i = 1; i <= pdf.numPages; i++) {
                     const page = await pdf.getPage(i);
                     const textContent = await page.getTextContent();
                     const pageText = textContent.items.map((item: any) => item.str).join(' ');
                     fullText += `[Page ${i}]\n${pageText}\n\n`;
                 }
                 content = fullText;

            } else if (fileName.endsWith('.docx')) {
                type = 'docx';
                const res = await fetch(file.download_url);
                const arrayBuffer = await res.arrayBuffer();
                
                // Parse DOCX
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                content = result.value;

            } else {
                // Handle text-based files
                const contentRes = await fetch(file.download_url);
                content = await contentRes.text();
                
                if (fileName.endsWith('.md')) type = 'md';
                else if (fileName.endsWith('.json')) type = 'json';
                else if (fileName.endsWith('.csv')) type = 'xlsx'; // Mapped to xlsx icon for CSV
            }
        } catch (e) {
            console.error(`Failed to parse file ${file.name}:`, e);
            content = `[System Error: Could not parse contents of ${file.name}. Error: ${(e as any).message}]`;
        }

        return {
            id: file.sha,
            name: file.name,
            type: type,
            content: content,
            source: 'github',
            url: file.html_url
        };
    }));

    return documents;

  } catch (error) {
    console.error("Error fetching GitHub repo:", error);
    throw error;
  }
};
