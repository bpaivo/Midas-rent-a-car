import { z } from 'zod';

export const vehicleSchema = z.object({
    plate: z.string().length(7, 'Placa deve ter exatamente 7 caracteres'),
    brand: z.string().min(2, 'Marca obrigatória'),
    model: z.string().min(2, 'Modelo obrigatório'),
    year: z.number().min(1900).max(new Date().getFullYear() + 1),
    category: z.string().min(1, 'Categoria obrigatória'),
    km: z.number().min(0),
    status: z.enum(['Disponível', 'Alugado', 'Reservado', 'Em Reparo']),
    color: z.string().min(2, 'Cor obrigatória'),
    passengers: z.number().min(1),
    doors: z.number().min(2),
    transmission: z.enum(['Manual', 'Automático']),
    renavan: z.string().min(11, 'Renavan inválido'),
    chassis: z.string().min(17, 'Chassis inválido')
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;
