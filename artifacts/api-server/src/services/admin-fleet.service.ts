/**
 * FleetService - Admin Fleet & Logistics Management
 * 
 * Centralized business logic for:
 * - Rider management & approvals
 * - Ride dispatch & tracking
 * - SOS alerts handling
 * - GPS location tracking
 * - Service zone management
 * - Rider penalties & ratings
 */

import { db } from "@workspace/db";
import {
  usersTable,
  ridesTable,
  ridersTable,
  rideRatingsTable,
  riderPenaltiesTable,
  locationLogsTable,
  serviceZonesTable,
  sosAlertsTable,
} from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { generateId } from "../lib/id.js";
import { logger } from "../lib/logger.js";

export interface RiderApprovalInput {
  riderId: string;
  approved: boolean;
  reason?: string;
}

export interface RideUpdateInput {
  rideId: string;
  status?: string;
  driverId?: string;
  estimatedFare?: number;
}

export interface RiderPenaltyInput {
  riderId: string;
  type: string; // "cancellation", "rating", "complaint"
  points: number;
  reason: string;
}

export interface ServiceZoneInput {
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  isActive: boolean;
}

export class FleetService {
  /**
   * Get rider details
   */
  static async getRiderDetails(riderId: string) {
    const [rider] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, riderId))
      .limit(1);

    if (!rider) {
      throw new Error("Rider not found");
    }

    // Get additional rider profile data if exists
    const [riderProfile] = await db
      .select()
      .from(ridersTable)
      .where(eq(ridersTable.id, riderId))
      .limit(1);

    return {
      ...rider,
      profile: riderProfile,
    };
  }

  /**
   * Approve pending rider
   */
  static async approveRider(input: RiderApprovalInput) {
    const [rider] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.riderId))
      .limit(1);

    if (!rider) {
      throw new Error("Rider not found");
    }

    await db
      .update(usersTable)
      .set({
        kycStatus: "approved",
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, input.riderId));

    logger.info({ riderId: input.riderId }, "[FleetService] Rider approved");

    return { success: true };
  }

  /**
   * Reject pending rider
   */
  static async rejectRider(input: RiderApprovalInput) {
    const [rider] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.riderId))
      .limit(1);

    if (!rider) {
      throw new Error("Rider not found");
    }

    await db
      .update(usersTable)
      .set({
        kycStatus: "rejected",
        status: "suspended",
        kycRejectReason: input.reason || "Not specified",
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, input.riderId));

    logger.info(
      { riderId: input.riderId, reason: input.reason },
      "[FleetService] Rider rejected"
    );

    return { success: true };
  }

  /**
   * Suspend/Unsuspend rider
   */
  static async setRiderStatus(
    riderId: string,
    status: "active" | "suspended" | "banned"
  ) {
    const [rider] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, riderId))
      .limit(1);

    if (!rider) {
      throw new Error("Rider not found");
    }

    await db
      .update(usersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(usersTable.id, riderId));

    logger.info({ riderId, status }, "[FleetService] Rider status changed");

    return { success: true };
  }

  /**
   * Add penalty points to rider
   */
  static async addPenalty(input: RiderPenaltyInput) {
    const [rider] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.riderId))
      .limit(1);

    if (!rider) {
      throw new Error("Rider not found");
    }

    const penaltyId = generateId();

    await db.insert(riderPenaltiesTable).values({
      id: penaltyId,
      riderId: input.riderId,
      type: input.type,
      points: input.points,
      reason: input.reason,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Get total penalty points
    const penalties = await db
      .select()
      .from(riderPenaltiesTable)
      .where(eq(riderPenaltiesTable.riderId, input.riderId));

    const totalPoints = penalties.reduce((sum, p) => sum + p.points, 0);

    // Auto-suspend if penalty threshold exceeded
    const SUSPENSION_THRESHOLD = 100; // configurable
    if (totalPoints >= SUSPENSION_THRESHOLD) {
      await db
        .update(usersTable)
        .set({ status: "suspended", updatedAt: new Date() })
        .where(eq(usersTable.id, input.riderId));

      logger.info(
        { riderId: input.riderId, totalPoints },
        "[FleetService] Rider auto-suspended (penalty threshold)"
      );
    }

    logger.info(
      { riderId: input.riderId, points: input.points, totalPoints },
      "[FleetService] Penalty added to rider"
    );

    return { success: true, totalPoints };
  }

  /**
   * Update ride status
   */
  static async updateRideStatus(rideId: string, status: string) {
    const [ride] = await db
      .select()
      .from(ridesTable)
      .where(eq(ridesTable.id, rideId))
      .limit(1);

    if (!ride) {
      throw new Error("Ride not found");
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      "searching": ["bargaining", "accepted", "cancelled"],
      "bargaining": ["accepted", "cancelled", "searching"],
      "accepted": ["arrived", "in_transit", "cancelled"],
      "arrived": ["in_transit"],
      "in_transit": ["completed", "cancelled"],
      "completed": [],
      "cancelled": [],
    };

    const currentStatus = ride.status || "searching";
    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      throw new Error(
        `Cannot transition from ${currentStatus} to ${status}`
      );
    }

    await db
      .update(ridesTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(ridesTable.id, rideId));

    logger.info({ rideId, status }, "[FleetService] Ride status updated");

    return { success: true };
  }

  /**
   * Get active rides with GPS tracking
   */
  static async getActiveRides() {
    const activeStatuses = ["accepted", "arrived", "in_transit"];

    const rides = await db
      .select({
        id: ridesTable.id,
        userId: ridesTable.userId,
        driverId: ridesTable.driverId,
        status: ridesTable.status,
        pickupLat: ridesTable.pickupLat,
        pickupLng: ridesTable.pickupLng,
        dropoffLat: ridesTable.dropoffLat,
        dropoffLng: ridesTable.dropoffLng,
        startTime: ridesTable.startTime,
        updatedAt: ridesTable.updatedAt,
      })
      .from(ridesTable)
      .where(eq(ridesTable.status, "in_transit"))
      .orderBy(desc(ridesTable.updatedAt));

    return rides.map((r) => ({
      ...r,
      startTime: r.startTime?.toISOString(),
      updatedAt: r.updatedAt?.toISOString(),
    }));
  }

  /**
   * Get SOS alerts list
   */
  static async getSosAlerts(limit: number = 100) {
    const alerts = await db
      .select()
      .from(sosAlertsTable)
      .orderBy(desc(sosAlertsTable.createdAt))
      .limit(Math.min(limit, 500));

    return alerts.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() || null,
    }));
  }

  /**
   * Mark SOS alert as resolved
   */
  static async resolveSosAlert(alertId: string) {
    const [alert] = await db
      .select()
      .from(sosAlertsTable)
      .where(eq(sosAlertsTable.id, alertId))
      .limit(1);

    if (!alert) {
      throw new Error("SOS alert not found");
    }

    await db
      .update(sosAlertsTable)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sosAlertsTable.id, alertId));

    logger.info({ alertId }, "[FleetService] SOS alert resolved");

    return { success: true };
  }

  /**
   * Get location history for a ride or user
   */
  static async getLocationHistory(
    riderId: string,
    limit: number = 100
  ) {
    const locations = await db
      .select()
      .from(locationLogsTable)
      .where(eq(locationLogsTable.userId, riderId))
      .orderBy(desc(locationLogsTable.createdAt))
      .limit(Math.min(limit, 500));

    return locations.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Create or update service zone
   */
  static async upsertServiceZone(input: ServiceZoneInput) {
    if (input.radiusKm <= 0) {
      throw new Error("Radius must be positive");
    }

    const zoneId = generateId();

    await db.insert(serviceZonesTable).values({
      id: zoneId,
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm,
      isActive: input.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info({ zoneId, name: input.name }, "[FleetService] Service zone created");

    return { success: true, zoneId };
  }

  /**
   * Get all service zones
   */
  static async getServiceZones() {
    const zones = await db
      .select()
      .from(serviceZonesTable)
      .orderBy(serviceZonesTable.name);

    return zones.map((z) => ({
      ...z,
      createdAt: z.createdAt.toISOString(),
      updatedAt: z.updatedAt.toISOString(),
    }));
  }

  /**
   * Get rider metrics
   */
  static async getRiderMetrics(riderId: string) {
    const [rider] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, riderId))
      .limit(1);

    if (!rider) {
      throw new Error("Rider not found");
    }

    // Get ride count
    const rides = await db
      .select()
      .from(ridesTable)
      .where(eq(ridesTable.driverId, riderId));

    // Get average rating
    const ratings = await db
      .select()
      .from(rideRatingsTable)
      .where(eq(rideRatingsTable.driverId, riderId));

    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    // Get penalties
    const penalties = await db
      .select()
      .from(riderPenaltiesTable)
      .where(eq(riderPenaltiesTable.riderId, riderId));

    const totalPenaltyPoints = penalties.reduce((sum, p) => sum + p.points, 0);

    return {
      totalRides: rides.length,
      completedRides: rides.filter((r) => r.status === "completed").length,
      cancelledRides: rides.filter((r) => r.status === "cancelled").length,
      averageRating: parseFloat(avgRating.toFixed(2)),
      totalRatings: ratings.length,
      penaltyPoints: totalPenaltyPoints,
      status: rider.status,
      kycStatus: rider.kycStatus,
    };
  }
}
