import express from 'express';
import bodyParser from 'body-parser';
import reservaRoutes from './routes/reservaRoutes';
import sequelize from './config/database';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import { Reserva } from './models/reserva';
import { Op } from 'sequelize';
import moment from 'moment';
import { log } from 'console';

const cors = require('cors');
const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware para parsear o corpo da requisição
app.use(bodyParser.json());
app.use(cors()); // Agora o CORS está configurado corretamente

// Usar as rotas de reserva
app.use('/api', reservaRoutes);

// Função para limpar chaves com aspas extras
const limparChaves = (obj: any) => {
  const novoObj: any = {};
  for (const chave in obj) {
    if (obj.hasOwnProperty(chave)) {
      const chaveLimpa = chave.replace(/^"|"$/g, '').trim(); // Remove aspas duplas e espaços extras
      novoObj[chaveLimpa] = obj[chave];
    }
  }
  return novoObj;
};

// Rota para upload e processamento do CSV
app.post('/api/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).send('Nenhum arquivo enviado.');
    return;
  }

  const filePath = path.join(__dirname, '..', req.file.path);
  const resultados: any[] = [];

  // Ler o arquivo CSV
  fs.createReadStream(filePath, { encoding: 'utf16le' })
    .pipe(csvParser({ separator: ',' }))
    .on('data', (row) => {
      const rowLimpo = limparChaves(row);
      resultados.push(rowLimpo);
    })
    .on('end', async () => {
      try {
        let inseridos = 0;
        let duplicados = 0;

        // Iterar sobre os resultados e adicionar ao banco apenas se não existir
        for (const reservaData of resultados) {
          const inicio = formatarData(reservaData['Início']?.trim());
          const fim = formatarData(reservaData['Fim']?.trim());
          const ultimaAtualizacao = formatarData(reservaData['Última Atualização']?.trim());
          const duracao = converterDuracao(reservaData['Duração']?.trim());
          const area = reservaData['Área']?.trim() || 'N/A';
          const sala = reservaData['Sala']?.trim() || 'N/A';
          const idSala = filtroIdSala(sala);

          // Verificar se a reserva já existe no banco
          const reservaExistente = await Reserva.findOne({
            where: {
              area,
              sala,
              inicio,
              fim,
            },
          });

          // Se não existir, cria a nova reserva
          if (!reservaExistente) {
            await Reserva.create({
              usuarioAtividade: reservaData['"Usuário / Atividade']?.trim() || 'N/A',
              area,
              sala,
              idSala,
              inicio: inicio || 'N/A',
              fim: fim || 'N/A',
              duracao: duracao,
              descricao: reservaData['Descrição']?.trim() || '',
              tipo: reservaData['Tipo']?.trim() || 'N/A',
              reservadoPor: reservaData['Reservado por']?.trim() || 'N/A',
              statusArcondicionado: false,
              ultimaAtualizacao: ultimaAtualizacao || 'N/A',
            });
            inseridos++;
          } else {
            duplicados++;
          }
        }

        // Apagar o arquivo após o processamento
        fs.unlinkSync(filePath);

        // Responder com o status da operação
        res.status(200).send(
          `Arquivo CSV processado com sucesso. Reservas inseridas: ${inseridos}, Reservas duplicadas ignoradas: ${duplicados}`
        );
      } catch (error) {
        console.error('Erro ao salvar reservas:', error);
        res.status(500).send('Erro ao processar o arquivo CSV');
      }
    });
});

app.get('/verificar_agenda', async (req, res) => {
  try {
    const { sala } = req.query;  // Obtém o parâmetro 'sala' da query string

    console.log("Verificando agendamento em:", sala)

    if (!sala) {
      res.status(400).json({ message: 'Sala não informada' });
      return;
    }

    // Obtém o horário atual ajustado para o timezone de Manaus
    const now = moment().tz('America/Manaus'); // Hora atual

    // Verifica se a sala está reservada no horário atual
    const reserva = await Reserva.findOne({
      where: {
        idSala: sala,
        [Op.and]: [
          sequelize.where(
            sequelize.fn('TO_TIMESTAMP', sequelize.col('inicio'), 'DD/MM/YYYY, HH24:MI:SS'),
            { [Op.lte]: sequelize.fn('TO_TIMESTAMP', now.add(15, 'minutes').format('DD/MM/YYYY, HH:mm:ss'), 'DD/MM/YYYY, HH24:MI:SS') } // Tolerância de 15 minutos após o horário
          ),
          sequelize.where(
            sequelize.fn('TO_TIMESTAMP', sequelize.col('fim'), 'DD/MM/YYYY, HH24:MI:SS'),
            { [Op.gte]: sequelize.fn('TO_TIMESTAMP', now.format('DD/MM/YYYY, HH:mm:ss'), 'DD/MM/YYYY, HH24:MI:SS') } // Hora atual para verificar o fim
          ),
        ],
      },
    });

    if (reserva) {
      const id = reserva?.toJSON()["id"];
      // Se encontrar uma reserva, retorna que está ocupada
      const obj = {
        "id": id,
        "status": 1
      }
      res.status(200).json(obj);
      return;
    } else {
      // Se encontrar uma reserva, retorna que está ocupada
      const obj = {
        "id": -1,
        "status": 0
      }

      // Se não encontrar nenhuma reserva, a sala está livre
      res.status(200).json(obj);
      return;
    }
  } catch (error) {
    console.error('Erro ao verificar agenda:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
    return;
  }
});

function converterDuracao(duracao: string): number {
  const duracaoLimpa = duracao.replace(' horas', '').replace(',', '.');
  const duracaoNumero = parseFloat(duracaoLimpa);

  return isNaN(duracaoNumero) ? 0 : duracaoNumero;
}

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


// Sincronizar o banco de dados e iniciar o servidor
sequelize.sync().then(() => {
  app.listen(3000, '0.0.0.0', () => {
    console.log('Servidor rodando na porta 3000');
  });
});

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


