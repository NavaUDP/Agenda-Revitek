import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listProfessionals } from "@/api/profesionales";
import { Professional } from "@/types/professionals";
import { Service, ProfessionalServiceAssignment } from "@/types/services";
import {
  listAllServices,
  listProfessionalServices,
  assignService,
  removeServiceAssignment,
} from '@/api/servicios';
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function AdminAssignmentsPage() {
  const { toast } = useToast();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [assignments, setAssignments] = useState<ProfessionalServiceAssignment[]>([]);

  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("");

  const [loadingProf, setLoadingProf] = useState(true);
  const [loadingServ, setLoadingServ] = useState(true);
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load professionals + services
  useEffect(() => {
    const loadData = async () => {
      try {
        const [profs, servs] = await Promise.all([
          listProfessionals(),
          listAllServices()
        ]);
        setProfessionals(profs);
        setServices(servs);
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los datos iniciales.",
        });
      } finally {
        setLoadingProf(false);
        setLoadingServ(false);
      }
    };
    loadData();
  }, [toast]);

  // Load assignments when switching professional
  useEffect(() => {
    if (!selectedProfessionalId) {
      setAssignments([]);
      return;
    }

    let isCancelled = false;

    const loadAssignments = async () => {
      setLoadingAssign(true);
      try {
        const data = await listProfessionalServices({
          professional_id: Number(selectedProfessionalId),
        });

        if (!isCancelled) setAssignments(data);
      } catch (error) {
        if (!isCancelled) {
          console.error("Error loading assignments:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "No se pudieron cargar las asignaciones.",
          });
        }
      } finally {
        if (!isCancelled) setLoadingAssign(false);
      }
    };

    loadAssignments();

    return () => {
      isCancelled = true;
    };
  }, [selectedProfessionalId, toast]);

  const assignedServiceIds = new Set(assignments.map((a) => a.service));

  const toggleService = async (serviceId: number, checked: boolean) => {
    if (!selectedProfessionalId) return;

    const profId = Number(selectedProfessionalId);

    // Optimistic Update
    const previousAssignments = [...assignments];

    if (checked) {
      // Add mock assignment
      const newAssignment: ProfessionalServiceAssignment = {
        id: -1, // Temporary ID
        professional: profId,
        service: serviceId,
        active: true
      };
      setAssignments(prev => [...prev, newAssignment]);
    } else {
      // Remove assignment
      setAssignments(prev => prev.filter(a => a.service !== serviceId));
    }

    setSaving(true);

    try {
      if (checked) {
        await assignService({
          professional: profId,
          service: serviceId,
        });
      } else {
        const assignment = previousAssignments.find((a) => a.service === serviceId);
        if (assignment && assignment.id !== -1) {
          await removeServiceAssignment(assignment.id);
        }
      }

      // Refresh to get real IDs and ensure consistency
      const updated = await listProfessionalServices({
        professional_id: profId,
      });

      // Only update if we are still on the same professional
      if (Number(selectedProfessionalId) === profId) {
        setAssignments(updated);
      }

      toast({
        title: checked ? "Servicio asignado" : "Servicio removido",
        description: checked
          ? "El servicio ha sido asignado correctamente."
          : "El servicio ha sido removido correctamente.",
      });

    } catch (error) {
      console.error("Error toggling service:", error);
      // Revert on error
      setAssignments(previousAssignments);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la asignación. Intente nuevamente.",
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
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cargando profesionales...</span>
            </div>
          ) : (
            <div className="w-full md:w-1/2">
              <Select
                value={selectedProfessionalId}
                onValueChange={setSelectedProfessionalId}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un profesional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LISTA DE SERVICIOS */}
      {selectedProfessionalId && (
        <Card className="border border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center justify-between">
              <span>Servicios del profesional</span>
              {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loadingAssign || loadingServ ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Cargando servicios y asignaciones...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((s) => {
                  const isAssigned = assignedServiceIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      className={`
                        flex items-center space-x-3 p-4 rounded-lg border transition-all
                        ${isAssigned
                          ? "bg-primary/10 border-primary/50"
                          : "bg-card border-border hover:border-primary/30"
                        }
                      `}
                    >
                      <Checkbox
                        id={`service-${s.id}`}
                        checked={isAssigned}
                        onCheckedChange={(checked) => toggleService(s.id, checked as boolean)}
                        disabled={saving}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor={`service-${s.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {s.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {s.duration_min} min
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {services.length === 0 && !loadingServ && (
              <p className="text-center text-muted-foreground py-8">
                No hay servicios disponibles en el sistema.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
