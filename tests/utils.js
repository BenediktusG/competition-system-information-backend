// tests/utils.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const resetDb = async () => {
  // Urutan delete penting karena foreign key constraint
  await prisma.competition.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
};

export const disconnectDb = async () => {
  await prisma.$disconnect();
};

// Helper untuk membuat user dan mengembalikan Cookie Token
export const createTestUser = async (role = "STUDENT") => {
  const email = `test.${role.toLowerCase()}@unhas.ac.id`;
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: `Test ${role}`,
      email,
      password: hashedPassword,
      role,
    },
  });

  // Generate JWT Token (sesuaikan secret dengan env test)
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "rahasia_test_jwt_123",
    { expiresIn: "1h" }
  );

  // Return string Cookie dan object User
  return {
    cookie: `token=${token}`,
    user,
  };
};

export default prisma;
