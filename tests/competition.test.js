import request from "supertest";
import app from "../src/app.js";
import prisma, { resetDb, disconnectDb, createTestUser } from "./utils.js";

beforeEach(resetDb);
afterAll(disconnectDb);

// --- Helpers ---
const createCategory = async (name = "Technology") => {
  return await prisma.category.create({ data: { name } });
};

const mockPosterBuffer = Buffer.from("fake-image-content");

describe("Competition Management Integration Tests", () => {
  // ==========================================
  // 1. POST /competitions (Create & Submission)
  // ==========================================
  describe("POST /competitions", () => {
    // [UPDATED] Student CAN now create competition (Status: PENDING)
    it("should allow STUDENT to submit competition (Default: PENDING)", async () => {
      const { cookie, user } = await createTestUser("STUDENT");
      const category = await createCategory();

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const res = await request(app)
        .post("/api/v1/competitions")
        .set("Cookie", cookie)
        .field("title", "Student Submission")
        .field("shortDescription", "Lomba coding")
        .field("fullDescription", "Deskripsi panjang")
        .field("organizer", "BEM")
        .field("registrationStartDate", startDate.toISOString())
        .field("registrationEndDate", endDate.toISOString())
        .field("eventDate", endDate.toISOString())
        .field("registrationLink", "https://bit.ly/lomba")
        .field("contactPerson", "0812345678")
        .field("categoryId", category.id)
        .field("registrationFee", "Gratis")
        .attach("poster", mockPosterBuffer, "poster.jpg");

      expect(res.statusCode).toBe(201);

      // Verify Response Structure
      expect(res.body.message).toContain("Menunggu persetujuan Admin"); // Custom message check
      expect(res.body.data.title).toBe("Student Submission");

      // Verify Database State
      const dbComp = await prisma.competition.findUnique({
        where: { id: res.body.data.id },
      });
      expect(dbComp.status).toBe("PENDING"); // MUST be pending
      expect(dbComp.authorId).toBe(user.id); // Must link to author
    });

    // [UPDATED] Admin creation (Status: ACCEPTED)
    it("should allow ADMIN to publish competition directly (Default: ACCEPTED)", async () => {
      const { cookie, user } = await createTestUser("ADMIN");
      const category = await createCategory();

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);

      const res = await request(app)
        .post("/api/v1/competitions")
        .set("Cookie", cookie)
        .field("title", "Admin Event")
        .field("shortDescription", "Official")
        .field("fullDescription", "Desc")
        .field("organizer", "Faculty")
        .field("registrationStartDate", startDate.toISOString())
        .field("registrationEndDate", endDate.toISOString())
        .field("eventDate", endDate.toISOString())
        .field("registrationLink", "https://link.com")
        .field("contactPerson", "08111")
        .field("categoryId", category.id)
        .attach("poster", mockPosterBuffer, "poster.jpg");

      expect(res.statusCode).toBe(201);

      // Verify Database State
      const dbComp = await prisma.competition.findUnique({
        where: { id: res.body.data.id },
      });
      expect(dbComp.status).toBe("ACCEPTED"); // Admin bypasses moderation
      expect(dbComp.authorId).toBe(user.id);
    });

    it("should return 400 if Registration End Date is BEFORE Start Date", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await createCategory();

      const res = await request(app)
        .post("/api/v1/competitions")
        .set("Cookie", cookie)
        .field("title", "Logic Error Comp")
        .field("shortDescription", "Desc")
        .field("fullDescription", "Desc")
        .field("organizer", "Org")
        .field("registrationStartDate", "2025-12-31")
        .field("registrationEndDate", "2025-01-01") // Error here
        .field("eventDate", "2026-01-01")
        .field("registrationLink", "http://link.com")
        .field("contactPerson", "08111")
        .field("categoryId", category.id)
        .attach("poster", mockPosterBuffer, "poster.jpg");

      expect(res.statusCode).toBe(400);
    });
  });

  // ==========================================
  // 2. GET /competitions (Public List - Only ACCEPTED)
  // ==========================================
  describe("GET /competitions", () => {
    it("should ONLY return ACCEPTED competitions", async () => {
      const { cookie } = await createTestUser("STUDENT");
      const category = await createCategory();
      const future = new Date();
      future.setDate(future.getDate() + 30);

      // Seed 1 ACCEPTED
      await prisma.competition.create({
        data: {
          title: "Public Event",
          shortDescription: "x",
          fullDescription: "x",
          organizer: "x",
          posterUrl: "x",
          registrationStartDate: new Date(),
          registrationEndDate: future,
          eventDate: future,
          registrationLink: "x",
          contactPerson: "x",
          categoryId: category.id,
          status: "ACCEPTED", // Visible
        },
      });

      // Seed 1 PENDING
      await prisma.competition.create({
        data: {
          title: "Pending Event",
          shortDescription: "x",
          fullDescription: "x",
          organizer: "x",
          posterUrl: "x",
          registrationStartDate: new Date(),
          registrationEndDate: future,
          eventDate: future,
          registrationLink: "x",
          contactPerson: "x",
          categoryId: category.id,
          status: "PENDING", // Hidden
        },
      });

      const res = await request(app)
        .get("/api/v1/competitions")
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("Public Event");
    });
  });

  // ==========================================
  // 3. GET /competitions/admin/pending (Moderation List)
  // ==========================================
  describe("GET /competitions/admin/pending", () => {
    it("should allow ADMIN to see PENDING competitions", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await createCategory();

      await prisma.competition.create({
        data: {
          title: "Needs Review",
          shortDescription: "-",
          fullDescription: "-",
          organizer: "-",
          posterUrl: "-",
          registrationStartDate: new Date(),
          registrationEndDate: new Date(),
          eventDate: new Date(),
          registrationLink: "-",
          contactPerson: "-",
          categoryId: category.id,
          status: "PENDING",
        },
      });

      const res = await request(app)
        .get("/api/v1/competitions/admin/pending")
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(200);
      expect(res.body[0].title).toBe("Needs Review");
    });

    it("should forbid STUDENT from accessing pending list", async () => {
      const { cookie } = await createTestUser("STUDENT");
      const res = await request(app)
        .get("/api/v1/competitions/admin/pending")
        .set("Cookie", cookie);

      // Expect 404 (if caught by dynamic route) or 403 (if protected by middleware)
      // Depending on router order. If /:id is after /admin/pending, logic dictates middleware runs first.
      expect([403, 404]).toContain(res.statusCode);
    });
  });

  // ==========================================
  // 4. PUT /competitions/:id/status (Approve/Reject)
  // ==========================================
  describe("PUT /competitions/:id/status", () => {
    it("should allow ADMIN to Approve (ACCEPT) a competition", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await createCategory();

      const comp = await prisma.competition.create({
        data: {
          title: "Pending Submission",
          shortDescription: "-",
          fullDescription: "-",
          organizer: "-",
          posterUrl: "-",
          registrationStartDate: new Date(),
          registrationEndDate: new Date(),
          eventDate: new Date(),
          registrationLink: "-",
          contactPerson: "-",
          categoryId: category.id,
          status: "PENDING",
        },
      });

      const res = await request(app)
        .put(`/api/v1/competitions/${comp.id}/status`)
        .set("Cookie", cookie)
        .send({ status: "ACCEPTED" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe("ACCEPTED");

      // Verify DB
      const updated = await prisma.competition.findUnique({
        where: { id: comp.id },
      });
      expect(updated.status).toBe("ACCEPTED");
    });

    it("should reject invalid status", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await createCategory();
      const comp = await prisma.competition.create({
        data: {
          title: "Comp",
          shortDescription: "-",
          fullDescription: "-",
          organizer: "-",
          posterUrl: "-",
          registrationStartDate: new Date(),
          registrationEndDate: new Date(),
          eventDate: new Date(),
          registrationLink: "-",
          contactPerson: "-",
          categoryId: category.id,
          status: "PENDING",
        },
      });

      const res = await request(app)
        .put(`/api/v1/competitions/${comp.id}/status`)
        .set("Cookie", cookie)
        .send({ status: "INVALID_STATUS" });

      expect(res.statusCode).toBe(400); // Bad Request
    });
  });

  // ==========================================
  // 5. DELETE /competitions/:id
  // ==========================================
  describe("DELETE /competitions/:id", () => {
    it("should allow ADMIN to delete a competition", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await createCategory();
      const comp = await prisma.competition.create({
        data: {
          title: "To Delete",
          shortDescription: "-",
          fullDescription: "-",
          organizer: "-",
          posterUrl: "-",
          registrationStartDate: new Date(),
          registrationEndDate: new Date(),
          eventDate: new Date(),
          registrationLink: "-",
          contactPerson: "-",
          categoryId: category.id,
        },
      });

      const res = await request(app)
        .delete(`/api/v1/competitions/${comp.id}`)
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(204);
      const check = await prisma.competition.findUnique({
        where: { id: comp.id },
      });
      expect(check).toBeNull();
    });
  });
});
