import { Router } from "express";
import archiver from "archiver";
import type { Db } from "../db/connection.js";
import { asyncHandler } from "../lib/async-handler.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { getCoffee } from "../repos/coffees.js";
import { coffeeIdForUnit } from "../repos/units.js";
import { getSettings } from "../repos/settings.js";
import { renderLabelPng, buildQrUrl, labelFilename } from "../services/labels.js";
import type { Coffee } from "../repos/coffees.js";
import type { StorageUnit } from "../repos/units.js";

function requestOrigin(req: { protocol: string; get: (h: string) => string | undefined }): string {
  const host = req.get("host") ?? "";
  return host ? `${req.protocol}://${host}` : "";
}

function resolveUnit(db: Db, unitId: number): { coffee: Coffee; unit: StorageUnit } {
  const coffeeId = coffeeIdForUnit(db, unitId);
  if (coffeeId == null) throw notFound("Unit");
  const coffee = getCoffee(db, coffeeId)!;
  const unit = coffee.units.find((u) => u.id === unitId)!;
  return { coffee, unit };
}

export function labelsRouter(db: Db): Router {
  const router = Router();

  // Single label PNG — used for the live preview and single download.
  router.get(
    "/unit/:unitId.png",
    asyncHandler(async (req, res) => {
      const settings = getSettings(db);
      const { coffee, unit } = resolveUnit(db, Number(req.params.unitId));
      const qrUrl = buildQrUrl(settings, requestOrigin(req), unit.qrId);
      const png = await renderLabelPng(unit, coffee, settings, qrUrl);
      res.type("image/png");
      res.set("Content-Disposition", `inline; filename="${labelFilename(coffee, unit)}"`);
      res.send(png);
    })
  );

  // Batch export: one id → PNG, several → a ZIP of PNGs.
  router.get(
    "/export",
    asyncHandler(async (req, res) => {
      const ids = String(req.query.ids ?? "")
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
      if (ids.length === 0) throw badRequest("No units selected");

      const settings = getSettings(db);
      const origin = requestOrigin(req);

      if (ids.length === 1) {
        const { coffee, unit } = resolveUnit(db, ids[0]);
        const png = await renderLabelPng(unit, coffee, settings, buildQrUrl(settings, origin, unit.qrId));
        res.type("image/png");
        res.set("Content-Disposition", `attachment; filename="${labelFilename(coffee, unit)}"`);
        return res.send(png);
      }

      res.type("application/zip");
      res.set("Content-Disposition", 'attachment; filename="coffeelog-labels.zip"');
      const archive = archiver("zip", { zlib: { level: 6 } });
      archive.on("error", (err) => res.destroy(err));
      archive.pipe(res);
      for (const id of ids) {
        const { coffee, unit } = resolveUnit(db, id);
        const png = await renderLabelPng(unit, coffee, settings, buildQrUrl(settings, origin, unit.qrId));
        archive.append(png, { name: labelFilename(coffee, unit) });
      }
      await archive.finalize();
    })
  );

  return router;
}

/** Scanner/`/u/:qrId` resolution: qrId → { coffee, unit }. */
export function scanRouter(db: Db): Router {
  const router = Router();
  router.get(
    "/:qrId",
    asyncHandler(async (req, res) => {
      const row = db
        .prepare("SELECT id FROM storage_units WHERE qr_id = ?")
        .get(req.params.qrId) as { id: number } | undefined;
      if (!row) throw notFound("Label");
      res.json(resolveUnit(db, row.id));
    })
  );
  return router;
}
