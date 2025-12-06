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
  // 1. POST /competitions (Create)
  // ==========================================
  describe("POST /competitions", () => {
    it("should allow ADMIN to create competition with valid data and poster", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await createCategory();

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // 30 hari lagi

      const res = await request(app)
        .post("/api/v1/competitions")
        .set("Cookie", cookie)
        // Simulasi Form Data
        .field("title", "Hackathon 2025")
        .field("shortDescription", "Lomba coding")
        .field("fullDescription", "Deskripsi panjang lebar")
        .field("organizer", "HMJ TI")
        .field("registrationStartDate", startDate.toISOString())
        .field("registrationEndDate", endDate.toISOString())
        .field("eventDate", endDate.toISOString())
        .field("registrationLink", "https://bit.ly/lomba")
        .field("contactPerson", "0812345678")
        .field("categoryId", category.id)
        .field("registrationFee", "Gratis")
        .attach("poster", mockPosterBuffer, "poster.jpg"); // Upload File

      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe("Hackathon 2025");
      expect(res.body.posterUrl).toBeDefined(); // Pastikan path file ada
      expect(res.body.isArchived).toBe(false);
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
        .field("registrationStartDate", "2025-12-31") // Akhir tahun
        .field("registrationEndDate", "2025-01-01") // Awal tahun (Logic Error)
        .field("eventDate", "2026-01-01")
        .field("registrationLink", "http://link.com")
        .field("contactPerson", "08111")
        .field("categoryId", category.id)
        .attach("poster", mockPosterBuffer, "poster.jpg");

      expect(res.statusCode).toBe(400); // Bad Request (Logic Validation)
    });

    it("should return 400 if Category ID is invalid (Foreign Key Constraint)", async () => {
      const { cookie } = await createTestUser("ADMIN");

      const res = await request(app)
        .post("/api/v1/competitions")
        .set("Cookie", cookie)
        .field("title", "No Category Comp")
        .field("shortDescription", "x")
        .field("fullDescription", "x")
        .field("organizer", "x")
        .field("registrationStartDate", new Date().toISOString())
        .field("registrationEndDate", new Date().toISOString())
        .field("eventDate", new Date().toISOString())
        .field("registrationLink", "x")
        .field("contactPerson", "x")
        .field("categoryId", "invalid_category_id") // ID Ngawur
        .attach("poster", mockPosterBuffer, "poster.jpg");

      expect(res.statusCode).toBe(400); // Atau 404 tergantung implementasi Prisma Error Handler
    });

    it("should return 400 if Poster file is missing", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await createCategory();

      const res = await request(app)
        .post("/api/v1/competitions")
        .set("Cookie", cookie)
        .field("title", "No Poster")
        .field("shortDescription", "x")
        .field("fullDescription", "x")
        .field("organizer", "x")
        .field("registrationStartDate", new Date().toISOString())
        .field("registrationEndDate", new Date().toISOString())
        .field("eventDate", new Date().toISOString())
        .field("registrationLink", "x")
        .field("contactPerson", "x")
        .field("categoryId", category.id);
      // .attach('poster') <-- Missing

      expect(res.statusCode).toBe(400);
    });

    it("should forbid STUDENT from creating competition", async () => {
      const { cookie } = await createTestUser("STUDENT");
      const res = await request(app)
        .post("/api/v1/competitions")
        .set("Cookie", cookie);
      expect(res.statusCode).toBe(403);
    });
  });

  // ==========================================
  // 2. GET /competitions (Read Active & Filtering)
  // ==========================================
  describe("GET /competitions", () => {
    it("should FILTER by Title (Search)", async () => {
      const { cookie } = await createTestUser("STUDENT");
      const category = await createCategory();
      const future = new Date();
      future.setDate(future.getDate() + 30);

      // Seed 2 lomba
      await prisma.competition.createMany({
        data: [
          {
            title: "Lomba Makan Kerupuk",
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
          },
          {
            title: "Lomba Coding Python",
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
          },
        ],
      });

      // Search "Coding"
      const res = await request(app)
        .get("/api/v1/competitions?search=coding")
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("Lomba Coding Python");
    });

    it("should FILTER by Category", async () => {
      const { cookie } = await createTestUser("STUDENT");
      const catTech = await createCategory("Tech");
      const catArt = await createCategory("Art");
      const future = new Date();
      future.setDate(future.getDate() + 30);

      // Seed
      await prisma.competition.create({
        data: {
          title: "Tech Comp",
          categoryId: catTech.id,
          shortDescription: "x",
          fullDescription: "x",
          organizer: "x",
          posterUrl: "x",
          registrationStartDate: new Date(),
          registrationEndDate: future,
          eventDate: future,
          registrationLink: "x",
          contactPerson: "x",
        },
      });
      await prisma.competition.create({
        data: {
          title: "Art Comp",
          categoryId: catArt.id,
          shortDescription: "x",
          fullDescription: "x",
          organizer: "x",
          posterUrl: "x",
          registrationStartDate: new Date(),
          registrationEndDate: future,
          eventDate: future,
          registrationLink: "x",
          contactPerson: "x",
        },
      });

      // Filter by Tech Category ID
      const res = await request(app)
        .get(`/api/v1/competitions?categoryId=${catTech.id}`)
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe("Tech Comp");
    });

    it("should return 401 if not authenticated", async () => {
      const res = await request(app).get("/api/v1/competitions");
      expect(res.statusCode).toBe(401);
    });
  });

  // ==========================================
  // 3. GET /competitions/:id (Detail)
  // ==========================================
  describe("GET /competitions/:id", () => {
    it("should return competition detail if ID exists", async () => {
      const { cookie } = await createTestUser("STUDENT");
      const category = await createCategory();

      const comp = await prisma.competition.create({
        data: {
          title: "Detail Test",
          shortDescription: "Short",
          fullDescription: "Full",
          organizer: "Org",
          posterUrl: "url",
          registrationStartDate: new Date(),
          registrationEndDate: new Date(),
          eventDate: new Date(),
          registrationLink: "link",
          contactPerson: "cp",
          categoryId: category.id,
        },
      });

      const res = await request(app)
        .get(`/api/v1/competitions/${comp.id}`)
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe("Detail Test");
      expect(res.body.category.name).toBeDefined(); // Pastikan relasi terbawa (include)
    });

    it("should return 404 if competition ID not found", async () => {
      const { cookie } = await createTestUser("STUDENT");
      const res = await request(app)
        .get("/api/v1/competitions/invalid-id")
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(404);
    });
  });

  // ==========================================
  // 4. PUT /competitions/:id (Update)
  // ==========================================
  describe("PUT /competitions/:id", () => {
    it("should allow ADMIN to update details (without file)", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await createCategory();

      const comp = await prisma.competition.create({
        data: {
          title: "Old Title",
          shortDescription: "x",
          fullDescription: "x",
          organizer: "x",
          posterUrl: "old.jpg",
          registrationStartDate: new Date(),
          registrationEndDate: new Date(),
          eventDate: new Date(),
          registrationLink: "x",
          contactPerson: "x",
          categoryId: category.id,
        },
      });

      const res = await request(app)
        .put(`/api/v1/competitions/${comp.id}`)
        .set("Cookie", cookie)
        .field("title", "New Title Updated") // Hanya update judul
        // Field lain wajib dikirim ulang jika logic update bersifat "replace"
        // atau opsional jika "patch". Di sini kita asumsikan mengirim data lengkap.
        .field("shortDescription", "x")
        .field("fullDescription", "x")
        .field("organizer", "x")
        .field("registrationStartDate", new Date().toISOString())
        .field("registrationEndDate", new Date().toISOString())
        .field("eventDate", new Date().toISOString())
        .field("registrationLink", "x")
        .field("contactPerson", "x")
        .field("categoryId", category.id);
      // Note: Tidak attach poster

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe("New Title Updated");
      expect(res.body.posterUrl).toBe("old.jpg"); // Poster lama tidak berubah
    });
  });

  // ==========================================
  // 5. POST /competitions/:id/archive (Manual Archive)
  // ==========================================
  describe("POST /competitions/:id/archive", () => {
    it("should allow ADMIN to manually archive a competition", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await createCategory();

      const comp = await prisma.competition.create({
        data: {
          title: "To Be Archived",
          shortDescription: "x",
          fullDescription: "x",
          organizer: "x",
          posterUrl: "x",
          registrationStartDate: new Date(),
          registrationEndDate: new Date(),
          eventDate: new Date(),
          registrationLink: "x",
          contactPerson: "x",
          categoryId: category.id,
          isArchived: false,
        },
      });

      const res = await request(app)
        .post(`/api/v1/competitions/${comp.id}/archive`)
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.isArchived).toBe(true);

      // Verifikasi di DB
      const dbComp = await prisma.competition.findUnique({
        where: { id: comp.id },
      });
      expect(dbComp.isArchived).toBe(true);
    });
  });

  // ==========================================
  // 6. DELETE /competitions/:id
  // ==========================================
  describe("DELETE /competitions/:id", () => {
    it("should allow ADMIN to delete a competition", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await createCategory();

      const comp = await prisma.competition.create({
        data: {
          title: "To Delete",
          shortDescription: "x",
          fullDescription: "x",
          organizer: "x",
          posterUrl: "x",
          registrationStartDate: new Date(),
          registrationEndDate: new Date(),
          eventDate: new Date(),
          registrationLink: "x",
          contactPerson: "x",
          categoryId: category.id,
        },
      });

      const res = await request(app)
        .delete(`/api/v1/competitions/${comp.id}`)
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(204); // No Content

      const check = await prisma.competition.findUnique({
        where: { id: comp.id },
      });
      expect(check).toBeNull();
    });
  });
});
