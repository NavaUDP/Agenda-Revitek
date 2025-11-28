// src/pages/AdminAssignmentsPage.tsx
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listProfesionales, type Professional } from "@/api/profesionales";
import {
  listAllServicios,
  listAsignaciones,
  asignarServicio,
  quitarServicio,
} from "@/api/servicios";
import { useToast } from "@/components/ui/use-toast";

interface Servicio {
  id: number;
  name: string;
  duration_min: number;
}

interface Asignacion {
  id: number;
  professional: number;
  service: number;
  active: boolean;
}

export default function AdminAssignmentsPage() {
  const { toast } = useToast();

  const [profesionales, setProfesionales] = useState<Professional[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);

  const [selectedProfesionalId, setSelectedProfesionalId] = useState<number>();

  const [loadingProf, setLoadingProf] = useState(true);
  const [loadingServ, setLoadingServ] = useState(true);
  const [loadingAsign, setLoadingAsign] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isSwitching, setIsSwitching] = useState(false);

  // Load professionals + services
  useEffect(() => {
    const load = async () => {
      try {
        const profs = await listProfesionales();
        setProfesionales(profs);
      } finally {
        setLoadingProf(false);
      }

      try {
        const servs = await listAllServicios();
        setServicios(servs);
      } finally {
        setLoadingServ(false);
      }
    };
    load();
  }, []);

  // Load assignments when switching professional
  useEffect(() => {
    if (!selectedProfesionalId) {
      setAsignaciones([]);
      return;
    }

    let isCancelled = false;

    const loadAsign = async () => {
      setIsSwitching(true);
      setLoadingAsign(true);
      setAsignaciones([]);

      try {
        const data = await listAsignaciones({
          professional_id: selectedProfesionalId,
        });

        if (!isCancelled) setAsignaciones(data);
      } finally {
        if (!isCancelled) {
          setLoadingAsign(false);
          setIsSwitching(false);
        }
      }
    };

    loadAsign();
    return () => {
      isCancelled = true;
    };
  }, [selectedProfesionalId]);

  const assignedIds = new Set(asignaciones.map((a) => a.service));

  const toggleService = async (serviceId: number, checked: boolean) => {
    if (!selectedProfesionalId) return;

    const currentProfId = selectedProfesionalId;
    setSaving(true);

    try {
      if (checked) {
        await asignarServicio({
          professional: currentProfId,
          service: serviceId,
        });
      } else {
        const asign = asignaciones.find((a) => a.service === serviceId);
        if (asign) {
          await quitarServicio(asign.id);
        }
      }

      if (selectedProfesionalId === currentProfId) {
        const updated = await listAsignaciones({
          professional_id: currentProfId,
        });

        if (selectedProfesionalId === currentProfId) {
          setAsignaciones(updated);
        }
      }

      toast({
        title: "Éxito",
        description: checked ? "Servicio asignado" : "Servicio removido",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Asignar Servicios</h1>

      {/* SELECT PROFESIONAL */}
      <Card className="border border-border bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Profesional</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProf ? (
            <p className="text-muted-foreground">Cargando profesionales...</p>
          ) : (
            <select
              className="
                w-full md:w-1/2 p-2 rounded-md border border-border
                bg-background text-foreground
              "
              value={selectedProfesionalId ?? ""}
              onChange={(e) => setSelectedProfesionalId(Number(e.target.value))}
              disabled={saving}
            >
              <option value="">Seleccione...</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      {/* LISTA DE SERVICIOS */}
      {selectedProfesionalId && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">
              Servicios del profesional
            </CardTitle>
          </CardHeader>

          <CardContent>
            {isSwitching || loadingAsign || loadingServ ? (
              <p className="text-muted-foreground">Cargando servicios...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {servicios.map((s) => {
                  const checked = assignedIds.has(s.id);

                  return (
                    <label
                      key={s.id}
                      className="
                        flex items-center space-x-3 p-3 rounded-md border border-border
                        bg-muted/30 hover:bg-muted transition-colors cursor-pointer
                      "
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleService(s.id, e.target.checked)}
                        disabled={saving}
                        className="cursor-pointer accent-primary"
                      />

                      <span
                        className={`text-sm ${
                          saving ? "opacity-50" : "text-foreground"
                        }`}
                      >
                        {s.name} ({s.duration_min} min)
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {saving && (
              <p className="text-sm text-blue-500 mt-2">Guardando cambios...</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
