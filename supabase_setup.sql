-- Tabela para modelos de contrato
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  content TEXT,
  version TEXT,
  last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Tabela para contratos específicos de cada reserva
CREATE TABLE IF NOT EXISTS public.rental_contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  rental_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Simplificadas para o admin)
CREATE POLICY "allow all contracts" ON public.contract_templates FOR ALL USING (true);
CREATE POLICY "allow all rental_contracts" ON public.rental_contracts FOR ALL USING (true);

-- Inserir um modelo inicial básico (O usuário poderá editar depois)
INSERT INTO public.contract_templates (name, content, version)
VALUES ('Contrato Padrão Midas', '
<h1 style="text-align: center;">CONTRATO DE LOCAÇÃO DE VEÍCULO AUTOMOTOR</h1>
<p><strong>LOCADORA:</strong> MIDAS RENT A CAR LTDA, com sede em Tianguá-CE.</p>
<p><strong>LOCATÁRIO:</strong> {{CLIENT_NAME}}, portador do CPF {{CLIENT_CPF}}, residente em {{CLIENT_ADDRESS}}.</p>
<p><strong>VEÍCULO:</strong> {{VEHICLE_MODEL}}, Placa {{VEHICLE_PLATE}}, Cor {{VEHICLE_COLOR}}, Ano {{VEHICLE_YEAR}}.</p>
<p><strong>PERÍODO:</strong> De {{PICKUP_DATE}} até {{RETURN_DATE}}.</p>
<p><strong>VALORES:</strong> O valor total da locação é de {{TOTAL_VALUE}}, com caução de {{SECURITY_DEPOSIT}}.</p>
<p><strong>FRANQUIA DE SEGURO:</strong> O locatário está ciente da franquia de {{INSURANCE_VALUE}} em caso de sinistro.</p>
<br>
<p style="text-align: center;">__________________________________________</p>
<p style="text-align: center;">{{CLIENT_NAME}}</p>
', '1.0')
ON CONFLICT DO NOTHING;