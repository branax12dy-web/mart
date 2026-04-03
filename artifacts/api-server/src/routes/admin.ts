import { Router, type IRouter } from "express";
import { adminAuth } from "./admin-shared.js";
import authRoutes from "./admin/auth.js";
import usersRoutes from "./admin/users.js";
import ordersRoutes from "./admin/orders.js";
import ridesRoutes from "./admin/rides.js";
import financeRoutes from "./admin/finance.js";
import contentRoutes from "./admin/content.js";
import systemRoutes from "./admin/system.js";

export {
  DEFAULT_PLATFORM_SETTINGS,
  ensureAuthMethodColumn,
  getPlatformSettings,
  getAdminSecret,
  adminAuth,
  DEFAULT_RIDE_SERVICES,
  ensureDefaultRideServices,
  ensureDefaultLocations,
  type AdminRequest,
} from "./admin-shared.js";

const router: IRouter = Router();

router.use(authRoutes);

router.use(adminAuth);

router.use(usersRoutes);
router.use(ordersRoutes);
router.use(ridesRoutes);
router.use(financeRoutes);
router.use(contentRoutes);
router.use(systemRoutes);

export default router;
