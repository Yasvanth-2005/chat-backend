import { Router } from 'express';
import { getMessagesBetweenUsers } from '../controllers/MessageController';

const router = Router();

router.get('/:userId1/:userId2', getMessagesBetweenUsers);


export default router;
