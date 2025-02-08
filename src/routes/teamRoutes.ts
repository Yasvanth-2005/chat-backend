import { Router } from 'express';
import { createTeam, addMemberToTeam } from '../controllers/teamController';

const router = Router();

router.post('/create', createTeam);
router.post('/add-member', addMemberToTeam);

export default router;
