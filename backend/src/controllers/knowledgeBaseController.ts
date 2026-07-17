import { Request, Response } from 'express';
import path from 'path';
import prisma from '../prismaClient';
import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export const createKnowledgeBase = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    let { title, type, content, category } = req.body;
    let fileUrl = null;
    let fileType = null;

    if (type === 'URL' && content) {
      try {
        const response = await axios.get(content);
        const $ = cheerio.load(response.data);
        
        // Remove unwanted elements
        $('script, style, noscript, iframe, img, svg, video, nav, footer, header').remove();
        
        // Replace links with just their text to avoid messy [Text](url) in the knowledge base
        $('a').each((i, el) => {
          $(el).replaceWith($(el).text());
        });
        
        const turndownService = new TurndownService({ headingStyle: 'atx' });
        const markdown = turndownService.turndown($('body').html() || '');
        
        const defaultTitle = $('title').text().trim() || content;
        
        const chunks: {title: string, content: string}[] = [];
        const lines = markdown.split('\n');
        
        let currentChunkTitle = title || defaultTitle;
        let currentChunkContent = '';
        
        for (const line of lines) {
          const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
          if (headingMatch) {
            if (currentChunkContent.trim()) {
              chunks.push({
                title: currentChunkTitle,
                content: currentChunkContent.trim()
              });
            }
            currentChunkTitle = headingMatch[2].trim();
            currentChunkContent = '';
          } else {
            currentChunkContent += line + '\n';
          }
        }
        
        if (currentChunkContent.trim()) {
          chunks.push({
            title: currentChunkTitle,
            content: currentChunkContent.trim()
          });
        }

        if (chunks.length === 0) {
           return res.status(400).json({ message: 'No content found on the page' });
        }
        
        const records = chunks.map(chunk => ({
          clientId,
          title: chunk.title.substring(0, 255),
          type: 'URL' as const,
          content: chunk.content,
          category,
          fileType: null,
          fileUrl: content
        }));
        
        await prisma.knowledgeBase.createMany({
          data: records
        });
        
        return res.status(201).json({ message: `Created ${chunks.length} entries from URL` });
      } catch (err) {
        console.error('Failed to scrape URL:', err);
        return res.status(400).json({ message: 'Failed to extract data from the provided URL. Make sure it is a valid website.' });
      }
    } else if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      const ext = path.extname(req.file.originalname).toLowerCase();
      
      if (['.pdf', '.pptx', '.xls', '.xlsx', '.doc', '.docx'].includes(ext)) {
        fileType = 'document';
        type = 'PDF';
      } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
        fileType = 'picture';
        type = 'FAQ'; 
      } else if (['.mp4', '.heic', '.mov'].includes(ext)) {
        fileType = 'video';
        type = 'FAQ'; 
      } else {
        fileType = 'document';
        type = 'FAQ';
      }
      
      if (!title) {
        title = req.file.originalname;
      }
    }

    if (!type) type = 'FAQ';

    const kb = await prisma.knowledgeBase.create({
      data: {
        clientId,
        title,
        type,
        content,
        category,
        fileType,
        fileUrl
      }
    });

    res.status(201).json(kb);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getKnowledgeBases = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    if (!clientId) return res.status(403).json({ message: 'Client ID required' });

    const kbs = await prisma.knowledgeBase.findMany({
      where: { clientId }
    });

    res.json(kbs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateKnowledgeBase = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    const id = req.params.id as string;
    const updates = req.body;

    const kb = await prisma.knowledgeBase.updateMany({
      where: { id, clientId },
      data: updates
    });

    if (kb.count === 0) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    res.json({ message: 'Knowledge base updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteKnowledgeBase = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user?.clientId;
    const id = req.params.id as string;

    const kb = await prisma.knowledgeBase.deleteMany({
      where: { id, clientId }
    });

    if (kb.count === 0) {
      return res.status(404).json({ message: 'Knowledge base not found' });
    }

    res.json({ message: 'Knowledge base deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
