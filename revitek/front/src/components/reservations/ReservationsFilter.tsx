import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { Professional } from '@/types/professionals';
import { ReservationsFilters } from '@/hooks/useReservations';

interface ReservationsFilterProps {
    filters: ReservationsFilters;
    setFilters: (filters: ReservationsFilters) => void;
    professionals: Professional[];
    onRefresh: () => void;
}

export default function ReservationsFilter({ filters, setFilters, professionals, onRefresh }: ReservationsFilterProps) {
    const handleChange = (key: keyof ReservationsFilters, value: any) => {
        setFilters({ ...filters, [key]: value });
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Fecha</label>
                        <Input
                            type="date"
                            value={filters.date}
                            onChange={(e) => handleChange('date', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Estado</label>
                        <Select value={filters.status} onValueChange={(val) => handleChange('status', val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos</SelectItem>
                                <SelectItem value="PENDING">Pendiente</SelectItem>
                                <SelectItem value="CONFIRMED">Confirmada</SelectItem>
                                <SelectItem value="WAITING_CLIENT">Espera Cliente</SelectItem>
                                <SelectItem value="COMPLETED">Completada</SelectItem>
                                <SelectItem value="CANCELLED">Cancelada</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Profesional</label>
                        <Select value={filters.professional_id} onValueChange={(val) => handleChange('professional_id', val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos</SelectItem>
                                {professionals.map(p => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.first_name} {p.last_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2 pb-2">
                        <Button className="w-full" onClick={onRefresh}>
                            <Filter className="mr-2 h-4 w-4" /> Filtrar
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
