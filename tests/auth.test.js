import request from "supertest";
import app from "../src/app.js";
import { resetDb, disconnectDb } from "./utils.js";

beforeEach(resetDb);
afterAll(disconnectDb);

describe("Authentication Module", () => {
  describe("POST /auth/register", () => {
    it("should register successfully with @unhas.ac.id email", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Maba Unhas",
        email: "maba23@unhas.ac.id",
        password: "passwordStrong123",
      });

      // Sesuai Spec: UserResponse (Direct Object)
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.email).toBe("maba23@unhas.ac.id");
      expect(res.body.role).toBe("STUDENT");
      // Pastikan password tidak dikembalikan
      expect(res.body.password).toBeUndefined();
    });

    it("should FAIL if email is NOT @unhas.ac.id", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Spy User",
        email: "spy@gmail.com",
        password: "passwordStrong123",
      });

      // Sesuai Spec: ErrorResponse (message)
      expect(res.statusCode).toBe(400);
      // Asumsi validasi error mengembalikan message
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("POST /auth/login", () => {
    it("should login and return httpOnly cookie + User Profile", async () => {
      // Setup user
      await request(app).post("/api/v1/auth/register").send({
        name: "User Login",
        email: "login@unhas.ac.id",
        password: "password123",
      });

      const res = await request(app).post("/api/v1/auth/login").send({
        email: "login@unhas.ac.id",
        password: "password123",
      });

      // Sesuai Spec: UserResponse
      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe("login@unhas.ac.id");

      // Cookie Check
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.headers["set-cookie"][0]).toMatch(/token=/);
      expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/);
    });
  });

  describe("POST /auth/register", () => {
    it("should register successfully with valid @unhas.ac.id email", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Mahasiswa Teladan",
        email: "teladan@unhas.ac.id",
        password: "password123",
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.email).toBe("teladan@unhas.ac.id");
    });

    it("should FAIL when input fields are missing", async () => {
      // Tidak mengirim password
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Si Lupa",
        email: "lupa@unhas.ac.id",
      });
      expect(res.statusCode).toBe(400); // Bad Request
    });

    it("should FAIL when email format is invalid", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Si Typo",
        email: "bukan-email",
        password: "password123",
      });
      expect(res.statusCode).toBe(400);
    });

    it("should FAIL when domain is NOT exactly @unhas.ac.id", async () => {
      const invalidDomains = [
        "user@gmail.com", // Domain umum
        "user@unhas.ac.id.fake.com", // Subdomain spoofing
        "user@fakultas.unhas.ac.id", // Subdomain valid (jika aturan ketat hanya @unhas.ac.id)
        "user@gmail.com@unhas.ac.id", // Double @ attack
        "user@unhas.co.id", // Typo domain
      ];

      for (const email of invalidDomains) {
        const res = await request(app).post("/api/v1/auth/register").send({
          name: "Attacker",
          email,
          password: "password123",
        });
        expect(res.statusCode).toBe(400);
      }
    });

    it("should FAIL when registering with an existing email (Duplicate)", async () => {
      // 1. Register user pertama
      await request(app).post("/api/v1/auth/register").send({
        name: "User A",
        email: "kembar@unhas.ac.id",
        password: "password123",
      });

      // 2. Coba register lagi dengan email sama
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "User B",
        email: "kembar@unhas.ac.id",
        password: "password456",
      });

      expect(res.statusCode).toBe(409); // Conflict
    });

    it("should FAIL if password is too short (Security Policy)", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Weak User",
        email: "weak@unhas.ac.id",
        password: "123", // Terlalu pendek
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ==========================================
  // 2. LOGIN EDGE CASES
  // ==========================================
  describe("POST /auth/login", () => {
    // Setup user sebelum login test
    beforeEach(async () => {
      await request(app).post("/api/v1/auth/register").send({
        name: "Login User",
        email: "login@unhas.ac.id",
        password: "Password_Kuat_123",
      });
    });

    it("should login successfully with correct credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "login@unhas.ac.id",
        password: "Password_Kuat_123",
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should FAIL with wrong password", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "login@unhas.ac.id",
        password: "Password_Salah",
      });
      expect(res.statusCode).toBe(401); // Unauthorized
    });

    it("should FAIL if email is not registered", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "hantu@unhas.ac.id",
        password: "password123",
      });
      expect(res.statusCode).toBe(401); // User not found -> Unauthorized (generic message)
    });

    it("should be Case Insensitive for Email", async () => {
      // User terdaftar: login@unhas.ac.id
      // Login pakai: LOGIN@Unhas.Ac.Id
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "LOGIN@Unhas.Ac.Id",
        password: "Password_Kuat_123",
      });
      expect(res.statusCode).toBe(200); // Harusnya berhasil
    });
  });

  // ==========================================
  // 3. SESSION & SECURITY CHECKS
  // ==========================================
  describe("GET /auth/me (Session Check)", () => {
    it("should return 401 if NO cookie is provided", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.statusCode).toBe(401);
    });

    it("should return 401 if Cookie is fake/tampered", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", ["token=ini_token_palsu_yang_ngawur"]);

      expect(res.statusCode).toBe(401); // Invalid signature
    });

    it("should return User Data without Password field", async () => {
      // 1. Register & Login
      await request(app).post("/api/v1/auth/register").send({
        name: "Secure User",
        email: "secure@unhas.ac.id",
        password: "123456781",
      });
      const loginRes = await request(app).post("/api/v1/auth/login").send({
        email: "secure@unhas.ac.id",
        password: "123456781",
      });
      const cookie = loginRes.headers["set-cookie"];

      // 2. Get Me
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Cookie", cookie);

      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe("secure@unhas.ac.id");
      expect(res.body.password).toBeUndefined(); // PENTING: Jangan bocorkan hash
    });
  });

  // ==========================================
  // 4. LOGOUT
  // ==========================================
  describe("POST /auth/logout", () => {
    it("should clear the cookie", async () => {
      const res = await request(app).post("/api/v1/auth/logout");

      expect(res.statusCode).toBe(200);
      // Pastikan cookie dihapus (biasanya Max-Age=0 atau Expires=masa lalu)
      const cookies = res.headers["set-cookie"][0];
      expect(cookies).toMatch(/Expires=|Max-Age=0/);
    });
  });
});
