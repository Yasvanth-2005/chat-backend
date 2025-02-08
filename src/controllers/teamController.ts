import { Request, Response } from 'express';
import { Team } from '../models/Team';

export const createTeam = async (req: Request, res: Response) => {
  const { name } = req.body;

  try {
    const team = new Team({ name, members: [] });
    await team.save();
    res.status(201).json(team);
  } catch (error:any) {
    res.status(500).json({ error: error?.message });
  }
};

export const addMemberToTeam = async (req: Request, res: Response) => {
  const { teamId, userId } = req.body;

  try {
    const team = await Team.findByIdAndUpdate(
      teamId,
      { $addToSet: { members: userId } },
      { new: true }
    );
    res.status(200).json(team);
  } catch (error:any) {
    res.status(500).json({ error: error?.message });
  }
};
