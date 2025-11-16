// File: /api/src/controllers/competition.controller.js

import * as competitionService from "../services/competition.service.js";
import AppError from "../utils/AppError.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getAllActive = asyncHandler(async (req, res) => {
  const competitions = await competitionService.getActiveCompetitions(
    req.query
  );

  // PERBAIKAN: Kembalikan array langsung
  res.status(200).json(competitions);
});

export const getAllArchived = asyncHandler(async (req, res) => {
  const competitions = await competitionService.getArchivedCompetitions();

  // PERBAIKAN: Kembalikan array langsung
  res.status(200).json(competitions);
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const competition = await competitionService.getCompetitionById(id);

  // PERBAIKAN: Kembalikan objek lomba langsung
  res.status(200).json(competition);
});

export const create = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Poster gambar wajib di-upload", 400);
  }
  const posterPath = `/uploads/${req.file.filename}`;
  const data = { ...req.body, posterUrl: posterPath };

  const newCompetition = await competitionService.createCompetition(data);

  // PERBAIKAN: Kembalikan objek lomba baru
  res.status(201).json(newCompetition);
});

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

  // PERBAIKAN: Kembalikan objek lomba yang diupdate
  res.status(200).json(updatedCompetition);
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await competitionService.deleteCompetition(id);

  // (Sudah Sesuai) Spek meminta 204 No Content
  res.status(204).send();
});

export const archive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const archivedCompetition = await competitionService.archiveCompetition(id);

  // PERBAIKAN: Kembalikan objek lomba yang diarsip
  res.status(200).json(archivedCompetition);
});
