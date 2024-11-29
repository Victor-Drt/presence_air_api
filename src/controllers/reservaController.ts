import { Request, Response } from 'express';
import { ReservaService } from '../services/reservaService';


// Criar uma nova reserva
export const criarReserva = async (req: Request, res: Response) => {
    try {
        const { usuarioAtividade, area, sala, inicio, fim, duracao, descricao, tipo, reservadoPor, ultimaAtualizacao, statusArcondicionado } = req.body;

        var idSala = filtroIdSala(sala);

        const reserva = await ReservaService.criarReserva({
            usuarioAtividade,
            area,
            sala,
            idSala,
            inicio: formatarData(inicio),
            fim: formatarData(fim),
            duracao,
            descricao,
            tipo,
            reservadoPor,
            ultimaAtualizacao: String(ultimaAtualizacao),
            statusArcondicionado
        });

        res.status(201).json(reserva);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar a reserva' });
    }
};

function filtroIdSala(sala: string): string {
    const mapaSalas: Record<string, string> = {
      "Comunicações Ópticas": "9",
      "Lab. Programação I": "5",
      "Lab. Programação IV": "24",
      "MPCE": "25",
      "Lab. Programação II": "6",
      "Lab. Programação III": "7",
      "Redes de Telecomunicações": "10",
      "Sistemas de Telecom": "8",
      "Indústria I": "1",
      "Indústria II": "2",
      "Indústria III": "3",
      "Lab. FINEP": "18",
      "Lab. FLL": "29",
      "Lab. Prototipagem": "30",
      "Laboratório de Biologia": "15",
      "Laboratório de Desenho": "28",
      "Laboratório de Eletrônica de Potência": "23",
      "Lab. Robótica e Controle": "21",
      "Lab. de Acionamentos/ CLP": "20",
      "Lab. Hidrául./ Pneumática": "19",
      "Lab. Metrologia": "26",
      "Áudio e Vídeo": "11",
      "Lab. de Automação": "12",
      "Lab. de Física": "22",
      "Lab. de Química": "14",
    };
  
    return mapaSalas[sala] || "ID desconhecido"; // Retorna um valor padrão se não encontrado
  }
  

function formatarData(dataString: string): String | null {
    try {
        return new Date(dataString).toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return null;
    }
}

// Consultar todas as reservas
export const consultarReservas = async (req: Request, res: Response) => {
    try {

        const { p1, p2 } = req.query

        const reservas = await ReservaService.consultarReservas(p1 as string, p2 as string);
        res.status(200).json(reservas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao consultar as reservas' });
    }
};

// Consultar uma reserva por ID
export const consultarReservaPorId = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const reserva = await ReservaService.consultarReservaPorId(id);

        if (!reserva) {
            res.status(404).json({ error: 'Reserva não encontrada' });
            return;
        }

        res.status(200).json(reserva);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao consultar a reserva' });
    }
}

export const deletarReserva = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const resultado = await ReservaService.deletarReserva(id);

        if (!resultado) {
            res.status(404).json({ error: 'Erro ao deletar a reserva ou reserva não encontrada' });
            return;
        }

        res.status(200).json("Reserva deletada com Sucesso");
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao deletar a reserva ou reserva não encontrada' });
    }
}

export const editarReserva = async (req: Request, res: Response) => {
    try {
        const id = req.params.id; // ID da reserva na URL
        const data = req.body; // Dados da reserva para atualização

        // Verificar se o ID foi fornecido
        if (!id) {
            res.status(400).json({ message: 'ID da reserva é obrigatório.' });
            return;
        }

        // Chamar o serviço para editar a reserva
        const reservaAtualizada = await ReservaService.editarReserva(id, data);

        // Verificar se a reserva foi encontrada e atualizada
        if (!reservaAtualizada) {
            res.status(404).json({ message: 'Reserva não encontrada.' });
            return;
        }

        res.status(200).json({
            message: 'Reserva atualizada com sucesso.',
            data: reservaAtualizada,
        });
    } catch (error) {
        console.error('Erro ao editar reserva:', error);
        res.status(500).json({
            message: 'Erro interno ao editar a reserva.',
            error: error,
        });
    }
}
