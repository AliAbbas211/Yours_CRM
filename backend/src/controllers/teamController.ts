import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prismaClient';

export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const teamMembers = await prisma.user.findMany({
      where: {
        role: {
          in: ['SUPER_ADMIN', 'MANAGER', 'SUPPORT']
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    res.json(teamMembers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTeamMember = async (req: Request, res: Response) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['SUPER_ADMIN', 'MANAGER', 'SUPPORT'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTeamMember = async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      return res.status(400).json({ message: 'Missing team member id' });
    }

    // Prevent deleting the last super admin, though for MVP just simple delete is fine
    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'Team member deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
