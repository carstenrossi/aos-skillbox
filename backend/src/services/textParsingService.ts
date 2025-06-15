import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import MarkdownIt from 'markdown-it';
import { logger } from '../utils/logger';
import { s3Service } from './s3Service';

export interface TextExtractionResult {
  success: boolean;
  text?: string;
  error?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    characterCount?: number;
    language?: string;
    extractionMethod: string;
  };
}

export interface ParsedContent {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount?: number;
    characterCount?: number;
    language?: string;
    extractionMethod: string;
  };
}

class TextParsingService {
  private md: MarkdownIt;

  constructor() {
    this.md = new MarkdownIt();
  }

  /**
   * Extract text from file based on content type
   */
  async extractText(
    s3Key: string, 
    contentType: string, 
    originalName: string
  ): Promise<TextExtractionResult> {
    try {
      logger.info(`📄 Starting text extraction for: ${originalName} (${contentType})`);

      // Download file from S3
      const fileBuffer = await this.downloadFileFromS3(s3Key);
      if (!fileBuffer) {
        return {
          success: false,
          error: 'Failed to download file from S3'
        };
      }

      // Extract text based on file type
      let result: ParsedContent;

      switch (contentType) {
        case 'application/pdf':
          result = await this.extractFromPDF(fileBuffer);
          break;
        
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          result = await this.extractFromWord(fileBuffer);
          break;
        
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          result = await this.extractFromExcel(fileBuffer);
          break;
        
        case 'application/vnd.ms-powerpoint':
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          result = await this.extractFromPowerPoint(fileBuffer);
          break;
        
        case 'text/plain':
          result = await this.extractFromText(fileBuffer);
          break;
        
        case 'text/markdown':
          result = await this.extractFromMarkdown(fileBuffer);
          break;
        
        default:
          // Try to extract based on file extension
          const extension = originalName.toLowerCase().split('.').pop();
          result = await this.extractByExtension(fileBuffer, extension || '');
      }

      logger.info(`✅ Text extraction completed for: ${originalName} (${result.text.length} characters)`);

      return {
        success: true,
        text: result.text,
        metadata: result.metadata
      };

    } catch (error: any) {
      logger.error(`❌ Text extraction failed for: ${originalName}`, error);
      return {
        success: false,
        error: error.message || 'Unknown extraction error'
      };
    }
  }

  /**
   * Download file from S3
   */
  private async downloadFileFromS3(s3Key: string): Promise<Buffer | null> {
    try {
      const fileData = await s3Service.downloadFile(s3Key);
      return fileData;
    } catch (error) {
      logger.error(`Failed to download file from S3: ${s3Key}`, error);
      return null;
    }
  }

