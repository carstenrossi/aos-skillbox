import { Router } from 'express'; const router = Router(); router.get('/', (req: any, res: any) => { res.json({ success: true, message: 'Users endpoint' }); }); export default router;
