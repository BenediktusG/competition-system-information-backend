// File: /api/src/controllers/competition.controller.js

import * as competitionService from "../services/competition.service.js";
import AppError from "../utils/AppError.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getAllActive = asyncHandler(async (req, res) => {
  // Query params: ?search=...&categoryId=...&sort=...
  const competitions = await competitionService.getActiveCompetitions(
    req.query
  );
  res.status(200).json({
    status: "success",
    data: competitions,
  });
});

export const getAllArchived = asyncHandler(async (req, res) => {
  const competitions = await competitionService.getArchivedCompetitions();
  res.status(200).json({
    status: "success",
    data: competitions,
  });
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const competition = await competitionService.getCompetitionById(id);
  res.status(200).json({
    status: "success",
    data: competition,
  });
});

export const create = asyncHandler(async (req, res) => {
  // TODO: Tambahkan validasi body yang kuat di sini (e.g., pakai Joi/Zod)
  const newCompetition = await competitionService.createCompetition(req.body);
  res.status(201).json({
    status: "success",
    data: newCompetition,
  });
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedCompetition = await competitionService.updateCompetition(
    id,
    req.body
  );
  res.status(200).json({
    status: "success",
    data: updatedCompetition,
  });
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await competitionService.deleteCompetition(id);
  res.status(204).send();
});

export const archive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const archivedCompetition = await competitionService.archiveCompetition(id);
  res.status(200).json({
    status: "success",
    data: archivedCompetition,
  });
});
