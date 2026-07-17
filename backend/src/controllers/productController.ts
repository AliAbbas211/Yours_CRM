import { Request, Response } from 'express';
import prismaClient from '../prismaClient';
const prisma = prismaClient as any;
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../services/cloudinaryService';

// Resolves the effective clientId whether the caller is a CLIENT user
// (scoped to their own client) or a SUPER_ADMIN/MANAGER acting on behalf
// of a specific client (passed as ?clientId= or in the body).
const resolveClientId = (req: Request): string | null => {
  const user = (req as any).user;
  if (user?.role === 'CLIENT') return user.clientId;
  return (req.query.clientId as string) || req.body.clientId || null;
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(400).json({ message: 'clientId is required' });

    const { name, description, price, category } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: 'name and price are required' });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const images: string[] = [];
    const videos: string[] = [];

    for (const file of files) {
      const isVideo = file.mimetype.startsWith('video/');
      try {
        const url = await uploadBufferToCloudinary(file.buffer, isVideo ? 'video' : 'image', `products/${clientId}`);
        (isVideo ? videos : images).push(url);
      } catch (uploadErr: any) {
        console.error('Media upload failed for file', file.originalname, uploadErr.message);
        return res.status(502).json({ message: `Failed to upload ${file.originalname} to Cloudinary. Check Cloudinary credentials.` });
      }
    }

    const product = await prisma.product.create({
      data: {
        clientId,
        name,
        description: description || null,
        price: parseFloat(price),
        category: category || null,
        images,
        videos,
      } as any,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('createProduct error:', error);
    res.status(500).json({ message: 'Server error creating product' });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    if (!clientId) return res.status(400).json({ message: 'clientId is required' });

    const { search, category } = req.query as { search?: string; category?: string };

    const products = await prisma.product.findMany({
      where: {
        clientId,
        ...(category ? { category } : {}),
        ...(search
          ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] }
          : {}),
      } as any,
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    const { id } = req.params;
    const product = await prisma.product.findFirst({ where: { id, clientId } as any });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    const { id } = req.params;
    if (!clientId) return res.status(400).json({ message: 'clientId is required' });

    const existing = await prisma.product.findFirst({ where: { id, clientId } as any });
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    const { name, description, price, category, isActive, removeExistingMedia } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];

    let images = (existing as any).images as string[];
    let videos = (existing as any).videos as string[];

    // If the client explicitly wants to replace all media
    if (removeExistingMedia === 'true' || removeExistingMedia === true) {
      for (const url of [...images, ...videos]) {
        await deleteFromCloudinary(url);
      }
      images = [];
      videos = [];
    }

    if (files.length) {
      for (const file of files) {
        const isVideo = file.mimetype.startsWith('video/');
        try {
          const url = await uploadBufferToCloudinary(file.buffer, isVideo ? 'video' : 'image', `products/${clientId}`);
          (isVideo ? videos : images).push(url);
        } catch (uploadErr: any) {
          console.error('Media upload failed:', uploadErr.message);
          return res.status(502).json({ message: `Failed to upload ${file.originalname} to Cloudinary.` });
        }
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name ?? undefined,
        description: description ?? undefined,
        category: category ?? undefined,
        images,
        videos,
        price: price !== undefined ? parseFloat(price) : undefined,
        isActive: isActive !== undefined ? isActive === 'true' || isActive === true : undefined,
      } as any,
    });

    res.json(product);
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ message: 'Server error updating product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const clientId = resolveClientId(req);
    const { id } = req.params;

    const existing = await prisma.product.findFirst({ where: { id, clientId } as any });
    if (!existing) return res.status(404).json({ message: 'Product not found' });

    for (const url of [...(existing as any).images, ...(existing as any).videos]) {
      await deleteFromCloudinary(url);
    }

    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('deleteProduct error:', error);
    res.status(500).json({ message: 'Server error deleting product' });
  }
};

/**
 * PUBLIC (internal) endpoint for n8n — resolves a product mentioned by
 * approximate name to its exact record, so the bot can double check
 * media URLs / prices even if the system-prompt catalog snapshot is stale.
 * GET /api/bot/product-lookup?instance=xxx&name=xxx
 */
export const lookupProductForBot = async (req: Request, res: Response) => {
  try {
    const { instance, name } = req.query as { instance: string; name: string };
    if (!instance || !name) return res.status(400).json({ found: false });

    const client = await prisma.client.findFirst({ where: { instanceName: instance } });
    if (!client) return res.json({ found: false });

    const product = await prisma.product.findFirst({
      where: {
        clientId: client.id,
        isActive: true,
        name: { contains: name, mode: 'insensitive' },
      } as any,
    });

    if (!product) return res.json({ found: false });

    res.json({ found: true, product });
  } catch (error) {
    console.error('lookupProductForBot error:', error);
    res.status(500).json({ found: false });
  }
};
