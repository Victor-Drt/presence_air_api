import { Op, Sequelize, QueryTypes } from 'sequelize';
import { Reserva } from '../models/reserva';
import moment from 'moment-timezone';
import { log } from 'console';
import sequelize from '../config/database';

export class ReservaService {
  // Criar uma nova reserva
  public static async criarReserva(data: any): Promise<any> {
    const reserva = await Reserva.create(data);
    return reserva;
  }

  // Consultar todas as reservas
  public static async consultarReservas(p1: string, p2: string): Promise<any[]> {
    try {
      const [inicio, final] = formatDates(p1, p2);
      const inicioISO = moment.tz(inicio, "DD/MM/yyyy, HH:mm:ss", "America/Manaus").toISOString();
      const finalISO = moment.tz(final, "DD/MM/yyyy, HH:mm:ss", "America/Manaus").toISOString();

      // Usando a função TO_TIMESTAMP do PostgreSQL para conversão da string para timestamp
      const reservas = await Reserva.findAll({
        where: Sequelize.where(
          Sequelize.fn('TO_TIMESTAMP', Sequelize.col('inicio'), 'DD/MM/YYYY, HH24:MI:SS'),
          {
            [Op.between]: [inicioISO, finalISO],
          }
        ),
        order: [['inicio', 'ASC']], // Ordena pela coluna 'inicio' em ordem crescente
      });

      return reservas;
    } catch (error) {
      console.error('Erro ao consultar reservas:', error);
      return [];
    }
  }

  // Consultar uma reserva por ID
  public static async consultarReservaPorId(id: string): Promise<any | null> {
    const reserva = await Reserva.findByPk(id);
    return reserva;
  }

  public static async deletarReserva(id: string): Promise<boolean> {
    try {
      const reserva = await Reserva.findByPk(id);
      if (!reserva) {
        return false;
      }
      await reserva.destroy();
      return true;
    } catch (error) {
      console.error('Erro ao deletar reserva:', error);
      return false;
    }
  }

  public static async editarReserva(
    id: string,
    data: Partial<Reserva>
  ): Promise<any | null> {
    try {
      const reserva = await Reserva.findByPk(id);

      if (!reserva) {
        console.error(`Reserva com ID ${id} não encontrada.`);
        return null;
      }

      // Atualiza os campos permitidos
      await reserva.update({
        usuarioAtividade: data.usuarioAtividade || reserva.usuarioAtividade,
        area: data.area || reserva.area,
        sala: data.sala || reserva.sala,
        idSala: filtroIdSala(data.sala!) || reserva.idSala,
        inicio: formatarData(data.inicio) || reserva.inicio,
        fim: formatarData(data.fim) || reserva.fim,
        duracao: data.duracao || reserva.duracao,
        descricao: data.descricao !== undefined ? data.descricao : reserva.descricao,
        tipo: data.tipo || reserva.tipo,
        reservadoPor: data.reservadoPor || reserva.reservadoPor,
        ultimaAtualizacao: data.ultimaAtualizacao || reserva.ultimaAtualizacao,
        statusArcondicionado: data.statusArcondicionado !== undefined ? data.statusArcondicionado : reserva.statusArcondicionado,
        encerrado: data.encerrado !== undefined ? data.encerrado : reserva.encerrado
      });

      return reserva;
    } catch (error) {
      console.error('Erro ao editar reserva:', error);
      return null;
    }
  }
}

function filtroIdSala(sala: string | undefined): string | undefined {
  if (sala) {
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

  } else {
    return undefined;
  }
}


// Função de formatação das datas de entrada
function formatDates(p1: string, p2: string) {
  const inicio = moment.tz(p1, "America/Manaus").startOf("day").format("DD/MM/yyyy, HH:mm:ss");
  const final = moment.tz(p2, "America/Manaus").endOf("day").format("DD/MM/yyyy, HH:mm:ss");

  return [inicio, final];
}


function formatarData(dataString: string | undefined): String | undefined {

  if (dataString !== undefined) {
    try {
      const date = new Date(dataString!).toLocaleString('pt-BR', { timeZone: 'America/Manaus' });
      return date;
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return undefined;
    }
  } else {
    return undefined;
  }

}
