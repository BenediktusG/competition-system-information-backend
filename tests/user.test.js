import request from "supertest";
import app from "../src/app.js";
import prisma, { resetDb, disconnectDb, createTestUser } from "./utils.js";

beforeEach(resetDb);
afterAll(disconnectDb);

describe("User Management (Super Admin Restricted)", () => {
  // ==========================================
  // 1. GET /users (List All Users)
  // ==========================================
  describe("GET /users", () => {
    it("should return 401 if user is NOT authenticated", async () => {
      const res = await request(app).get("/api/v1/users");
      expect(res.statusCode).toBe(401);
    });

    it("should return 403 if user is STUDENT", async () => {
      const { cookie } = await createTestUser("STUDENT");
      const res = await request(app).get("/api/v1/users").set("Cookie", cookie);

      expect(res.statusCode).toBe(403); // Forbidden
    });

    it("should return 403 if user is ADMIN (Regular Admin)", async () => {
      // Admin biasa tidak boleh melihat daftar semua user (sesuai spec Super Admin Only)
      const { cookie } = await createTestUser("ADMIN");
      const res = await request(app).get("/api/v1/users").set("Cookie", cookie);

      expect(res.statusCode).toBe(403);
    });

    it("should return 200 and list of users if user is SUPER_ADMIN", async () => {
      // 1. Buat Super Admin
      const { cookie, user: superUser } = await createTestUser("SUPER_ADMIN");

      // 2. Buat beberapa user dummy tambahan
      await createTestUser("STUDENT");
      await createTestUser("ADMIN");

      const res = await request(app).get("/api/v1/users").set("Cookie", cookie);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3); // SuperAdmin + 2 dummy

      // Pastikan data sensitif tidak bocor
      expect(res.body[0].password).toBeUndefined();
      expect(res.body[0]).toHaveProperty("role");
    });
  });

  // ==========================================
  // 2. PUT /users/:id/role (Change Role)
  // ==========================================
  describe("PUT /users/:id/role", () => {
    // --- Helper: Setup Data ---
    const setupData = async () => {
      const superAdmin = await createTestUser("SUPER_ADMIN");
      const targetUser = await createTestUser("STUDENT"); // User yang akan diubah
      return { superAdmin, targetUser };
    };

    it("should allow SUPER_ADMIN to promote STUDENT to ADMIN", async () => {
      const { superAdmin, targetUser } = await setupData();

      const res = await request(app)
        .put(`/api/v1/users/${targetUser.user.id}/role`)
        .set("Cookie", superAdmin.cookie)
        .send({ role: "ADMIN" });

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(targetUser.user.id);
      expect(res.body.role).toBe("ADMIN");

      // Verifikasi Database
      const updatedUser = await prisma.user.findUnique({
        where: { id: targetUser.user.id },
      });
      expect(updatedUser.role).toBe("ADMIN");
    });

    it("should allow SUPER_ADMIN to demote ADMIN to STUDENT", async () => {
      const superAdmin = await createTestUser("SUPER_ADMIN");
      const targetAdmin = await createTestUser("ADMIN");

      const res = await request(app)
        .put(`/api/v1/users/${targetAdmin.user.id}/role`)
        .set("Cookie", superAdmin.cookie)
        .send({ role: "STUDENT" });

      expect(res.statusCode).toBe(200);
      expect(res.body.role).toBe("STUDENT");
    });

    // --- EDGE CASE: Unauthorized Access ---
    it("should forbid ADMIN from changing roles", async () => {
      const regularAdmin = await createTestUser("ADMIN");
      const targetUser = await createTestUser("STUDENT");

      const res = await request(app)
        .put(`/api/v1/users/${targetUser.user.id}/role`)
        .set("Cookie", regularAdmin.cookie)
        .send({ role: "ADMIN" });

      expect(res.statusCode).toBe(403); // Admin biasa tidak boleh
    });

    it("should forbid STUDENT from changing roles (Privilege Escalation Attempt)", async () => {
      const hackerStudent = await createTestUser("STUDENT");

      // Mencoba menaikkan role sendiri
      const res = await request(app)
        .put(`/api/v1/users/${hackerStudent.user.id}/role`)
        .set("Cookie", hackerStudent.cookie)
        .send({ role: "SUPER_ADMIN" });

      expect(res.statusCode).toBe(403);
    });

    // --- EDGE CASE: Invalid Input ---
    it("should return 400 if Role is invalid (ENUM validation)", async () => {
      const { superAdmin, targetUser } = await setupData();

      const res = await request(app)
        .put(`/api/v1/users/${targetUser.user.id}/role`)
        .set("Cookie", superAdmin.cookie)
        .send({ role: "GOD_MODE" }); // Role tidak ada di ENUM Prisma

      expect(res.statusCode).toBe(400); // Bad Request
    });

    it("should return 400 if Role field is missing", async () => {
      const { superAdmin, targetUser } = await setupData();

      const res = await request(app)
        .put(`/api/v1/users/${targetUser.user.id}/role`)
        .set("Cookie", superAdmin.cookie)
        .send({}); // Body kosong

      expect(res.statusCode).toBe(400);
    });

    // --- EDGE CASE: Not Found ---
    it("should return 404 if target user ID does not exist", async () => {
      const { cookie } = await createTestUser("SUPER_ADMIN");
      const fakeId = "cuid_palsu_yang_sangat_panjang";

      const res = await request(app)
        .put(`/api/v1/users/${fakeId}/role`)
        .set("Cookie", cookie)
        .send({ role: "ADMIN" });

      expect(res.statusCode).toBe(404);
    });
  });
});