  /**
   * Extract text from PDF
   */
  private async extractFromPDF(buffer: Buffer): Promise<ParsedContent> {
    try {
      const data = await pdfParse.default(buffer);
      
      return {
        text: data.text.trim(),
        metadata: {
          pageCount: data.numpages,
          wordCount: this.countWords(data.text),
          characterCount: data.text.length,
          extractionMethod: 'pdf-parse'
        }
      };
    } catch (error: any) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from Word documents
   */
  private async extractFromWord(buffer: Buffer): Promise<ParsedContent> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();
      
      return {
        text,
        metadata: {
          wordCount: this.countWords(text),
          characterCount: text.length,
          extractionMethod: 'mammoth'
        }
      };
    } catch (error: any) {
      throw new Error(`Word document parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from Excel files
   */
  private async extractFromExcel(buffer: Buffer): Promise<ParsedContent> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 65001 });
      let allText = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Use sheet_to_json for better text extraction
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '',
          raw: false 
        });
        
        // Convert JSON data to readable text
        let sheetText = '';
        (jsonData as any[][]).forEach((row: any[], rowIndex: number) => {
          if (row && Array.isArray(row) && row.length > 0) {
            const rowText = row
              .filter(cell => cell !== null && cell !== undefined && cell !== '')
              .join('\t');
            if (rowText.trim()) {
              sheetText += `${rowText}\n`;
            }
          }
        });
        
        if (sheetText.trim()) {
          allText += `\n=== ${sheetName} ===\n${sheetText}\n`;
        }
      });
      
      const text = allText.trim();
      
      return {
        text,
        metadata: {
          wordCount: this.countWords(text),
          characterCount: text.length,
          extractionMethod: 'xlsx-improved'
        }
      };
    } catch (error: any) {
      throw new Error(`Excel parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from PowerPoint (basic implementation)
   */
  private async extractFromPowerPoint(buffer: Buffer): Promise<ParsedContent> {
    try {
      // For now, we'll use a basic approach
      // In the future, we could use a more sophisticated library
      const text = 'PowerPoint text extraction not yet implemented. File uploaded successfully.';
      
      return {
        text,
        metadata: {
          wordCount: this.countWords(text),
          characterCount: text.length,
          extractionMethod: 'basic-ppt'
        }
      };
    } catch (error: any) {
      throw new Error(`PowerPoint parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromText(buffer: Buffer): Promise<ParsedContent> {
    try {
      const text = buffer.toString('utf-8').trim();
      
      return {
        text,
        metadata: {
          wordCount: this.countWords(text),
          characterCount: text.length,
          extractionMethod: 'utf-8-decode'
        }
      };
    } catch (error: any) {
      throw new Error(`Text file parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract text from Markdown files
   */
  private async extractFromMarkdown(buffer: Buffer): Promise<ParsedContent> {
    try {
      const markdownText = buffer.toString('utf-8');
      
      // Convert markdown to plain text (remove formatting)
      const htmlText = this.md.render(markdownText);
      const plainText = this.htmlToText(htmlText);
      
      return {
        text: plainText.trim(),
        metadata: {
          wordCount: this.countWords(plainText),
          characterCount: plainText.length,
          extractionMethod: 'markdown-it'
        }
      };
    } catch (error: any) {
      throw new Error(`Markdown parsing failed: ${error.message}`);
    }
  }

  /**
   * Extract text based on file extension
   */
  private async extractByExtension(buffer: Buffer, extension: string): Promise<ParsedContent> {
    switch (extension) {
      case 'txt':
      case 'log':
      case 'csv':
        return this.extractFromText(buffer);
      
      case 'md':
      case 'markdown':
        return this.extractFromMarkdown(buffer);
      
      case 'pdf':
        return this.extractFromPDF(buffer);
      
      case 'doc':
      case 'docx':
        return this.extractFromWord(buffer);
      
      case 'xls':
      case 'xlsx':
        return this.extractFromExcel(buffer);
      
      case 'ppt':
      case 'pptx':
        return this.extractFromPowerPoint(buffer);
      
      default:
        // Try as text file
        try {
          return await this.extractFromText(buffer);
        } catch {
          throw new Error(`Unsupported file extension: ${extension}`);
        }
    }
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Detect language (basic implementation)
   */
  private detectLanguage(text: string): string {
    // Basic language detection based on common words
    const germanWords = ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'mit', 'für', 'auf'];
    const englishWords = ['the', 'and', 'is', 'a', 'an', 'with', 'for', 'on', 'in', 'to'];
    
    const words = text.toLowerCase().split(/\s+/).slice(0, 100); // Check first 100 words
    
    let germanCount = 0;
    let englishCount = 0;
    
    words.forEach(word => {
      if (germanWords.includes(word)) germanCount++;
      if (englishWords.includes(word)) englishCount++;
    });
    
    if (germanCount > englishCount) return 'de';
    if (englishCount > germanCount) return 'en';
    return 'unknown';
  }

  /**
   * Check if file type supports text extraction
   */
  isTextExtractable(contentType: string, originalName: string): boolean {
    const supportedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/markdown'
    ];

    const supportedExtensions = [
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'txt', 'md', 'markdown', 'log', 'csv'
    ];

    const extension = originalName.toLowerCase().split('.').pop();
    
    return supportedTypes.includes(contentType) || 
           (!!extension && supportedExtensions.includes(extension));
  }
}

// Export singleton instance
export const textParsingService = new TextParsingService();
export default textParsingService; 