import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

type AdminContextType = {
    resources: { id: string; title: string; }[];
    setResources: React.Dispatch<React.SetStateAction<{ id: string; title: string; }[]>>;
};

const ProfessionalsPage = () => {
    const { resources, setResources } = useOutletContext<AdminContextType>();

    const handleAddProfessional = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const input = form.elements.namedItem('professionalName') as HTMLInputElement;
        const name = input.value.trim();

        if(name) {
            const newProfessional = {
                id: String(Date.now()),
                title: name,
            };
            setResources(prev => [...prev, newProfessional]);
            form.reset();
        }
    };

    const handleDeleteProfessional = (id: string) => {
        setResources(prev => prev.filter(res => res.id !== id));
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold text-foreground mb-8">Gestionar Profesionales</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Columna para añadir */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <PlusCircle className="h-5 w-5 mr-2" />
                            Añadir Nuevo Profesional
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddProfessional} className="flex space-x-2">
                            <Input name="professionalName" placeholder="Nombre del profesional" required />
                            <Button type="submit">Añadir</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Columna para listar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Profesionales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                            {resources.map(res => (
                                <li key={res.id} className="flex justify-between items-center p-3 bg-muted rounded-md">
                                    <span className="font-medium">{res.title}</span>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteProfessional(res.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfessionalsPage;