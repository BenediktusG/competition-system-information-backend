// File: /api/src/controllers/competition.controller.js

import * as competitionService from "../services/competition.service.js";
import AppError from "../utils/AppError.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 1. Get Public / Active Competitions
export const getAllActive = asyncHandler(async (req, res) => {
  // Service sudah memfilter hanya yang status='ACCEPTED'
  const competitions = await competitionService.getActiveCompetitions(
    req.query
  );
  res.status(200).json(competitions);
});

// 2. [BARU] Get Pending Competitions (Khusus Admin)
export const getAllPending = asyncHandler(async (req, res) => {
  const competitions = await competitionService.getPendingCompetitions();
  res.status(200).json(competitions);
});

// 3. Get Archived
export const getAllArchived = asyncHandler(async (req, res) => {
  const competitions = await competitionService.getArchivedCompetitions();
  res.status(200).json(competitions);
});

// 4. Get Detail
export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const competition = await competitionService.getCompetitionById(id);
  res.status(200).json(competition);
});

// 5. [MODIFIKASI] Create Competition (Bisa Student / Admin)
export const create = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Poster gambar wajib di-upload", 400);
  }

  // Pastikan middleware auth sudah menaruh user di req.user
  if (!req.user) {
    throw new AppError("User tidak terautentikasi", 401);
  }

  const posterPath = `/uploads/${req.file.filename}`;
  const data = { ...req.body, posterUrl: posterPath };

  // Kirim req.user ke service untuk penentuan status & author
  const result = await competitionService.createCompetition(data, req.user);

  // Cek status dari hasil service (property _initialStatus dari service)
  const isPending = result._initialStatus === "PENDING";

  // Bersihkan property helper sebelum dikirim ke client
  delete result._initialStatus;

  // Berikan respon informatif
  res.status(201).json({
    message: isPending
      ? "Lomba berhasil diajukan. Menunggu persetujuan Admin."
      : "Lomba berhasil dipublikasikan.",
    data: result,
  });
});

// 6. [BARU] Update Status (Approve/Reject)
export const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // Expect: { "status": "ACCEPTED" }

  const updatedCompetition = await competitionService.updateCompetitionStatus(
    id,
    status
  );

  res.status(200).json({
    message: `Status lomba berhasil diubah menjadi ${status}`,
    data: updatedCompetition,
  });
});

// 7. Update Data (Edit Lomba)
export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = { ...req.body };

  if (req.file) {
    const posterPath = `/uploads/${req.file.filename}`;
    data.posterUrl = posterPath;
  }

  const updatedCompetition = await competitionService.updateCompetition(
    id,
    data
  );

  res.status(200).json(updatedCompetition);
});

// 8. Delete Lomba
export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await competitionService.deleteCompetition(id);
  res.status(204).send();
});

// 9. Manual Archive
export const archive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const archivedCompetition = await competitionService.archiveCompetition(id);
  res.status(200).json(archivedCompetition);
});
