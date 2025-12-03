// revitek/front/src/components/BlockDetailModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, AlertTriangle, Edit2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { deleteBlock, updateBlock, SlotBlockData } from "@/api/agenda";
import { toast } from "@/components/ui/use-toast";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface BlockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: SlotBlockData | null;
  onRefreshCalendar?: () => void;
}

export const BlockDetailModal = ({ isOpen, onClose, block, onRefreshCalendar }: BlockDetailModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);

  // Estados para edición
  const [editedReason, setEditedReason] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [editedStartTime, setEditedStartTime] = useState("");
  const [editedEndTime, setEditedEndTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsEditing(false);
      setShowConfirmDelete(false);
      setDeleted(false);
    }
  }, [isOpen]);

  if (!block) return null;

  // Inicializar estados de edición
  const startEditing = () => {
    setEditedReason(block.reason || "");
    setEditedDate(block.date);

    // Assuming block.start and block.end are ISO strings or contain time
    // If they are full ISO strings: 2023-10-10T10:00:00
    const startDate = new Date(block.start);
    const endDate = new Date(block.end);

    setEditedStartTime(startDate.toTimeString().slice(0, 5)); // HH:MM
    setEditedEndTime(endDate.toTimeString().slice(0, 5)); // HH:MM

    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!editedReason.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La razón del bloqueo es requerida"
      });
      return;
    }

    if (!block.id) return;

    setIsSaving(true);
    try {
      const startISO = `${editedDate}T${editedStartTime}:00`;
      const endISO = `${editedDate}T${editedEndTime}:00`;

      await updateBlock(block.id, {
        professional: block.professional,
        date: editedDate,
        start: startISO,
        end: endISO,
        reason: editedReason.trim()
      });

      toast({
        title: "Bloqueo Actualizado",
        description: "Los cambios se guardaron exitosamente"
      });

      setIsEditing(false);

      // Refrescar calendario después de un momento
      setTimeout(() => {
        onClose();
        if (onRefreshCalendar) {
          onRefreshCalendar();
        }
      }, 1000);

    } catch (error: any) {
      console.error('Error actualizando bloqueo:', error);
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: error?.response?.data?.detail || "No se pudo actualizar el bloqueo"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!block.id) return;

    setIsDeleting(true);
    try {
      await deleteBlock(block.id);
      setDeleted(true);
      setShowConfirmDelete(false);

      toast({
        title: "Bloqueo Eliminado",
        description: "El bloqueo de horario se eliminó exitosamente"
      });

      // Cerrar modal después de 1.5 segundos
      setTimeout(() => {
        onClose();
        if (onRefreshCalendar) {
          onRefreshCalendar();
        }
      }, 1500);

    } catch (error: any) {
      console.error('Error eliminando bloqueo:', error);
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error?.response?.data?.detail || "No se pudo eliminar el bloqueo"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Formatear fechas para mostrar
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    // dateStr is YYYY-MM-DD
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return format(date, "EEEE d 'de' MMMM, yyyy", { locale: es });
  };

  const formatTimeDisplay = (isoStr: string) => {
    if (!isoStr) return "";
    const date = new Date(isoStr);
    return format(date, "HH:mm", { locale: es });
  };

  // Si fue eliminado exitosamente
  if (deleted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md text-center">
          <div className="space-y-4 py-6">
            <div className="text-green-600 text-5xl">✓</div>
            <h2 className="text-xl font-semibold text-foreground">Bloqueo Eliminado</h2>
            <p className="text-muted-foreground">
              El bloqueo de horario se eliminó correctamente.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      {/* Modal de confirmación de eliminación */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Confirmar Eliminación</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground">
              ¿Estás seguro que deseas eliminar este bloqueo de horario?
            </p>
            <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
              <p><strong>Fecha:</strong> {formatDateDisplay(block.date)}</p>
              <p><strong>Horario:</strong> {formatTimeDisplay(block.start)} - {formatTimeDisplay(block.end)}</p>
              <p><strong>Razón:</strong> {block.reason || "Sin razón especificada"}</p>
            </div>
            <p className="mt-3 text-sm text-destructive">
              Esta acción no se puede deshacer. Los horarios volverán a estar disponibles.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDelete(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Eliminando..." : "Sí, Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal principal de detalle/edición */}
      <Dialog open={isOpen && !showConfirmDelete} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-destructive" />
                <span>Bloqueo de Horario #{block.id}</span>
              </DialogTitle>
              <Badge variant="destructive">Bloqueado</Badge>
            </div>
          </DialogHeader>

          {!isEditing ? (
            // MODO VISUALIZACIÓN
            <div className="space-y-6">
              {/* Información del Profesional */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Profesional</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-foreground">Profesional #{block.professional}</p>
                </div>
              </div>

              <Separator />

              {/* Fecha y Horario */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Fecha y Horario</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="font-medium">{formatDateDisplay(block.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hora Inicio:</span>
                    <span className="font-medium">{formatTimeDisplay(block.start)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hora Fin:</span>
                    <span className="font-medium">{formatTimeDisplay(block.end)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Razón del Bloqueo */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Razón del Bloqueo</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">{block.reason || "Sin razón especificada"}</p>
                </div>
              </div>

              {block.created_at && (
                <>
                  <Separator />
                  <div className="text-sm text-muted-foreground">
                    Creado: {new Date(block.created_at).toLocaleString('es-CL')}
                  </div>
                </>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={startEditing}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              </div>
            </div>
          ) : (
            // MODO EDICIÓN
            <div className="space-y-6">
              {/* Información del Profesional (no editable) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Profesional</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-muted-foreground text-sm">No se puede cambiar el profesional asignado</p>
                  <p className="text-foreground font-medium">Profesional #{block.professional}</p>
                </div>
              </div>

              <Separator />

              {/* Editar Fecha y Horario */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Fecha y Horario</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-fecha">Fecha</Label>
                    <Input
                      id="edit-fecha"
                      type="date"
                      value={editedDate}
                      onChange={(e) => setEditedDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-hora-inicio">Hora Inicio</Label>
                      <Input
                        id="edit-hora-inicio"
                        type="time"
                        value={editedStartTime}
                        onChange={(e) => setEditedStartTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-hora-fin">Hora Fin</Label>
                      <Input
                        id="edit-hora-fin"
                        type="time"
                        value={editedEndTime}
                        onChange={(e) => setEditedEndTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Editar Razón */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Razón del Bloqueo *</h3>
                </div>
                <Textarea
                  value={editedReason}
                  onChange={(e) => setEditedReason(e.target.value)}
                  placeholder="Ej: Vacaciones, Licencia médica, Reunión..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Botones de edición */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={cancelEditing}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                >
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
