import request from "supertest";
import app from "../src/app.js";
import prisma, { resetDb, disconnectDb, createTestUser } from "./utils.js";

beforeEach(resetDb);
afterAll(disconnectDb);

describe("Category Management Integration Tests", () => {
  // ==========================================
  // 1. GET /categories (Read)
  // ==========================================
  describe("GET /categories", () => {
    it("should return 401 if user is not authenticated", async () => {
      const res = await request(app).get("/api/v1/categories");
      expect(res.statusCode).toBe(401);
    });

    it("should return empty array if no categories exist", async () => {
      const { cookie } = await createTestUser("STUDENT");
      const res = await request(app)
        .get("/api/v1/categories")
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return list of categories for authenticated user", async () => {
      // Seed Data
      await prisma.category.createMany({
        data: [{ name: "Web Development" }, { name: "Data Science" }],
      });

      const { cookie } = await createTestUser("STUDENT");
      const res = await request(app)
        .get("/api/v1/categories")
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
      // Pastikan urutan atau keberadaan item
      const names = res.body.map((c) => c.name);
      expect(names).toContain("Web Development");
      expect(names).toContain("Data Science");
    });
  });

  // ==========================================
  // 2. POST /categories (Create)
  // ==========================================
  describe("POST /categories", () => {
    it("should allow ADMIN to create a category", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const res = await request(app)
        .post("/api/v1/categories")
        .set("Cookie", cookie)
        .send({ name: "Cyber Security" });

      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe("Cyber Security");
      expect(res.body).toHaveProperty("id");

      // Verifikasi Database
      const dbCheck = await prisma.category.findUnique({
        where: { name: "Cyber Security" },
      });
      expect(dbCheck).not.toBeNull();
    });

    it("should forbid STUDENT from creating a category", async () => {
      const { cookie } = await createTestUser("STUDENT");
      const res = await request(app)
        .post("/api/v1/categories")
        .set("Cookie", cookie)
        .send({ name: "Hacking" });

      expect(res.statusCode).toBe(403); // Forbidden
    });

    it("should return 400 if name is missing or empty", async () => {
      const { cookie } = await createTestUser("ADMIN");

      // Case 1: Missing field
      let res = await request(app)
        .post("/api/v1/categories")
        .set("Cookie", cookie)
        .send({});
      expect(res.statusCode).toBe(400);

      // Case 2: Empty string
      res = await request(app)
        .post("/api/v1/categories")
        .set("Cookie", cookie)
        .send({ name: "" });
      expect(res.statusCode).toBe(400);
    });

    it("should return 409 if category name already exists (Duplicate)", async () => {
      const { cookie } = await createTestUser("ADMIN");

      // 1. Create First
      await prisma.category.create({ data: { name: "UI/UX" } });

      // 2. Try Create Duplicate
      const res = await request(app)
        .post("/api/v1/categories")
        .set("Cookie", cookie)
        .send({ name: "UI/UX" });

      expect(res.statusCode).toBe(409); // Conflict
      expect(res.body).toHaveProperty("message");
    });
  });

  // ==========================================
  // 3. PUT /categories/:id (Update)
  // ==========================================
  describe("PUT /categories/:id", () => {
    it("should allow ADMIN to update category name", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await prisma.category.create({
        data: { name: "Old Name" },
      });

      const res = await request(app)
        .put(`/api/v1/categories/${category.id}`)
        .set("Cookie", cookie)
        .send({ name: "New Name" });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe("New Name");
    });

    it("should return 404 if category ID does not exist", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const fakeId = "cm00000000000000000000000"; // CUID like ID

      const res = await request(app)
        .put(`/api/v1/categories/${fakeId}`)
        .set("Cookie", cookie)
        .send({ name: "New Name" });

      expect(res.statusCode).toBe(404);
    });

    it("should return 409 if updating to an existing name", async () => {
      const { cookie } = await createTestUser("ADMIN");
      // Setup: Ada cat A dan cat B
      await prisma.category.create({ data: { name: "Cat A" } });
      const catB = await prisma.category.create({ data: { name: "Cat B" } });

      // Coba update Cat B menjadi Cat A
      const res = await request(app)
        .put(`/api/v1/categories/${catB.id}`)
        .set("Cookie", cookie)
        .send({ name: "Cat A" }); // Nama sudah dipakai

      expect(res.statusCode).toBe(409);
    });
  });

  // ==========================================
  // 4. DELETE /categories/:id (Delete & Cascade)
  // ==========================================
  describe("DELETE /categories/:id", () => {
    it("should allow ADMIN to delete a category", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const category = await prisma.category.create({
        data: { name: "To Delete" },
      });

      const res = await request(app)
        .delete(`/api/v1/categories/${category.id}`)
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(204); // No Content

      // Verifikasi di DB sudah hilang
      const check = await prisma.category.findUnique({
        where: { id: category.id },
      });
      expect(check).toBeNull();
    });

    it("should CASCADE delete related competitions when category is deleted", async () => {
      // 1. Setup: Login sebagai Admin (karena hanya admin yang boleh hapus kategori)
      const { cookie } = await createTestUser("ADMIN");

      // 2. Setup: Buat Dummy Kategori
      const category = await prisma.category.create({
        data: { name: "Category To Delete" },
      });

      // 3. Setup: Buat Dummy Lomba yang terhubung ke Kategori tersebut
      // PERBAIKAN: Isi field wajib & pastikan logika tanggal benar (Start < End < Event)
      const competition = await prisma.competition.create({
        data: {
          title: "Child Competition",
          shortDescription: "Short desc",
          fullDescription: "Full description content",
          organizer: "Himpunan Mahasiswa",
          posterUrl: "/uploads/test-poster.jpg",

          // Logika Tanggal: Gunakan waktu masa depan agar valid
          registrationStartDate: new Date(),
          registrationEndDate: new Date(Date.now() + 86400000), // +1 Hari
          eventDate: new Date(Date.now() + 172800000), // +2 Hari

          registrationLink: "https://example.com",
          contactPerson: "08123456789",
          categoryId: category.id, // Relasi ke parent

          // [FITUR BARU] Field Status
          // Walaupun defaultnya PENDING, kita set explicit agar jelas
          status: "PENDING",

          // [FITUR BARU] Author (Optional/Nullable di schema)
          // Kita biarkan null atau bisa diisi jika tes memerlukan relasi user
          authorId: null,
        },
      });

      // 4. Action: Request DELETE ke endpoint kategori
      const response = await request(app) // Pastikan 'request' & 'app' sudah di-import dari supertest
        .delete(`/api/v1/categories/${category.id}`)
        .set("Cookie", cookie);

      // 5. Assertion: Pastikan response sukses (204 No Content)
      expect(response.status).toBe(204);

      // 6. Verifikasi Database: Cek apakah lomba IKUT terhapus
      const deletedCompetition = await prisma.competition.findUnique({
        where: { id: competition.id },
      });

      // Ekspektasi: Lomba harus null (hilang) karena efek Cascade
      expect(deletedCompetition).toBeNull();
    });

    it("should return 404 when deleting non-existent category", async () => {
      const { cookie } = await createTestUser("ADMIN");
      const res = await request(app)
        .delete("/api/v1/categories/non-existent-id")
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(404);
    });
  });
});
