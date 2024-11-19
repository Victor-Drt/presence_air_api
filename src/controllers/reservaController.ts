import { Request, Response } from 'express';
import { Reserva } from '../models/reserva';
import { ReservaService } from '../services/reservaService';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { log } from 'console';

// Criar uma nova reserva
export const criarReserva = async (req: Request, res: Response) => {
    try {
        const { usuarioAtividade, area, sala, inicio, fim, duracao, descricao, tipo, reservadoPor, ultimaAtualizacao, statusArcondicionado } = req.body;

        const reserva = await ReservaService.criarReserva({
            usuarioAtividade,
            area,
            sala,
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

function formatarData(dataString: string): String | null {
    try {
        // Remover o dia da semana (exemplo: "- segunda", "- terça")
        const dataSemDiaSemana = dataString.replace(/ - [a-zA-ZÀ-ú]+ /i, ' ');

        // Quebra a string em horário e data
        const [horario, diaTexto, mesTexto, ano] = dataSemDiaSemana.split(' ');

        if (!horario || !diaTexto || !mesTexto || !ano) {
            console.error('Formato de data inválido:', dataString);
            return null;
        }

        // Mapeamento de meses
        const meses: { [key: string]: string } = {
            janeiro: '01',
            fevereiro: '02',
            março: '03',
            abril: '04',
            maio: '05',
            junho: '06',
            julho: '07',
            agosto: '08',
            setembro: '09',
            outubro: '10',
            novembro: '11',
            dezembro: '12',
        };

        // Obter o número do mês
        const mes = meses[mesTexto.toLowerCase()];

        if (!mes) {
            console.error('Mês inválido:', mesTexto);
            return null;
        }

        // Construir a string de data no formato YYYY-MM-DDTHH:mm:ss
        const dataFormatada = `${ano}-${mes}-${diaTexto}T${horario}`;

        return new Date(dataFormatada).toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
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
