import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { UnitDetail } from "../api/hooks";

/**
 * Landing for a scanned label URL ("/u/:qrId"). Resolves the qrId to its unit
 * and redirects to the unit detail — this is what a phone camera opens.
 */
export function ResolveUnitScreen() {
  const { qrId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["scan", qrId],
    queryFn: () => api.get<UnitDetail>(`/scan/${qrId}`),
    retry: false,
  });

  useEffect(() => {
    if (data) navigate(`/units/${data.unit.id}`, { replace: true });
  }, [data, navigate]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-cream px-8 text-center">
      {isLoading && <p className="text-[13.5px] text-muted">Opening unit…</p>}
      {isError && (
        <>
          <p className="mb-3 text-[14px] font-semibold text-danger">No unit found for “{qrId}”.</p>
          <button onClick={() => navigate("/catalog")} className="font-semibold text-terracotta">
            Go to catalog
          </button>
        </>
      )}
    </div>
  );
}
