import type { InferSelectModel } from "drizzle-orm";
import type { ridesTable, usersTable } from "@workspace/db/schema";

declare global {
  namespace Express {
    interface Request {
      customerId?: string;
      customerPhone?: string;
      customerUser?: InferSelectModel<typeof usersTable>;
      vendorId?: string;
      vendorUser?: InferSelectModel<typeof usersTable>;
      riderId?: string;
      riderUser?: InferSelectModel<typeof usersTable>;
      adminId?: string;
      adminRole?: string;
      adminName?: string;
      adminIp?: string;
      ride?: InferSelectModel<typeof ridesTable>;
    }
  }
}
