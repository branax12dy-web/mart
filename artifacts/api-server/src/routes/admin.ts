import { Router, type IRouter } from "express";
import { adminAuth } from "./admin-shared.js";
import authRoutes from "./admin/auth.js";
import usersRoutes from "./admin/users.js";
import ordersRoutes from "./admin/orders.js";
import ridesRoutes from "./admin/rides.js";
import financeRoutes from "./admin/finance.js";
import contentRoutes from "./admin/content.js";
import systemRoutes from "./admin/system.js";
import serviceZonesRoutes from "./admin/service-zones.js";
import deliveryAccessRoutes from "./admin/delivery-access.js";
import conditionsRoutes from "./admin/conditions.js";
import popupsRoutes from "./admin/popups.js";
import supportChatAdminRoutes from "./admin/support-chat.js";
import faqAdminRoutes from "./admin/faq.js";
import communicationAdminRoutes from "./admin/communication.js";
import loyaltyAdminRoutes from "./admin/loyalty.js";
import chatMonitorRoutes from "./admin/chat-monitor.js";
import wishlistAnalyticsRoutes from "./admin/wishlist-analytics.js";
import qrCodesRoutes from "./admin/qr-codes.js";
import weatherConfigRoutes from "./admin/weather-config.js";
import userAddressesRoutes from "./admin/user-addresses.js";

export {
  DEFAULT_PLATFORM_SETTINGS,
  ensureAuthMethodColumn,
  ensureRideBidsMigration,
  ensureOrdersGpsColumns,
  ensurePromotionsTables,
  ensureSupportMessagesTable,
  ensureFaqsTable,
  ensureCommunicationTables,
  ensureVendorLocationColumns,
  ensureVanServiceUpgrade,
  ensureWalletP2PColumns,
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
router.use("/service-zones", serviceZonesRoutes);
router.use(deliveryAccessRoutes);
router.use(conditionsRoutes);
router.use(popupsRoutes);
router.use("/support-chat", supportChatAdminRoutes);
router.use("/faqs", faqAdminRoutes);
router.use(communicationAdminRoutes);
router.use(loyaltyAdminRoutes);
router.use("/chat-monitor", chatMonitorRoutes);
router.use(wishlistAnalyticsRoutes);
router.use("/qr-codes", qrCodesRoutes);
router.use("/weather-config", weatherConfigRoutes);
router.use(userAddressesRoutes);

export default router;
