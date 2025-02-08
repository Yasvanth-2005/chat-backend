import { Router } from 'express';
import { createUser, getUsersInTeam } from '../controllers/UserController';
import { create } from 'domain';

const router = Router();

router.get('/team/:teamId/users', getUsersInTeam);
router.post('/create'  , createUser)


export default router;
