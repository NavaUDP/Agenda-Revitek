// src/pages/AdminAssignmentsPage.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox" // Para seleccionar servicios
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast";
import { listProfesionales, Profesional } from '@/api/profesionales'; // Para obtener profesionales
import { listAllServicios, listAsignaciones, asignarServicio, quitarServicio } from '@/api/servicios'; // Para obtener servicios y asignaciones

// Tipos para los datos que manejaremos
interface Servicio {
  id: number;
  nombre: string;
  duracion_min: number;
  // Añade otros campos si los necesitas mostrar
}

interface Asignacion {
  id: number; // ID de la asignación (ProfesionalServicio)
  profesional: number;
  servicio: Servicio;
  duracion_override_min?: number | null;
  activo: boolean;
}

const AdminAssignmentsPage = () => {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [selectedProfesionalId, setSelectedProfesionalId] = useState<string | undefined>();
  const [asignacionesProfesional, setAsignacionesProfesional] = useState<Asignacion[]>([]);
  const [loadingProfesionales, setLoadingProfesionales] = useState(true);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(false);
  const [saving, setSaving] = useState(false); // Para indicar que se está guardando
  const { toast } = useToast();

  // Cargar profesionales y servicios al montar
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingProfesionales(true);
        const profData = await listProfesionales();
        setProfesionales(profData);
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los profesionales." });
      } finally {
        setLoadingProfesionales(false);
      }

      try {
        setLoadingServicios(true);
        const servData = await listAllServicios();
        setServicios(servData);
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los servicios." });
      } finally {
        setLoadingServicios(false);
      }
    };
    fetchData();
  }, [toast]);

  // Cargar asignaciones cuando se selecciona un profesional
  useEffect(() => {
    if (selectedProfesionalId) {
      const fetchAsignaciones = async () => {
        setLoadingAsignaciones(true);
        try {
          const asignData = await listAsignaciones({ profesional_id: parseInt(selectedProfesionalId, 10) });
          setAsignacionesProfesional(asignData);
        } catch (err) {
          toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las asignaciones del profesional." });
          setAsignacionesProfesional([]);
        } finally {
          setLoadingAsignaciones(false);
        }
      };
      fetchAsignaciones();
    } else {
      setAsignacionesProfesional([]); // Limpiar si no hay profesional seleccionado
    }
  }, [selectedProfesionalId, toast]);

  // Manejar cambio en checkbox de servicio
  const handleServiceAssignmentChange = async (serviceId: number, isChecked: boolean) => {
    if (!selectedProfesionalId) return;
    const profesionalId = parseInt(selectedProfesionalId, 10);

    setSaving(true);
    try {
      if (isChecked) {
        // Asignar servicio
        await asignarServicio({
          profesional: profesionalId,
          servicio: serviceId,
          activo: true // Por defecto lo asignamos como activo
          // Podrías añadir un input para duracion_override_min si quieres
        });
        toast({ title: "Éxito", description: "Servicio asignado." });
      } else {
        // Quitar asignación (Desasignar)
        // Necesitamos encontrar el ID de la asignación específica para borrarla
        const asignacionParaBorrar = asignacionesProfesional.find(a => a.servicio.id === serviceId);
        if (asignacionParaBorrar) {
           // 2. Usar el ID de la asignación (asignacionParaBorrar.id)
           await quitarServicio(asignacionParaBorrar.id); // CAMBIADO
           
           toast({ title: "Éxito", description: "Servicio desasignado." });
        } else {
            toast({ variant: "destructive", title: "Error", description: "No se encontró la asignación para eliminar." });
        }
      }
      // Recargar asignaciones después del cambio
      const updatedAsignaciones = await listAsignaciones({ profesional_id: profesionalId });
      setAsignacionesProfesional(updatedAsignaciones);
    } catch (err: any) {
      const errorMsg = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      toast({ variant: "destructive", title: "Error al actualizar", description: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const getAssignedServiceIds = () => {
    return new Set(asignacionesProfesional.map(a => a.servicio.id));
  };

  const assignedServiceIds = getAssignedServiceIds();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Asignar Servicios a Profesionales</h1>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Profesional</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProfesionales ? (
            <p>Cargando profesionales...</p>
          ) : (
            <Select onValueChange={setSelectedProfesionalId} value={selectedProfesionalId}>
              <SelectTrigger className="w-full md:w-1/2">
                <SelectValue placeholder="Seleccione un profesional..." />
              </SelectTrigger>
              <SelectContent>
                {profesionales.map(prof => (
                  <SelectItem key={prof.id} value={String(prof.id)}>
                    {prof.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedProfesionalId && (
        <Card>
          <CardHeader>
            <CardTitle>Servicios Asignados</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingServicios || loadingAsignaciones ? (
              <p>Cargando servicios y asignaciones...</p>
            ) : servicios.length === 0 ? (
                <p className="text-muted-foreground">No hay servicios creados. Añade servicios primero.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Marca los servicios que realiza {profesionales.find(p => String(p.id) === selectedProfesionalId)?.nombre || 'este profesional'}.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {servicios.map(servicio => (
                    <div key={servicio.id} className="flex items-center space-x-2 p-3 border rounded-md">
                      <Checkbox
                        id={`service-${servicio.id}`}
                        checked={assignedServiceIds.has(servicio.id)}
                        onCheckedChange={(checked) => handleServiceAssignmentChange(servicio.id, !!checked)}
                        disabled={saving} // Deshabilitar mientras guarda
                      />
                      <Label htmlFor={`service-${servicio.id}`} className="cursor-pointer">
                        {servicio.nombre} ({servicio.duracion_min} min)
                      </Label>
                      {/* Podrías añadir aquí un Input pequeño para duracion_override_min si es necesario */}
                    </div>
                  ))}
                </div>
                 {saving && <p className="text-sm text-blue-500 mt-4">Guardando cambios...</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAssignmentsPage;