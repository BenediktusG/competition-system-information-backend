// File: /api/src/config/prisma.js

import { PrismaClient } from "@prisma/client";

/**
 * @type {PrismaClient}
 */
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  // Pastikan di development, kita tidak membuat instance baru terus-menerus
  // saat hot-reloading
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default prisma;
